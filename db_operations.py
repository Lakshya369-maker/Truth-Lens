import sqlite3
from typing import Optional, Tuple, List
from auth_utils import hash_password, verify_password

DB_NAME = 'users.db'

def add_user(username: str, email: str, password: str) -> bool:
    """Add a user. Password will be hashed before storing.
       Returns True if added, False if username/email already exists."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    hashed = hash_password(password)
    try:
        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            (username, email, hashed)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        # username or email already exists
        return False
    finally:
        conn.close()

def get_all_users() -> List[Tuple]:
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email FROM users")
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_user(username: str) -> Optional[Tuple]:
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, password FROM users WHERE username=?", (username,))
    row = cursor.fetchone()
    conn.close()
    return row  # (id, username, email, password) or None

def delete_user(username: str) -> bool:
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE username=?", (username,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted

def authenticate(username: str, password: str) -> bool:
    """Return True if username exists and password matches hash."""
    row = get_user(username)
    if not row:
        return False
    stored_hash = row[3]
    return verify_password(password, stored_hash)

def save_news_check(username: str, headline: str, result: str) -> bool:
    """Save a news check to history"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    try:
        # Get user ID
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        if not user:
            print(f"❌ User {username} not found")
            return False
        
        user_id = user[0]
        print(f"✅ Found user {username} with ID {user_id}")
        
        # Insert into history
        cursor.execute(
            "INSERT INTO news_history (user_id, headline, result) VALUES (?, ?, ?)",
            (user_id, headline, result)
        )
        conn.commit()
        print(f"✅ Inserted into database")
        return True
    except Exception as e:
        print(f"❌ Error saving news check: {e}")
        return False
    finally:
        conn.close()

def get_news_history(username: str) -> list:
    """Get all news checks for a user"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            """SELECT id, headline, result, checked_at FROM news_history 
               WHERE user_id = (SELECT id FROM users WHERE username = ?) 
               ORDER BY checked_at DESC LIMIT 20""",
            (username,)
        )
        history = cursor.fetchall()
        print(f"✅ Got {len(history)} history items for {username}")
        return history
    except Exception as e:
        print(f"❌ Error getting news history: {e}")
        return []
    finally:
        conn.close()

def delete_history_item(history_id: int) -> bool:
    """Delete a specific history item"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM news_history WHERE id = ?", (history_id,))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"❌ Error deleting history: {e}")
        return False
    finally:
        conn.close()



# Optional quick tests when running this file directly
if __name__ == "__main__":
    print("Creating example users...")
    print("add alice:", add_user("alice", "alice@example.com", "alice123"))
    print("add bob:", add_user("bob", "bob@example.com", "bob123"))
    print("all users:", get_all_users())
    print("auth alice correct:", authenticate("alice", "alice123"))
    print("auth alice wrong:", authenticate("alice", "wrong"))
    print("delete bob:", delete_user("bob"))
    print("after deletion:", get_all_users())
