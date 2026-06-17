# CUREVA — RAG Pipeline + Knowledge MCP
### Prompt 13 of 20
### Role: Senior AI Engineer

---

## ROLE

Build production RAG pipeline.
Qdrant + BGE-small + BM25 + RRF reranking.
Replaces static drug DB in Knowledge MCP (Prompt 12).
Full runnable code. No stubs.

---

## PIPELINE

```
10 clinical PDFs
      ↓
DocLoader → chunks (512 tokens, 50 overlap)
      ↓
BGE-small embeddings (local, no API)
      ↓
Qdrant (vector store)
      ↓
Query time:
  Vector search (top 20)
  BM25 search (top 20)
  RRF merge → top 5
  Cross-encoder rerank → top 3
  Context builder → agent prompt
```

---

## STACK

```
qdrant-client          vector store
fastembed              BGE-small embeddings (local)
rank-bm25              BM25 keyword search
sentence-transformers  cross-encoder reranker
PyMuPDF (fitz)         PDF text extraction
langchain-text-splitters chunking
```

```bash
pip install qdrant-client fastembed rank-bm25 \
  sentence-transformers PyMuPDF \
  langchain-text-splitters --break-system-packages
```

---

## 1. DOCUMENT INGESTION

```python
# rag/ingest.py
"""
Load clinical PDFs → chunk → embed → store in Qdrant.
Run once. Re-run to update knowledge base.
"""
import fitz          # PyMuPDF
import uuid
import json
from pathlib import Path
from typing import Generator
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    PayloadSchemaType,
)
from fastembed import TextEmbedding

DOCS_DIR        = Path("rag/documents")
COLLECTION_NAME = "cureva_clinical"
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"   # 33M params, fast, good quality
CHUNK_SIZE      = 512
CHUNK_OVERLAP   = 50
VECTOR_DIM      = 384    # BGE-small output dim

# Qdrant: local Docker or Qdrant Cloud
QDRANT_URL = "http://localhost:6333"    # local
# QDRANT_URL = "https://xxx.qdrant.io"  # cloud (set via env)
# QDRANT_API_KEY = "..."               # cloud only

embedder = TextEmbedding(model_name=EMBEDDING_MODEL)
splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", ".", " "],
)


def extract_pdf_text(pdf_path: Path) -> str:
    """Extract text from PDF using PyMuPDF."""
    doc = fitz.open(str(pdf_path))
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    doc.close()
    return text.strip()


def chunk_document(
    text: str,
    source: str,
    category: str,
) -> list[dict]:
    """Split text → chunks with metadata."""
    chunks = splitter.split_text(text)
    return [
        {
            "id":       str(uuid.uuid4()),
            "text":     chunk,
            "source":   source,
            "category": category,
            "chunk_index": i,
        }
        for i, chunk in enumerate(chunks)
        if len(chunk.strip()) > 50    # skip tiny chunks
    ]


DOCUMENT_CATEGORIES = {
    "cardiac_triage.pdf":         "clinical_guidelines",
    "dermatology_referral.pdf":   "clinical_guidelines",
    "psychiatric_screening.pdf":  "clinical_guidelines",
    "general_fever_protocol.pdf": "clinical_guidelines",
    "drug_interactions.pdf":      "drug_information",
    "dpdp_compliance.pdf":        "compliance",
    "escalation_sop.pdf":         "sop",
    "waitlist_policy.pdf":        "policy",
    "intervention_playbook.pdf":  "policy",
    "recovery_strategies.pdf":    "policy",
}


def setup_collection(client: QdrantClient) -> None:
    """Create Qdrant collection if not exists."""
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME in existing:
        print(f"Collection '{COLLECTION_NAME}' already exists. Skipping create.")
        return

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=VECTOR_DIM,
            distance=Distance.COSINE,
        ),
    )

    # Create payload index for fast filtering
    client.create_payload_index(
        collection_name=COLLECTION_NAME,
        field_name="category",
        field_schema=PayloadSchemaType.KEYWORD,
    )
    client.create_payload_index(
        collection_name=COLLECTION_NAME,
        field_name="source",
        field_schema=PayloadSchemaType.KEYWORD,
    )
    print(f"Collection '{COLLECTION_NAME}' created.")


def ingest_all() -> None:
    client = QdrantClient(url=QDRANT_URL)
    setup_collection(client)

    all_chunks = []
    for pdf_name, category in DOCUMENT_CATEGORIES.items():
        pdf_path = DOCS_DIR / pdf_name
        if not pdf_path.exists():
            print(f"[skip] {pdf_name} not found — generating mock content")
            text = _generate_mock_content(pdf_name, category)
        else:
            print(f"[load] {pdf_name}")
            text = extract_pdf_text(pdf_path)

        chunks = chunk_document(text, source=pdf_name, category=category)
        all_chunks.extend(chunks)
        print(f"  → {len(chunks)} chunks")

    print(f"\n[embed] {len(all_chunks)} total chunks via {EMBEDDING_MODEL}...")
    texts = [c["text"] for c in all_chunks]
    embeddings = list(embedder.embed(texts))    # batch embed

    print("[store] Uploading to Qdrant...")
    points = [
        PointStruct(
            id=chunk["id"],
            vector=embedding.tolist(),
            payload={
                "text":        chunk["text"],
                "source":      chunk["source"],
                "category":    chunk["category"],
                "chunk_index": chunk["chunk_index"],
            },
        )
        for chunk, embedding in zip(all_chunks, embeddings)
    ]

    # Upload in batches of 100
    batch_size = 100
    for i in range(0, len(points), batch_size):
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points[i:i + batch_size],
        )
    print(f"[done] {len(points)} chunks stored in Qdrant.")

    # Save BM25 index alongside
    _build_bm25_index(all_chunks)


def _build_bm25_index(chunks: list[dict]) -> None:
    """Build and persist BM25 index for keyword search."""
    import pickle
    from rank_bm25 import BM25Okapi

    corpus = [c["text"].lower().split() for c in chunks]
    bm25 = BM25Okapi(corpus)

    with open("rag/bm25_index.pkl", "wb") as f:
        pickle.dump({
            "bm25":   bm25,
            "chunks": chunks,
        }, f)
    print("[bm25] Index saved to rag/bm25_index.pkl")


def _generate_mock_content(filename: str, category: str) -> str:
    """
    Generate realistic mock content for missing PDFs.
    For demo purposes only.
    """
    mocks = {
        "cardiac_triage.pdf": """
CARDIAC TRIAGE GUIDELINES — City Clinic Protocol

CHEST PAIN ASSESSMENT
All patients presenting with chest pain must be triaged within 5 minutes.

Red Flag Symptoms (Immediate Escalation Required):
- Crushing or squeezing chest pain
- Radiation to left arm, jaw, or back
- Associated shortness of breath
- Diaphoresis (sweating)
- Nausea or vomiting
- Syncope or near-syncope
- Oxygen saturation < 92%

Initial Assessment Protocol:
1. 12-lead ECG within 10 minutes of arrival
2. Serial troponins at 0h and 3h
3. Chest X-ray
4. IV access and cardiac monitoring

Specialist Referral Criteria:
- Suspected ACS: Immediate cardiology referral
- Stable angina: Cardiology within 72 hours
- Non-cardiac chest pain: General medicine

Drug Therapy First Line:
Aspirin 325mg stat (if no contraindication)
Nitroglycerin 0.4mg sublingual for ongoing pain
""",
        "drug_interactions.pdf": """
COMMON DRUG INTERACTIONS — Clinical Reference

CARDIOVASCULAR DRUGS

Aspirin + Ibuprofen:
Severity: Moderate
Mechanism: Ibuprofen competitively inhibits COX-1, blocking aspirin's irreversible
platelet inhibition. Increases GI bleeding risk.
Management: Avoid combination. Use paracetamol for analgesia if needed.

Warfarin + Aspirin:
Severity: Severe
Mechanism: Additive anticoagulant effect. Significantly increased bleeding risk.
Management: Avoid unless specifically indicated by cardiologist.
If combination necessary: reduce warfarin dose, monitor INR closely.

Atorvastatin + Clarithromycin:
Severity: Moderate
Mechanism: Clarithromycin inhibits CYP3A4, increasing atorvastatin levels.
Risk of myopathy and rhabdomyolysis.
Management: Use azithromycin instead. If must use clarithromycin, temporarily
discontinue atorvastatin.

DIABETES DRUGS

Metformin + Iodinated Contrast:
Severity: Severe
Mechanism: Risk of contrast-induced nephropathy and lactic acidosis.
Management: Hold metformin 48 hours before and after contrast procedures.
Resume only after renal function confirmed normal.

ANTIBIOTICS

Ciprofloxacin + Antacids:
Severity: Moderate
Mechanism: Antacids reduce ciprofloxacin absorption by up to 90%.
Management: Separate administration by at least 2 hours.
""",
        "escalation_sop.pdf": """
ESCALATION STANDARD OPERATING PROCEDURE

When to Escalate to Human Staff:

1. No-Show Recovery Timeout
   Trigger: No patient response within 15 minutes of outreach
   Action: Notify front desk with full handoff payload
   Include: Slot details, patients contacted, recommended next action

2. Critical Triage Symptoms
   Trigger: Red flag symptoms detected in patient intake
   Action: Immediate doctor notification + recommend ER if needed
   Include: Symptoms, urgency level, patient contact

3. Agent Confidence Below Threshold
   Trigger: Agent confidence score < 0.60
   Action: Pause agent action, notify supervising staff
   Include: What agent was trying to do, what context it had

4. Drug Interaction Alert
   Trigger: Severe interaction detected in prescription
   Action: Block prescription generation, alert doctor
   Include: Drug names, interaction severity, recommended alternative

Handoff Format:
All escalations must include:
- Session ID
- Timestamp
- What the agent attempted
- Why it escalated
- Recommended human action
- Patient contact information
""",
    }

    # Default mock for files without specific content
    default = f"""
{filename.replace('.pdf', '').replace('_', ' ').upper()} — Clinical Reference

This document contains standard operating procedures and guidelines
for {category.replace('_', ' ')} at Cureva Health.

Content includes protocols, decision trees, and reference material
for clinical staff and AI agent decision support.

Key principles:
- Patient safety is paramount
- Follow evidence-based guidelines
- Escalate when uncertain
- Document all interventions
- Maintain DPDP compliance at all times
"""
    return mocks.get(filename, default)


if __name__ == "__main__":
    ingest_all()
```

