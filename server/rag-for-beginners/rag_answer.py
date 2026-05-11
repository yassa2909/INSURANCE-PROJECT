import argparse
import logging
import re
from typing import List, Tuple

from llama_index.core import Settings, VectorStoreIndex
from llama_index.core.schema import NodeWithScore, QueryBundle, TextNode
from llama_index.core.postprocessor.types import BaseNodePostprocessor
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.huggingface import HuggingFaceLLM
from llama_index.vector_stores.qdrant import QdrantVectorStore
from qdrant_client import QdrantClient


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

DEFAULT_COLLECTION = "company_docs"
DEFAULT_QDRANT_PATH = "./qdrant_data"
DEFAULT_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_LLM_MODEL = "google/flan-t5-small"
ANSWER_FALLBACK = "Answer not found in the provided document."


def clean_text(text: str) -> str:
    text = re.sub(r"1800.*?\d+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"www\..*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"IRDA.*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"CIN:.*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"UIN:.*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def split_sentences(text: str) -> List[str]:
    return [sentence.strip() for sentence in re.split(r"(?<=[.!?])\s+", text) if sentence.strip()]


def build_multi_chunk_answer(query: str, context: str, max_sentences: int = 4) -> str:
    sentences = split_sentences(clean_text(context))
    query_terms = {term for term in re.findall(r"\w+", query.lower()) if len(term) > 2}

    scored: List[Tuple[int, str]] = []
    for sentence in sentences:
        sentence = clean_text(sentence)
        if not sentence:
            continue
        sentence_terms = set(re.findall(r"\w+", sentence.lower()))
        score = len(query_terms & sentence_terms)
        if score > 0:
            scored.append((score, sentence))

    if not scored:
        return ANSWER_FALLBACK

    scored.sort(key=lambda item: item[0], reverse=True)
    selected = [sentence for _, sentence in scored[:max_sentences]]
    answer = clean_text(" ".join(selected))

    if len(answer) > 400:
        answer = answer[:400].rsplit(" ", 1)[0]

    return answer or ANSWER_FALLBACK


def combine_contexts(retrieved_nodes: List[NodeWithScore]) -> str:
    contexts = []
    for node in retrieved_nodes:
        content = node.node.get_content() if hasattr(node.node, "get_content") else str(node.node)
        cleaned = clean_text(content)
        if cleaned:
            contexts.append(cleaned)
    return " ".join(contexts)


def parse_score_and_reason(evaluation_text: str) -> Tuple[int, str]:
    score_match = re.search(r"Score\s*:\s*(\d{1,3})", evaluation_text, flags=re.IGNORECASE)
    score = int(score_match.group(1)) if score_match else 0

    reason_match = re.search(r"Reason\s*:\s*(.*)", evaluation_text, flags=re.IGNORECASE | re.DOTALL)
    reason = reason_match.group(1).strip() if reason_match else evaluation_text.strip()
    reason = re.sub(r"\s+", " ", reason)

    return max(0, min(score, 100)), reason


def evaluate_answer(llm, question: str, context: str, answer: str) -> str:
    prompt = f"""
You are an expert evaluator.

Evaluate the answer based ONLY on the context.

Criteria:
1. Correctness (Is it factually correct?)
2. Completeness (Does it include all important details?)
3. Relevance (Does it answer the question?)

Return STRICT format:

Score: <0-100>
Reason: <clear explanation>

Context:
{context}

Question:
{question}

Answer:
{answer}
"""
    return llm.invoke(prompt)


class CleanTextPostprocessor(BaseNodePostprocessor):
    @classmethod
    def class_name(cls) -> str:
        return "CleanTextPostprocessor"

    def _postprocess_nodes(
        self,
        nodes: List[NodeWithScore],
        query_bundle: QueryBundle | None = None,
    ) -> List[NodeWithScore]:
        cleaned_nodes: List[NodeWithScore] = []

        for node in nodes:
            content = node.node.get_content() if hasattr(node.node, "get_content") else str(node.node)
            cleaned_content = clean_text(content)
            if not cleaned_content:
                continue

            cleaned_node = TextNode(text=cleaned_content, metadata=getattr(node.node, "metadata", {}))
            cleaned_nodes.append(NodeWithScore(node=cleaned_node, score=node.score))

        return cleaned_nodes


def load_index(collection_name: str, qdrant_path: str) -> VectorStoreIndex:
    client = QdrantClient(path=qdrant_path)
    vector_store = QdrantVectorStore(client=client, collection_name=collection_name)
    return VectorStoreIndex.from_vector_store(vector_store=vector_store)


def build_retriever(index: VectorStoreIndex):
    return index.as_retriever(similarity_top_k=5)


def main() -> None:
    parser = argparse.ArgumentParser(description="Local PDF RAG answer pipeline")
    parser.add_argument("--collection", default=DEFAULT_COLLECTION)
    parser.add_argument("--qdrant-path", default=DEFAULT_QDRANT_PATH)
    parser.add_argument("--embed-model", default=DEFAULT_EMBED_MODEL)
    parser.add_argument("--llm-model", default=DEFAULT_LLM_MODEL)
    parser.add_argument("--show-retrieval", action="store_true")
    parser.add_argument("--auto-improve", action="store_true", help="Retry with more sentences when evaluation score is low")
    args = parser.parse_args()

    Settings.embed_model = HuggingFaceEmbedding(model_name=args.embed_model)
    Settings.llm = HuggingFaceLLM(
        model_name=args.llm_model,
        tokenizer_name=args.llm_model,
        context_window=2048,
        max_new_tokens=256,
        generate_kwargs={"do_sample": False, "temperature": 0.0},
    )

    index = load_index(args.collection, args.qdrant_path)
    retriever = build_retriever(index)

    print("RAG ready. Type 'quit' to exit.")

    while True:
        query = input("Enter your question: ").strip()
        if not query:
            continue
        if query.lower() in {"quit", "exit", "q"}:
            break

        retrieved_nodes = retriever.retrieve(query)

        if args.show_retrieval:
            print("\n--- RETRIEVED CHUNKS ---\n")
            for node in retrieved_nodes:
                print(clean_text(node.node.get_content())[:300])
                print("-----")

        combined_context = combine_contexts(retrieved_nodes)
        answer = build_multi_chunk_answer(query, combined_context, max_sentences=4)

        evaluation_text = evaluate_answer(Settings.llm, query, combined_context, answer)
        score, reason = parse_score_and_reason(evaluation_text)

        if args.auto_improve and score < 70 and answer != ANSWER_FALLBACK:
            improved_answer = build_multi_chunk_answer(query, combined_context, max_sentences=6)
            if improved_answer != answer:
                answer = improved_answer
                evaluation_text = evaluate_answer(Settings.llm, query, combined_context, answer)
                score, reason = parse_score_and_reason(evaluation_text)

        if score < 70 and answer != ANSWER_FALLBACK:
            reason = f"Answer may be incomplete. {reason}"

        print("\nANSWER:\n", answer)
        print("\nEVALUATION:\n")
        print(f"Score: {score}")
        print(f"Reason: {reason}")


if __name__ == "__main__":
    main()
