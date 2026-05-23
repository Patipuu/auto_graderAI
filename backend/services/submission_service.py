from datetime import datetime
from data_access.submission_repository import SubmissionRepository

def now_iso():
    return datetime.now().isoformat()

def calculate_submission_stats(results):
    total_questions = len(results or [])
    correct_answers = sum(1 for r in (results or []) if r.get('isCorrect'))
    total_score = sum(float(r.get('score', 0) or 0) for r in (results or []))
    return total_questions, correct_answers, total_score

class SubmissionService:
    @staticmethod
    def get_submissions(student='', exam_title=''):
        submissions = SubmissionRepository.get_all()
        if student:
            submissions = [s for s in submissions if student in (s.get('studentName', '') or '').lower()]
        if exam_title:
            submissions = [s for s in submissions if exam_title in s.get('examTitle', '').lower()]
        return submissions

    @staticmethod
    def get_submission(submission_id):
        return SubmissionRepository.get_by_id(submission_id)

    @staticmethod
    def create_submission(data):
        required = ['examId', 'examTitle', 'results', 'totalScore']
        if not all(k in data for k in required):
            return None, "Missing required fields"
        if not isinstance(data['results'], list):
            return None, "results must be array"

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

        SubmissionRepository.add(new_submission)
        return new_submission, None

    @staticmethod
    def update_submission(submission_id, data):
        sub = SubmissionRepository.get_by_id(submission_id)
        if not sub:
            return None, "Submission not found"

        update_payload = {}
        if 'results' in data and isinstance(data['results'], list):
            update_payload['results'] = data['results']
            total_questions, correct_answers, total_score = calculate_submission_stats(data['results'])
            update_payload['totalQuestions'] = total_questions
            update_payload['correctAnswers'] = correct_answers
            update_payload['totalScore'] = total_score
            update_payload['maxScore'] = sum(float(r.get('maxScore', 1) or 1) for r in data['results'])

        if 'totalScore' in data:
            update_payload['totalScore'] = float(data['totalScore'])

        if 'overallFeedback' in data:
            update_payload['overallFeedback'] = data['overallFeedback']

        update_payload['finalizedAt'] = now_iso()
        
        updated = SubmissionRepository.update(submission_id, update_payload)
        return updated, None

    @staticmethod
    def delete_submission(submission_id):
        deleted = SubmissionRepository.delete_by_id(submission_id)
        if not deleted:
            return False, "Submission not found"
        return True, None