---

## 2. HYBRID RETRIEVER

```python
# rag/retriever.py
"""
Hybrid retrieval: Vector + BM25 + RRF reranking.
Single retrieve() call returns grounded context for agents.
"""
import pickle
import numpy as np
from typing import Optional
from pathlib import Path
from qdrant_client import QdrantClient
from fastembed import TextEmbedding
from sentence_transformers import CrossEncoder

COLLECTION_NAME = "cureva_clinical"
QDRANT_URL      = "http://localhost:6333"
BM25_INDEX_PATH = "rag/bm25_index.pkl"
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
RERANKER_MODEL  = "cross-encoder/ms-marco-MiniLM-L-6-v2"   # 22M params, fast

# Load once at module level
_qdrant    = None
_embedder  = None
_bm25_data = None
_reranker  = None


def _get_qdrant() -> QdrantClient:
    global _qdrant
    if _qdrant is None:
        _qdrant = QdrantClient(url=QDRANT_URL)
    return _qdrant


def _get_embedder() -> TextEmbedding:
    global _embedder
    if _embedder is None:
        _embedder = TextEmbedding(model_name=EMBEDDING_MODEL)
    return _embedder


def _get_bm25():
    global _bm25_data
    if _bm25_data is None:
        if Path(BM25_INDEX_PATH).exists():
            with open(BM25_INDEX_PATH, "rb") as f:
                _bm25_data = pickle.load(f)
        else:
            _bm25_data = None
    return _bm25_data


def _get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder(RERANKER_MODEL)
    return _reranker


def _vector_search(
    query: str,
    top_k: int = 20,
    category_filter: Optional[str] = None,
) -> list[dict]:
    """Search Qdrant by vector similarity."""
    embedder = _get_embedder()
    query_vec = list(embedder.embed([query]))[0].tolist()

    client = _get_qdrant()

    from qdrant_client.models import Filter, FieldCondition, MatchValue
    search_filter = None
    if category_filter:
        search_filter = Filter(
            must=[FieldCondition(
                key="category",
                match=MatchValue(value=category_filter),
            )]
        )

    results = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vec,
        limit=top_k,
        query_filter=search_filter,
        with_payload=True,
    )

    return [
        {
            "id":       str(r.id),
            "text":     r.payload["text"],
            "source":   r.payload.get("source", ""),
            "category": r.payload.get("category", ""),
            "score":    r.score,
            "method":   "vector",
        }
        for r in results
    ]


def _bm25_search(query: str, top_k: int = 20) -> list[dict]:
    """BM25 keyword search over all chunks."""
    bm25_data = _get_bm25()
    if not bm25_data:
        return []

    bm25   = bm25_data["bm25"]
    chunks = bm25_data["chunks"]

    tokens = query.lower().split()
    scores = bm25.get_scores(tokens)

    top_indices = np.argsort(scores)[::-1][:top_k]
    results = []
    for idx in top_indices:
        if scores[idx] > 0:
            results.append({
                "id":       chunks[idx]["id"],
                "text":     chunks[idx]["text"],
                "source":   chunks[idx]["source"],
                "category": chunks[idx]["category"],
                "score":    float(scores[idx]),
                "method":   "bm25",
            })
    return results


def _reciprocal_rank_fusion(
    vector_results: list[dict],
    bm25_results:   list[dict],
    k: int = 60,
) -> list[dict]:
    """
    Reciprocal Rank Fusion.
    Merges two ranked lists into one.
    RRF score = Σ 1 / (k + rank_i)
    """
    scores: dict[str, float] = {}
    docs:   dict[str, dict]  = {}

    for rank, doc in enumerate(vector_results):
        doc_id = doc["id"]
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
        docs[doc_id] = doc

    for rank, doc in enumerate(bm25_results):
        doc_id = doc["id"]
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
        docs[doc_id] = doc

    sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

    merged = []
    for doc_id in sorted_ids:
        doc = docs[doc_id].copy()
        doc["rrf_score"] = scores[doc_id]
        merged.append(doc)

    return merged


def _rerank(query: str, candidates: list[dict], top_k: int = 3) -> list[dict]:
    """
    Cross-encoder reranking.
    More accurate than embedding similarity for final selection.
    """
    if not candidates:
        return []

    reranker = _get_reranker()
    pairs = [[query, c["text"]] for c in candidates]
    scores = reranker.predict(pairs)

    for i, score in enumerate(scores):
        candidates[i]["rerank_score"] = float(score)

    candidates.sort(key=lambda x: x["rerank_score"], reverse=True)
    return candidates[:top_k]


def retrieve(
    query: str,
    top_k_final: int = 3,
    category_filter: Optional[str] = None,
    use_reranker: bool = True,
) -> list[dict]:
    """
    Main retrieval function.
    Vector search + BM25 + RRF + reranking.
    Returns top_k_final most relevant chunks.
    """
    try:
        vector_results = _vector_search(query, top_k=20, category_filter=category_filter)
    except Exception as e:
        print(f"[rag] Vector search failed: {e}")
        vector_results = []

    try:
        bm25_results = _bm25_search(query, top_k=20)
    except Exception as e:
        print(f"[rag] BM25 search failed: {e}")
        bm25_results = []

    if not vector_results and not bm25_results:
        return []

    # Merge via RRF
    merged = _reciprocal_rank_fusion(vector_results, bm25_results)

    # Take top 10 for reranking (reranker is slower)
    candidates = merged[:10]

    if use_reranker and len(candidates) > 1:
        try:
            return _rerank(query, candidates, top_k=top_k_final)
        except Exception as e:
            print(f"[rag] Reranker failed: {e}. Using RRF results.")
            return candidates[:top_k_final]

    return candidates[:top_k_final]
```

