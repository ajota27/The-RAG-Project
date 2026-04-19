import os
import uuid
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional
import requests

from database import init_db, create_session, get_sessions, add_message, get_messages, delete_session, update_session_title, get_user_by_username
from rag_service import add_document_to_index, query_relevant_context, delete_document_from_index, list_user_documents, reset_vector_db
from auth import create_access_token, get_current_user, check_admin_role, verify_password

app = FastAPI()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")

# Inicializar DB con reset=True para empezar de cero como pidió el usuario
# Ahora también limpiamos ChromaDB y archivos físicos para evitar inconsistencias
SHOULD_RESET = False 
if SHOULD_RESET:
    init_db(reset=True)
    reset_vector_db()
    if os.path.exists(UPLOAD_DIR):
        shutil.rmtree(UPLOAD_DIR)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
else:
    init_db(reset=False)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2"

class ChatRequest(BaseModel):
    session_id: str
    message: str

# --- Endpoints de Autenticación ---

@app.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_username(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"], "user_id": user["id"]}
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user["role"], "username": user["username"]}

# --- Endpoints de Gestión de Usuarios (Solo Admin) ---

class UserCreate(BaseModel):
    username: str
    password: str
    role: str

class UserUpdate(BaseModel):
    username: str
    password: Optional[str] = None
    role: str

@app.get("/users")
async def list_all_users(current_user: dict = Depends(check_admin_role)):
    from database import get_all_users
    return get_all_users()

@app.post("/users")
async def create_new_user(user_data: UserCreate, current_user: dict = Depends(check_admin_role)):
    from database import create_user_manual
    try:
        uid = create_user_manual(user_data.username, user_data.password, user_data.role)
        return {"id": uid, "message": "Usuario creado"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe o hubo un error.")

@app.put("/users/{user_id}")
async def update_existing_user(user_id: str, user_data: UserUpdate, current_user: dict = Depends(check_admin_role)):
    from database import get_user_by_id, update_user
    target_user = get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # REGLA: Un admin no puede editar a otro admin (a menos que sea él mismo)
    if target_user["role"] == "admin" and target_user["id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar a otro administrador")
    
    update_user(user_id, user_data.username, user_data.password, user_data.role)
    return {"message": "Usuario actualizado"}

@app.delete("/users/{user_id}")
async def remove_user(user_id: str, current_user: dict = Depends(check_admin_role)):
    from database import get_user_by_id, delete_user
    target_user = get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # REGLA: Solo se pueden borrar usuarios con rol 'user'
    if target_user["role"] != "user":
        raise HTTPException(status_code=403, detail="Solo se pueden eliminar usuarios con rol 'user'")
    
    # REGLA: No borrarse a sí mismo (ya cubierto por la regla anterior, pero por si acaso)
    if target_user["id"] == current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No puedes eliminar tu propia cuenta")
    
    delete_user(user_id)
    return {"message": "Usuario eliminado correctamente"}

# --- Endpoints de Gestión de Documentos (Protegidos) ---

@app.get("/documents")
async def list_documents(current_user: dict = Depends(get_current_user)):
    # Los documentos son gestionados por el admin pero visibles para todos los usuarios
    # para que puedan chatear con ellos.
    files = list_user_documents("GLOBAL_ADMIN") # Usamos una etiqueta global para documentos compartidos
    return {"documents": files}

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(check_admin_role)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    try:
        # Los documentos se indexan bajo el contexto "GLOBAL_ADMIN" para ser compartidos
        add_document_to_index(file.filename, content, "GLOBAL_ADMIN")
        return {"message": f"Documento {file.filename} indexado con éxito"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al indexar: {str(e)}")

@app.delete("/documents/{filename}")
async def delete_document(
    filename: str,
    current_user: dict = Depends(check_admin_role)
):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        delete_document_from_index(filename, "GLOBAL_ADMIN")
        return {"message": "Documento eliminado"}
    raise HTTPException(status_code=404, detail="Archivo no encontrado")

# --- Endpoints de Sesiones de Chat (Privados por Usuario) ---

@app.get("/sessions")
async def get_all_sessions(current_user: dict = Depends(get_current_user)):
    return get_sessions(current_user["user_id"])

@app.post("/sessions")
async def create_new_session(
    title: str = Body(default="Nuevo Chat", embed=True),
    current_user: dict = Depends(get_current_user)
):
    session_id = str(uuid.uuid4())
    create_session(session_id, current_user["user_id"], title)
    return {"session_id": session_id}

@app.delete("/sessions/{session_id}")
async def remove_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Aquí podríamos verificar si la sesión pertenece al usuario, 
    # pero database.py ya filtra por ID de sesión.
    delete_session(session_id)
    return {"message": "Sesión eliminada"}

@app.get("/sessions/{session_id}/messages")
async def get_session_history(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    return get_messages(session_id)

@app.post("/chat")
async def chat_interaction(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    # 1. Obtener contexto de los documentos administrados (GLOBAL_ADMIN)
    try:
        context = query_relevant_context(request.message, "GLOBAL_ADMIN")
    except Exception as e:
        context = "No hay documentos cargados o hubo un error en la búsqueda."

    # 2. Guardar mensaje del usuario
    add_message(request.session_id, "user", request.message)

    # 3. Preparar prompt con Markdown
    prompt = f"""
    Contexto de los documentos:
    ---
    {context}
    ---
    Pregunta del usuario: {request.message}
    
    Responde basándote estrictamente en el contexto anterior. 
    USA FORMATO MARKDOWN (encabezados, listas, negritas).
    Respuesta:
    """

    # 4. Llamar a Ollama
    payload = {"model": MODEL_NAME, "prompt": prompt, "stream": False}
    response = requests.post(OLLAMA_URL, json=payload)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Error con Ollama")
    
    ai_response = response.json().get("response", "Sin respuesta")

    # 5. Guardar respuesta de la IA
    add_message(request.session_id, "assistant", ai_response)

    # 6. Título automático si es el inicio
    new_title = None
    msgs = get_messages(request.session_id)
    if len(msgs) <= 2:
        try:
            t_prompt = f"Resume este mensaje en un título de máx 5 palabras: {request.message}"
            t_res = requests.post(OLLAMA_URL, json={"model": MODEL_NAME, "prompt": t_prompt, "stream": False})
            if t_res.status_code == 200:
                gen_title = t_res.json().get("response", "").strip().strip('"')
                if gen_title:
                    update_session_title(request.session_id, gen_title)
                    new_title = gen_title
        except: pass

    return {"response": ai_response, "new_title": new_title}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
