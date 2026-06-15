"""
OMR Template Generator
Generates a standardized bubble-sheet answer template image based on questionCount.
Uses PIL to draw high-quality Vietnamese text to support accents natively.
"""

import os
import cv2
import numpy as np
import base64
from PIL import Image, ImageDraw, ImageFont
from typing import Dict, Any, Tuple

# Reference dimensions (A4 @ 300 DPI)
IMG_W = 2480
IMG_H = 3508

MARKER_SIZE = 60
MARKER_MARGIN = 80
MARKERS = [
    (MARKER_MARGIN, MARKER_MARGIN),                              # top-left
    (IMG_W - MARKER_MARGIN - MARKER_SIZE, MARKER_MARGIN),        # top-right
    (MARKER_MARGIN, IMG_H - MARKER_MARGIN - MARKER_SIZE),        # bottom-left
    (IMG_W - MARKER_MARGIN - MARKER_SIZE, IMG_H - MARKER_MARGIN - MARKER_SIZE),  # bottom-right
]

HEADER_Y = 280
TITLE_Y = 160

def draw_text_pil(
    img: np.ndarray,
    text: str,
    pos: Tuple[int, int],
    font_size: int,
    color: Tuple[int, int, int] = (0, 0, 0),
    is_bold: bool = False
) -> np.ndarray:
    """Draw text on OpenCV image using PIL for full Unicode/Vietnamese support."""
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(img_rgb)
    draw = ImageDraw.Draw(pil_img)
    
    # Load Windows system font
    font_name = "arialbd.ttf" if is_bold else "arial.ttf"
    windir = os.environ.get("WINDIR", "C:\\Windows")
    font_path = os.path.join(windir, "Fonts", font_name)
    
    try:
        font = ImageFont.truetype(font_path, font_size)
    except IOError:
        try:
            # Fallback to standard arial.ttf if bold is not found
            font = ImageFont.truetype(os.path.join(windir, "Fonts", "arial.ttf"), font_size)
        except IOError:
            # Final fallback
            font = ImageFont.load_default()
            
    draw.text(pos, text, font=font, fill=color)
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

