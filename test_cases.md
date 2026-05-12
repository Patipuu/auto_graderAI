# Kịch bản Kiểm thử (Test Cases) - AutoGrader AI

Dưới đây là bộ Test Cases tổng hợp để kiểm thử thủ công (Manual Testing) toàn bộ các chức năng của hệ thống AutoGrader AI.

---

## 1. Module Xác thực (Authentication)

| ID | Tên Test Case | Các bước thực hiện | Kết quả mong đợi |
|----|--------------|--------------------|-------------------|
| AUTH-01 | Đăng nhập thành công | 1. Mở trang đăng nhập.<br>2. Nhập username đúng (`admin` hoặc `teacher`).<br>3. Nhập password đúng.<br>4. Bấm "Đăng nhập". | Chuyển hướng thành công vào Dashboard. Header hiện đúng tên người dùng. |
| AUTH-02 | Đăng nhập sai mật khẩu | 1. Nhập username đúng.<br>2. Nhập password sai.<br>3. Bấm "Đăng nhập". | Hiển thị thông báo lỗi "Invalid credentials" (hoặc Sai tài khoản/mật khẩu). Không cho phép đăng nhập. |
| AUTH-03 | Đăng nhập bỏ trống trường | 1. Bỏ trống username hoặc password.<br>2. Bấm "Đăng nhập". | Hiển thị cảnh báo yêu cầu nhập đầy đủ thông tin. |
| AUTH-04 | Kiểm tra bảo vệ Route | 1. Mở trình duyệt ẩn danh (chưa đăng nhập).<br>2. Dán link truy cập thẳng vào trang Dashboard hoặc Đề thi. | Hệ thống tự động chuyển hướng (redirect) về lại trang Đăng nhập. |

---

## 2. Module Tổng quan (Dashboard)

| ID | Tên Test Case | Các bước thực hiện | Kết quả mong đợi |
|----|--------------|--------------------|-------------------|
| DASH-01 | Hiển thị thống kê | 1. Truy cập Dashboard.<br>2. Kiểm tra các thẻ thống kê. | Số lượng Đề thi, Câu hỏi, Bài chấm và Điểm trung bình hiển thị chính xác khớp với dữ liệu thực tế. |
| DASH-02 | Cập nhật thống kê | 1. Tạo thêm 1 bài chấm mới có điểm số cụ thể.<br>2. Quay lại Dashboard. | Số bài chấm tăng lên 1, điểm trung bình thay đổi theo công thức đúng. |

---

## 3. Module Ngân hàng Câu hỏi (Question Bank)

| ID | Tên Test Case | Các bước thực hiện | Kết quả mong đợi |
|----|--------------|--------------------|-------------------|
| QEST-01 | Xem danh sách câu hỏi | 1. Vào tab "Ngân hàng câu hỏi". | Danh sách câu hỏi hiển thị đầy đủ, phân trang (nếu có). |
| QEST-02 | Tìm kiếm câu hỏi | 1. Gõ từ khóa nội dung câu hỏi vào ô tìm kiếm. | Danh sách được lọc đúng những câu chứa từ khóa. |
| QEST-03 | Nhập từ văn bản (Import text) | 1. Chọn "Nhập từ văn bản".<br>2. Dán nội dung câu hỏi đúng chuẩn.<br>3. Chọn môn học, độ khó -> Xác nhận. | Hệ thống parse thành công, hiển thị thông báo số lượng thêm mới và xuất hiện trong danh sách. |
| QEST-04 | Nhập từ file (txt/docx/pdf) | 1. Chọn "Nhập từ file".<br>2. Tải lên file `.docx` chứa câu hỏi.<br>3. Xác nhận. | Server extract text thành công, AI parse ra câu hỏi và lưu vào database. |
| QEST-05 | Xóa câu hỏi | 1. Nhấn nút "Xóa" trên 1 câu hỏi.<br>2. Xác nhận xóa. | Câu hỏi biến mất khỏi danh sách. Reset lại trang vẫn không hiển thị lại. |

---

## 4. Module Quản lý Đề thi (Exams)

