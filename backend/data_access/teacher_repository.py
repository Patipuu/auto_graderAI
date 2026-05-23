from data_access.database import load_db

class TeacherRepository:
    @staticmethod
    def get_by_username(username: str):
        db = load_db()
        return next((t for t in db.get('teachers', []) if t.get('username') == username), None)

    @staticmethod
    def get_by_id(teacher_id: str):
        db = load_db()
        return next((t for t in db.get('teachers', []) if t.get('id') == teacher_id), None)
