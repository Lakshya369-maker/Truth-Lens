from db_operations import add_user, get_all_users, get_user, delete_user, authenticate

def main():
    # Try adding a user
    if add_user("shashi", "shashi@example.com", "1234"):
        print("Added user shashi")
    else:
        print("⚠ Could not add shashi — may already exist")

    # List users
    print("All users (id, username, email):", get_all_users())

    # Fetch single user
    u = get_user("shashi")
    print("Fetched user row (id, username, email, password_hash):", u)

    # Authenticate
    ok = authenticate("shashi", "1234")
    print("Authenticate shashi with password '1234':", ok)

    # Delete user (example)
    deleted = delete_user("shashi")
    print("Deleted shashi:", deleted)
    print("All users after deletion:", get_all_users())

if __name__ == "__main__":
    main()
