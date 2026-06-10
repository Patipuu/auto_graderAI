"""
AI Grading Service - Gemini Integration
Handles all AI-powered grading and feedback generation.
"""

import os
import json
import re
from datetime import datetime
from google import genai
from google.genai import types
from dotenv import load_dotenv, dotenv_values
from typing import Dict, List, Any

load_dotenv()
_env_file = dotenv_values()
for _key in ['GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_FALLBACK_MODELS']:
    if _env_file.get(_key):
        os.environ[_key] = _env_file[_key]

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-3-flash-preview')
GEMINI_FALLBACK_MODELS = [
    model.strip()
    for model in os.getenv('GEMINI_FALLBACK_MODELS', 'gemini-2.5-flash,gemini-2.0-flash').split(',')
    if model.strip()
]

if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    client = None
    print("⚠  WARNING: GEMINI_API_KEY not set. AI features will not work.")

def build_manual_review_grade(exam: Dict[str, Any], reason: str) -> Dict[str, Any]:
    """Return a non-blocking grading result when Gemini cannot process the request."""
    answer_key = {str(k): v for k, v in exam.get('answerKey', {}).items()}
    question_count = int(exam.get('questionCount') or len(answer_key) or 0)
    question_points = {
        str(k): float(v)
        for k, v in (exam.get('questionPoints') or {}).items()
    }
    if not question_points:
        question_points = {str(i): 1.0 for i in range(1, question_count + 1)}

    return {
        'studentName': None,
        'studentId': None,
        'results': [
            {
                'questionNum': question_num,
                'studentAnswer': '',
                'isCorrect': False,
                'score': 0.0,
                'maxScore': float(question_points.get(str(question_num), 1.0)),
                'feedback': f'{reason} Giáo viên cần kiểm tra và nhập điểm thủ công.'
            }
            for question_num in range(1, question_count + 1)
        ],
        'totalScore': 0.0,
        'maxScore': sum(question_points.values()),
        'confidence': 0.01,
        'requiresManualReview': True,
        'aiStatus': 'quota_exhausted'
    }

def is_retryable_gemini_error(error: Exception) -> bool:
    error_text = str(error)
    return any(marker in error_text for marker in [
        '503',
        'UNAVAILABLE',
        'high demand',
        'RESOURCE_EXHAUSTED',
        '429',
        'Quota exceeded',
    ])

def generate_content_with_fallback(contents: Any, config: Any):
    models = []
    for model in [GEMINI_MODEL, *GEMINI_FALLBACK_MODELS]:
        if model and model not in models:
            models.append(model)

    last_error = None
    for model in models:
        try:
            return client.models.generate_content(
                model=model,
                contents=contents,
                config=config
            )
        except Exception as exc:
            last_error = exc
            if not is_retryable_gemini_error(exc):
                raise

    raise last_error

def round_quarter_point(score: float, max_score: float = 1.0) -> float:
    score = max(0.0, min(float(max_score), float(score or 0)))
    return round(score * 4) / 4

def format_rubric_groups_for_prompt(rubric_groups: Dict[str, Any]) -> str:
    if not isinstance(rubric_groups, dict) or not rubric_groups:
        return "{}"
    return json.dumps(rubric_groups, ensure_ascii=False, indent=2)

# ==================== GEMINI GRADE SUBMISSION ====================

