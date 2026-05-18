"""
AutoGrader AI - Flask Backend
Main application with all API routes for exam management, grading, and submissions.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from functools import wraps
import json
import os
import io
from dotenv import load_dotenv, dotenv_values
import jwt
from datetime import datetime, timedelta
from werkzeug.security import check_password_hash

load_dotenv()
_env_file = dotenv_values()
for _key in ['GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_FALLBACK_MODELS']:
    if _env_file.get(_key):
        os.environ[_key] = _env_file[_key]

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ==================== CONFIG ====================
SECRET_KEY = os.getenv('JWT_SECRET', 'your-secret-key-change-in-prod-2026')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

from data_access.database import load_db, save_db

VALID_DIFFICULTIES = {'Dễ', 'Trung bình', 'Khó', 'Dá»…', 'Trung bÃ¬nh', 'KhÃ³'}

def now_iso():
    return datetime.now().isoformat()

def calculate_submission_stats(results):
    total_questions = len(results or [])
    correct_answers = sum(1 for r in (results or []) if r.get('isCorrect'))
    total_score = sum(float(r.get('score', 0) or 0) for r in (results or []))
    return total_questions, correct_answers, total_score

def normalize_question_points(question_points, question_count, default_point=1.0):
    points = {}
    source = question_points if isinstance(question_points, dict) else {}
    for question_num in range(1, int(question_count or 0) + 1):
        raw = source.get(str(question_num), source.get(question_num, default_point))
        try:
            value = float(raw)
        except (TypeError, ValueError):
            value = default_point
        points[str(question_num)] = max(0.25, round(value * 4) / 4)
    return points

def normalize_rubric_groups(rubric_groups, question_count):
    groups_by_question = {}
    source = rubric_groups if isinstance(rubric_groups, dict) else {}

    for question_num in range(1, int(question_count or 0) + 1):
        raw_groups = source.get(str(question_num), source.get(question_num, []))
        if not isinstance(raw_groups, list):
            raw_groups = []

        normalized_groups = []
        for group_index, group in enumerate(raw_groups, start=1):
            if not isinstance(group, dict):
                continue

            raw_items = group.get('items', [])
            if not isinstance(raw_items, list):
                raw_items = []

            normalized_items = []
            for item_index, item in enumerate(raw_items, start=1):
                if not isinstance(item, dict):
                    continue

                description = str(item.get('description', '')).strip()
                if not description:
                    continue

                try:
                    points = float(item.get('points', 0.25))
                except (TypeError, ValueError):
                    points = 0.25

                normalized_items.append({
                    'id': str(item.get('id') or f'g{group_index}-i{item_index}'),
                    'description': description,
                    'points': max(0.25, round(points * 4) / 4)
                })

            title = str(group.get('title', '')).strip() or f'Nhóm tiêu chí {group_index}'
            if normalized_items:
                normalized_groups.append({
                    'id': str(group.get('id') or f'g{group_index}'),
                    'title': title,
                    'items': normalized_items
                })

        if normalized_groups:
            groups_by_question[str(question_num)] = normalized_groups

    return groups_by_question

# ==================== AUTH MIDDLEWARE ====================

def token_required(f):
    """JWT Authentication decorator"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'success': False, 'message': 'Token missing'}), 401
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            request.user_id = data['user_id']
            request.username = data.get('username')
            return f(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401
    return decorated

# ==================== AUTH ROUTES ====================

@app.route('/api/login', methods=['POST'])
def login():
    """
    Teacher login endpoint
    Request: { "username": str, "password": str }
    Response: { "success": bool, "token": str, "user": {...} }
    """
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'success': False, 'message': 'Missing credentials'}), 400

    db = load_db()
    teacher = next((t for t in db['teachers'] if t['username'] == username), None)

    if not teacher or not check_password_hash(teacher.get('password_hash', ''), password):
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

    # Generate JWT token (expires in 24 hours)
    token = jwt.encode(
        {
            'user_id': teacher['id'],
            'username': teacher['username'],
            'exp': datetime.utcnow() + timedelta(hours=24)
        },
        SECRET_KEY,
        algorithm='HS256'
    )

    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'id': teacher['id'],
            'username': teacher['username'],
            'email': teacher.get('email', '')
        }
    }), 200

