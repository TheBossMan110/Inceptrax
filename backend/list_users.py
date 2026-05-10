from app import create_app, db
from app.models.user_model import User

app = create_app()
with app.app_context():
    users = User.query.all()
    for u in users:
        print(f"ID: {u.id} | {u.first_name} {u.last_name} | {u.email} | admin: {u.is_admin}")
