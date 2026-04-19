import os
import chromadb
from chromadb.config import Settings
import PyPDF2
import io
import requests
import uuid

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "db", "chroma_db")
OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "llama3.2"

client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_or_create_collection(name="documents")

def extract_text_from_pdf(file_content):
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() + "\n"
    return text

def chunk_text(text, chunk_size=1000, overlap=200):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def get_embedding(text):
    response = requests.post(OLLAMA_EMBED_URL, json={
        "model": EMBED_MODEL,
        "prompt": text
    })
    return response.json()["embedding"]

def add_document_to_index(file_name, file_content, user_id):
    text = extract_text_from_pdf(file_content)
    chunks = chunk_text(text)
    
    ids = []
    documents = []
    metadatas = []
    embeddings = []
    
    for i, chunk in enumerate(chunks):
        chunk_id = f"{user_id}_{file_name}_{i}_{str(uuid.uuid4())[:8]}"
        embedding = get_embedding(chunk)
        
        ids.append(chunk_id)
        documents.append(chunk)
        metadatas.append({
            "source": file_name,
            "user_id": user_id
        })
        embeddings.append(embedding)
        
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas
    )

def query_relevant_context(question, user_id, n_results=5):
    query_embedding = get_embedding(question)
    # Filtramos la búsqueda por el ID del usuario en los metadatos
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where={"user_id": user_id}
    )
    
    if not results['documents'] or len(results['documents'][0]) == 0:
        return "No se encontró contexto relevante para este usuario."
        
    context = "\n---\n".join(results['documents'][0])
    return context

def delete_document_from_index(file_name, user_id):
    # Borramos solo lo que pertenezca a este usuario y a este archivo
    collection.delete(where={
        "$and": [
            {"source": file_name},
            {"user_id": user_id}
        ]
    })

def list_user_documents(user_id):
    # Obtener metadatos únicos por usuario
    results = collection.get(where={"user_id": user_id}, include=["metadatas"])
    if not results['metadatas']:
        return []
    # Extraer nombres de archivo únicos
    docs = set([m['source'] for m in results['metadatas']])
    return list(docs)

def reset_vector_db():
    # Eliminar todos los documentos de la colección
    ids = collection.get()['ids']
    if ids:
        collection.delete(ids=ids)
    print("Índice de ChromaDB reiniciado.")
