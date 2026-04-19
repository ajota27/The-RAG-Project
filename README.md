# RAG PRO - Chat Multidocumento con IA Local

Este es un sistema de chat basado en RAG (Retrieval-Augmented Generation) que permite subir documentos PDF y chatear con ellos utilizando una IA local.

## Características
- **IA 100% Local**: Utiliza Ollama con llama3.2.
- **Base de Datos Vectorial**: ChromaDB para búsqueda semántica eficiente.
- **Autenticación**: Sistema de Login con roles (Admin y User).
- **Interfaz Moderna**: Dashboard diseñado con React y CSS Vanilla.

## Requisitos Previos
1. [Ollama](https://ollama.com/) instalado y ejecutándose.
2. Modelo llama3.2 descargado: `ollama run llama3.2`.
3. Python 3.10 o superior.
4. Node.js (v18 o superior) y npm.

## Configuración e Instalación

### 1. Backend (FastAPI)
Navega a la carpeta `backend`, crea un entorno virtual e instala las dependencias:
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

Para iniciar el servidor:
```powershell
uvicorn main:app --reload
```

### 2. Frontend (React)
Navega a la carpeta `frontend`, instala las dependencias e inicia el entorno de desarrollo:
```powershell
cd ../frontend
npm install
npm run dev
```

## Credenciales por Defecto
El sistema viene precargado con dos usuarios de prueba:
- **Administrador**: `ajota1427` / `12345` (Puede subir documentos).
- **Usuario Regular**: `user_1` / `12345` (Solo puede chatear).

## Estructura del Proyecto
- `/backend`: Lógica de FastAPI, RAG, Seguridad y ChromaDB.
- `/frontend`: Interfaz de usuario en React.
- `requirements.txt`: Dependencias del backend.
- `.gitignore`: Configuración para excluir archivos de entorno y datos privados.

---
© 2026 RAG Pro Project