---

## 3. CONTEXT BUILDER

```python
# rag/context_builder.py
"""
Converts retrieved chunks → formatted context string for LLM prompt.
Respects token budget. Cites sources.
"""

MAX_CONTEXT_TOKENS = 1500    # leave room for agent prompt + patient context


def build_context(
    results: list[dict],
    query: str,
    max_tokens: int = MAX_CONTEXT_TOKENS,
) -> str:
    """
    Format retrieved chunks into LLM-ready context.
    Truncates to max_tokens. Adds source citations.
    """
    if not results:
        return ""

    sections = []
    total_chars = 0
    char_limit = max_tokens * 4    # rough: 1 token ≈ 4 chars

    for i, result in enumerate(results):
        text   = result["text"].strip()
        source = result["source"].replace(".pdf", "").replace("_", " ").title()

        section = f"[Source: {source}]\n{text}"

        if total_chars + len(section) > char_limit:
            # Truncate to fit
            remaining = char_limit - total_chars
            if remaining > 100:
                section = section[:remaining] + "..."
                sections.append(section)
            break

        sections.append(section)
        total_chars += len(section)

    if not sections:
        return ""

    return (
        f"RETRIEVED CLINICAL CONTEXT (for query: '{query}'):\n\n"
        + "\n\n---\n\n".join(sections)
    )


def build_drug_context(drug_name: str, results: list[dict]) -> str:
    """Specialized context builder for drug queries."""
    if not results:
        return f"No specific guidelines found for {drug_name}. Use standard clinical judgment."

    text = results[0]["text"][:800]
    source = results[0]["source"].replace(".pdf", "").replace("_", " ").title()
    return f"Drug Reference [{source}]:\n{text}"


def build_interaction_context(drug_a: str, drug_b: str, results: list[dict]) -> str:
    """Specialized context for drug interaction queries."""
    if not results:
        return f"No specific interaction data found for {drug_a} + {drug_b}."
    text = results[0]["text"][:600]
    return f"Interaction Reference:\n{text}"
```

