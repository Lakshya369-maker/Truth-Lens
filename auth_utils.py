import bcrypt

def hash_password(password: str) -> str:
    """Return bcrypt-hashed password (utf-8 string)."""
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against the stored hashed password."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# Quick local test when running this file directly
if __name__ == "__main__":
    p = "mypassword"
    h = hash_password(p)
    print("hashed:", h)
    print("verify (correct):", verify_password("mypassword", h))
    print("verify (wrong):", verify_password("wrong", h))
