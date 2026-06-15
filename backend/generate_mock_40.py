import os
import sys
import cv2
import numpy as np

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from services.omr_template_service import generate_omr_template, get_omr_layout, get_bubble_center

def draw_pencil_mark(img, cx, cy, radius):
    # Tạo vết chì đen ngẫu nhiên cho chân thực
    for i in range(35):
        offset_x = np.random.randint(-4, 5)
        offset_y = np.random.randint(-4, 5)
        r = radius - np.random.randint(2, 6)
        color = (np.random.randint(30, 60), np.random.randint(30, 60), np.random.randint(30, 60))
        cv2.circle(img, (cx + offset_x, cy + offset_y), r, color, -1)

# Đề 40 câu
question_count = 40
img, _ = generate_omr_template(question_count, "Kiểm tra 40 câu", "1781015723608")
layout = get_omr_layout(question_count)

# Điền ngẫu nhiên đáp án cho 40 câu
np.random.seed(42)
for q in range(1, question_count + 1):
    # Cố tình để trống vài câu hoặc chọn nhiều đáp án để test nếu cần
    if q == 15:
        continue # Trống
    elif q == 25:
        # Chọn 2 đáp án
        cx, cy = get_bubble_center(q, 0, layout)
        draw_pencil_mark(img, cx, cy, layout['bubble_radius'])
        cx, cy = get_bubble_center(q, 1, layout)
        draw_pencil_mark(img, cx, cy, layout['bubble_radius'])
    else:
        ans = np.random.randint(0, 4)
        cx, cy = get_bubble_center(q, ans, layout)
        draw_pencil_mark(img, cx, cy, layout['bubble_radius'])

# Thông tin học sinh
cv2.putText(img, "Nguyen Van A", (520, 460), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (30, 30, 30), 2)
cv2.putText(img, "123456", (320, 530), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (30, 30, 30), 2)
cv2.putText(img, "12A1", (680, 530), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (30, 30, 30), 2)

out_path = r"c:\tmp\autograder\omr_mock_filled_40.png"
cv2.imwrite(out_path, img)
print(f"Saved to {out_path}")