@app.route('/api/auth/verify', methods=['GET'])
@token_required
def verify_token():
    """Verify JWT token validity"""
    return jsonify({'success': True, 'user_id': request.user_id, 'username': request.username}), 200

# ==================== QUESTION BANK ROUTES ====================

@app.route('/api/questions', methods=['GET'])
def get_questions():
    """Fetch all questions from bank"""
    db = load_db()
    questions = db.get('questions', [])
    
    # Optional: filter by search query
    query = request.args.get('q', '').lower()
    subject = request.args.get('subject', '')
    
    if query:
        questions = [q for q in questions if query in q.get('content', '').lower()]
    if subject:
        questions = [q for q in questions if q.get('subject') == subject]
    
    return jsonify(questions), 200

def persist_imported_questions(questions):
    if not isinstance(questions, list) or len(questions) == 0:
        return None, ({'success': False, 'message': 'Questions array required and non-empty'}, 400)

    for q in questions:
        if not isinstance(q.get('content'), str) or not q.get('content').strip():
            return None, ({'success': False, 'message': 'Missing or invalid content'}, 400)
        if q.get('type') not in ['trac-nghiem', 'tu-luan']:
            return None, ({'success': False, 'message': f"Invalid type: {q.get('type')}"}, 400)
        if not q.get('correctAnswer'):
            return None, ({'success': False, 'message': 'Missing correctAnswer'}, 400)
        if q.get('difficulty') not in VALID_DIFFICULTIES:
            return None, ({'success': False, 'message': f"Invalid difficulty: {q.get('difficulty')}"}, 400)

    db = load_db()
    if 'questions' not in db:
        db['questions'] = []

    imported = []
    for idx, q in enumerate(questions):
        new_q = {
            'id': f"{int(datetime.now().timestamp() * 1000)}{idx}",
            'content': q['content'].strip(),
            'type': q['type'],
            'options': q.get('options', []) if q.get('type') == 'trac-nghiem' else [],
            'correctAnswer': str(q['correctAnswer']).strip(),
            'subject': q.get('subject', 'Chung'),
            'difficulty': q.get('difficulty', 'Trung bình'),
            'createdAt': now_iso()
        }
        db['questions'].append(new_q)
        imported.append(new_q)

    save_db(db)
    return imported, None

@app.route('/api/questions/import', methods=['POST'])
def import_questions():
    """
    Import bulk questions from parsed text
    Request: { "questions": [...] }
    """
    data = request.json or {}
    questions = data.get('questions', [])

    imported, error = persist_imported_questions(questions)
    if error:
        payload, status = error
        return jsonify(payload), status
    return jsonify({'success': True, 'count': len(imported), 'questions': imported}), 201

@app.route('/api/questions/import-text', methods=['POST'])
def import_questions_from_text():
    """Parse and import questions from raw text on the backend."""
    from services.ai_service import parse_questions_from_text

    data = request.json or {}
    text = data.get('text', '')
    subject = data.get('subject', 'Chung')
    difficulty = data.get('difficulty', 'Trung bình')

    questions = parse_questions_from_text(text, subject=subject, difficulty=difficulty)
    imported, error = persist_imported_questions(questions)
    if error:
        payload, status = error
        return jsonify(payload), status
    return jsonify({'success': True, 'count': len(imported), 'questions': imported}), 201

