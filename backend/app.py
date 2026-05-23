import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv, dotenv_values
from datetime import datetime

# Load environment variables
load_dotenv()
_env_file = dotenv_values()
for _key in ['GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_FALLBACK_MODELS']:
    if _env_file.get(_key):
        os.environ[_key] = _env_file[_key]

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Import Controllers (Blueprints)
from controllers.auth_controller import auth_bp
from controllers.question_controller import question_bp
from controllers.exam_controller import exam_bp
from controllers.submission_controller import submission_bp
from controllers.ai_controller import ai_bp

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(question_bp)
app.register_blueprint(exam_bp)
app.register_blueprint(submission_bp)
app.register_blueprint(ai_bp)

# ==================== HEALTH CHECK ====================
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()}), 200

# ==================== ERROR HANDLERS ====================
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': 'Internal server error'}), 500

# ==================== MAIN ====================
if __name__ == '__main__':
    from data_access.database import init_db, MONGO_URI, MONGO_DB_NAME, MONGO_COLLECTION
    os.environ.setdefault('FLASK_ENV', 'development')
    
    # Initialize Database
    init_db()
    print(f"MongoDB initialized at {MONGO_URI}, database={MONGO_DB_NAME}, collection={MONGO_COLLECTION}")
    
    # Start Server
    print(f"🚀 Starting Flask server on http://localhost:3000")
    print(f"📚 API docs: POST /api/login, GET /api/questions, POST /api/ai/grade-submission, etc.")
    
    debug_enabled = os.getenv('FLASK_DEBUG', '0') == '1'
    app.run(debug=debug_enabled, port=3000, host='0.0.0.0', use_reloader=False)
