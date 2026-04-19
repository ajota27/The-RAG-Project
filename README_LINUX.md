# RAG PRO - Chat Multidocumento con IA Local (Versión Linux)

Este es un sistema de chat basado en RAG que permite analizar PDFs localmente usando Ollama.

## Requisitos Previos
1. [Ollama para Linux](https://ollama.com/download/linux) instalado.
2. Modelo llama3.2: `ollama run llama3.2`.
3. Python 3.10+ y Node.js 18+.

## Instalación y Ejecución

### 1. Configurar Backend (FastAPI)
Desde la raíz del proyecto:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Para iniciar el servidor:
```bash
uvicorn main:app --reload
```

### 2. Configurar Frontend (React)
Desde una nueva terminal en la raíz del proyecto:
```bash
cd frontend
npm install
npm run dev
```

## Credenciales de Acceso
- **Admin**: `ajota1427` / `12345`
- **User**: `user_1` / `12345`

## Notas para Linux
- Asegúrate de que el servicio de Ollama esté corriendo: `sudo systemctl status ollama`.
- Si usas un firewall (como UFW), permite el tráfico en los puertos 8000 (backend) y 5173 (frontend).
- Las dependencias de `bcrypt` pueden requerir herramientas de compilación: `sudo apt install build-essential python3-dev`.

---
© 2026 RAG Pro Project
