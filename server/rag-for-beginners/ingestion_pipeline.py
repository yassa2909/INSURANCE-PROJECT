import argparse
import hashlib
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set

from llama_index.core import Settings, SimpleDirectoryReader, StorageContext, VectorStoreIndex, Document
from llama_index.core.node_parser import HierarchicalNodeParser
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import ResponseHandlingException
import pypdf

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DEFAULT_COLLECTION = "company_docs"
DEFAULT_EMBED_MODEL = "BAAI/bge-base-en-v1.5"
DEFAULT_QDRANT_PATH = "./qdrant_data"


def build_qdrant_client(qdrant_path: str = DEFAULT_QDRANT_PATH) -> QdrantClient:
    return QdrantClient(path=qdrant_path)

# Deduplication cache
DOCUMENT_HASHES: Set[str] = set()


def compute_document_hash(content: str) -> str:
    """Compute SHA256 hash of document content for deduplication."""
    return hashlib.sha256(content.encode()).hexdigest()


def deduplicate_documents(documents: List) -> List:
    """Remove duplicate documents based on content hash.
    
    Prevents indexing the same document multiple times.
    """
    global DOCUMENT_HASHES
    deduplicated = []
    
    for doc in documents:
        content = doc.get_content() if hasattr(doc, 'get_content') else str(doc)
        doc_hash = compute_document_hash(content)
        
        if doc_hash not in DOCUMENT_HASHES:
            DOCUMENT_HASHES.add(doc_hash)
            deduplicated.append(doc)
            logger.info(f"Including document: {doc.metadata.get('filename', 'Unknown')}")
        else:
            logger.warning(f"Skipping duplicate document: {doc.metadata.get('filename', 'Unknown')}")
    
    return deduplicated


def preprocess_document_metadata(file_path: str) -> dict:
    """Extract rich metadata from documents for filtering.
    
    Metadata helps filter documents by:
    - document type (pdf, txt)
    - creation date
    - file source path
    """
    p = Path(file_path)
    stat = p.stat()
    
    metadata = {
        "filename": p.name,
        "file_path": str(p.resolve()),
        "file_type": p.suffix,
        "created_date": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        "modified_date": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "file_size_kb": stat.st_size / 1024,
    }
    
    logger.info(f"Extracted metadata for {p.name}: {metadata}")
    return metadata


def init_qdrant(collection_name: str, mode: str, qdrant_path: str) -> QdrantVectorStore:
    """Initialize Qdrant vector store with error handling."""
    client = build_qdrant_client(qdrant_path)
    client.get_collections()
    logger.info(f"Connected to local Qdrant at {qdrant_path}")

    if mode == "create":
        try:
            if client.collection_exists(collection_name):
                client.delete_collection(collection_name=collection_name)
                logger.info(f"Deleted existing collection: {collection_name}")
        except Exception as e:
            logger.warning(f"Could not delete collection: {e}")

    return QdrantVectorStore(client=client, collection_name=collection_name)


def load_documents(docs_path: str) -> List[Document]:
    """Load documents with proper PDF text extraction.
    
    Uses pypdf for reliable PDF text extraction instead of raw SimpleDirectoryReader.
    Handles:
    - PDFs: Extracted with pypdf for readable text
    - TXT files: Loaded directly with metadata
    - Missing directories
    - Empty document sets
    """
    if not os.path.isdir(docs_path):
        logger.error(f"Documents directory not found: {docs_path}")
        raise FileNotFoundError(f"Documents directory not found: {docs_path}")
    
    logger.info(f"Loading documents from: {docs_path}")
    documents = []
    
    # Walk through directory recursively
    for root, dirs, files in os.walk(docs_path):
        for file in files:
            file_path = os.path.join(root, file)
            
            try:
                if file.lower().endswith('.pdf'):
                    # Extract text from PDF using pypdf
                    logger.info(f"Extracting text from PDF: {file}")
                    with open(file_path, 'rb') as pdf_file:
                        pdf_reader = pypdf.PdfReader(pdf_file)
                        text_content = ""
                        for page_num, page in enumerate(pdf_reader.pages):
                            text_content += f"\n--- Page {page_num + 1} ---\n"
                            text_content += page.extract_text()
                    
                    if text_content.strip():
                        metadata = preprocess_document_metadata(file_path)
                        doc = Document(
                            text=text_content,
                            metadata=metadata,
                            doc_id=metadata['filename']
                        )
                        documents.append(doc)
                        logger.info(f"Successfully extracted {len(text_content)} characters from {file}")
                    else:
                        logger.warning(f"PDF contains no extractable text: {file}")
                
                elif file.lower().endswith('.txt'):
                    # Load text files directly
                    logger.info(f"Loading text file: {file}")
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as txt_file:
                        text_content = txt_file.read()
                    
                    if text_content.strip():
                        metadata = preprocess_document_metadata(file_path)
                        doc = Document(
                            text=text_content,
                            metadata=metadata,
                            doc_id=metadata['filename']
                        )
                        documents.append(doc)
                        logger.info(f"Successfully loaded {len(text_content)} characters from {file}")
            
            except Exception as e:
                logger.error(f"Error loading file {file}: {e}")
                continue
    
    logger.info(f"Loaded {len(documents)} documents from {docs_path}")
    
    if not documents:
        raise ValueError(f"No supported documents (.pdf, .txt) found in directory: {docs_path}")
    
    # Deduplicate documents
    documents = deduplicate_documents(documents)
    logger.info(f"After deduplication: {len(documents)} unique documents")
    
    return documents


