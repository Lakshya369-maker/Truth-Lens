import sqlite3
from sqlite3 import Connection

DB_NAME = "users.db"

def create_connection(db_name: str) -> Connection:
    conn = sqlite3.connect(db_name)
    return conn

def create_table():
    conn = create_connection(DB_NAME)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
    ''')
    
    # News check history table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS news_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        headline TEXT NOT NULL,
        result TEXT NOT NULL,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Database and tables created successfully: users.db")

if __name__ == "__main__":
    create_table()
