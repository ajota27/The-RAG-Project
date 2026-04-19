import sqlite3
import os

DB_PATH = "c:/laragon/www/IA/backend/db/chat_history.db"

if os.path.exists(DB_PATH):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Renombrar ajota1427 a adonis
    cursor.execute("UPDATE users SET username = 'adonis' WHERE username = 'ajota1427'")
    # Renombrar zjuarez a zubin
    cursor.execute("UPDATE users SET username = 'zubin' WHERE username = 'zjuarez'")
    
    conn.commit()
    print(f"Cambios realizados: {cursor.rowcount} filas actualizadas.")
    conn.close()
else:
    print("La base de datos no existe en la ruta especificada.")
