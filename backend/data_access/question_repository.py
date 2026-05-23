from data_access.database import load_db, save_db
from typing import List, Dict, Any

class QuestionRepository:
    @staticmethod
    def get_all() -> List[Dict[str, Any]]:
        db = load_db()
        return db.get('questions', [])

    @staticmethod
    def add(question: Dict[str, Any]):
        db = load_db()
        if 'questions' not in db:
            db['questions'] = []
        db['questions'].append(question)
        save_db(db)
        return question

    @staticmethod
    def add_many(questions: List[Dict[str, Any]]):
        db = load_db()
        if 'questions' not in db:
            db['questions'] = []
        db['questions'].extend(questions)
        save_db(db)
        return questions

    @staticmethod
    def delete_by_id(question_id: str) -> bool:
        db = load_db()
        if 'questions' not in db:
            return False

        initial_len = len(db['questions'])
        db['questions'] = [q for q in db['questions'] if q.get('id') != question_id]
        
        if len(db['questions']) != initial_len:
            save_db(db)
            return True
        return False
