import sqlite3
import os
from datetime import datetime
import uuid
# Importamos desde auth para las contraseñas iniciales
from auth import get_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), "db", "chat_history.db")

def get_db_connection():
    return sqlite3.connect(DB_PATH, timeout=30)

def init_db(reset=False):
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Si pedimos reset, borramos la DB vieja para empezar de cero
    if reset and os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print("Base de datos reiniciada.")

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tabla de Usuarios
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            password_hash TEXT,
            role TEXT
        )
    ''')
    
    # Tabla de Sesiones (Chat) - añadimos user_id
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT,
            created_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Tabla de Mensajes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            role TEXT,
            content TEXT,
            timestamp TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions (id)
        )
    ''')
    
    conn.commit()

    # Crear usuarios iniciales si la tabla está vacía
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        initial_users = [
            ("adonis", "12345", "admin"),
            ("zubin", "12345", "admin"),
            ("user_1", "12345", "user")
        ]
        for uname, pwd, role in initial_users:
            uid = str(uuid.uuid4())
            u_hash = get_password_hash(pwd)
            cursor.execute('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
                           (uid, uname, u_hash, role))
        conn.commit()
        print("Usuarios iniciales creados.")

    conn.close()

def get_user_by_username(username):
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None

def create_session(session_id, user_id, title="Nuevo Chat"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO sessions (id, user_id, title, created_at) VALUES (?, ?, ?, ?)', 
                   (session_id, user_id, title, datetime.now()))
    conn.commit()
    conn.close()

def get_sessions(user_id):
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC', (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_message(session_id, role, content):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)', 
                   (session_id, role, content, datetime.now()))
    conn.commit()
    conn.close()

def get_messages(session_id):
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC', (session_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_session(session_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM messages WHERE session_id = ?', (session_id,))
    cursor.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
    conn.commit()
    conn.close()

def update_session_title(session_id, title):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE sessions SET title = ? WHERE id = ?', (title, session_id))
    conn.commit()
    conn.close()

# --- Gestión de Usuarios ---

def get_all_users():
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, role FROM users')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def create_user_manual(username, password, role):
    conn = get_db_connection()
    cursor = conn.cursor()
    uid = str(uuid.uuid4())
    pw_hash = get_password_hash(password)
    cursor.execute('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
                   (uid, username, pw_hash, role))
    conn.commit()
    conn.close()
    return uid

def update_user(user_id, username, password=None, role=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if password:
        pw_hash = get_password_hash(password)
        cursor.execute('UPDATE users SET username = ?, password_hash = ?, role = ? WHERE id = ?',
                       (username, pw_hash, role, user_id))
    else:
        cursor.execute('UPDATE users SET username = ?, role = ? WHERE id = ?',
                       (username, role, user_id))
    
    conn.commit()
    conn.close()

def delete_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Borrar primero sus mensajes y sesiones para mantener integridad
    cursor.execute('SELECT id FROM sessions WHERE user_id = ?', (user_id,))
    session_ids = [row[0] for row in cursor.fetchall()]
    for s_id in session_ids:
        cursor.execute('DELETE FROM messages WHERE session_id = ?', (s_id,))
    cursor.execute('DELETE FROM sessions WHERE user_id = ?', (user_id,))
    # Borrar usuario
    cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()

def get_user_by_id(user_id):
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None
