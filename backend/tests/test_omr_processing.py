import os
import sys
import base64
import numpy as np
import cv2

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.omr_template_service import generate_omr_template, get_omr_layout, get_bubble_center
from services.omr_service import grade_bubble_sheet

def run_omr_test():
    print("[TEST] Starting OMR Integration Test...")
    
    # 1. Create a dummy exam structure
    exam_id = "TEST-101"
    exam_title = "Test Exam OMR"
    question_count = 20  # let's test 20 questions (1 column)
    
    # Correct answer key
    answer_key = {
        "1": "A", "2": "B", "3": "C", "4": "D",
        "5": "A", "6": "B", "7": "C", "8": "D",
        "9": "A", "10": "B", "11": "C", "12": "D",
        "13": "A", "14": "B", "15": "C", "16": "D",
        "17": "A", "18": "B", "19": "C", "20": "D"
    }
    
    exam = {
        "id": exam_id,
        "title": exam_title,
        "questionCount": question_count,
        "answerKey": answer_key,
        "questionPoints": {str(i): 1.0 for i in range(1, question_count + 1)},
        "gradingType": "OMR"
    }
    
    # 2. Generate template
    print(f"Generating template for {question_count} questions...")
    img, _ = generate_omr_template(question_count, exam_title, exam_id)
    
    # 3. Simulate student marking:
    # Student will mark:
    # Q1: A (Correct)
    # Q2: A (Incorrect, correct is B)
    # Q3: C (Correct)
    # Q4: (Unfilled)
    # Q5: A and B (Multiple/Invalid)
    # Others correct
    student_marks = {}
    for q in range(1, question_count + 1):
        q_str = str(q)
        if q == 2:
            student_marks[q_str] = "A"
        elif q == 4:
            student_marks[q_str] = "" # skipped
        elif q == 5:
            student_marks[q_str] = "AB" # multiple
        else:
            student_marks[q_str] = answer_key[q_str]
            
    # Draw student marks on the template image (black filled circles)
    layout = get_omr_layout(question_count)
    marked_img = img.copy()
    
    for q_str, ans in student_marks.items():
        q_num = int(q_str)
        if not ans:
            continue
        for char in ans:
            oi = ord(char) - ord("A")
            cx, cy = get_bubble_center(q_num, oi, layout)
            # Fill the circle with black (simulate pen)
            cv2.circle(marked_img, (cx, cy), layout["bubble_radius"] - 2, (10, 10, 10), -1)
            
    # Save student sheet mock
    os.makedirs("tests/output", exist_ok=True)
    cv2.imwrite("tests/output/student_sheet_mock.png", marked_img)
    print("Mock student sheet saved to tests/output/student_sheet_mock.png")
    
    # Convert to base64
    _, buffer = cv2.imencode('.png', marked_img)
    base64_img = base64.b64encode(buffer).decode('utf-8')
    base64_uri = f"data:image/png;base64,{base64_img}"
    
    # 4. Grade the sheet
    print("Grading the mock student sheet using OpenCV OMR service...")
    result = grade_bubble_sheet(base64_uri, "image/png", exam)
    
    # 5. Assertions
    print("\n--- GRADE RESULTS SUMMARY ---")
    print(f"Success: {result['success']}")
    print(f"Total Score: {result['totalScore']} / {result['maxScore']}")
    
    # Check individual questions
    # Expected score: 20 questions total.
    # Q1: Correct (+1)
    # Q2: Incorrect (+0)
    # Q3: Correct (+1)
    # Q4: Empty (+0)
    # Q5: Multiple (+0)
    # Q6-20: Correct (+15)
    # Total expected score = 1 + 0 + 1 + 0 + 0 + 15 = 17.0
    expected_score = 17.0
    assert result['success'] is True, "Grading should succeed"
    assert result['totalScore'] == expected_score, f"Expected score {expected_score}, got {result['totalScore']}"
    
    # Verify specific questions
    results_map = {r['questionNum']: r for r in result['results']}
    
    assert results_map[1]['studentAnswer'] == "A", f"Q1 student answer should be A, got {results_map[1]['studentAnswer']}"
    assert results_map[1]['isCorrect'] is True
    
    assert results_map[2]['studentAnswer'] == "A", f"Q2 student answer should be A, got {results_map[2]['studentAnswer']}"
    assert results_map[2]['isCorrect'] is False
    
    assert results_map[4]['studentAnswer'] == "", f"Q4 student answer should be empty, got {results_map[4]['studentAnswer']}"
    assert results_map[4]['isCorrect'] is False
    
    assert "A" in results_map[5]['studentAnswer'] and "B" in results_map[5]['studentAnswer'], f"Q5 student answer should be multiple AB, got {results_map[5]['studentAnswer']}"
    assert results_map[5]['isCorrect'] is False
    
    # Save the output marked image to check visual markings
    marked_out_data = base64.b64decode(result['markedImage'].split(",")[-1])
    nparr = np.frombuffer(marked_out_data, np.uint8)
    marked_out_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    cv2.imwrite("tests/output/graded_sheet_output.png", marked_out_img)
    print("Graded result visualization saved to tests/output/graded_sheet_output.png")
    
    print("\nSUCCESS: ALL OMR INTEGRATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_omr_test()