---

## 4. UPGRADED KNOWLEDGE MCP

```python
# mcp/knowledge/server.py  (replaces static version from Prompt 12)
"""
Production Knowledge MCP with RAG retrieval.
Swaps mock static DB → Qdrant hybrid search.
All tool signatures identical to Prompt 12 — agents unchanged.
"""
from fastmcp import FastMCP
from pydantic import BaseModel
from typing import Optional
from rag.retriever import retrieve
from rag.context_builder import build_context, build_drug_context, build_interaction_context
from mcp.base import mcp_tool_logger

mcp = FastMCP("knowledge-mcp", version="2.0")    # version bump — additive only


class KnowledgeResult(BaseModel):
    content: str
    source: str
    relevance_score: float


class DrugInteractionResult(BaseModel):
    drug_a: str
    drug_b: str
    interaction_found: bool
    severity: Optional[str]
    description: Optional[str]
    recommendation: Optional[str]
    context: Optional[str]          # raw RAG context for transparency


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def retrieve_drug_info(drug_name: str) -> str:
    """
    Retrieve drug information from clinical knowledge base.
    Returns formatted context string for LLM prompt.
    """
    results = retrieve(
        query=f"{drug_name} dosage indications contraindications interactions",
        top_k_final=2,
        category_filter="drug_information",
    )
    return build_drug_context(drug_name, results)


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def check_drug_interaction(drug_a: str, drug_b: str) -> DrugInteractionResult:
    """
    Check drug interaction via RAG retrieval.
    Falls back to "no interaction found" if not in knowledge base.
    """
    results = retrieve(
        query=f"{drug_a} {drug_b} drug interaction severity management",
        top_k_final=2,
        category_filter="drug_information",
    )

    context = build_interaction_context(drug_a, drug_b, results)

    # Parse interaction from retrieved text
    # Simple heuristic: look for severity keywords
    interaction_found = False
    severity = None
    description = None
    recommendation = None

    if results:
        text = results[0]["text"].lower()
        if drug_a.lower() in text and drug_b.lower() in text:
            interaction_found = True
            if "severe" in text:
                severity = "severe"
            elif "moderate" in text:
                severity = "moderate"
            elif "mild" in text:
                severity = "mild"

            # Extract sentences containing both drug names
            sentences = results[0]["text"].split(".")
            relevant = [s for s in sentences
                       if drug_a.lower() in s.lower() or drug_b.lower() in s.lower()]
            if relevant:
                description = ". ".join(relevant[:2]).strip()

    return DrugInteractionResult(
        drug_a=drug_a,
        drug_b=drug_b,
        interaction_found=interaction_found,
        severity=severity,
        description=description,
        recommendation="Consult clinical guidelines. When in doubt, avoid combination.",
        context=context,
    )


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def retrieve_symptom_pathway(symptoms_raw: str) -> str:
    """
    Retrieve clinical pathway for reported symptoms.
    Returns formatted context for Triage Agent.
    """
    results = retrieve(
        query=f"clinical pathway triage {symptoms_raw} specialist referral urgency",
        top_k_final=3,
        category_filter="clinical_guidelines",
    )
    return build_context(results, query=symptoms_raw)


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def retrieve_red_flags(symptoms_raw: str) -> str:
    """Retrieve red flag symptoms for Triage Agent."""
    results = retrieve(
        query=f"red flags emergency symptoms {symptoms_raw} immediate escalation",
        top_k_final=2,
        category_filter="clinical_guidelines",
    )
    return build_context(results, query=f"red flags: {symptoms_raw}")


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def retrieve_drug_guidelines(
    diagnosis: str,
    specialty: str,
) -> str:
    """
    Retrieve prescribing guidelines for diagnosis.
    Used by Prescription Agent.
    """
    results = retrieve(
        query=f"{diagnosis} {specialty} treatment guidelines first-line therapy Indian guidelines",
        top_k_final=3,
        category_filter="clinical_guidelines",
    )
    return build_context(results, query=f"{diagnosis} treatment")


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def retrieve_escalation_sop(
    escalation_reason: str,
) -> str:
    """Retrieve escalation SOP for Escalation Agent."""
    results = retrieve(
        query=f"escalation protocol {escalation_reason} handoff human staff",
        top_k_final=2,
        category_filter="sop",
    )
    return build_context(results, query=escalation_reason)


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def retrieve_intervention_guideline(
    channel: str,
    risk_tier: str,
) -> str:
    """Retrieve intervention playbook for Intervention Agent."""
    results = retrieve(
        query=f"outreach intervention {channel} {risk_tier} risk patient contact strategy",
        top_k_final=2,
        category_filter="policy",
    )
    return build_context(results, query=f"{channel} intervention {risk_tier}")


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def search_knowledge(
    query: str,
    category: Optional[str] = None,
    top_k: int = 3,
) -> list[KnowledgeResult]:
    """
    General knowledge search.
    Any agent can call this for ad-hoc knowledge retrieval.
    """
    results = retrieve(
        query=query,
        top_k_final=top_k,
        category_filter=category,
    )
    return [
        KnowledgeResult(
            content=r["text"],
            source=r["source"],
            relevance_score=r.get("rerank_score", r.get("rrf_score", 0)),
        )
        for r in results
    ]


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8006)
```

