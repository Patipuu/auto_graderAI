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
        sub = SubmissionRepository.get_by_id(submission_id)
        if not sub:
            return None
            
        # Try to inject question content
        from data_access.exam_repository import ExamRepository
        from data_access.question_repository import QuestionRepository
        
        exam_id = sub.get('examId')
        if exam_id:
            exam = ExamRepository.get_by_id(exam_id)
            if exam:
                question_ids = exam.get('questionIds', [])
                # Get actual questions
                all_questions = QuestionRepository.get_all()
                q_dict = {str(q['id']): q for q in all_questions}
                
                # Assume questionIds are ordered [q1, q2, ...]
                ans_key = exam.get('answerKey', {})
                for res in sub.get('results', []):
                    q_num = res.get('questionNum')
                    if q_num and isinstance(q_num, int) and 1 <= q_num <= len(question_ids):
                        q_id = question_ids[q_num - 1]
                        question = q_dict.get(str(q_id))
                        if question:
                            res['questionContent'] = question.get('content', '')
                            
                    res['referenceAnswer'] = ans_key.get(str(q_num), '')
                    
        return sub

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
            'studentClass': data.get('studentClass'),
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

        for field in ['studentName', 'studentId', 'studentClass']:
            if field in data:
                update_payload[field] = data[field]

        update_payload['finalizedAt'] = now_iso()
        
        updated = SubmissionRepository.update(submission_id, update_payload)
        return updated, None

    @staticmethod
    def delete_submission(submission_id):
        deleted = SubmissionRepository.delete_by_id(submission_id)
        if not deleted:
            return False, "Submission not found"
        return True, None

    @staticmethod
    def get_error_rate_stats():
        from data_access.exam_repository import ExamRepository
        submissions = SubmissionRepository.get_all()
        exams = ExamRepository.get_all()
        exam_dict = {str(e['id']): e for e in exams}

        stats_map = {} # key: examId_questionNum
        
        for sub in submissions:
            exam_id = str(sub.get('examId'))
            results = sub.get('results', [])
            
            for res in results:
                q_num = res.get('questionNum')
                if not q_num: continue
                
                key = f"{exam_id}_{q_num}"
                if key not in stats_map:
                    exam = exam_dict.get(exam_id)
                    q_type = 'unknown'
                    exam_title = sub.get('examTitle', 'Unknown Exam')
                    if exam:
                        exam_title = exam.get('title', exam_title)
                        # Determine type from answer key format
                        ans = exam.get('answerKey', {}).get(str(q_num), '')
                        if ans in ['A', 'B', 'C', 'D']:
                            q_type = 'trac-nghiem'
                        elif len(str(ans)) > 1:
                            q_type = 'tu-luan'
                            
                    stats_map[key] = {
                        'examId': exam_id,
                        'examTitle': exam_title,
                        'questionNum': q_num,
                        'questionType': q_type,
                        'totalSubmissions': 0,
                        'incorrectCount': 0
                    }
                
                stats_map[key]['totalSubmissions'] += 1
                if not res.get('isCorrect'):
                    stats_map[key]['incorrectCount'] += 1
                    
        stats_list = []
        for v in stats_map.values():
            if v['totalSubmissions'] > 0:
                v['errorRate'] = round((v['incorrectCount'] / v['totalSubmissions']) * 100, 1)
                stats_list.append(v)
                
        # Sort by error rate descending
        stats_list.sort(key=lambda x: x['errorRate'], reverse=True)
        return stats_list

    @staticmethod
    def get_approve_queue():
        from data_access.exam_repository import ExamRepository
        submissions = SubmissionRepository.get_all()
        exams = ExamRepository.get_all()
        exam_dict = {str(e['id']): e for e in exams}
        
        queue = []
        for sub in submissions:
            exam_id = str(sub.get('examId'))
            exam = exam_dict.get(exam_id)
            if not exam: continue
            
            for res in sub.get('results', []):
                q_num = res.get('questionNum')
                ans_key = exam.get('answerKey', {}).get(str(q_num), '')
                # Is essay?
                if len(str(ans_key)) > 1 and str(ans_key) not in ['A', 'B', 'C', 'D']:
                    # Unsure if score is between 0 and maxScore, or confidence is low
                    if 0 < float(res.get('score', 0)) < float(res.get('maxScore', 1)) or sub.get('confidence', 1) < 0.85:
                        queue_item = {
                            'submissionId': sub['id'],
                            'studentName': sub.get('studentName', 'Unknown'),
                            'examTitle': sub.get('examTitle', ''),
                            'questionNum': q_num,
                            'studentAnswer': res.get('studentAnswer', ''),
                            'suggestedScore': res.get('score', 0),
                            'maxScore': res.get('maxScore', 1),
                            'feedback': res.get('feedback', ''),
                            'referenceAnswer': str(ans_key)
                        }
                        queue.append(queue_item)
        return queue

    @staticmethod
    def apply_grading_rule(exam_id, question_num, student_answer, new_score, feedback=None):
        submissions = SubmissionRepository.get_all()
        updated_count = 0
        
        for sub in submissions:
            if str(sub.get('examId')) != str(exam_id): continue
            
            needs_update = False
            for res in sub.get('results', []):
                if str(res.get('questionNum')) == str(question_num):
                    # Simple similarity check
                    if res.get('studentAnswer', '').strip().lower() == student_answer.strip().lower():
                        res['score'] = float(new_score)
                        if feedback:
                            res['feedback'] = feedback
                        needs_update = True
                        updated_count += 1
                        
            if needs_update:
                total_questions, correct_answers, total_score = calculate_submission_stats(sub['results'])
                update_payload = {
                    'results': sub['results'],
                    'totalQuestions': total_questions,
                    'correctAnswers': correct_answers,
                    'totalScore': total_score,
                    'finalizedAt': now_iso()
                }
                SubmissionRepository.update(sub['id'], update_payload)
                
        return updated_count
