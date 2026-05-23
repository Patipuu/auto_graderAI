from flask import Blueprint, request, jsonify
from services.exam_service import ExamService

exam_bp = Blueprint('exam_bp', __name__)

@exam_bp.route('/api/exams', methods=['GET'])
def get_exams():
    """Fetch all exams"""
    query = request.args.get('q', '').lower()
    subject = request.args.get('subject', '')
    
    exams = ExamService.get_exams(query, subject)
    return jsonify(exams), 200

@exam_bp.route('/api/exams', methods=['POST'])
def create_exam():
    """Create new exam"""
    data = request.json or {}
    new_exam, error = ExamService.create_exam(data)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400

    return jsonify(new_exam), 201

@exam_bp.route('/api/exams/<exam_id>', methods=['GET'])
def get_exam(exam_id):
    """Fetch single exam"""
    exam = ExamService.get_exam(exam_id)
    if not exam:
        return jsonify({'success': False, 'message': 'Exam not found'}), 404
    return jsonify(exam), 200

@exam_bp.route('/api/exams/<exam_id>', methods=['PUT'])
def update_exam(exam_id):
    """Update exam details"""
    data = request.json or {}
    updated_exam, error = ExamService.update_exam(exam_id, data)
    
    if error:
        return jsonify({'success': False, 'message': error}), 404
        
    return jsonify(updated_exam), 200

@exam_bp.route('/api/exams/<exam_id>', methods=['DELETE'])
def delete_exam(exam_id):
    """Delete exam"""
    success, error = ExamService.delete_exam(exam_id)
    if error:
        return jsonify({'success': False, 'message': error}), 404
    return jsonify({'success': True}), 200
