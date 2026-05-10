import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import create_app, get_db
from app.models.user_model import User

app = create_app()
with app.app_context():
    users = User.find_all()
    for u in users:
        print(f"ID: {u.id} | {u.first_name} {u.last_name} | {u.email} | admin: {u.is_admin}")
