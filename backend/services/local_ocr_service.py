import os
import re
from typing import List, Dict, Any

def perform_local_ocr(base64_image: str, mime_type: str) -> List[Dict[str, Any]]:
    """
    Perform local OCR on student exam sheet to extract text and bounding boxes.
    Returns:
        List of dicts: [
            {"text": str, "boundingBox": [ymin, xmin, ymax, xmax]}
        ]
        Returns empty list if OCR engine is not available — this triggers
        the Gemini Vision fallback in grade_hybrid_submission_with_gemini.
    """
    try:
        import easyocr
        import numpy as np
        import cv2
        import base64

        # Initialize reader (will download model on first run)
        reader = easyocr.Reader(['vi', 'en'], gpu=False)
        
        # Decode base64 image
        img_data = base64.b64decode(base64_image.split(",")[-1])
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        h, w, _ = img.shape
        
        results = reader.readtext(img)
        ocr_lines = []
        
        for (bbox, text, prob) in results:
            xs = [pt[0] for pt in bbox]
            ys = [pt[1] for pt in bbox]
            
            # Normalize coordinates to 0-1000 range
            ymin = int((min(ys) / h) * 1000)
            xmin = int((min(xs) / w) * 1000)
            ymax = int((max(ys) / h) * 1000)
            xmax = int((max(xs) / w) * 1000)
            
            ocr_lines.append({
                "text": text,
                "boundingBox": [ymin, xmin, ymax, xmax],
                "confidence": float(prob)
            })
            
        return ocr_lines
            
    except ImportError:
        print("⚠  EasyOCR not installed. Falling back to Gemini Vision for OCR.")
        return []
    except Exception as e:
        print(f"⚠  Local OCR failed: {e}. Falling back to Gemini Vision.")
        return []

