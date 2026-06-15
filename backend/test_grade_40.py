import os
import sys
import cv2
import base64

sys.path.append(r"c:\tmp\autograder\backend")
from services.omr_service import grade_bubble_sheet

def run_test():
    img_path = r"c:\tmp\autograder\omr_mock_filled_40.png"
    if not os.path.exists(img_path):
        print("Image not found")
        return

    with open(img_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
        base64_uri = f"data:image/png;base64,{encoded}"

    exam = {
        "id": "1781015723608",
        "title": "Kiểm tra 40 câu",
        "questionCount": 40,
        "gradingType": "OMR",
        "answerKey": {str(i): "A" for i in range(1, 41)},
        "questionPoints": {str(i): 1 for i in range(1, 41)}
    }

    try:
        result = grade_bubble_sheet(base64_uri, "image/png", exam)
        print("Success:", result.get("success"))
        print("Total score:", result.get("totalScore"))
        # Check if markedImage is returned
        if "markedImage" in result:
            print("Marked image returned. Length:", len(result["markedImage"]))
        else:
            print("No marked image returned!")
    except Exception as e:
        print("Error grading:", str(e))

if __name__ == "__main__":
    run_test()
