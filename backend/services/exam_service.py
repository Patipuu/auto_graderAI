from datetime import datetime
from data_access.exam_repository import ExamRepository
from data_access.question_repository import QuestionRepository

def now_iso():
    return datetime.now().isoformat()

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

class ExamService:
    @staticmethod
    def get_exams(query='', subject=''):
        exams = ExamRepository.get_all()
        if query:
            exams = [e for e in exams if query in e.get('title', '').lower()]
        if subject:
            exams = [e for e in exams if e.get('subject') == subject]
        return exams

    @staticmethod
    def get_exam(exam_id):
        return ExamRepository.get_by_id(exam_id)

    @staticmethod
    def create_exam(data):
        if not data.get('title') or not data.get('subject'):
            return None, "Missing title or subject"
        if not isinstance(data.get('answerKey', {}), dict):
            return None, "answerKey must be object"
            
        question_ids = data.get('questionIds', [])
        if question_ids and not isinstance(question_ids, list):
            return None, "questionIds must be array"

        answer_key = {str(k): v for k, v in data.get('answerKey', {}).items()}
        if question_ids:
            all_questions = QuestionRepository.get_all()
            bank_by_id = {q['id']: q for q in all_questions}
            missing_ids = [qid for qid in question_ids if qid not in bank_by_id]
            if missing_ids:
                return None, f"Some questionIds do not exist: {missing_ids}"

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
        
        ExamRepository.add(new_exam)
        return new_exam, None

    @staticmethod
    def update_exam(exam_id, data):
        exam = ExamRepository.get_by_id(exam_id)
        if not exam:
            return None, "Exam not found"

        previous_question_ids = list(exam.get('questionIds', []))
        update_payload = {}

        for key in ['title', 'subject', 'answerKey', 'questionIds', 'questionCount', 'questionPoints', 'rubricGroups']:
            if key in data:
                update_payload[key] = data[key]

        if 'answerKey' in data:
            update_payload['answerKey'] = {
                str(k): v for k, v in data.get('answerKey', {}).items()
            }

        # Use current exam data and merge updates
        current_data = exam.copy()
        current_data.update(update_payload)

        if (
            'questionIds' in update_payload
            and update_payload['questionIds']
            and update_payload['questionIds'] != previous_question_ids
        ):
            all_questions = QuestionRepository.get_all()
            bank_by_id = {q['id']: q for q in all_questions}
            question_ids = update_payload['questionIds']
            current_data['questionCount'] = len(question_ids)
            current_data['answerKey'] = {
                str(index): bank_by_id.get(question_id, {}).get('correctAnswer', '')
                for index, question_id in enumerate(question_ids, start=1)
            }

        question_count = int(current_data.get('questionCount', 0))
        current_data['questionPoints'] = normalize_question_points(
            current_data.get('questionPoints', {}),
            question_count
        )
        current_data['rubricGroups'] = normalize_rubric_groups(
            current_data.get('rubricGroups', {}),
            question_count
        )
        current_data['totalPoints'] = sum(current_data['questionPoints'].values())

        updated_exam = ExamRepository.update(exam_id, current_data)
        return updated_exam, None

    @staticmethod
    def delete_exam(exam_id):
        deleted = ExamRepository.delete_by_id(exam_id)
        if not deleted:
            return False, "Exam not found"
        return True, None
