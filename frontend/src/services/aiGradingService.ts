export interface GradingResult {
  score: number;
  isCorrect: boolean;
  feedback: string;
}

export interface SubmissionGradeResult {
  studentName?: string | null;
  studentId?: string | null;
  studentClass?: string | null;
  results: Array<{
    questionNum: number;
    studentAnswer: string;
    isCorrect: boolean;
    score: number;
    feedback: string;
  }>;
  totalScore: number;
  confidence: number;
}

const authHeaders = () => {
  const token = localStorage.getItem('teacher_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseApiResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'API request failed');
  }
  return payload as T;
};

export const aiGradingService = {
  async gradeSubmission(
    base64Image: string,
    mimeType: string,
    examId: string,
    gradingType?: string
  ): Promise<SubmissionGradeResult> {
    const response = await fetch('/api/ai/grade-submission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ base64Image, mimeType, examId, gradingType })
    });

    return parseApiResponse<SubmissionGradeResult>(response);
  },

  async evaluateResponse(
    submissionId: string,
    questionNum: number,
    studentAnswer: string
  ): Promise<GradingResult> {
    const response = await fetch('/api/ai/re-evaluate-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ submissionId, questionNum, studentAnswer })
    });

    return parseApiResponse<GradingResult>(response);
  },

  async analyzeOverallPerformance(submissionId: string): Promise<string> {
    const response = await fetch('/api/ai/overall-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ submissionId })
    });

    const result = await parseApiResponse<{ feedback: string }>(response);
    return result.feedback;
  }
};
