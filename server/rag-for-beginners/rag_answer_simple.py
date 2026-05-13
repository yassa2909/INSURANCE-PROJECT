#!/usr/bin/env python3
"""
Simplified RAG answer retrieval script using local Qdrant.
Returns one concise, grounded answer from multiple retrieved chunks.
"""

import argparse
import logging
import os
import re
from pathlib import Path
from typing import List, Optional, Sequence, Tuple

from numpy import dot
from numpy.linalg import norm
from qdrant_client import QdrantClient
from llama_index.core import Settings, VectorStoreIndex
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.qdrant import QdrantVectorStore

try:
    from llama_index.llms.ollama import Ollama
except Exception:  # pragma: no cover - optional local dependency
    Ollama = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DEFAULT_COLLECTION = "company_docs"
DEFAULT_EMBED_MODEL = "BAAI/bge-base-en-v1.5"
DEFAULT_QDRANT_PATH = "./qdrant_data"
DEFAULT_OLLAMA_MODEL = "llama3"
ANSWER_FALLBACK = "Answer not found in the provided document."


# Lazy runtime state used by FastAPI via get_answer().
_RAG_RUNTIME = {
    "initialized": False,
    "retriever": None,
    "embed_model": None,
    "index": None,
    "client": None,
}



def split_sentences(text: str) -> List[str]:
    # Split on periods, exclamation, question marks followed by whitespace OR numbered lists (i., ii., iii. etc)
    sentences = re.split(r"(?<=[.!?])\s+(?![ivxlc]\.)", text)
    return [sentence.strip() for sentence in sentences if sentence.strip()]


