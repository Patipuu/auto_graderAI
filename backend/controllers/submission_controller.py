from flask import Blueprint, request, jsonify
from services.submission_service import SubmissionService

submission_bp = Blueprint('submission_bp', __name__)

@submission_bp.route('/api/submissions', methods=['GET'])
def get_submissions():
    """Fetch all submissions"""
    student = request.args.get('student', '').lower()
    exam_title = request.args.get('exam', '').lower()
    
    submissions = SubmissionService.get_submissions(student, exam_title)
    return jsonify(submissions), 200

@submission_bp.route('/api/submissions', methods=['POST'])
def create_submission():
    """Create submission from AI grading results"""
    data = request.json or {}
    new_submission, error = SubmissionService.create_submission(data)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify(new_submission), 201

@submission_bp.route('/api/submissions/<submission_id>', methods=['GET'])
def get_submission(submission_id):
    """Get single submission"""
    sub = SubmissionService.get_submission(submission_id)
    if not sub:
        return jsonify({'success': False, 'message': 'Submission not found'}), 404
    return jsonify(sub), 200

@submission_bp.route('/api/submissions/<submission_id>', methods=['PUT'])
def update_submission(submission_id):
    """Update submission (manual score edits, feedback)"""
    data = request.json or {}
    updated, error = SubmissionService.update_submission(submission_id, data)
    
    if error:
        return jsonify({'success': False, 'message': error}), 404
        
    return jsonify(updated), 200

@submission_bp.route('/api/submissions/<submission_id>', methods=['DELETE'])
def delete_submission(submission_id):
    """Delete submission"""
    success, error = SubmissionService.delete_submission(submission_id)
    if error:
        return jsonify({'success': False, 'message': error}), 404
    return jsonify({'success': True}), 200

@submission_bp.route('/api/submissions/stats/error-rate', methods=['GET'])
def get_error_rate_stats():
    """Get statistics on most frequently missed questions"""
    stats = SubmissionService.get_error_rate_stats()
    return jsonify(stats), 200
