import sys
import os
import uuid

# Añadir el path del backend para poder importar modulos
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import get_db_connection, get_user_by_username
from auth import get_password_hash

def add_new_user(username, password, role):
    if get_user_by_username(username):
        print(f"El usuario {username} ya existe.")
        return

    conn = get_db_connection()
    cursor = conn.cursor()
    
    uid = str(uuid.uuid4())
    pw_hash = get_password_hash(password)
    
    cursor.execute('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
                   (uid, username, pw_hash, role))
    conn.commit()
    conn.close()
    print(f"Usuario {username} creado con éxito con rol {role}.")

if __name__ == "__main__":
    add_new_user("zjuarez", "12345", "admin")