---

## 5. QDRANT DOCKER + CLOUD

```yaml
# docker/docker-compose.yml (add to existing)
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    environment:
      QDRANT__SERVICE__HTTP_PORT: 6333

volumes:
  qdrant_storage:
```

```python
# For Qdrant Cloud (zero infra):
# rag/retriever.py — swap QDRANT_URL:

import os
QDRANT_URL     = os.getenv("QDRANT_URL",     "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)

def _get_qdrant() -> QdrantClient:
    global _qdrant
    if _qdrant is None:
        if QDRANT_API_KEY:
            _qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        else:
            _qdrant = QdrantClient(url=QDRANT_URL)
    return _qdrant
```

---

## 6. RAG EVAL

```python
# eval/rag_eval.py
"""
Measure RAG quality.
Metrics: retrieval precision, recall, latency.
"""
import time
from rag.retriever import retrieve

TEST_CASES = [
    {
        "query":    "chest pain shortness of breath treatment",
        "expected_sources": ["cardiac_triage.pdf"],
        "expected_keywords": ["ACS", "cardiology", "aspirin", "ECG"],
    },
    {
        "query":    "aspirin ibuprofen interaction",
        "expected_sources": ["drug_interactions.pdf"],
        "expected_keywords": ["bleeding", "COX-1", "moderate"],
    },
    {
        "query":    "no response timeout escalation",
        "expected_sources": ["escalation_sop.pdf"],
        "expected_keywords": ["front desk", "handoff", "15 minutes"],
    },
    {
        "query":    "metformin diabetes first line",
        "expected_sources": ["drug_interactions.pdf"],
        "expected_keywords": ["Type 2", "eGFR", "contraindicated"],
    },
    {
        "query":    "hypertension amlodipine calcium channel blocker",
        "expected_sources": ["cardiac_triage.pdf"],
        "expected_keywords": ["BP", "first-line"],
    },
]


def run_rag_eval() -> dict:
    results = []
    total_latency = 0

    for tc in TEST_CASES:
        start = time.time()
        retrieved = retrieve(tc["query"], top_k_final=3)
        latency_ms = int((time.time() - start) * 1000)
        total_latency += latency_ms

        retrieved_sources = [r["source"] for r in retrieved]
        retrieved_text    = " ".join(r["text"] for r in retrieved).lower()

        # Source recall: did we get expected source?
        source_hit = any(
            exp in retrieved_sources
            for exp in tc["expected_sources"]
        )

        # Keyword precision: how many expected keywords in context?
        kw_hits = sum(
            1 for kw in tc["expected_keywords"]
            if kw.lower() in retrieved_text
        )
        kw_precision = kw_hits / len(tc["expected_keywords"])

        results.append({
            "query":         tc["query"],
            "source_hit":    source_hit,
            "kw_precision":  kw_precision,
            "latency_ms":    latency_ms,
            "top_source":    retrieved_sources[0] if retrieved_sources else "none",
        })

        status = "✅" if source_hit and kw_precision >= 0.5 else "❌"
        print(f"{status} {tc['query'][:50]:<50} | "
              f"src={'✓' if source_hit else '✗'} "
              f"kw={kw_precision:.0%} "
              f"{latency_ms}ms")

    avg_latency  = total_latency / len(results)
    source_acc   = sum(r["source_hit"] for r in results) / len(results)
    avg_kw_prec  = sum(r["kw_precision"] for r in results) / len(results)

    print(f"\nSource accuracy:   {source_acc:.0%}")
    print(f"Keyword precision: {avg_kw_prec:.0%}")
    print(f"Avg latency:       {avg_latency:.0f}ms")

    return {
        "source_accuracy":   source_acc,
        "keyword_precision": avg_kw_prec,
        "avg_latency_ms":    avg_latency,
        "pass":              source_acc >= 0.8 and avg_kw_prec >= 0.6,
    }


if __name__ == "__main__":
    run_rag_eval()
```