@app.route('/api/questions/import-file', methods=['POST'])
def import_questions_from_file():
    """Extract text from txt/docx/pdf and import parsed questions."""
    from services.ai_service import parse_questions_from_text

    upload = request.files.get('file')
    if not upload:
        return jsonify({'success': False, 'message': 'Missing file'}), 400

    subject = request.form.get('subject', 'Chung')
    difficulty = request.form.get('difficulty', 'Trung bình')
    filename = (upload.filename or '').lower()
    raw = upload.read()

    try:
        if filename.endswith('.txt'):
            text = raw.decode('utf-8-sig')
        elif filename.endswith('.docx'):
            from docx import Document
            document = Document(io.BytesIO(raw))
            text = '\n'.join(p.text for p in document.paragraphs if p.text.strip())
        elif filename.endswith('.pdf'):
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(raw))
            text = '\n'.join((page.extract_text() or '') for page in reader.pages)
        else:
            return jsonify({'success': False, 'message': 'Only .txt, .docx, and .pdf files are supported'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f'Cannot extract text from file: {str(e)}'}), 400

    questions = parse_questions_from_text(text, subject=subject, difficulty=difficulty)
    imported, error = persist_imported_questions(questions)
    if error:
        payload, status = error
        return jsonify(payload), status
    return jsonify({'success': True, 'count': len(imported), 'questions': imported}), 201

@app.route('/api/questions/<question_id>', methods=['DELETE'])
def delete_question(question_id):
    """Delete a question from bank"""
    db = load_db()
    if 'questions' not in db:
        db['questions'] = []

    initial_len = len(db['questions'])
    db['questions'] = [q for q in db['questions'] if q['id'] != question_id]

    if len(db['questions']) == initial_len:
        return jsonify({'success': False, 'message': 'Question not found'}), 404

    save_db(db)
    return jsonify({'success': True}), 200

# ==================== EXAM ROUTES ====================

@app.route('/api/exams', methods=['GET'])
def get_exams():
    """Fetch all exams"""
    db = load_db()
    exams = db.get('exams', [])
    
    # Optional: filter by search
    query = request.args.get('q', '').lower()
    subject = request.args.get('subject', '')
    
    if query:
        exams = [e for e in exams if query in e.get('title', '').lower()]
    if subject:
        exams = [e for e in exams if e.get('subject') == subject]
    
    return jsonify(exams), 200

@app.route('/api/exams', methods=['POST'])
def create_exam():
    """
    Create new exam
    Request: { "title", "subject", "questionCount", "answerKey", "questionIds"? }
    """
    data = request.json or {}
    
    if not data.get('title') or not data.get('subject'):
        return jsonify({'success': False, 'message': 'Missing title or subject'}), 400

    # Validate answerKey is dict
    if not isinstance(data.get('answerKey', {}), dict):
        return jsonify({'success': False, 'message': 'answerKey must be object'}), 400

    db = load_db()
    if 'exams' not in db:
        db['exams'] = []

    question_ids = data.get('questionIds', [])
    if question_ids and not isinstance(question_ids, list):
        return jsonify({'success': False, 'message': 'questionIds must be array'}), 400

    answer_key = {str(k): v for k, v in data.get('answerKey', {}).items()}
    if question_ids:
        bank_by_id = {q['id']: q for q in db.get('questions', [])}
        missing_ids = [qid for qid in question_ids if qid not in bank_by_id]
        if missing_ids:
            return jsonify({'success': False, 'message': 'Some questionIds do not exist', 'missingIds': missing_ids}), 400

        answer_key = {}
        for index, question_id in enumerate(question_ids, start=1):
            answer_key[str(index)] = bank_by_id[question_id].get('correctAnswer', '')

    question_count = len(question_ids) if question_ids else int(data.get('questionCount', 0))
    question_points = normalize_question_points(data.get('questionPoints', {}), question_count)
    rubric_groups = normalize_rubric_groups(data.get('rubricGroups', {}), question_count)

    new_exam = {
        'id': str(int(datetime.now().timestamp() * 1000)),
        'title': data['title'].strip(),
        'subject': data['subject'].strip(),
        'questionCount': question_count,
        'answerKey': answer_key,
        'questionPoints': question_points,
        'rubricGroups': rubric_groups,
        'questionIds': question_ids,
        'totalPoints': sum(question_points.values()),
        'createdAt': now_iso()
    }

    db['exams'].append(new_exam)
    save_db(db)
    return jsonify(new_exam), 201