def get_node_parser(chunk_size: int = 512, chunk_overlap: int = 50) -> HierarchicalNodeParser:
    """Create hierarchical node parser for semantic chunking.
    
    Creates parent chunks (2048 tokens) and child chunks (512 tokens).
    This reduces token waste by retrieving parent context when needed.
    """
    logger.info(f"Configuring parser: chunk_size={chunk_size}, chunk_overlap={chunk_overlap}")
    
    return HierarchicalNodeParser.from_defaults(
        chunk_sizes=[2048, chunk_size],
        chunk_overlap=chunk_overlap,
    )


def create_index(documents: List, vector_store: QdrantVectorStore) -> VectorStoreIndex:
    """Create vector index with error handling."""
    logger.info(f"Creating index for {len(documents)} documents...")
    
    try:
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        index = VectorStoreIndex.from_documents(
            documents,
            storage_context=storage_context,
            show_progress=True,
        )
        logger.info("Index created successfully")
        return index
    except Exception as e:
        logger.error(f"Error creating index: {e}")
        raise


def main():
    parser = argparse.ArgumentParser(
        description="Production-ready ingestion pipeline with deduplication and metadata extraction."
    )
    parser.add_argument("--docs-path", default="docs", help="Path to documents directory")
    parser.add_argument("--qdrant-path", default=DEFAULT_QDRANT_PATH, help="Local Qdrant storage path")
    parser.add_argument("--collection", default=DEFAULT_COLLECTION, help="Qdrant collection name")
    parser.add_argument(
        "--mode",
        choices=["create", "update"],
        default="update",
        help="Create new collection or update existing"
    )
    parser.add_argument("--embed-model", default=DEFAULT_EMBED_MODEL, help="Embedding model")
    parser.add_argument("--chunk-size", type=int, default=512, help="Chunk size in tokens")
    parser.add_argument("--chunk-overlap", type=int, default=50, help="Chunk overlap in tokens")
    parser.add_argument("--log-level", default="INFO", help="Logging level")
    
    args = parser.parse_args()
    
    # Set logging level
    logger.setLevel(getattr(logging, args.log_level))
    
    logger.info("=" * 60)
    logger.info("Starting ingestion pipeline")
    logger.info("=" * 60)
    
    try:
        Settings.embed_model = HuggingFaceEmbedding(model_name=args.embed_model)
        Settings.node_parser = get_node_parser(args.chunk_size, args.chunk_overlap)
        
        vector_store = init_qdrant(
            collection_name=args.collection,
            mode=args.mode,
            qdrant_path=args.qdrant_path
        )
        documents = load_documents(args.docs_path)
        create_index(documents, vector_store)
        
        logger.info("=" * 60)
        logger.info("Ingestion complete!")
        logger.info(f"Collection: {args.collection}")
        logger.info(f"Mode: {args.mode}")
        logger.info(f"Documents path: {args.docs_path}")
        logger.info(f"Documents indexed: {len(documents)}")
        logger.info(f"Chunk size: {args.chunk_size}")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Ingestion failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()
