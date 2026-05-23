from functools import wraps
from flask import request, jsonify
from services.auth_service import AuthService

def token_required(f):
    """JWT Authentication decorator"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'success': False, 'message': 'Token missing'}), 401
            
        data, error = AuthService.verify_token(token)
        if error:
            return jsonify({'success': False, 'message': error}), 401
            
        request.user_id = data['user_id']
        request.username = data.get('username')
        return f(*args, **kwargs)
    return decorated
