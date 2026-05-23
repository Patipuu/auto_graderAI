from datetime import datetime
from data_access.question_repository import QuestionRepository

VALID_DIFFICULTIES = {'Dễ', 'Trung bình', 'Khó', 'Dá»…', 'Trung bÃ¬nh', 'KhÃ³'}

def now_iso():
    return datetime.now().isoformat()

class QuestionService:
    @staticmethod
    def get_questions(query='', subject=''):
        questions = QuestionRepository.get_all()
        if query:
            questions = [q for q in questions if query in q.get('content', '').lower()]
        if subject:
            questions = [q for q in questions if q.get('subject') == subject]
        return questions

    @staticmethod
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
            imported.append(new_q)

        QuestionRepository.add_many(imported)
        return imported, None

    @staticmethod
    def delete_question(question_id):
        deleted = QuestionRepository.delete_by_id(question_id)
        if not deleted:
            return False, "Question not found"
        return True, None
