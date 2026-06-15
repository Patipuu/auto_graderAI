from flask import Blueprint, request, jsonify
from data_access.exam_repository import ExamRepository
from data_access.submission_repository import SubmissionRepository
from data_access.question_repository import QuestionRepository
from services.submission_service import now_iso

ai_bp = Blueprint('ai_bp', __name__)

@ai_bp.route('/api/ai/grade-submission', methods=['POST'])
def grade_submission():
    """
    Grade entire submission using either OpenCV OMR or Hybrid OCR + Gemini
    """
    from services.ai_service import grade_submission_with_gemini, grade_hybrid_submission_with_gemini
    from services.omr_service import grade_bubble_sheet

    data = request.json or {}
    required = ['base64Image', 'mimeType', 'examId']

    if not all(k in data for k in required):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400

    exam = ExamRepository.get_by_id(data['examId'])
    if not exam:
        return jsonify({'success': False, 'message': 'Exam not found'}), 404

    grading_type = data.get('gradingType') or exam.get('gradingType') or 'HYBRID'

    try:
        if grading_type == 'OMR':
            result = grade_bubble_sheet(
                base64_image=data['base64Image'],
                mime_type=data['mimeType'],
                exam=exam
            )
        else:
            result = grade_hybrid_submission_with_gemini(
                base64_image=data['base64Image'],
                mime_type=data['mimeType'],
                exam=exam
            )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_bp.route('/api/ai/re-evaluate-question', methods=['POST'])
def re_evaluate_question():
    """
    Re-evaluate single question
    """
    from services.ai_service import evaluate_response

    data = request.json or {}
    required = ['submissionId', 'questionNum', 'studentAnswer']

    if not all(k in data for k in required):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400

    submission = SubmissionRepository.get_by_id(data['submissionId'])
    if not submission:
        return jsonify({'success': False, 'message': 'Submission not found'}), 404

    exam = ExamRepository.get_by_id(submission['examId'])
    if not exam:
        return jsonify({'success': False, 'message': 'Exam not found'}), 404

    question_num = int(data['questionNum'])
    
    # Get actual question content from bank if available
    question_content = f"Nội dung câu hỏi số {question_num}"
    if exam.get('questionIds') and len(exam['questionIds']) >= question_num:
        q_id = exam['questionIds'][question_num - 1]
        all_questions = QuestionRepository.get_all()
        question = next((q for q in all_questions if q['id'] == q_id), None)
        if question:
            question_content = question.get('content', question_content)

    reference_answer = exam.get('answerKey', {}).get(str(question_num), '')
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

@ai_bp.route('/api/ai/overall-feedback', methods=['POST'])
def overall_feedback():
    """
    Generate overall feedback from submission results
    """
    from services.ai_service import analyze_overall_performance

    data = request.json or {}
    submission_id = data.get('submissionId')

    if not submission_id:
        return jsonify({'success': False, 'message': 'Missing submissionId'}), 400

    submission = SubmissionRepository.get_by_id(submission_id)
    if not submission:
        return jsonify({'success': False, 'message': 'Submission not found'}), 404

    try:
        feedback = analyze_overall_performance(submission.get('results', []))
        
        # Update submission with feedback
        SubmissionRepository.update(submission_id, {
            'overallFeedback': feedback,
            'finalizedAt': now_iso()
        })
        
        return jsonify({'feedback': feedback}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