def get_omr_layout(question_count: int) -> Dict[str, Any]:
    """
    Computes optimal OMR grid layout variables depending on the question count.
    Supports up to 100 questions on a single page by adjusting column count and spacing.
    """
    # 1. Determine column layout
    if question_count <= 20:
        num_cols = 1
        questions_per_col = question_count
    elif question_count <= 40:
        num_cols = 2
        questions_per_col = (question_count + 1) // 2
    elif question_count <= 60:
        num_cols = 3
        questions_per_col = (question_count + 2) // 3
    else: # Up to 100
        num_cols = 4
        questions_per_col = (question_count + 3) // 4
        
    questions_per_col = max(questions_per_col, 5)  # neatness minimum
    
    # 2. Vertical layout
    grid_y_start = 800  # Shifted down from 580 to prevent overlap with header (which goes up to Y=720)
    grid_y_end = 3250
    available_height = grid_y_end - grid_y_start
    
    row_height = available_height // questions_per_col
    row_height = min(130, max(80, row_height))
    
    # 3. Horizontal layout
    margin_left = MARKER_MARGIN + MARKER_SIZE + 60
    margin_right = IMG_W - (MARKER_MARGIN + MARKER_SIZE + 60)
    available_width = margin_right - margin_left
    
    # Bubble dimensions based on columns
    if num_cols == 1:
        bubble_spacing = 160
        bubble_x_offset = 200
        col_width = 800
        bubble_radius = 32
    elif num_cols == 2:
        bubble_spacing = 150
        bubble_x_offset = 180
        col_width = 750
        bubble_radius = 30
    elif num_cols == 3:
        bubble_spacing = 125
        bubble_x_offset = 140
        col_width = 600
        bubble_radius = 26
    else: # 4 cols
        bubble_spacing = 100
        bubble_x_offset = 110
        col_width = 460
        bubble_radius = 22
        
    # Column starting coordinates (X)
    col_x_starts = []
    if num_cols == 1:
        col_x_starts = [(IMG_W - col_width) // 2]
    else:
        step = (available_width - col_width) // (num_cols - 1)
        for i in range(num_cols):
            col_x_starts.append(margin_left + i * step)
            
    return {
        "num_cols": num_cols,
        "questions_per_col": questions_per_col,
        "row_height": row_height,
        "bubble_radius": bubble_radius,
        "bubble_spacing": bubble_spacing,
        "bubble_x_offset": bubble_x_offset,
        "col_x_starts": col_x_starts,
        "grid_y_start": grid_y_start,
        "col_width": col_width
    }

def get_bubble_center(question_num: int, option_index: int, layout: Dict[str, Any]) -> Tuple[int, int]:
    col = (question_num - 1) // layout["questions_per_col"]
    row = (question_num - 1) % layout["questions_per_col"]
    if col >= len(layout["col_x_starts"]):
        col = len(layout["col_x_starts"]) - 1
    col_x = layout["col_x_starts"][col]
    cy = layout["grid_y_start"] + row * layout["row_height"]
    cx = col_x + layout["bubble_x_offset"] + option_index * layout["bubble_spacing"]
    return (cx, cy)

def generate_omr_template(
    question_count: int = 40,
    exam_title: str = "",
    exam_id: str = ""
) -> Tuple[np.ndarray, str]:
    """
    Generate a clean OMR answer-sheet image dynamically sized for the questions count.
    """
    # Force black markers and clean white page
    img = np.ones((IMG_H, IMG_W, 3), dtype=np.uint8) * 255
    
    # 1. Draw corner alignment markers
    for (mx, my) in MARKERS:
        cv2.rectangle(img, (mx, my), (mx + MARKER_SIZE, my + MARKER_SIZE), (0, 0, 0), -1)
        
    # 2. Draw Title (with proper accents)
    img = draw_text_pil(img, "PHIẾU TRẢ LỜI TRẮC NGHIỆM", (IMG_W // 2 - 580, TITLE_Y), 64, is_bold=True)
                
    # Horizontal rule
    cv2.line(img, (MARKER_MARGIN, HEADER_Y), (IMG_W - MARKER_MARGIN, HEADER_Y), (0, 0, 0), 3)
    
    # Exam info lines (using PIL for correct Vietnamese diacritics)
    exam_line = f"Kỳ thi: {exam_title or 'Kiểm tra'}"
    if len(exam_line) > 50:
        exam_line = exam_line[:47] + "..."
    img = draw_text_pil(img, exam_line, (250, HEADER_Y + 40), 36, is_bold=False)
    img = draw_text_pil(img, f"Mã đề thi: {exam_id or '________________'}", (250, HEADER_Y + 110), 36, is_bold=False)
    img = draw_text_pil(img, "Họ và tên học sinh: ____________________________________", (250, HEADER_Y + 180), 36, is_bold=False)
    img = draw_text_pil(img, "MSSV: _________________    Lớp: _________________", (250, HEADER_Y + 250), 36, is_bold=False)
                
    # Get layout configuration
    layout = get_omr_layout(question_count)
    
    # Draw Column headers A B C D
    option_labels = ["A", "B", "C", "D"]
    for col_x in layout["col_x_starts"]:
        bx = col_x + layout["bubble_x_offset"]
        for oi, label in enumerate(option_labels):
            cx = bx + oi * layout["bubble_spacing"]
            # Shift Y up for column labels
            img = draw_text_pil(img, label, (cx - 15, layout["grid_y_start"] - 100), 40, is_bold=True)
                        
    # Draw vertical separator lines between columns if multiple columns
    for i in range(layout["num_cols"] - 1):
        x1 = layout["col_x_starts"][i] + layout["col_width"]
        x2 = layout["col_x_starts"][i+1]
        sep_x = (x1 + x2) // 2
        # Vertical line covering the height of the grid
        y_end = layout["grid_y_start"] + (layout["questions_per_col"] - 1) * layout["row_height"] + 40
        cv2.line(img, (sep_x, layout["grid_y_start"] - 80), (sep_x, y_end), (180, 180, 180), 2)
        
    # 3. Draw question rows
    for q in range(1, question_count + 1):
        col = (q - 1) // layout["questions_per_col"]
        col_x = layout["col_x_starts"][col]
        
        # Draw question number
        label = f"{q}."
        _, cy = get_bubble_center(q, 0, layout)
        img = draw_text_pil(img, label, (col_x, cy - 22), 36, is_bold=True)
                    
        # Draw bubbles (A, B, C, D)
        for oi in range(4):
            cx, cy = get_bubble_center(q, oi, layout)
            cv2.circle(img, (cx, cy), layout["bubble_radius"], (0, 0, 0), 2)
            
    # 4. Footer
    footer_y = layout["grid_y_start"] + layout["questions_per_col"] * layout["row_height"] + 100
    footer_y = min(footer_y, IMG_H - 220)
    
    cv2.line(img, (MARKER_MARGIN, footer_y), (IMG_W - MARKER_MARGIN, footer_y), (0, 0, 0), 2)
    img = draw_text_pil(img, "* HỌC SINH TÔ KÍN VÒNG TRÒN ĐÁP ÁN BẰNG BÚT CHÌ 2B HOẶC BÚT MỰC MÀU ĐEN/XANH.", (250, footer_y + 40), 28, is_bold=False)
    img = draw_text_pil(img, "* TRÁNH LÀM DƠ, BẨN, RÁCH HOẶC GẤP PHIẾU PHIÊN CHUẨN.", (250, footer_y + 90), 28, is_bold=False)
                
    # Encode to base64
    _, buffer = cv2.imencode('.png', img)
    b64 = base64.b64encode(buffer).decode('utf-8')
    
    return img, f"data:image/png;base64,{b64}"