@app.route('/api/exams/<exam_id>', methods=['GET'])
def get_exam(exam_id):
    """Fetch single exam"""
    db = load_db()
    exam = next((e for e in db.get('exams', []) if e['id'] == exam_id), None)
    if not exam:
        return jsonify({'success': False, 'message': 'Exam not found'}), 404
    return jsonify(exam), 200

@app.route('/api/exams/<exam_id>', methods=['PUT'])
def update_exam(exam_id):
    """Update exam details"""
    data = request.json or {}
    db = load_db()

    exam_idx = next((i for i, e in enumerate(db.get('exams', []))
                     if e['id'] == exam_id), -1)
    if exam_idx == -1:
        return jsonify({'success': False, 'message': 'Exam not found'}), 404

    previous_question_ids = list(db['exams'][exam_idx].get('questionIds', []))

    # Update allowed fields
    for key in ['title', 'subject', 'answerKey', 'questionIds', 'questionCount', 'questionPoints', 'rubricGroups']:
        if key in data:
            db['exams'][exam_idx][key] = data[key]

    if 'answerKey' in db['exams'][exam_idx]:
        db['exams'][exam_idx]['answerKey'] = {
            str(k): v for k, v in db['exams'][exam_idx].get('answerKey', {}).items()
        }

    if (
        'questionIds' in data
        and db['exams'][exam_idx].get('questionIds')
        and db['exams'][exam_idx].get('questionIds') != previous_question_ids
    ):
        bank_by_id = {q['id']: q for q in db.get('questions', [])}
        question_ids = db['exams'][exam_idx]['questionIds']
        db['exams'][exam_idx]['questionCount'] = len(question_ids)
        db['exams'][exam_idx]['answerKey'] = {
            str(index): bank_by_id.get(question_id, {}).get('correctAnswer', '')
            for index, question_id in enumerate(question_ids, start=1)
        }

    question_count = int(db['exams'][exam_idx].get('questionCount', 0))
    db['exams'][exam_idx]['questionPoints'] = normalize_question_points(
        db['exams'][exam_idx].get('questionPoints', {}),
        question_count
    )
    db['exams'][exam_idx]['rubricGroups'] = normalize_rubric_groups(
        db['exams'][exam_idx].get('rubricGroups', {}),
        question_count
    )
    db['exams'][exam_idx]['totalPoints'] = sum(db['exams'][exam_idx]['questionPoints'].values())

    save_db(db)
    return jsonify(db['exams'][exam_idx]), 200

@app.route('/api/exams/<exam_id>', methods=['DELETE'])
def delete_exam(exam_id):
    """Delete exam"""
    db = load_db()
    initial_len = len(db.get('exams', []))
    db['exams'] = [e for e in db.get('exams', []) if e['id'] != exam_id]

    if len(db['exams']) == initial_len:
        return jsonify({'success': False, 'message': 'Exam not found'}), 404

    save_db(db)
    return jsonify({'success': True}), 200

# ==================== SUBMISSION ROUTES ====================

@app.route('/api/submissions', methods=['GET'])
def get_submissions():
    """Fetch all submissions"""
    db = load_db()
    submissions = db.get('submissions', [])
    
    # Optional filters
    student = request.args.get('student', '').lower()
    exam_title = request.args.get('exam', '').lower()
    
    if student:
        submissions = [s for s in submissions if student in (s.get('studentName', '') or '').lower()]
    if exam_title:
        submissions = [s for s in submissions if exam_title in s.get('examTitle', '').lower()]
    
    return jsonify(submissions), 200

