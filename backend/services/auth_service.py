import os
import jwt
from datetime import datetime, timedelta
from werkzeug.security import check_password_hash
from data_access.teacher_repository import TeacherRepository

SECRET_KEY = os.getenv('JWT_SECRET', 'your-secret-key-change-in-prod-2026')

class AuthService:
    @staticmethod
    def login(username, password):
        teacher = TeacherRepository.get_by_username(username)
        if not teacher or not check_password_hash(teacher.get('password_hash', ''), password):
            return None, "Invalid credentials"

        token = jwt.encode(
            {
                'user_id': teacher['id'],
                'username': teacher['username'],
                'exp': datetime.utcnow() + timedelta(hours=24)
            },
            SECRET_KEY,
            algorithm='HS256'
        )
        
        return {
            'token': token,
            'user': {
                'id': teacher['id'],
                'username': teacher['username'],
                'email': teacher.get('email', '')
            }
        }, None

    @staticmethod
    def verify_token(token):
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            return data, None
        except jwt.ExpiredSignatureError:
            return None, "Token expired"
        except jwt.InvalidTokenError:
            return None, "Invalid token"
