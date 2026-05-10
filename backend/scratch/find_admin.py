import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load .env file
load_dotenv()

MONGODB_URI = os.getenv('MONGODB_URI')

if not MONGODB_URI:
    print("MONGODB_URI not found in .env")
    exit(1)

try:
    client = MongoClient(MONGODB_URI)
    # Extract DB name from URI or default to 'inceptrax_db_user' based on your .env
    db_name = MONGODB_URI.rsplit('/', 1)[-1].split('?')[0] if '/' in MONGODB_URI else 'inceptrax_db_user'
    db = client[db_name]
    
    users = db.users.find({"is_admin": True})
    
    print(f"Searching for admin users in database: {db_name}")
    found = False
    for user in users:
        found = True
        print(f"ID: {user.get('id')} | Name: {user.get('first_name')} {user.get('last_name')} | Email: {user.get('email')} | Password Hash: {user.get('password_hash') or user.get('password')}")

    if not found:
        print("No admin users found in the 'users' collection.")
        # Try finding all users just in case
        print("\nAll users in collection:")
        all_users = db.users.find()
        for user in all_users:
            print(f"ID: {user.get('id')} | Email: {user.get('email')} | Admin: {user.get('is_admin')}")

except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