@app.route('/api/submissions', methods=['POST'])
def create_submission():
    """
    Create submission from AI grading results
    Request: { "examId", "examTitle", "studentName", "results", "totalScore", "confidence", "fileType" }
    """
    data = request.json or {}
    required = ['examId', 'examTitle', 'results', 'totalScore']
    
    if not all(k in data for k in required):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400

    if not isinstance(data['results'], list):
        return jsonify({'success': False, 'message': 'results must be array'}), 400

    db = load_db()
    if 'submissions' not in db:
        db['submissions'] = []

    total_questions, correct_answers, calculated_total = calculate_submission_stats(data['results'])
    calculated_max = sum(float(r.get('maxScore', 1) or 1) for r in data['results'])
    total_score = float(data.get('totalScore', calculated_total))

    new_submission = {
        'id': str(int(datetime.now().timestamp() * 1000)),
        'examId': data['examId'],
        'examTitle': data['examTitle'],
        'studentName': data.get('studentName'),
        'studentId': data.get('studentId'),
        'results': data['results'],
        'totalScore': total_score,
        'maxScore': float(data.get('maxScore', calculated_max)),
        'totalQuestions': total_questions,
        'correctAnswers': correct_answers,
        'confidence': float(data.get('confidence', 0.8)),
        'requiresManualReview': bool(data.get('requiresManualReview', False)),
        'aiStatus': data.get('aiStatus', 'completed'),
        'fileType': data.get('fileType'),
        'processedAt': now_iso(),
        'gradedAt': now_iso()
    }

    db['submissions'].append(new_submission)
    save_db(db)
    return jsonify(new_submission), 201

@app.route('/api/submissions/<submission_id>', methods=['GET'])
def get_submission(submission_id):
    """Get single submission"""
    db = load_db()
    sub = next((s for s in db.get('submissions', []) if s['id'] == submission_id), None)
    if not sub:
        return jsonify({'success': False, 'message': 'Submission not found'}), 404
    return jsonify(sub), 200

@app.route('/api/submissions/<submission_id>', methods=['PUT'])
def update_submission(submission_id):
    """Update submission (manual score edits, feedback)"""
    data = request.json or {}
    db = load_db()

    sub_idx = next((i for i, s in enumerate(db.get('submissions', []))
                    if s['id'] == submission_id), -1)
    if sub_idx == -1:
        return jsonify({'success': False, 'message': 'Submission not found'}), 404

    # Update allowed fields
    if 'results' in data and isinstance(data['results'], list):
        db['submissions'][sub_idx]['results'] = data['results']
        total_questions, correct_answers, total_score = calculate_submission_stats(data['results'])
        db['submissions'][sub_idx]['totalQuestions'] = total_questions
        db['submissions'][sub_idx]['correctAnswers'] = correct_answers
        db['submissions'][sub_idx]['totalScore'] = total_score
        db['submissions'][sub_idx]['maxScore'] = sum(float(r.get('maxScore', 1) or 1) for r in data['results'])

    if 'totalScore' in data:
        db['submissions'][sub_idx]['totalScore'] = float(data['totalScore'])

    if 'overallFeedback' in data:
        db['submissions'][sub_idx]['overallFeedback'] = data['overallFeedback']

    db['submissions'][sub_idx]['finalizedAt'] = now_iso()

    save_db(db)
    return jsonify(db['submissions'][sub_idx]), 200

@app.route('/api/submissions/<submission_id>', methods=['DELETE'])
def delete_submission(submission_id):
    """Delete submission"""
    db = load_db()
    initial_len = len(db.get('submissions', []))
    db['submissions'] = [s for s in db.get('submissions', [])
                         if s['id'] != submission_id]

    if len(db['submissions']) == initial_len:
        return jsonify({'success': False, 'message': 'Submission not found'}), 404

    save_db(db)
    return jsonify({'success': True}), 200

# ==================== AI GRADING ROUTES ====================