| ID | Tên Test Case | Các bước thực hiện | Kết quả mong đợi |
|----|--------------|--------------------|-------------------|
| EXAM-01 | Xem danh sách đề thi | 1. Vào tab "Đề thi". | Danh sách các đề thi được liệt kê chi tiết (Tên, Môn, Số câu, Ngày tạo). |
| EXAM-02 | Tạo đề thi thủ công | 1. Chọn "Thêm đề thi".<br>2. Nhập tiêu đề, môn học.<br>3. Nhập số lượng câu (VD: 5).<br>4. Nhập đáp án cho 5 câu.<br>5. Lưu lại. | Đề thi mới được tạo, có tổng điểm mặc định được chia đều cho số lượng câu. |
| EXAM-03 | Tạo đề từ Ngân hàng | 1. Chọn "Tạo từ Ngân hàng câu hỏi".<br>2. Chọn tick một vài câu hỏi có sẵn.<br>3. Nhập tiêu đề và lưu. | Đề thi mới tự động trích xuất đáp án đúng (Answer Key) từ các câu hỏi được chọn. |
| EXAM-04 | Chỉnh sửa đề thi | 1. Chọn sửa một đề thi hiện tại.<br>2. Đổi đáp án câu 1 từ A sang B.<br>3. Lưu lại. | Dữ liệu được cập nhật thành công. Các bài chấm trong tương lai sử dụng đáp án mới. |
| EXAM-05 | Xóa đề thi | 1. Nhấn xóa đề thi.<br>2. Xác nhận. | Đề thi bị xóa khỏi danh sách. |

---

## 5. Module Chấm thi bằng AI (Submissions & Grading)

| ID | Tên Test Case | Các bước thực hiện | Kết quả mong đợi |
|----|--------------|--------------------|-------------------|
| GRAD-01 | Chấm bài qua ảnh (Thành công) | 1. Vào trang "Chấm bài".<br>2. Chọn Đề thi tương ứng.<br>3. Tải lên hình ảnh bài làm rõ nét.<br>4. Gửi yêu cầu chấm. | AI trả về kết quả: Tên/Mã HS, đáp án từng câu (so khớp đúng/sai với Answer Key) và Tổng điểm. |
| GRAD-02 | Chấm bài qua ảnh (Mờ/Khuyết) | 1. Tải lên hình ảnh bài làm cực kỳ mờ hoặc không có chữ.<br>2. Gửi yêu cầu chấm. | Hệ thống trả về thông báo lỗi (AI không nhận diện được) hoặc chấm với độ tin cậy thấp (Confidence score thấp). Cảnh báo cần review thủ công. |
| GRAD-03 | AI Re-evaluate (Chấm lại tự luận) | 1. Mở chi tiết 1 bài chấm có câu tự luận.<br>2. Nhấn nút "Chấm lại bằng AI" cho câu đó. | Gửi request đến AI, AI trả về số điểm mới kèm Feedback chi tiết vì sao cho điểm như vậy dựa trên Rubric. |
| GRAD-04 | AI Overall Feedback | 1. Trong chi tiết bài chấm, nhấn "Tạo nhận xét chung". | AI tổng hợp kết quả các câu đúng/sai để viết một đoạn nhận xét năng lực của học sinh. |
| GRAD-05 | Chỉnh sửa điểm thủ công | 1. Sửa điểm số của một câu (VD: 1.0 -> 0.5) bằng tay.<br>2. Lưu lại. | Tổng điểm của bài thi phải tự động tính toán lại và cập nhật vào Database. |
| GRAD-06 | Xóa bài chấm | 1. Vào tab "Kết quả".<br>2. Nhấn Xóa 1 bài chấm. | Bài chấm bị xóa, tổng số liệu trên Dashboard giảm đi tương ứng. |

---

## 6. Bảo mật và Xử lý Lỗi (Security & Error Handling)

| ID | Tên Test Case | Các bước thực hiện | Kết quả mong đợi |
|----|--------------|--------------------|-------------------|
| SEC-01 | Hết hạn Token | 1. Đăng nhập và để treo trình duyệt 24h (hoặc sửa token thành token hết hạn).<br>2. Thực hiện thao tác API bất kỳ. | API trả về lỗi 401 (Token expired). Frontend đẩy người dùng về trang Đăng nhập. |
| ERR-01 | Sai định dạng file | 1. Chức năng import câu hỏi, tải lên file `.exe` hoặc `.png`. | Backend từ chối, trả về lỗi 400 (Chỉ hỗ trợ txt/docx/pdf). |
| ERR-02 | Thiếu biến môi trường | 1. Chạy hệ thống nhưng cố tình xóa `GEMINI_API_KEY` trong `.env`.<br>2. Bấm chấm bài AI. | API trả về lỗi 500 kèm thông điệp rõ ràng liên quan đến khóa API. |
