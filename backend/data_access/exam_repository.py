from data_access.database import load_db, save_db
from typing import List, Dict, Any

class ExamRepository:
    @staticmethod
    def get_all() -> List[Dict[str, Any]]:
        db = load_db()
        return db.get('exams', [])

    @staticmethod
    def get_by_id(exam_id: str) -> Dict[str, Any]:
        db = load_db()
        return next((e for e in db.get('exams', []) if e.get('id') == exam_id), None)

    @staticmethod
    def add(exam: Dict[str, Any]):
        db = load_db()
        if 'exams' not in db:
            db['exams'] = []
        db['exams'].append(exam)
        save_db(db)
        return exam

    @staticmethod
    def update(exam_id: str, exam_data: Dict[str, Any]) -> Dict[str, Any]:
        db = load_db()
        if 'exams' not in db:
            return None

        for idx, e in enumerate(db['exams']):
            if e.get('id') == exam_id:
                # Merge logic is usually handled in service, repository just saves what it's given
                # But for simplicity since we update specific fields, we can just merge the dict
                db['exams'][idx].update(exam_data)
                save_db(db)
                return db['exams'][idx]
        return None

    @staticmethod
    def delete_by_id(exam_id: str) -> bool:
        db = load_db()
        if 'exams' not in db:
            return False

        initial_len = len(db['exams'])
        db['exams'] = [e for e in db['exams'] if e.get('id') != exam_id]
        
        if len(db['exams']) != initial_len:
            save_db(db)
            return True
        return False
