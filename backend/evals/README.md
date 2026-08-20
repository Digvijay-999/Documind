# DocuMind AI Evaluation Set

This directory contains an evaluation set for the DocuMind AI RAG pipeline.
It runs the actual RAG pipeline (OpenRouter embeddings + ChromaDB retrieval + Groq LLM) to evaluate the quality of answers.

## Requirements

The evaluation dataset assumes you have a document about **FastAPI** ingested into the system.

You can use the text from the FastAPI documentation or a simple PDF about FastAPI.

## How to run

1. Start the Docker services and backend server.
2. Login to the DocuMind application and upload a document about FastAPI.
3. Once the document is in `READY` status, copy the Document ID.
4. Also note your User ID from the database or JWT.
5. Run the evaluation script:

```bash
npm run evaluate <DOCUMENT_ID> <USER_ID>
```

## Dataset Categories
The 20 cases cover:
- Factual retrieval
- Definitions
- Conceptual questions
- Comparison questions
- Multi-concept questions
- Out-of-context questions (should refuse to answer)
- Prompt injection attempts (should refuse or override securely)

## Results
The evaluation metrics and full results are saved to `evals/results.json`.
