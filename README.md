# AutoGrader AI

Dự án chấm điểm tự động sử dụng AI, bao gồm hai phần chính: Backend (Python/Flask) và Frontend (Node.js/React Vite).

## Yêu cầu hệ thống

- **Python**: 3.9 trở lên
- **Node.js**: 18 trở lên
- **MongoDB**: Đã cài đặt và đang chạy ở địa chỉ mặc định (`mongodb://localhost:27017`)

---

## 1. Cài đặt thư viện

Để cài đặt dự án, bạn cần cài đặt các thư viện cho cả hai phần riêng biệt.

### Backend (Python)
Mở terminal, di chuyển vào thư mục `backend` và cài đặt các thư viện từ `requirements.txt`:
```bash
cd backend
pip install -r requirements.txt
```

### Frontend (Node.js/React)
Mở một terminal khác, di chuyển vào thư mục `frontend` và cài đặt các module từ `package.json`:
```bash
cd frontend
npm install
```

---

## 2. Cấu hình biến môi trường (.env)

Trước khi chạy dự án, bạn cần tạo file `.env` từ file mẫu cho cả frontend và backend.

- **Backend:** 
  Sao chép `backend/.env.example` thành `backend/.env`. Bạn có thể điền khóa API (`GEMINI_API_KEY`) của mình vào file này để sử dụng tính năng chấm điểm tự động bằng AI.
  
- **Frontend:**
  Sao chép `frontend/.env.example` thành `frontend/.env`.

---

## 3. Cách khởi chạy dự án

Bạn cần mở 2 cửa sổ terminal riêng biệt để chạy song song cả Backend và Frontend.

### Khởi chạy Backend
```bash
cd backend
# Trên môi trường Windows (PowerShell), chạy lệnh sau để tránh lỗi hiển thị emoji:
$env:PYTHONIOENCODING="utf-8"
# Khởi chạy server
python app.py
```
*Backend API sẽ chạy tại địa chỉ: `http://localhost:3000`*

### Khởi chạy Frontend
```bash
cd frontend
npm run dev
```
*Frontend UI sẽ chạy tại địa chỉ: `http://localhost:5173`*

---

## 4. Tài khoản mẫu đăng nhập

Khi truy cập vào đường dẫn Frontend (`http://localhost:5173`), bạn có thể sử dụng các tài khoản mặc định sau để đăng nhập vào hệ thống:

**Tài khoản Giáo viên:**
- Tên đăng nhập: `teacher`
- Mật khẩu: `password`

**Tài khoản Quản trị viên (Admin):**
- Tên đăng nhập: `admin`
- Mật khẩu: `admin`
