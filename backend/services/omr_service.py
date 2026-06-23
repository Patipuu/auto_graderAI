import cv2
import numpy as np
import base64
from typing import Dict, Any, List, Tuple
from services.omr_template_service import get_omr_layout, get_bubble_center, MARKER_MARGIN

def detect_corners(img: np.ndarray) -> List[Tuple[int, int]]:
    """
    Detect the 4 corner markers (filled black squares) on the OMR sheet.
    Returns sorted markers: [Top-Left, Top-Right, Bottom-Left, Bottom-Right]
    """
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Threshold to find black regions (inverse so black markers become white)
    _, thresh = cv2.threshold(blurred, 100, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter square-like contours
    candidates = []
    img_area = h * w
    min_area = img_area * 0.00005  # minimum area for 60x60 square
    max_area = img_area * 0.02
    
    for c in contours:
        x_c, y_c, w_c, h_c = cv2.boundingRect(c)
        aspect_ratio = float(w_c) / h_c
        area = cv2.contourArea(c)
        solidity = float(area) / (w_c * h_c)
        
        # Check size, aspect ratio and solidity (should be square and solid)
        if min_area <= area <= max_area and 0.7 <= aspect_ratio <= 1.45 and solidity >= 0.75:
            cx = x_c + w_c // 2
            cy = y_c + h_c // 2
            candidates.append((cx, cy))
            
    # Assign candidates to corners based on quadrants
    # Quad corners
    quads = {
        "TL": [],
        "TR": [],
        "BL": [],
        "BR": []
    }
    
    mid_x, mid_y = w // 2, h // 2
    for (cx, cy) in candidates:
        if cx < mid_x and cy < mid_y:
            quads["TL"].append((cx, cy))
        elif cx >= mid_x and cy < mid_y:
            quads["TR"].append((cx, cy))
        elif cx < mid_x and cy >= mid_y:
            quads["BL"].append((cx, cy))
        else:
            quads["BR"].append((cx, cy))
            
    # Choose candidate closest to the absolute corners
    corners = {}
    target_corners = {
        "TL": (0, 0),
        "TR": (w, 0),
        "BL": (0, h),
        "BR": (w, h)
    }
    
    for quad, pts in quads.items():
        if pts:
            tx, ty = target_corners[quad]
            # sort by distance
            pts_sorted = sorted(pts, key=lambda p: (p[0] - tx)**2 + (p[1] - ty)**2)
            corners[quad] = pts_sorted[0]
        else:
            corners[quad] = None
            
    # Fallback/Recovery if a corner is missing (3-point parallelogram estimation)
    if corners["TL"] is None and all(corners[k] is not None for k in ["TR", "BL", "BR"]):
        # TL = BL + TR - BR
        cx = corners["BL"][0] + corners["TR"][0] - corners["BR"][0]
        cy = corners["BL"][1] + corners["TR"][1] - corners["BR"][1]
        corners["TL"] = (cx, cy)
    elif corners["TR"] is None and all(corners[k] is not None for k in ["TL", "BL", "BR"]):
        # TR = TL + BR - BL
        cx = corners["TL"][0] + corners["BR"][0] - corners["BL"][0]
        cy = corners["TL"][1] + corners["BR"][1] - corners["BL"][1]
        corners["TR"] = (cx, cy)
    elif corners["BL"] is None and all(corners[k] is not None for k in ["TL", "TR", "BR"]):
        # BL = TL + BR - TR
        cx = corners["TL"][0] + corners["BR"][0] - corners["TR"][0]
        cy = corners["TL"][1] + corners["BR"][1] - corners["TR"][1]
        corners["BL"] = (cx, cy)
    elif corners["BR"] is None and all(corners[k] is not None for k in ["TL", "TR", "BL"]):
        # BR = TR + BL - TL
        cx = corners["TR"][0] + corners["BL"][0] - corners["TL"][0]
        cy = corners["TR"][1] + corners["BL"][1] - corners["TL"][1]
        corners["BR"] = (cx, cy)
        
    # Final fallback if still missing (just use the image border)
    tl = corners["TL"] if corners["TL"] is not None else (MARKER_MARGIN + 30, MARKER_MARGIN + 30)
    tr = corners["TR"] if corners["TR"] is not None else (w - MARKER_MARGIN - 30, MARKER_MARGIN + 30)
    bl = corners["BL"] if corners["BL"] is not None else (MARKER_MARGIN + 30, h - MARKER_MARGIN - 30)
    br = corners["BR"] if corners["BR"] is not None else (w - MARKER_MARGIN - 30, h - MARKER_MARGIN - 30)
    
    return [tl, tr, bl, br]

def grade_bubble_sheet(base64_image: str, mime_type: str, exam: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process OMR bubble sheet using OpenCV:
    1. Warp perspective using corner markers.
    2. Detect student bubble answers against reference template coordinates.
    3. Grade answers and draw results on the warped image.
    """
    answer_key = {str(k): str(v).upper() for k, v in exam.get('answerKey', {}).items()}
    question_count = int(exam.get('questionCount') or len(answer_key) or 10)
    question_points = {
        str(k): float(v)
        for k, v in (exam.get('questionPoints') or {}).items()
    }
    if not question_points:
        question_points = {str(i): 1.0 for i in range(1, question_count + 1)}
        
    # Decode image
    img_data = base64.b64decode(base64_image.split(",")[-1])
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
        
    h_orig, w_orig = img.shape[:2]
    
    # 1. Detect corners & warp perspective
    pts_src = np.float32(detect_corners(img))
    
    # Reference coordinates
    pts_dst = np.float32([
        [110, 110],       # TL
        [2370, 110],      # TR
        [110, 3398],      # BL
        [2370, 3398]      # BR
    ])
    
    M = cv2.getPerspectiveTransform(pts_src, pts_dst)
    warped = cv2.warpPerspective(img, M, (2480, 3508))
    
    # Get layout constants
    layout = get_omr_layout(question_count)
    
    # 2. Prepare threshold image for bubble density checking
    gray_warped = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    # Calculate block size dynamically based on bubble radius to ensure it is much larger than bubble diameter (so local background is captured)
    b_size = int(layout["bubble_radius"] * 5) | 1
    # Adaptive thresholding to convert to binary (filled parts become white pixels)
    thresh_warped = cv2.adaptiveThreshold(
        gray_warped, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, b_size, 15
    )
    
    results = []
    total_score = 0.0
    options = ["A", "B", "C", "D"]
    
    # 3. Grade each question
    for q in range(1, question_count + 1):
        correct_ans = answer_key.get(str(q), "")
        max_q_score = float(question_points.get(str(q), 1.0))
        
        # Check pixel density for each option A, B, C, D
        filled_ratios = []
        r = layout["bubble_radius"]
        r_mask = r - 5  # check inside region of the bubble to avoid borders
        
        for oi in range(4):
            cx, cy = get_bubble_center(q, oi, layout)
            
            ymin, ymax = cy - r, cy + r
            xmin, xmax = cx - r, cx + r
            
            if ymin >= 0 and ymax <= 3508 and xmin >= 0 and xmax <= 2480:
                roi = thresh_warped[ymin:ymax, xmin:xmax]
                h_roi, w_roi = roi.shape[:2]
                mask = np.zeros((h_roi, w_roi), dtype=np.uint8)
                cv2.circle(mask, (w_roi // 2, h_roi // 2), r_mask, 255, -1)
                
                # Mean value of ROI under mask (0 to 255)
                mean_val = cv2.mean(roi, mask=mask)[0]
                filled_ratios.append(mean_val / 255.0)
            else:
                filled_ratios.append(0.0)
                
        # Determine student answer based on density
        threshold = 0.30
        filled_indices = [i for i, ratio in enumerate(filled_ratios) if ratio >= threshold]
        
        if len(filled_indices) == 0:
            student_ans = ""
        elif len(filled_indices) == 1:
            student_ans = options[filled_indices[0]]
        else:
            # Check if there is a clear winner (one is clearly shaded more than the next)
            sorted_ratios = sorted([(ratio, idx) for idx, ratio in enumerate(filled_ratios)], reverse=True)
            if sorted_ratios[0][0] - sorted_ratios[1][0] > 0.15:
                student_ans = options[sorted_ratios[0][1]]
            else:
                student_ans = "".join([options[i] for i in filled_indices])  # multiple selection
                
        is_correct = (student_ans == correct_ans) and (correct_ans != "")
        q_score = max_q_score if is_correct else 0.0
        
        # 4. Draw markers on the warped image
        for oi, opt in enumerate(options):
            cx, cy = get_bubble_center(q, oi, layout)
            
            if opt == student_ans:
                # Student chose this
                color = (0, 180, 0) if is_correct else (0, 0, 255)
                cv2.circle(warped, (cx, cy), r + 8, color, 4)
                cv2.circle(warped, (cx, cy), 8, color, -1)
            elif opt == correct_ans:
                # Correct option (student missed it)
                cv2.circle(warped, (cx, cy), r + 8, (0, 180, 0), 2)
                
        # Draw status text next to row
        cx_d, cy_d = get_bubble_center(q, 3, layout)
        text_x = cx_d + layout["bubble_spacing"] - 40
        if is_correct:
            cv2.putText(warped, f"+{q_score:.2f}", (text_x, cy_d + 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 180, 0), 2)
            feedback_str = "Đúng"
        else:
            if student_ans == "":
                feedback_str = f"Chưa làm. Đáp án đúng: {correct_ans}"
            else:
                feedback_str = f"Sai (Chọn {student_ans}). Đáp án đúng: {correct_ans}"
            cv2.putText(warped, f"x ({correct_ans})", (text_x, cy_d + 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            
        results.append({
            "questionNum": q,
            "studentAnswer": student_ans,
            "isCorrect": is_correct,
            "score": q_score,
            "maxScore": max_q_score,
            "feedback": feedback_str
        })
        total_score += q_score
        
    # 5. Add Header Band
    cv2.rectangle(warped, (0, 0), (2480, 130), (50, 50, 50), -1)
    title_upper = exam.get('title', 'KỲ THI').upper()
    title_upper = "".join([c for c in title_upper if ord(c) < 128]) # ASCII check/clean
    score_text = f"DIEM SO: {total_score:.2f} / {sum(question_points.values()):.2f} PTS"
    
    cv2.putText(warped, score_text, (80, 85), cv2.FONT_HERSHEY_SIMPLEX, 1.8, (0, 255, 0) if total_score > 0.5 * sum(question_points.values()) else (0, 165, 255), 5)
    
    # 6. Encode marked image
    _, buffer = cv2.imencode('.png', warped)
    marked_base64 = base64.b64encode(buffer).decode('utf-8')
    marked_image_uri = f"data:image/png;base64,{marked_base64}"
    
    return {
        "success": True,
        "studentName": "Học sinh OMR",
        "results": results,
        "totalScore": total_score,
        "maxScore": sum(question_points.values()),
        "markedImage": marked_image_uri
    }