def grade_submission_with_gemini(base64_image: str, mime_type: str, exam: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process exam image via Gemini OCR + grading
    
    Args:
        base64_image: Base64 encoded image data
        mime_type: Image MIME type (e.g., "image/jpeg")
        exam: Exam object with title, subject, answerKey, questionIds
    
    Returns:
        {
            "studentName": str,
            "studentId": str|null,
            "results": [{
                "questionNum": int,
                "studentAnswer": str,
                "isCorrect": bool,
                "score": float (0-1),
                "feedback": str
            }],
            "totalScore": float,
            "confidence": float (0-1)
        }
    """
    if not client:
        raise Exception("Gemini API key not configured")

    answer_key = {str(k): v for k, v in exam.get('answerKey', {}).items()}
    question_count = int(exam.get('questionCount') or len(answer_key) or 0)
    question_points = {
        str(k): float(v)
        for k, v in (exam.get('questionPoints') or {}).items()
    }
    if not question_points:
        question_points = {str(i): 1.0 for i in range(1, question_count + 1)}

    prompt = f"""
    Bạn là một trợ lý giáo vụ AI chuyên chấm điểm bài thi.
    
    Thông tin đề thi:
    - Tên đề: {exam.get('title', 'Unknown')}
    - Môn học: {exam.get('subject', 'Unknown')}
    - Đáp án/rubric chấm theo từng câu: {json.dumps(exam.get('answerKey', {}), ensure_ascii=False)}
    - Structured rubric item groups per question: {format_rubric_groups_for_prompt(exam.get('rubricGroups', {}))}
    - Điểm tối đa từng câu: {json.dumps(question_points, ensure_ascii=False)}
    
    Hãy thực hiện các bước sau:
    1. Trích xuất Tên học sinh từ ảnh (nếu có)
    2. Trích xuất Mã học sinh (nếu có)
    3. Trích xuất Lớp học (ví dụ: Lớp 10A1, Class 9B... Nếu có thì ghi lại, không có thì để null)
    4. Xác định đáp án của học sinh cho từng câu hỏi
    5. Với trắc nghiệm: so sánh đáp án A/B/C/D.
    6. Với tự luận/toán/văn: nếu có Structured rubric item groups thì bắt buộc chấm lần lượt từng item trong từng nhóm trước; nếu không có thì dùng đáp án mẫu như rubric/dàn ý.
    7. Sau khi chấm từng item, tự soát lại một lần nữa: có item nào học sinh đã làm đúng nhưng chưa được cộng điểm không, có item nào bị cộng điểm khi chưa có bằng chứng không.
    8. Cung cấp nhận xét phải bắt đầu bằng "Lý do: [Nguyên nhân cho điểm/trừ điểm]". Ví dụ: "Lý do: Thiếu từ khóa trọng tâm, chỉ đạt 50% yêu cầu."
    
    Trả về JSON với cấu trúc chính xác sau (KHÔNG có text khác):
    {{
        "studentName": "Tên học sinh hoặc null",
        "studentId": "Mã học sinh hoặc null",
        "studentClass": "Tên lớp học hoặc null",
        "results": [
            {{
                "questionNum": 1,
                "studentAnswer": "A hoặc text tự luận",
                "isCorrect": true/false,
                "score": 1.0,
                "feedback": "Lý do: Nhận xét ngắn gọn",
                "criterionAudit": [
                    {{
                        "groupTitle": "Tên nhóm rubric",
                        "itemDescription": "Tiêu chí chấm",
                        "maxPoints": 0.5,
                        "awardedPoints": 0.25,
                        "status": "achieved|partial|missing|unreadable",
                        "evidence": "Trích ngắn phần bài làm liên quan hoặc lý do không đọc được"
                    }}
                ]
            }},
            {{
                "questionNum": 2,
                "studentAnswer": "B",
                "isCorrect": false,
                "score": 0.0,
                "feedback": "Lý do: Sai. Đáp án đúng là A"
            }}
        ],
        "totalScore": 8.5,
        "confidence": 0.92
    }}
    
    Lưu ý:
    - Confidence (0-1): độ tin cạy của OCR. 0.95+ = rất tốt, 0.7-0.95 = bình thường
    - Score: điểm thực tế theo điểm tối đa từng câu, không phải tỷ lệ. Ví dụ câu 2 điểm có thể cho 0.25, 0.5, 1.25, 2.0.
    - Điểm chỉ dùng bước nhảy 0.25 và không vượt quá điểm tối đa của câu.
    - Môn Văn/tự luận: chấm theo mức độ đạt rubric/dàn ý; chấp nhận diễn đạt khác nếu đúng ý.
    - Môn Toán: nếu lời giải nhiều bước, chỉ cho điểm phần/bước làm đúng; sai ở bước nào thì không cộng điểm phần sau phụ thuộc vào bước sai đó.
    - Với từng câu tự luận, score phải bằng tổng awardedPoints trong criterionAudit sau khi làm tròn 0.25.
    - Không được bỏ qua tiêu chí rubric chỉ vì học sinh diễn đạt khác; nếu đúng ý thì phải cộng điểm phù hợp.
    - Nếu OCR không chắc một đoạn liên quan đến tiêu chí, đánh status unreadable hoặc partial thay vì tự kết luận sai.
    - Nếu có Structured rubric item groups, feedback phải nhắc rõ nhóm/item nào đạt, đạt một phần hoặc thiếu.
    - Feedback phải luôn bắt đầu bằng "Lý do: ".
    - Nếu không thể đọc được gì, hãy đặt confidence thấp
    - totalScore = sum của tất cả scores
    """

    try:
        response = generate_content_with_fallback(
            contents=[
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64_image
                            }
                        }
                    ]
                }
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )

        # Parse response
        response_text = response.text.strip()
        
        # Try to extract JSON if wrapped in markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        result = json.loads(response_text)

        # Validate and sanitize result
        if 'results' not in result or not isinstance(result['results'], list):
            raise ValueError("Invalid response structure: missing 'results' array")

        sanitized_results = []
        result_by_num = {
            int(r.get('questionNum')): r
            for r in result.get('results', [])
            if str(r.get('questionNum', '')).isdigit()
        }
        expected_numbers = range(1, question_count + 1) if question_count else sorted(result_by_num.keys())

        for question_num in expected_numbers:
            raw = result_by_num.get(question_num, {})
            max_question_score = float(question_points.get(str(question_num), 1.0))
            score = round_quarter_point(float(raw.get('score', 0) or 0), max_question_score)
            reference_answer = str(answer_key.get(str(question_num), '')).strip()
            student_answer = str(raw.get('studentAnswer', '') or '').strip()
            is_correct = bool(raw.get('isCorrect', False))
            if reference_answer and len(reference_answer) == 1:
                is_correct = student_answer.upper() == reference_answer.upper()
                score = max_question_score if is_correct else 0.0

            criterion_audit = raw.get('criterionAudit', [])
            if not isinstance(criterion_audit, list):
                criterion_audit = []

            sanitized_results.append({
                'questionNum': question_num,
                'studentAnswer': student_answer,
                'isCorrect': is_correct,
                'score': score,
                'maxScore': max_question_score,
                'criterionAudit': criterion_audit,
                'feedback': str(raw.get('feedback', '') or 'Cần giáo viên kiểm tra lại.')
            })

        total_score = sum(r['score'] for r in sanitized_results)
        max_score = sum(float(question_points.get(str(i), 1.0)) for i in expected_numbers)
        confidence = max(0.0, min(1.0, float(result.get('confidence', 0.8) or 0.8)))

        return {
            'studentName': result.get('studentName'),
            'studentId': result.get('studentId'),
            'studentClass': result.get('studentClass'),
            'results': sanitized_results,
            'totalScore': total_score,
            'maxScore': max_score,
            'confidence': confidence
        }

    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse Gemini response as JSON: {str(e)}\nResponse: {response.text[:200]}")
    except Exception as e:
        error_text = str(e)
        if is_retryable_gemini_error(e):
            return build_manual_review_grade(
                exam,
                'Gemini tạm thời không xử lý được vì quá tải hoặc hết quota API.'
            )
        raise Exception(f"Gemini API error: {str(e)}")

# ==================== GEMINI RE-EVALUATE QUESTION ====================

def evaluate_response(
    question_content: str,
    student_answer: str,
    reference_answer: str,
    max_score: float = 1.0
) -> Dict[str, Any]:
    """
    Re-evaluate a single question
    
    Args:
        question_content: Full question text
        student_answer: Student's response
        reference_answer: Model answer from exam
        max_score: Maximum points for this question
    
    Returns:
        {
            "score": float (0 to max_score),
            "isCorrect": bool,
            "feedback": str
        }
    """
    if not client:
        raise Exception("Gemini API key not configured")

    prompt = f"""
    Bạn là giáo viên chấm bài chuyên nghiệp. Chấm câu trả lời sau:
    
    Câu hỏi: {question_content}
    
    Rubric / dàn ý / đáp án mẫu: {reference_answer}
    
    Câu trả lời của học sinh: {student_answer}
    
    Thang điểm tối đa: {max_score}
    
    Hướng dẫn chấm:
    1. Nếu là trắc nghiệm: so khớp chính xác A/B/C/D.
    2. Nếu là tự luận, Văn, Lịch sử, Giáo lý: dùng rubric/dàn ý như tiêu chí chấm. Không yêu cầu học sinh viết giống hệt; chấp nhận cách diễn đạt khác nếu đúng ý.
    3. Nếu là Toán hoặc bài có nhiều bước: chia theo các ý/bước trong rubric. Học sinh đúng bước nào thì được phần điểm bước đó; sai ở bước nào thì không cộng điểm cho các bước sau phụ thuộc trực tiếp vào bước sai.
    4. Điểm là điểm thực tế trên thang tối đa {max_score}. Chỉ dùng bước nhảy 0.25 và không vượt quá {max_score}.
    5. Feedback phải có cấu trúc rõ ràng. Bắt buộc bắt đầu bằng "Lý do: [lý do chính được điểm hoặc trừ điểm]". Ví dụ: "Lý do: Độ tương đồng ngữ nghĩa đạt 80%, thiếu từ khóa X."
    
    Trả về JSON (CHỈ JSON, không text khác):
    {{
        "score": {max_score},
        "isCorrect": true,
        "feedback": "Lý do: Đạt đủ các ý chính trong rubric. Học sinh trình bày tốt."
    }}
    """

    try:
        response = generate_content_with_fallback(
            contents=[{"role": "user", "parts": [{"text": prompt}]}],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2
            )
        )

        response_text = response.text.strip()
        
        # Extract JSON from markdown if needed
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        result = json.loads(response_text)

        score = round_quarter_point(float(result.get('score', 0)), max_score)
        return {
            'score': score,
            'isCorrect': score >= float(max_score),
            'feedback': str(result.get('feedback', 'Chấm điểm hoàn tất'))
        }

    except Exception as e:
        # Fallback response
        return {
            'score': 0.0,
            'isCorrect': False,
            'feedback': f'Lỗi khi chấm: {str(e)}'
        }

# ==================== GEMINI OVERALL FEEDBACK ====================

def analyze_overall_performance(results: List[Dict[str, Any]]) -> str:
    """
    Generate overall feedback based on all results
    
    Args:
        results: List of result objects from submission
    
    Returns:
        Feedback string (3-4 sentences, encouraging)
    """
    if not client:
        return "Bài thi của em có tiến bộ. Hãy tiếp tục cố gắng!"

    # Build summary
    correct_count = sum(1 for r in results if r.get('isCorrect', False))
    total_count = len(results)
    total_score = sum(r.get('score', 0) for r in results)
    percentage = (total_score / total_count) * 100 if total_count > 0 else 0

    summary = '\n'.join([
        f"Câu {r['questionNum']}: {'✓' if r.get('isCorrect') else '✗'} "
        f"({r.get('score', 0):.1f}) - {r.get('feedback', '')}"
        for r in sorted(results, key=lambda x: x.get('questionNum', 0))
    ])

    prompt = f"""
    Bạn là giáo viên lớp. Đưa ra nhận xét tổng quan về bài thi (3-4 câu, khích lệ, mang tính xây dựng).
    
    Thống kê:
    - Số câu đúng: {correct_count}/{total_count}
    - Tổng điểm: {total_score:.1f}/{total_count}
    - Tỷ lệ: {percentage:.0f}%
    
    Chi tiết từng câu:
    {summary}
    
    Nhận xét nên:
    1. Khen ngợi những gì em làm tốt
    2. Chỉ ra những mảng cần cải thiện
    3. Khích lệ em cố gắng thêm
    4. Lời khuyên cụ thể (nếu có)
    
    Trả về JSON (CHỈ JSON):
    {{
        "feedback": "Nhận xét tổng quan..."
    }}
    """

    try:
        response = generate_content_with_fallback(
            contents=[{"role": "user", "parts": [{"text": prompt}]}],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7
            )
        )

        response_text = response.text.strip()
        
        # Extract JSON
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        result = json.loads(response_text)
        return result.get('feedback', 'Bài thi của em có tiến bộ!')

    except Exception as e:
        # Fallback
        if percentage >= 80:
            return f"Chúc mừng! Em đã đạt {percentage:.0f}%. Bài thi của em rất tốt. Hãy giữ vững thành tích này!"
        elif percentage >= 60:
            return f"Bài thi của em đạt {percentage:.0f}%. Còn một số phần cần cải thiện. Hãy ôn tập kỹ hơn các câu em sai."
        else:
            return f"Bài thi của em đạt {percentage:.0f}%. Em cần ôn tập lại toàn bộ kiến thức. Giáo viên sẵn sàng giúp em."

# ==================== HELPER: PARSE QUESTIONS FROM TEXT ====================

def parse_questions_from_text(text: str, subject: str = "Chung", difficulty: str = "Trung bình") -> List[Dict[str, Any]]:
    """
    Parse Vietnamese exam text into normalized question-bank records.

    Supported examples:
    - Câu 1. Nội dung ... / A. ... / B. ... / Đáp án: B
    - 1) Nội dung ... / a) ... / b) ... / ĐA: A
    - Câu 2: Câu tự luận ... / Đáp án: ý chính ...
    """
    if not text or not text.strip():
        return []

    normalized = text.replace('\r\n', '\n').replace('\r', '\n')
    normalized = re.sub(r'\n{3,}', '\n\n', normalized)

    starts = list(re.finditer(r'(?im)^\s*(?:câu\s*)?\d+\s*[\.\):\-]\s+', normalized))
    if not starts:
        starts = list(re.finditer(r'(?im)^\s*câu\s+\d+\s*[:\.\):\-]?\s+', normalized))

    blocks = []
    if starts:
        for index, match in enumerate(starts):
            end = starts[index + 1].start() if index + 1 < len(starts) else len(normalized)
            blocks.append(normalized[match.start():end].strip())
    else:
        blocks = [b.strip() for b in re.split(r'\n\s*\n', normalized) if b.strip()]

    questions = []
    for block in blocks:
        block = re.sub(r'(?im)^\s*(?:câu\s*)?\d+\s*[\.\):\-]\s*', '', block, count=1).strip()
        if len(block) < 3:
            continue

        answer = ""
        answer_match = re.search(
            r'(?im)^\s*(?:đáp\s*án|dap\s*an|đáp\s*án\s*đúng|đ/a|đa|answer|key)\s*[:\.\-\)]?\s*',
            block
        )
        if answer_match:
            answer = block[answer_match.end():].strip()
            block = block[:answer_match.start()].strip()
        else:
            arrow_matches = list(re.finditer(r'(?im)^\s*(?:=>|→)\s*([A-Da-d]|.+?)\s*$', block))
            if arrow_matches:
                answer = arrow_matches[-1].group(1).strip()
                block = block[:arrow_matches[-1].start()] + block[arrow_matches[-1].end():]

        option_matches = list(re.finditer(
            r'(?ims)^\s*([A-D])\s*[\.\):\-]\s*(.*?)(?=^\s*[A-D]\s*[\.\):\-]\s*|\Z)',
            block
        ))

        options = []
        content = block.strip()
        if option_matches:
            content = block[:option_matches[0].start()].strip()
            options = [
                re.sub(r'\s+', ' ', match.group(2)).strip()
                for match in option_matches
                if match.group(2).strip()
            ]
        else:
            lines = [line.strip() for line in block.split('\n') if line.strip()]
            letter_match = re.search(r'\b([A-D])\b', answer.upper())
            if letter_match and len(lines) >= 3:
                # Many Word exams list choices as four plain lines without A/B/C/D labels.
                # Treat the last 4 short lines before "Đáp án: X" as A-D choices.
                candidate_count = 4 if len(lines) >= 5 else min(4, len(lines) - 1)
                candidate_options = lines[-candidate_count:]
                candidate_content = lines[:-candidate_count]
                short_option_lines = all(len(item) <= 180 for item in candidate_options)
                if candidate_content and len(candidate_options) >= 2 and short_option_lines:
                    content = '\n'.join(candidate_content)
                    options = candidate_options

        content = re.sub(r'\s+', ' ', content).strip()
        answer = '\n'.join(re.sub(r'[ \t]+', ' ', line).strip() for line in answer.splitlines() if line.strip())

        if not content:
            continue

        is_multiple_choice = len(options) >= 2
        if is_multiple_choice:
            letter_match = re.search(r'\b([A-D])\b', answer.upper())
            correct_answer = letter_match.group(1) if letter_match else ""
            q_type = "trac-nghiem"
        else:
            correct_answer = answer or "Chưa có đáp án"
            q_type = "tu-luan"

        questions.append({
            'content': content,
            'type': q_type,
            'options': options if q_type == "trac-nghiem" else [],
            'correctAnswer': correct_answer if correct_answer else "Chưa có đáp án",
            'subject': subject or "Chung",
            'difficulty': difficulty or "Trung bình"
        })

    return questions

if __name__ == "__main__":
    print("✅ AI Service module loaded")
    print("Available functions:")
    print("  - grade_submission_with_gemini()")
    print("  - evaluate_response()")
    print("  - analyze_overall_performance()")
    print("  - parse_questions_from_text()")