@app.route('/api/ai/grade-submission', methods=['POST'])
def grade_submission():
    """
    [SERVER-SIDE PROXY] Grade entire submission via Gemini
    Request: { "base64Image", "mimeType", "examId" }
    Response: { "studentName", "studentId", "results", "totalScore", "confidence" }
    """
    from services.ai_service import grade_submission_with_gemini

    data = request.json or {}
    required = ['base64Image', 'mimeType', 'examId']

    if not all(k in data for k in required):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400

    db = load_db()
    exam = next((e for e in db.get('exams', []) if e['id'] == data['examId']), None)
    if not exam:
        return jsonify({'success': False, 'message': 'Exam not found'}), 404

    try:
        result = grade_submission_with_gemini(
            base64_image=data['base64Image'],
            mime_type=data['mimeType'],
            exam=exam
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/ai/re-evaluate-question', methods=['POST'])
def re_evaluate_question():
    """
    Re-evaluate single question
    Request: { "submissionId", "questionNum", "studentAnswer" }
    Response: { "score", "isCorrect", "feedback" }
    """
    from services.ai_service import evaluate_response

    data = request.json or {}
    required = ['submissionId', 'questionNum', 'studentAnswer']

    if not all(k in data for k in required):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400

    db = load_db()
    submission = next((s for s in db.get('submissions', [])
                       if s['id'] == data['submissionId']), None)
    if not submission:
        return jsonify({'success': False, 'message': 'Submission not found'}), 404

    exam = next((e for e in db.get('exams', [])
                 if e['id'] == submission['examId']), None)
    if not exam:
        return jsonify({'success': False, 'message': 'Exam not found'}), 404

    question_num = int(data['questionNum'])
    
    # Get actual question content from bank if available
    question_content = f"Nội dung câu hỏi số {question_num}"
    if exam.get('questionIds') and len(exam['questionIds']) >= question_num:
        q_id = exam['questionIds'][question_num - 1]
        question = next((q for q in db.get('questions', [])
                         if q['id'] == q_id), None)
        if question:
            question_content = question.get('content', question_content)

    reference_answer = exam['answerKey'].get(str(question_num), '')
    rubric_groups = (exam.get('rubricGroups') or {}).get(str(question_num), [])
    if rubric_groups:
        rubric_lines = ['Rubric item groups:']
        for group in rubric_groups:
            rubric_lines.append(f"- {group.get('title', 'Nhóm tiêu chí')}")
            for item in group.get('items', []):
                rubric_lines.append(f"  + {item.get('description', '')}: {item.get('points', 0)} điểm")
        if reference_answer:
            rubric_lines.append(f"Đáp án/ghi chú bổ sung: {reference_answer}")
        reference_answer = "\n".join(rubric_lines)
    question_points = exam.get('questionPoints', {})
    max_score = float(question_points.get(str(question_num), 1.0))

    try:
        evaluation = evaluate_response(
            question_content=question_content,
            student_answer=data['studentAnswer'],
            reference_answer=reference_answer,
            max_score=max_score
        )
        return jsonify(evaluation), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/ai/overall-feedback', methods=['POST'])
def overall_feedback():
    """
    Generate overall feedback from submission results
    Request: { "submissionId" }
    Response: { "feedback": str }
    """
    from services.ai_service import analyze_overall_performance

    data = request.json or {}
    submission_id = data.get('submissionId')

    if not submission_id:
        return jsonify({'success': False, 'message': 'Missing submissionId'}), 400

    db = load_db()
    sub_idx = next((i for i, s in enumerate(db.get('submissions', []))
                    if s['id'] == submission_id), -1)
    if sub_idx == -1:
        return jsonify({'success': False, 'message': 'Submission not found'}), 404

    try:
        feedback = analyze_overall_performance(db['submissions'][sub_idx]['results'])
        db['submissions'][sub_idx]['overallFeedback'] = feedback
        db['submissions'][sub_idx]['finalizedAt'] = now_iso()
        save_db(db)
        return jsonify({'feedback': feedback}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

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
    init_db()
    print(f"MongoDB initialized at {MONGO_URI}, database={MONGO_DB_NAME}, collection={MONGO_COLLECTION}")
    print(f"🚀 Starting Flask server on http://localhost:3000")
    print(f"📚 API docs: POST /api/login, GET /api/questions, POST /api/ai/grade-submission, etc.")
    debug_enabled = os.getenv('FLASK_DEBUG', '0') == '1'
    app.run(debug=debug_enabled, port=3000, host='0.0.0.0', use_reloader=False)