def clean_text(text: str) -> str:
    # Remove phone numbers, long digit strings, emails, websites
    text = re.sub(r"\+?\d[\d\s\-()]{6,}\d", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\b\d{3,}[- ]\d{3,}[- ]\d{4,}\b", "", text)
    text = re.sub(r"\S+@\S+", "", text)
    text = re.sub(r"www\.[\S]+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"https?://[\S]+", "", text, flags=re.IGNORECASE)
    # Remove common policy identifiers and headers
    text = re.sub(r"IRDA[:\w\s-]*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"CIN[:\w\s-]*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"UIN[:\w\s-]*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"Policy\s+No[:\s\w-]*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"Page\s+\d+\s+of\s+\d+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"Annexure[:\s\w-]*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"Optional cover", "", text, flags=re.IGNORECASE)
    text = re.sub(r"Claim form", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def detect_insurance_category(query: str) -> Optional[str]:
    """Detect insurance category from query: health, motor, or life."""
    q = query.lower()
    
    health_keywords = ["health", "medical", "hospitalization", "treatment", "doctor", "hospital", "medicine", "illness", "disease", "coverage coverage"]
    motor_keywords = ["motor", "vehicle", "car", "bike", "accident", "driving", "road", "vehicle coverage", "vehicle insurance"]
    life_keywords = ["life", "term plan", "maturity", "nominee", "premium", "death", "insurance coverage", "life insurance", "death benefit"]
    
    if any(k in q for k in health_keywords):
        return "health"
    elif any(k in q for k in motor_keywords):
        return "motor"
    elif any(k in q for k in life_keywords):
        return "life"
    
    return None


def expand_query(query: str) -> str:
    q = query.lower()
    category = detect_insurance_category(query)
    
    # Category-specific expansion
    if category == "health" or "health" in q:
        return query + " health insurance medical coverage hospitalization treatment expenses diagnosis hospital benefits"
    elif category == "motor" or "motor" in q:
        return query + " motor insurance vehicle coverage accident claim driving policy motor insurance"
    elif category == "life" or "life" in q:
        return query + " life insurance term plan maturity benefit nominee death coverage premium"
    
    # Generic query expansion
    if "benefit" in q or "benefits" in q:
        return query + " hospitalization expenses treatment coverage policy benefits medical coverage"
    if "documents" in q or "document" in q:
        return query + " claim documents required bills reports forms discharge summary"
    if "grace period" in q:
        return query + " number of days renewal grace period duration"
    if "waiting period" in q:
        return query + " how many days waiting period duration"
    if "check coverage" in q:
        return query + " coverage details benefits included plan coverage policy"
    if "file claim" in q:
        return query + " claim process claim process steps claim documents requirements"
    if "find hospital" in q or "hospital" in q:
        return query + " network hospitals empanelled hospitals hospital list"
    if "add member" in q or "add" in q:
        return query + " add family member dependents add person coverage"
    
    return query


def is_numeric_question(query: str) -> bool:
    q = query.lower()
    return any(k in q for k in [
        "how many",
        "how much",
        "days",
        "period",
        "duration",
        "limit",
        "amount",
        "grace period",
        "waiting period",
    ])


def boost_numeric(sentence: str, score: float, query: str) -> float:
    if is_numeric_question(query):
        if re.search(r"\d+", sentence):
            score += 0.5
    return score


def penalize_definitions(sentence: str, score: float, query: str) -> float:
    if is_numeric_question(query):
        if "means" in sentence.lower() or sentence.strip().lower().startswith(("means", "meaning", "definition")):
            score -= 0.4
    return score


def boost_score(sentence: str, score: float, query: str) -> float:
    s = sentence.lower()
    q = query.lower()
    if "benefit" in q or "benefits" in q:
        if any(word in s for word in ["treatment", "expenses", "hospitalization", "coverage", "charges", "benefit"]):
            score += 0.2
    return score


def is_irrelevant(sentence: str) -> bool:
    s = sentence.lower()
    bad_keywords = [
        "bonus",
        "optional",
        "annexure",
        "documents required",
        "visa",
        "passport",
        "claim form",
        "apply online",
        "contact us",
        "website",
        "page ",
    ]
    return any(k in s for k in bad_keywords)


def cosine_similarity(a, b) -> float:
    return float(dot(a, b) / (norm(a) * norm(b) + 1e-8))


def filter_relevant(sentences: Sequence[str], query: str) -> List[str]:
    # Keep sentences long enough and drop those flagged irrelevant
    filtered = [s for s in sentences if len(s) > 30 and not is_irrelevant(s)]
    return filtered


def detect_question_type(query: str) -> str:
    q = query.lower()

    if any(keyword in q for keyword in ["what is", "define", "means", "meaning of"]):
        return "definition"
    if any(keyword in q for keyword in ["list", "documents", "requirements", "steps", "types", "benefit", "benefits"]):
        return "list"
    return "general"


def rank_sentences(embed_model, query: str, sentences: Sequence[str]) -> List[str]:
    if not sentences:
        return []

    query_emb = embed_model.get_text_embedding(query)
    
    # Filter out irrelevant and empty sentences first to save embedding time
    candidates = [s.strip() for s in sentences if not is_irrelevant(s) and len(s.strip()) > 10]
    if not candidates:
        return []

    # Use batch embedding for much better performance
    sent_embs = embed_model.get_text_embedding_batch(candidates)
    
    scored = []
    for s, emb in zip(candidates, sent_embs):
        score = cosine_similarity(query_emb, emb)

        # apply numeric and domain boosts / penalties
        score = boost_numeric(s, score, query)
        score = penalize_definitions(s, score, query)
        score = boost_score(s, score, query)

        scored.append((score, s))

    scored.sort(reverse=True, key=lambda x: x[0])
    return [s for _, s in scored]


def mmr_select(sentences: Sequence[str], embed_model, query: str, k: int = 4, lambda_: float = 0.7) -> List[str]:
    if not sentences:
        return []

    selected: List[str] = []
    selected_indices: List[int] = []
    query_emb = embed_model.get_text_embedding(query)
    
    # Use batch embedding
    sent_embs = embed_model.get_text_embedding_batch(list(sentences))

    while len(selected) < min(k, len(sentences)):
        best_idx = -1
        best_score = -1e9

        for index, sentence in enumerate(sentences):
            if index in selected_indices:
                continue

            sim_to_query = cosine_similarity(query_emb, sent_embs[index])
            
            # Use pre-calculated embeddings for selected sentences
            sim_to_selected = max(
                [cosine_similarity(sent_embs[index], sent_embs[idx]) for idx in selected_indices],
                default=0.0,
            )
            score = lambda_ * sim_to_query - (1 - lambda_) * sim_to_selected

            if score > best_score:
                best_idx = index
                best_score = score

        if best_idx == -1:
            break
            
        selected.append(sentences[best_idx])
        selected_indices.append(best_idx)

    return selected


def is_list_question(query: str) -> bool:
    return any(keyword in query.lower() for keyword in ["list", "documents", "requirements", "steps", "types", "benefit", "benefits"])


def format_answer(answer: str, sentences: Sequence[str], query: str) -> str:
    """Format answer based on query type and insurance category."""
    category = detect_insurance_category(query)
    
    q_type = detect_question_type(query)
    
    # For definitions, keep as continuous text (no bullets)
    if q_type == "definition":
        # Add category context as header
        if category == "health":
            return f"**Health Insurance Details:**\n{answer}"
        elif category == "motor":
            return f"**Motor Insurance Details:**\n{answer}"
        elif category == "life":
            return f"**Life Insurance Details:**\n{answer}"
        return answer
    
    # For list questions, use bullets
    if is_list_question(query) and sentences:
        bullets = [f"- {sentence}" for sentence in sentences]
        answer = "\n".join(bullets)
        
        # Add category context
        if category == "health":
            answer = f"**Health Insurance Details:**\n{answer}"
        elif category == "motor":
            answer = f"**Motor Insurance Details:**\n{answer}"
        elif category == "life":
            answer = f"**Life Insurance Details:**\n{answer}"
    
    return answer


def build_multi_chunk_answer(query: str, context: str, embed_model) -> tuple[str, List[str]]:
    """Create a complete answer from combined retrieved chunks using semantic ranking and MMR."""
    sentences = [sentence.strip() for sentence in split_sentences(clean_text(context)) if len(sentence.strip()) > 30]
    sentences = filter_relevant(sentences, query)
    
    # Limit to top 30 sentences to ensure speed on CPU
    if len(sentences) > 30:
        sentences = sentences[:30]

    if not sentences:
        return ANSWER_FALLBACK, []

    ranked = rank_sentences(embed_model, query, sentences)
    q_type = detect_question_type(query)

    # For numeric questions, prefer sentences with numbers
    if is_numeric_question(query):
        numeric_candidates = [s for s in ranked if re.search(r"\d+", s)]
        if numeric_candidates:
            selected = numeric_candidates[:2]
        else:
            selected = ranked[:2]
        # keep concise, no extra definitions
        selected = mmr_select(selected, embed_model, query, k=len(selected))
        selected = list(dict.fromkeys([s for s in selected]))
        answer = " ".join(selected)
        answer = re.sub(r"\s+", " ", answer).strip()
        return answer, selected

    if q_type == "definition":
        selected = ranked[:8]  # Get many sentences for complete definitions with all conditions
    elif q_type == "list":
        selected = ranked[:8]
    else:
        selected = ranked[:3]

    selected = mmr_select(selected, embed_model, query, k=len(selected))

    if not selected:
        return ANSWER_FALLBACK, []

    # Deduplicate while preserving order and cap number of items
    def deduplicate(sent_list: List[str]) -> List[str]:
        seen = set()
        out = []
        for s in sent_list:
            key = s.lower()
            if key not in seen:
                seen.add(key)
                out.append(s)
        return out

    selected = deduplicate(selected)
    if len(selected) > 8:
        selected = selected[:8]

    # Build answer based on question type
    if q_type == "list":
        answer = "\n".join([f"- {s}" for s in selected])
    elif q_type == "definition":
        answer = " ".join(selected)  # Join all sentences for complete definition
    else:
        answer = " ".join(selected[:3])

    answer = re.sub(r"\s+", " ", answer).strip()
    answer = format_answer(answer, selected, query)
    return answer, selected


def refine_answer(question: str, context: str, draft: str, llm) -> str:
    if llm is None:
        return draft

    prompt = f"""
Rewrite clearly and concisely.

Use ONLY the context.
Remove repetition.
Max 3 sentences.

Context:
{context}

Question:
{question}

Draft:
{draft}

Final Answer:
"""
    try:
        response = llm.complete(prompt)
        refined = getattr(response, "text", str(response)).strip()
        refined = clean_text(refined)
        return refined or draft
    except Exception:
        return draft


def extract_source_metadata(metadata: object) -> str:
    if isinstance(metadata, dict):
        return metadata.get("filename") or metadata.get("file_path") or ""
    return str(metadata) if metadata else ""


def get_sources(results) -> List[str]:
    sources = list({
        node.node.metadata.get("filename", "")
        for node in results
        if getattr(node, "node", None) and getattr(node.node, "metadata", None)
    })
    return [source for source in sources if source]


def _token_set(text: str) -> set[str]:
    return {token for token in re.findall(r"\w+", text.lower()) if len(token) > 2}


def compare_with_llm(question: str, context: str, grounded_answer: str) -> dict:
    """Optionally compare the grounded answer with an LLM answer generated from the same context."""
    result = {
        "enabled": False,
        "status": "disabled",
        "model": None,
        "llm_answer": None,
        "overlap_score": None,
    }

    if os.getenv("RAG_COMPARE_WITH_LLM", "1").strip().lower() not in {"1", "true", "yes", "on"}:
        return result

    if Ollama is None:
        result["status"] = "ollama_unavailable"
        return result

    try:
        llm_model = os.getenv("RAG_OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)
        llm = Ollama(model=llm_model)
        prompt = f"""
Use only the provided context. Do not add outside knowledge.
Return a concise answer in plain text.

Context:
{context}

Question:
{question}

Answer:
"""
        response = llm.complete(prompt)
        llm_answer = getattr(response, "text", str(response)).strip()

        grounded_tokens = _token_set(grounded_answer)
        llm_tokens = _token_set(llm_answer)
        overlap_score = 0.0
        if llm_tokens:
            overlap_score = round(len(grounded_tokens & llm_tokens) / len(llm_tokens), 3)

        result.update(
            {
                "enabled": True,
                "status": "ok",
                "model": llm_model,
                "llm_answer": llm_answer,
                "overlap_score": overlap_score,
            }
        )
        return result
    except Exception as exc:
        logger.warning(f"LLM comparison failed: {exc}")
        result["status"] = "error"
        return result


def get_confidence(results) -> float:
    scores = [float(node.score) for node in results if getattr(node, "score", None) is not None]
    if not scores:
        return 0.0
    return sum(scores) / len(scores)


def is_weak_answer(answer: str, confidence: float) -> bool:
    if answer == ANSWER_FALLBACK:
        return True
    if confidence < 0.45:
        return True
    if len(answer.split()) < 8:
        return True
    return False


def _init_runtime(
    collection: str = DEFAULT_COLLECTION,
    qdrant_path: str = DEFAULT_QDRANT_PATH,
    embed_model_name: str = DEFAULT_EMBED_MODEL,
) -> None:
    """Initialize retriever once for API usage."""
    if _RAG_RUNTIME["initialized"]:
        return

    logger.info("[get_answer] Initializing runtime retriever")
    Settings.embed_model = HuggingFaceEmbedding(model_name=embed_model_name)

    qdrant_resolved = str(Path(qdrant_path).resolve())
    client = QdrantClient(path=qdrant_resolved)

    collections = client.get_collections().collections
    collection_names = [col.name for col in collections]
    if collection not in collection_names:
        raise RuntimeError(
            f"Collection '{collection}' not found. Available: {collection_names}"
        )

    vector_store = QdrantVectorStore(client=client, collection_name=collection)
    index = VectorStoreIndex.from_vector_store(vector_store=vector_store)
    retriever = index.as_retriever(similarity_top_k=5)  # Reduced from 12 to 5 for speed

    _RAG_RUNTIME["initialized"] = True
    _RAG_RUNTIME["retriever"] = retriever
    _RAG_RUNTIME["embed_model"] = Settings.embed_model
    _RAG_RUNTIME["index"] = index
    _RAG_RUNTIME["client"] = client


def _build_answer_bundle(query: str) -> dict:
    """Build a grounded answer bundle from retrieved document chunks."""
    if not query or not query.strip():
        return {
            "answer": "Question is required.",
            "sources": [],
            "confidence": 0.0,
            "llm_comparison": {"enabled": False, "status": "disabled"},
            "context": "",
        }

    _init_runtime()

    retriever = _RAG_RUNTIME["retriever"]
    embed_model = _RAG_RUNTIME["embed_model"]
    index = _RAG_RUNTIME["index"]

    # Detect insurance category for better context
    category = detect_insurance_category(query)
    
    expanded_query = expand_query(query.strip())
    results = retriever.retrieve(expanded_query)
    
    # If no results in primary category, try broader search
    if not results and category:
        logger.info(f"No results for {category} category, trying broader search")
        results = retriever.retrieve(query.strip())
    
    if not results:
        # Provide category-specific helpful message if known
        if category == "health":
            return {
                "answer": "I don't have specific information about this health insurance query. Please try asking about coverage, claims, or hospitalization benefits.",
                "sources": [],
                "confidence": 0.0,
                "llm_comparison": {"enabled": False, "status": "disabled"},
                "context": "",
            }
        elif category == "motor":
            return {
                "answer": "I don't have specific information about this motor insurance query. Please try asking about vehicle coverage, accident claims, or policy details.",
                "sources": [],
                "confidence": 0.0,
                "llm_comparison": {"enabled": False, "status": "disabled"},
                "context": "",
            }
        elif category == "life":
            return {
                "answer": "I don't have specific information about this life insurance query. Please try asking about term plans, maturity benefits, or nominees.",
                "sources": [],
                "confidence": 0.0,
                "llm_comparison": {"enabled": False, "status": "disabled"},
                "context": "",
            }
        return {
            "answer": ANSWER_FALLBACK,
            "sources": [],
            "confidence": 0.0,
            "llm_comparison": {"enabled": False, "status": "disabled"},
            "context": "",
        }

    contexts = [clean_text(node.get_content()) for node in results if clean_text(node.get_content())]
    combined_context = " ".join(contexts)
    answer, selected_sentences = build_multi_chunk_answer(expanded_query, combined_context, embed_model)

    # For list queries, retry with deeper retrieval if coverage looks thin
    q_type_local = detect_question_type(query)
    if q_type_local == "list" and len(selected_sentences) < 5:
        retry_retriever = index.as_retriever(similarity_top_k=10)
        retry_results = retry_retriever.retrieve(expanded_query)
        retry_ctxs = [clean_text(node.get_content()) for node in retry_results if clean_text(node.get_content())]
        retry_combined = " ".join(retry_ctxs)
        retry_answer, retry_selected = build_multi_chunk_answer(expanded_query, retry_combined, embed_model)
        if retry_selected and len(retry_selected) > len(selected_sentences):
            answer = retry_answer

    return {
        "answer": answer,
        "sources": get_sources(results),
        "confidence": get_confidence(results),
        "llm_comparison": compare_with_llm(query.strip(), combined_context, answer),
        "context": combined_context,
    }


def get_answer(query: str) -> str:
    """Return a concise grounded answer for FastAPI /api/chat."""
    return _build_answer_bundle(query)["answer"]


def get_answer_details(query: str) -> dict:
    """Return the grounded answer plus retrieval and LLM comparison metadata."""
    return _build_answer_bundle(query)


def main():
    """Initialize RAG system and start interactive Q&A loop."""

    parser = argparse.ArgumentParser(description="Local RAG answer script using Qdrant + LlamaIndex")
    parser.add_argument("--collection", default=DEFAULT_COLLECTION)
    parser.add_argument("--qdrant-path", default=DEFAULT_QDRANT_PATH)
    parser.add_argument("--embed-model", default=DEFAULT_EMBED_MODEL)
    parser.add_argument("--ollama-model", default=DEFAULT_OLLAMA_MODEL)
    parser.add_argument("--use-ollama", action="store_true", help="Use local Ollama refinement if available")
    parser.add_argument("--show-retrieval", action="store_true")
    parser.add_argument("--query", help="Run a single query and exit (non-interactive)")
    args = parser.parse_args()
    
    logger.info("=" * 60)
    logger.info("Initializing Simplified RAG System (Local Qdrant)")
    logger.info("=" * 60)
    
    try:
        # Initialize embedding model
        logger.info(f"Loading embedding model: {args.embed_model}")
        Settings.embed_model = HuggingFaceEmbedding(model_name=args.embed_model)
        
        # Load local Qdrant client
        qdrant_path = str(Path(args.qdrant_path).resolve())
        logger.info(f"Connecting to local Qdrant: {qdrant_path}")
        try:
            client = QdrantClient(path=qdrant_path)
        except RuntimeError as exc:
            logger.error(f"Could not open local Qdrant storage: {exc}")
            logger.error("Close any other running Qdrant client or rerun after it exits.")
            return
        
        # Check if collection exists
        collections = client.get_collections().collections
        collection_names = [col.name for col in collections]
        logger.info(f"Available collections: {collection_names}")
        
        if args.collection not in collection_names:
            logger.error(f"Collection '{args.collection}' not found!")
            logger.error("Please run ingestion_pipeline.py first to create the index.")
            return
        
        # Load the vector store and index
        logger.info(f"Loading index from collection: {args.collection}")
        vector_store = QdrantVectorStore(client=client, collection_name=args.collection)
        index = VectorStoreIndex.from_vector_store(vector_store=vector_store)
        logger.info("✅ Index loaded successfully!")
        
        # Get collection stats
        collection_info = client.get_collection(args.collection)
        logger.info(f"Collection stats: {collection_info.points_count} documents indexed")
        
        # Create retriever that returns multiple relevant chunks (use deeper retrieval)
        retriever = index.as_retriever(similarity_top_k=8)
        llm = None
        if args.use_ollama:
            if Ollama is None:
                logger.warning("Ollama package is not available; running without refinement.")
            else:
                llm = Ollama(model=args.ollama_model)
        
        logger.info("=" * 60)
        logger.info("RAG System Ready! Enter your questions (type 'quit' to exit)")
        logger.info("=" * 60)
        
        # Run single query non-interactively if provided, otherwise enter interactive loop
        if args.query:
            queries = [args.query]
        else:
            queries = None

        def handle_query(query_text: str):
            logger.info(f"Searching for: {query_text}")
            expanded_query = expand_query(query_text)
            results = retriever.retrieve(expanded_query)
            if not results:
                print("\n❌ No relevant documents found.")
                return
            contexts = [clean_text(node.get_content()) for node in results if clean_text(node.get_content())]
            combined_context = " ".join(contexts)
            answer, selected_sentences = build_multi_chunk_answer(expanded_query, combined_context, Settings.embed_model)

            # If list question and too few items, retry with deeper retrieval (k=10)
            q_type_local = detect_question_type(query_text)
            if q_type_local == "list" and len(selected_sentences) < 5:
                retry_r = index.as_retriever(similarity_top_k=10)
                retry_res = retry_r.retrieve(expanded_query)
                retry_ctxs = [clean_text(node.get_content()) for node in retry_res if clean_text(node.get_content())]
                retry_combined = " ".join(retry_ctxs)
                retry_answer, retry_selected = build_multi_chunk_answer(expanded_query, retry_combined, Settings.embed_model)
                if retry_selected and len(retry_selected) > len(selected_sentences):
                    answer = retry_answer
                    selected_sentences = retry_selected
                    results = retry_res
                    combined_context = retry_combined

            if args.use_ollama and llm is not None and answer != ANSWER_FALLBACK:
                answer = refine_answer(query_text, combined_context, answer, llm)

            confidence = get_confidence(results)
            sources = get_sources(results)

            print("\nANSWER:\n")
            print(answer)

            print(f"\nConfidence: {confidence:.2f}")

            if sources:
                print("\nSources:")
                for source in sources:
                    print(f"- {source}")

            if is_list_question(query_text) and selected_sentences:
                print("\nStructured Answer:")
                print(format_answer(answer, selected_sentences, query_text))

        if queries is not None:
            for q in queries:
                handle_query(q)
            return

        # Interactive query loop
        while True:
            try:
                query = input("\n❓ Your question: ").strip()
                if query.lower() in ["quit", "exit", "q"]:
                    logger.info("Exiting RAG system. Goodbye!")
                    break
                if not query:
                    logger.warning("Please enter a question.")
                    continue
                handle_query(query)

                if is_weak_answer(answer, confidence):
                    retry_retriever = index.as_retriever(similarity_top_k=12)
                    retry_results = retry_retriever.retrieve(expanded_query)
                    retry_contexts = [clean_text(node.get_content()) for node in retry_results if clean_text(node.get_content())]
                    retry_combined_context = " ".join(retry_contexts)
                    retry_answer, retry_selected = build_multi_chunk_answer(expanded_query, retry_combined_context, Settings.embed_model)
                    if retry_answer != ANSWER_FALLBACK:
                        answer = retry_answer
                        selected_sentences = retry_selected
                        confidence = get_confidence(retry_results)
                        sources = get_sources(retry_results)
                        if args.use_ollama and llm is not None:
                            answer = refine_answer(query, retry_combined_context, answer, llm)

                print("\nANSWER:\n")
                print(answer)

                print(f"\nConfidence: {confidence:.2f}")

                if sources:
                    print("\nSources:")
                    for source in sources:
                        print(f"- {source}")

                if is_list_question(query) and selected_sentences:
                    print("\nStructured Answer:")
                    print(format_answer(answer, selected_sentences, query))
                
            except KeyboardInterrupt:
                logger.info("\nInterrupted by user.")
                break
            except Exception as e:
                logger.error(f"Error during retrieval: {e}")
                continue
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        logger.info("Closing Qdrant client...")
        if 'client' in locals():
            client.close()


if __name__ == "__main__":
    main()
