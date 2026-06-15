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

@submission_bp.route('/api/students', methods=['GET'])
def get_students():
    """Fetch all student profiles aggregated by MSHS"""
    profiles = SubmissionService.get_student_profiles()
    return jsonify(profiles), 200

@submission_bp.route('/api/submissions', methods=['POST'])
def create_submission():
    """Create submission from AI grading results"""
    data = request.json or {}
    new_submission, error = SubmissionService.create_submission(data)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify(new_submission), 201

@submission_bp.route('/api/submissions/duplicates/student-ids', methods=['GET'])
def get_duplicate_student_ids():
    """List MSHS values used by more than one submission"""
    duplicates = SubmissionService.get_duplicate_student_ids()
    return jsonify({
        'success': True,
        'totalDuplicates': len(duplicates),
        'duplicates': duplicates,
    }), 200

@submission_bp.route('/api/submissions/check-student-id', methods=['GET'])
def check_student_id():
    """Check whether an MSHS already exists on other submissions"""
    student_id = request.args.get('studentId', '')
    exclude_id = request.args.get('excludeId')

    matches = SubmissionService.check_student_id(student_id, exclude_id)
    return jsonify({
        'success': True,
        'studentId': student_id.strip(),
        'isDuplicate': len(matches) > 0,
        'matches': matches,
    }), 200

@submission_bp.route('/api/submissions/queue', methods=['GET'])
def get_approve_queue():
    """Get queue of unsure essay grading for manual approval"""
    queue = SubmissionService.get_approve_queue()
    return jsonify(queue), 200

@submission_bp.route('/api/submissions/queue/approve', methods=['POST'])
def approve_queue_item():
    """Persist teacher approval for a queued essay question"""
    data = request.json or {}
    submission_id = data.get('submissionId')
    question_num = data.get('questionNum')
    score = data.get('score')

    if not submission_id or question_num is None or score is None:
        return jsonify({'success': False, 'message': 'Missing submissionId, questionNum, or score'}), 400

    updated, error = SubmissionService.approve_queue_item(submission_id, question_num, score)
    if error:
        return jsonify({'success': False, 'message': error}), 404

    return jsonify({'success': True, 'submission': updated}), 200

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

@submission_bp.route('/api/submissions/apply-rule', methods=['POST'])
def apply_grading_rule():
    """Apply a grading rule to similar answers"""
    data = request.json or {}
    exam_id = data.get('examId')
    q_num = data.get('questionNum')
    student_answer = data.get('studentAnswer')
    new_score = data.get('newScore')
    feedback = data.get('feedback')
    
    if not all([exam_id, q_num, student_answer, new_score is not None]):
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
        
    count = SubmissionService.apply_grading_rule(exam_id, q_num, student_answer, new_score, feedback)
    return jsonify({'success': True, 'updatedCount': count}), 200
