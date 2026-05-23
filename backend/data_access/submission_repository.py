from data_access.database import load_db, save_db
from typing import List, Dict, Any

class SubmissionRepository:
    @staticmethod
    def get_all() -> List[Dict[str, Any]]:
        db = load_db()
        return db.get('submissions', [])

    @staticmethod
    def get_by_id(submission_id: str) -> Dict[str, Any]:
        db = load_db()
        return next((s for s in db.get('submissions', []) if s.get('id') == submission_id), None)

    @staticmethod
    def add(submission: Dict[str, Any]):
        db = load_db()
        if 'submissions' not in db:
            db['submissions'] = []
        db['submissions'].append(submission)
        save_db(db)
        return submission

    @staticmethod
    def update(submission_id: str, submission_data: Dict[str, Any]) -> Dict[str, Any]:
        db = load_db()
        if 'submissions' not in db:
            return None

        for idx, s in enumerate(db['submissions']):
            if s.get('id') == submission_id:
                db['submissions'][idx].update(submission_data)
                save_db(db)
                return db['submissions'][idx]
        return None

    @staticmethod
    def delete_by_id(submission_id: str) -> bool:
        db = load_db()
        if 'submissions' not in db:
            return False

        initial_len = len(db['submissions'])
        db['submissions'] = [s for s in db['submissions'] if s.get('id') != submission_id]
        
        if len(db['submissions']) != initial_len:
            save_db(db)
            return True
        return False