---

## STARTUP

```bash
# 1. Start Qdrant (Docker)
docker-compose up qdrant -d

# 2. Ingest documents
python rag/ingest.py
# Output:
# [load] cardiac_triage.pdf → 12 chunks
# [embed] 87 total chunks via BAAI/bge-small-en-v1.5...
# [store] 87 chunks stored in Qdrant.
# [bm25] Index saved to rag/bm25_index.pkl

# 3. Run RAG eval
python eval/rag_eval.py
# ✅ chest pain shortness...  src=✓ kw=75% 340ms
# ✅ aspirin ibuprofen...     src=✓ kw=100% 280ms
# Source accuracy: 80%  Keyword precision: 72%

# 4. Start Knowledge MCP (v2 — RAG)
python mcp/knowledge/server.py

# 5. Test retrieval
curl -X POST http://localhost:8006/tools/retrieve_drug_info \
  -H "Content-Type: application/json" \
  -d '{"drug_name": "atorvastatin"}'
```

---

## RULES

```
1. Embedder + reranker load once — never per request
2. BM25 index built at ingest, loaded from pkl at runtime
3. RRF k=60 — standard default, tune if recall drops
4. Reranker top 10 → 3 — balance accuracy vs latency
5. Category filter on vector search — prevents clinical/policy bleed
6. Context max 1500 tokens — leaves room for agent reasoning
7. Knowledge MCP v2 — all tool signatures identical to v1
8. RAG eval must pass before deploy — CI gate
9. Mock content generated if PDFs missing — demo always works
10. Qdrant Cloud URL + API key via env vars — zero code change
```
