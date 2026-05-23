from flask import Blueprint, request, jsonify
from services.auth_service import AuthService
from middleware.auth_middleware import token_required

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/api/login', methods=['POST'])
def login():
    """
    Teacher login endpoint
    Request: { "username": str, "password": str }
    """
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'success': False, 'message': 'Missing credentials'}), 400

    result, error = AuthService.login(username, password)
    if error:
        return jsonify({'success': False, 'message': error}), 401

    return jsonify({
        'success': True,
        'token': result['token'],
        'user': result['user']
    }), 200

@auth_bp.route('/api/auth/verify', methods=['GET'])
@token_required
def verify_token():
    """Verify JWT token validity"""
    return jsonify({'success': True, 'user_id': request.user_id, 'username': request.username}), 200
