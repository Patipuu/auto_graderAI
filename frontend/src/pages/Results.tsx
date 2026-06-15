import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, Download, User, BookOpen, Save, ShieldCheck, Sparkles, RefreshCcw, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { aiGradingService } from '@/services/aiGradingService';
import { cn } from '@/lib/utils';
import MathText from '@/components/MathText';

export default function Results() {
  const { id } = useParams();
  const [submission, setSubmission] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState<number[]>([]);
  const [overallFeedback, setOverallFeedback] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Highlight state: questionNum -> array of highlights
  const [highlights, setHighlights] = useState<Record<number, Array<{ id: string, text: string, note: string }>>>({});
  const [selectionBox, setSelectionBox] = useState<{ show: boolean, x: number, y: number, text: string, questionNum: number } | null>(null);
  const [highlightNote, setHighlightNote] = useState('');
  const [questionModal, setQuestionModal] = useState<{
    questionNum: number;
    questionContent?: string;
    referenceAnswer?: string;
  } | null>(null);
  const [answerModal, setAnswerModal] = useState<{
    questionNum: number;
    studentAnswer?: string;
  } | null>(null);
  const [studentIdDuplicates, setStudentIdDuplicates] = useState<Array<{
    id: string;
    studentName?: string;
    examTitle?: string;
    studentClass?: string;
  }>>([]);

  const UNAVAILABLE_QUESTION = 'Nội dung câu hỏi không khả dụng';
  const COMPACT_CELL_CLASS =
    'max-h-24 overflow-y-auto overflow-x-hidden text-[10px] leading-snug text-slate-500 bg-slate-50 rounded-md border border-slate-100 p-2 break-words [&_.katex]:!text-[10px] [&_.katex]:!leading-snug [&_.katex-display]:!text-[10px] [&_.katex-display]:!my-1 [&_.katex-display]:overflow-x-hidden';
  const COMPACT_ANSWER_CELL_CLASS =
    'max-h-28 overflow-y-auto overflow-x-hidden text-[10px] leading-relaxed text-slate-600 bg-slate-50 rounded-md border border-slate-100 p-2 break-words [&_.katex]:!text-[10px] [&_.katex]:!leading-relaxed [&_.katex-display]:!text-[10px] [&_.katex-display]:!my-1.5 [&_.katex-display]:overflow-x-hidden';

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/submissions/${id}`);
        if (!res.ok) throw new Error('Submission not found');
        const data = await res.json();
        setSubmission(data);
        setOverallFeedback(data.overallFeedback || '');

        // Extract highlights from results
        const loadedHighlights: Record<number, any[]> = {};
        if (data.results) {
          data.results.forEach((r: any) => {
            if (r.highlights && r.highlights.length > 0) {
              loadedHighlights[r.questionNum] = r.highlights;
            }
          });
        }
        setHighlights(loadedHighlights);

      } catch (err) {
        toast.error('Không tìm thấy kết quả');
      } finally {
        setIsLoading(false);
      }
    };
    fetchResult();
  }, [id]);

  const checkStudentIdDuplicate = async (studentId: string, showToast = false) => {
    const trimmed = studentId?.trim();
    if (!trimmed) {
      setStudentIdDuplicates([]);
      return;
    }

    try {
      const params = new URLSearchParams({
        studentId: trimmed,
        ...(id ? { excludeId: id } : {}),
      });
      const res = await fetch(`/api/submissions/check-student-id?${params}`);
      if (!res.ok) return;

      const data = await res.json();
      const matches = data.matches || [];
      setStudentIdDuplicates(matches);

      if (showToast && data.isDuplicate) {
        const names = matches
          .map((m: any) => m.studentName || 'Học sinh không tên')
          .slice(0, 3)
          .join(', ');
        toast.warning(
          `MSHS "${trimmed}" đã tồn tại (${matches.length} bài khác)${names ? `: ${names}` : ''}`,
          { duration: 5000 }
        );
      }
    } catch {
      // ignore check errors
    }
  };

  useEffect(() => {
    if (submission?.studentId?.trim()) {
      checkStudentIdDuplicate(submission.studentId);
    }
  }, [submission?.id]);

  const handleTextSelection = (e: React.MouseEvent, questionNum: number) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      if (selectionBox && !e.nativeEvent.composedPath().some((el: any) => el.id === 'highlight-popup')) {
        setSelectionBox(null);
      }
      return;
    }

    const text = selection.toString().trim();
    if (!text) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectionBox({
      show: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      text,
      questionNum
    });
  };

  const handleAddHighlight = () => {
    if (!selectionBox) return;

    const { questionNum, text } = selectionBox;
    const newHighlight = {
      id: `hl-${Date.now()}`,
      text,
      note: highlightNote || 'Cần chú ý'
    };

    const updatedHighlights = {
      ...highlights,
      [questionNum]: [...(highlights[questionNum] || []), newHighlight]
    };

    setHighlights(updatedHighlights);

    // Update submission state
    const newResults = submission.results.map((r: any) =>
      r.questionNum === questionNum
        ? { ...r, highlights: updatedHighlights[questionNum] }
        : r
    );

    setSubmission({
      ...submission,
      results: newResults
    });

    setSelectionBox(null);
    setHighlightNote('');
    window.getSelection()?.removeAllRanges();
  };

  const handleRemoveHighlight = (questionNum: number, highlightId: string) => {
    const updatedQuestionHighlights = highlights[questionNum]?.filter(h => h.id !== highlightId) || [];

    const updatedHighlights = {
      ...highlights,
      [questionNum]: updatedQuestionHighlights
    };

    setHighlights(updatedHighlights);

    // Update submission state
    const newResults = submission.results.map((r: any) =>
      r.questionNum === questionNum
        ? { ...r, highlights: updatedQuestionHighlights }
        : r
    );

    setSubmission({
      ...submission,
      results: newResults
    });
  };

  const renderHighlightedText = (text: string, questionNum: number, compact = false) => {
    if (!text) return <span className="text-slate-300 italic">Chưa đọc được</span>;

    const qHighlights = highlights[questionNum];
    if (!qHighlights || qHighlights.length === 0) return <MathText text={text} compact={compact} />;

    // Simple implementation for highlighting text
    // Note: This is a basic approach and might have issues with overlapping highlights or HTML
    let elements: React.ReactNode[] = [text];

    qHighlights.forEach((hl) => {
      elements = elements.flatMap((el, i) => {
        if (typeof el !== 'string') return [el];

        const parts = el.split(hl.text);
        if (parts.length === 1) return [el];

        const newElements: React.ReactNode[] = [];
        parts.forEach((part, index) => {
          newElements.push(part);
          if (index < parts.length - 1) {
            newElements.push(
              <span
                key={`${hl.id}-${i}-${index}`}
                className="bg-yellow-200 cursor-pointer group relative px-0.5 rounded"
                onClick={() => handleRemoveHighlight(questionNum, hl.id)}
              >
                {hl.text}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-[200px] p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-50">
                  <p className="font-bold mb-1 border-b border-slate-700 pb-1">Ghi chú</p>
                  <p className="whitespace-pre-wrap">{hl.note}</p>
                  <p className="text-[8px] text-slate-400 mt-2 text-center">(Click để xóa)</p>
                </div>
              </span>
            );
          }
        });
        return newElements;
      });
    });

    return <span className="whitespace-pre-wrap leading-relaxed break-words">{elements}</span>;
  };

  const isEssayQuestion = (res: any) => {
    const ref = (res.referenceAnswer || '').trim().toUpperCase();
    const ans = (res.studentAnswer || '').trim();
    const isSingleMcqPick = ans.length <= 2 && /^[A-Da-d]$/.test(ans);
    if (ref && ['A', 'B', 'C', 'D'].includes(ref) && isSingleMcqPick) return false;
    if (ref && ['A', 'B', 'C', 'D'].includes(ref) && ans.length > 3) return true;
    if (ref && ref.length > 1 && !['A', 'B', 'C', 'D'].includes(ref)) return true;
    return ans.length > 15;
  };

  const getQuestionContent = (res: any) => {
    const content = res.questionContent?.trim();
    if (content && content !== UNAVAILABLE_QUESTION) return content;
    return null;
  };

  const renderEmphasizedFeedback = (feedback?: string) => {
    if (!feedback) return <span className="text-slate-300 italic">—</span>;

    const splitRegex = /(Lý do:|thiếu|chưa đủ|chưa đạt|không đạt|sai|lỗi|chưa đúng|chưa chính xác|cần chú ý|trừ điểm|cần cải thiện|đúng|chính xác|đạt đủ|hoàn chỉnh|xuất sắc)/gi;
    const negativeKw = /^(thiếu|chưa đủ|chưa đạt|không đạt|sai|lỗi|chưa đúng|chưa chính xác|cần chú ý|trừ điểm|cần cải thiện)$/i;
    const positiveKw = /^(đúng|chính xác|đạt đủ|hoàn chỉnh|xuất sắc)$/i;
    const parts = feedback.split(splitRegex).filter(Boolean);

    return (
      <div className="text-xs text-slate-600 leading-relaxed max-h-28 overflow-y-auto break-words whitespace-pre-wrap">
        {parts.map((part, i) => {
          if (part === 'Lý do:') {
            return <strong key={i} className="text-slate-900 font-bold">{part} </strong>;
          }
          if (negativeKw.test(part)) {
            return <strong key={i} className="text-red-700 font-bold">{part}</strong>;
          }
          if (positiveKw.test(part)) {
            return <strong key={i} className="text-green-700 font-bold">{part}</strong>;
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  };

  const renderQuestionAnswerCell = (res: any) => {
    const qContent = getQuestionContent(res);
    return (
      <div className={`${COMPACT_CELL_CLASS} space-y-1.5`}>
        {qContent ? (
          <MathText text={qContent} compact />
        ) : (
          <span className="text-slate-400 italic">Chưa có nội dung</span>
        )}
        {res.referenceAnswer && (
          <div className="pt-1.5 border-t border-slate-200">
            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wide block mb-0.5">Đáp án</span>
            <div className="text-blue-700 font-medium">
              <MathText text={res.referenceAnswer} compact />
            </div>
          </div>
        )}
        {(qContent || res.referenceAnswer) && (
          <button
            type="button"
            onClick={() => setQuestionModal({
              questionNum: res.questionNum,
              questionContent: res.questionContent,
              referenceAnswer: res.referenceAnswer,
            })}
            className="text-[9px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
          >
            <Eye className="w-3 h-3" /> Xem đầy đủ
          </button>
        )}
      </div>
    );
  };

  const renderStudentAnswerCell = (res: any) => {
    const essay = isEssayQuestion(res);
    if (!essay) {
      return (
        <div
          className="text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-md px-2 py-1 text-center"
          onMouseUp={(e) => handleTextSelection(e, res.questionNum)}
        >
          {renderHighlightedText(res.studentAnswer, res.questionNum, false)}
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        <div
          className={COMPACT_ANSWER_CELL_CLASS}
          onMouseUp={(e) => handleTextSelection(e, res.questionNum)}
        >
          {renderHighlightedText(res.studentAnswer, res.questionNum, true)}
        </div>
        {res.studentAnswer?.trim() && (
          <button
            type="button"
            onClick={() => setAnswerModal({
              questionNum: res.questionNum,
              studentAnswer: res.studentAnswer,
            })}
            className="text-[9px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
          >
            <Eye className="w-3 h-3" /> Xem đầy đủ
          </button>
        )}
      </div>
    );
  };

  const renderAIRegradeButton = (questionNum: number) => (
    <Button
      variant="outline"
      size="sm"
      className="h-8 w-full min-w-[104px] text-[10px] font-bold text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 gap-1 shadow-sm"
      onClick={() => handleAIReevaluate(questionNum)}
      disabled={isEvaluating.includes(questionNum)}
      title="Yêu cầu AI chấm lại câu này"
    >
      {isEvaluating.includes(questionNum) ? (
        <RefreshCcw className="w-3 h-3 animate-spin shrink-0" />
      ) : (
        <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
      )}
      AI Chấm lại
    </Button>
  );

  const handleScoreChange = (questionNum: number, newScore: string) => {
    const newResults = submission.results.map((r: any) =>
      r.questionNum === questionNum
        ? { ...r, score: Math.min(parseFloat(newScore) || 0, r.maxScore || 1) }
        : r
    );

    // Recalculate total score
    const newTotal = newResults.reduce((acc: number, curr: any) => acc + curr.score, 0);

    setSubmission({
      ...submission,
      results: newResults,
      totalScore: newTotal
    });
  };

  const handleApplyGradingRule = async (questionNum: number) => {
    const result = submission.results.find((r: any) => r.questionNum === questionNum);
    if (!result || !result.studentAnswer) return;

    try {
      const res = await fetch('/api/submissions/apply-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: submission.examId,
          questionNum: questionNum,
          studentAnswer: result.studentAnswer,
          newScore: result.score,
          feedback: result.feedback
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã áp dụng điểm cho ${data.updatedCount} bài làm tương tự!`);
      } else {
        toast.error('Lỗi khi áp dụng chấm điểm nhanh');
      }
    } catch (err) {
      toast.error('Lỗi kết nối khi chấm điểm nhanh');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Bảng điểm đã được lưu thành công');
      } else {
        toast.error(data.message || 'Lỗi khi lưu bảng điểm');
      }
    } catch (err) {
      toast.error('Lỗi khi lưu bảng điểm');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIReevaluate = async (questionNum: number) => {
    const result = submission.results.find((r: any) => r.questionNum === questionNum);
    if (!result) return;

    setIsEvaluating(prev => [...prev, questionNum]);
    try {
      const evaluation = await aiGradingService.evaluateResponse(
        submission.id,
        questionNum,
        result.studentAnswer
      );

      const newResults = submission.results.map((r: any) =>
        r.questionNum === questionNum ? {
          ...r,
          score: evaluation.score,
          isCorrect: evaluation.isCorrect,
          feedback: `[AI] ${evaluation.feedback}`
        } : r
      );

      const newTotal = newResults.reduce((acc: number, curr: any) => acc + curr.score, 0);

      const updatedSubmission = {
        ...submission,
        results: newResults,
        totalScore: newTotal
      };

      setSubmission(updatedSubmission);
      await fetch(`/api/submissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSubmission)
      });
      toast.success(`Đã tự động chấm lại câu #${questionNum}`);
    } catch (err) {
      toast.error('Lỗi khi chấm điểm bằng AI');
    } finally {
      setIsEvaluating(prev => prev.filter(id => id !== questionNum));
    }
  };

  const handleOverallAnalysis = async () => {
    if (!submission.results) return;
    setIsAnalyzing(true);
    try {
      const feedback = await aiGradingService.analyzeOverallPerformance(submission.id);
      setOverallFeedback(feedback);
      setSubmission({ ...submission, overallFeedback: feedback });
      await fetch(`/api/submissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overallFeedback: feedback })
      });
      toast.success('Đã tạo nhận xét tổng quan bằng AI');
    } catch (err) {
      toast.error('Lỗi khi phân tích bằng AI');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportCsv = () => {
    if (!submission) return;

    const rows = [
      ['Submission ID', submission.id],
      ['Student Name', submission.studentName || ''],
      ['Student ID', submission.studentId || ''],
      ['Exam', submission.examTitle || ''],
      ['Total Score', String(submission.totalScore ?? 0)],
      [],
      ['Question', 'Student Answer', 'Score', 'Correct', 'Feedback'],
      ...(submission.results || []).map((r: any) => [
        r.questionNum,
        r.studentAnswer || '',
        r.score,
        r.isCorrect ? 'true' : 'false',
        r.feedback || ''
      ]),
      [],
      ['Overall Feedback', overallFeedback || submission.overallFeedback || '']
    ];

    const csv = rows
      .map(row => row.map((cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `submission-${submission.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Đang truy xuất kết quả...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
        <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy bài làm</h2>
        <p className="text-sm text-slate-500 mt-1">Vui lòng kiểm tra lại ID hoặc thực hiện chấm bài mới.</p>
        <Link to="/history" className="inline-block mt-6">
          <Button variant="outline" className="rounded-xl">Quay lại Lịch sử chấm bài</Button>
        </Link>
      </div>
    );
  }

  const scoreColor = submission.totalScore >= 8 ? 'text-green-600' : submission.totalScore >= 5 ? 'text-blue-600' : 'text-red-500';

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/history">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Chi tiết kết quả chấm</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submission ID:</span>
              <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 rounded">{submission.id}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 h-10 rounded-xl border-slate-200 hover:bg-white hover:shadow-sm" onClick={handleExportCsv}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            className="gap-2 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95 px-6"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Đang lưu..." : <><Save className="w-4 h-4" /> Lưu bảng điểm</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Left Side: Profile & Student Exam Image */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="card-polish">
            <div className="h-20 bg-slate-900 relative">
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 border-4 border-white rounded-2xl shadow-xl bg-slate-50 overflow-hidden">
                <div className="w-20 h-20 flex items-center justify-center bg-slate-100 text-slate-300">
                  <User className="w-10 h-10" />
                </div>
              </div>
            </div>
            <CardContent className="pt-14 pb-8 px-6 text-center">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên học sinh</label>
                  <Input
                    value={submission.studentName || ''}
                    onChange={e => setSubmission({ ...submission, studentName: e.target.value })}
                    placeholder="Nhập tên học sinh..."
                    className="h-9 text-sm font-bold text-center border-slate-200 mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã số (MSHS)</label>
                    <Input
                      value={submission.studentId || ''}
                      onChange={e => {
                        setSubmission({ ...submission, studentId: e.target.value });
                        if (!e.target.value.trim()) setStudentIdDuplicates([]);
                      }}
                      onBlur={e => checkStudentIdDuplicate(e.target.value, true)}
                      placeholder="Trống..."
                      className={`h-9 text-xs font-mono text-center mt-1 ${
                        studentIdDuplicates.length > 0
                          ? 'border-amber-400 bg-amber-50/50 focus-visible:ring-amber-400'
                          : 'border-slate-200'
                      }`}
                    />
                    {studentIdDuplicates.length > 0 && (
                      <div className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-left">
                        <p className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          MSHS trùng ({studentIdDuplicates.length} bài khác)
                        </p>
                        <ul className="mt-1 space-y-0.5 max-h-20 overflow-y-auto">
                          {studentIdDuplicates.map((m) => (
                            <li key={m.id} className="text-[10px] text-amber-900">
                              <Link to={`/results/${m.id}`} className="hover:underline font-medium">
                                {m.studentName || 'Không tên'}
                              </Link>
                              <span className="text-amber-700"> — {m.examTitle || 'Không rõ đề'}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lớp học</label>
                    <Input
                      value={submission.studentClass || ''}
                      onChange={e => setSubmission({ ...submission, studentClass: e.target.value })}
                      placeholder="Trống..."
                      className="h-9 text-xs font-bold text-center border-slate-200 mt-1 uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col items-center bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kết quả AI</span>
                <div className={`text-6xl font-black mt-2 tracking-tighter ${scoreColor}`}>
                  {submission.totalScore.toFixed(1)}
                </div>
                <div className="w-full mt-4 space-y-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <div className="flex justify-between">
                    <span>Độ tin cậy</span>
                    <span className="text-green-600">{(submission.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={submission.confidence * 100} className="h-1 bg-slate-200" />
                </div>
              </div>

              <div className="mt-6 space-y-3 text-left">
                <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Đề thi</p>
                    <p className="text-xs font-bold truncate max-w-[150px]">{submission.examTitle}</p>
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Trạng thái</p>
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider italic">Vừa hoàn thành</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exam Image Card */}
          <Card className="card-polish overflow-hidden">
             <CardHeader className="py-3 px-6 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold">Ảnh bài làm của học sinh</CardTitle>
                <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold border border-blue-200 text-[10px] uppercase">
                   {submission.gradingType === 'OMR' ? 'OMR OpenCV' : 'Hybrid Text OCR'}
                </Badge>
             </CardHeader>
             <CardContent className="p-4 flex items-center justify-center">
                {submission.gradingType === 'OMR' && submission.markedImage ? (
                  <img src={submission.markedImage} alt="OMR Results" className="w-full h-auto rounded-xl shadow-sm border border-slate-100" />
                ) : submission.studentImage ? (
                  <div className="relative w-full overflow-hidden rounded-xl border border-slate-100 shadow-sm bg-slate-50">
                    <img src={submission.studentImage} alt="Student Handwriting" className="w-full h-auto block" />
                    
                    {/* Bounding box SVG/HTML Overlay */}
                    <div className="absolute inset-0 pointer-events-auto">
                      {submission.results?.map((res: any) => {
                         if (!res.boundingBox) return null;
                         const [ymin, xmin, ymax, xmax] = res.boundingBox;
                         const top = ymin / 10;
                         const left = xmin / 10;
                         const height = (ymax - ymin) / 10;
                         const width = (xmax - xmin) / 10;
                         const isCorrect = res.isCorrect;
                         return (
                           <div
                             key={res.questionNum}
                             style={{
                               position: 'absolute',
                               top: `${top}%`,
                               left: `${left}%`,
                               width: `${width}%`,
                               height: `${height}%`,
                               border: `2px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                               backgroundColor: `${isCorrect ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)'}`,
                             }}
                             className="group transition-all hover:bg-black/10 rounded cursor-help"
                           >
                             <span className={cn(
                               "absolute -top-5 left-0 px-1 py-0.5 rounded text-[8px] font-black text-white shadow-sm pointer-events-none whitespace-nowrap",
                               isCorrect ? "bg-green-600" : "bg-red-500"
                             )}>
                               Câu {res.questionNum}: {res.score}đ
                             </span>
                             
                             {/* Hover tooltip showing feedback */}
                             <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-6 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-lg z-50 pointer-events-none">
                               <p className="font-bold">Câu {res.questionNum}: {res.score}/{res.maxScore}đ</p>
                               <p className="mt-1 line-clamp-3">{res.feedback}</p>
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 italic text-xs">
                     Không tìm thấy ảnh bài làm gốc.
                  </div>
                )}
             </CardContent>
          </Card>
        </div>

        {/* Detailed Results Table */}
        <div className="lg:col-span-3 space-y-6 min-w-0">
          <Card className="card-polish overflow-hidden">
            <CardHeader className="border-b border-slate-100 py-3 px-4 sm:px-5 flex flex-row items-center justify-between bg-slate-50/50">
              <CardTitle className="text-sm sm:text-base font-bold">Phân tích chi tiết câu trả lời</CardTitle>
              <Badge variant="outline" className="bg-white text-[10px] font-bold border-slate-200 shrink-0">
                {submission.results?.length || 0} câu
              </Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-hidden">
              {/* Desktop / laptop table */}
              <div className="hidden md:block">
                <Table className="table-fixed w-full">
                  <colgroup>
                    <col className="w-10" />
                    <col className="w-[16%]" />
                    <col className="w-[18%]" />
                    <col className="w-[120px]" />
                    <col className="w-[84px]" />
                    <col />
                  </colgroup>
                  <TableHeader className="table-header-polish bg-slate-50/80">
                    <TableRow className="hover:bg-transparent border-b border-slate-100">
                      <TableHead className="px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">#</TableHead>
                      <TableHead className="px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Câu hỏi & Đáp án</TableHead>
                      <TableHead className="px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Học sinh trả lời</TableHead>
                      <TableHead className="px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Trạng thái AI</TableHead>
                      <TableHead className="px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Điểm</TableHead>
                      <TableHead className="px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Nhận xét</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submission.results?.map((res: any) => (
                      <TableRow key={res.questionNum} className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/40">
                        <TableCell className="px-2 py-3 align-top whitespace-normal text-center">
                          <span className="text-[11px] font-bold text-slate-400 font-mono">#{res.questionNum}</span>
                        </TableCell>
                        <TableCell className="px-2 py-3 align-top whitespace-normal">
                          {renderQuestionAnswerCell(res)}
                        </TableCell>
                        <TableCell className="px-2 py-3 align-top whitespace-normal">
                          {renderStudentAnswerCell(res)}
                        </TableCell>
                        <TableCell className="px-2 py-3 align-top whitespace-normal">
                          <div className="flex flex-col items-stretch gap-2">
                            {res.isCorrect ? (
                              <Badge className="justify-center bg-green-50 text-green-700 border-green-200 hover:bg-green-50 text-[10px] font-bold gap-1 py-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Chính xác
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="justify-center bg-red-50 text-red-600 border-red-200 text-[10px] font-bold gap-1 py-0.5">
                                <XCircle className="w-3 h-3" /> Sai lệch
                              </Badge>
                            )}
                            {renderAIRegradeButton(res.questionNum)}
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-3 align-top whitespace-normal">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-0.5">
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                max={res.maxScore || 1}
                                value={res.score}
                                onChange={(e) => handleScoreChange(res.questionNum, e.target.value)}
                                className="w-12 h-7 text-center text-xs font-bold border-slate-200 bg-white px-1"
                              />
                              <span className="text-[10px] text-slate-400">/{Number(res.maxScore || 1).toFixed(1)}</span>
                            </div>
                            {res.studentAnswer && res.studentAnswer.length > 5 && (
                              <Button
                                variant="ghost"
                                size="xs"
                                className="h-5 text-[8px] font-bold text-amber-600 hover:bg-amber-50 px-1"
                                onClick={() => handleApplyGradingRule(res.questionNum)}
                              >
                                <Sparkles className="w-2 h-2 mr-0.5" /> Chung
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-3 align-top whitespace-normal">
                          {renderEmphasizedFeedback(res.feedback)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!submission.results && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-16 whitespace-normal">
                          <AlertCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">Không có dữ liệu chi tiết cho bài thi này.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Tablet / mobile card list */}
              <div className="md:hidden divide-y divide-slate-100">
                {submission.results?.map((res: any) => (
                  <div key={res.questionNum} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono text-slate-400">#{res.questionNum}</span>
                      <div className="flex items-center gap-2">
                        {res.isCorrect ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">Chính xác</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px]">Sai lệch</Badge>
                        )}
                        <div className="flex items-center gap-0.5">
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            max={res.maxScore || 1}
                            value={res.score}
                            onChange={(e) => handleScoreChange(res.questionNum, e.target.value)}
                            className="w-12 h-7 text-center text-xs font-bold"
                          />
                          <span className="text-[10px] text-slate-400">/{Number(res.maxScore || 1).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Câu hỏi & Đáp án</p>
                      {renderQuestionAnswerCell(res)}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Trả lời {isEssayQuestion(res) ? '(tự luận)' : ''}
                      </p>
                      {renderStudentAnswerCell(res)}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Trạng thái AI</p>
                      {renderAIRegradeButton(res.questionNum)}
                    </div>
                    {res.feedback && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nhận xét</p>
                        {renderEmphasizedFeedback(res.feedback)}
                      </div>
                    )}
                  </div>
                ))}
                {!submission.results && (
                  <div className="py-16 text-center">
                    <AlertCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Không có dữ liệu chi tiết cho bài thi này.</p>
                  </div>
                )}
              </div>
            </CardContent>
            <footer className="px-6 py-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
              <span className="italic text-[10px] text-slate-400">
                Hệ thống sử dụng mô hình Gemini 1.5 Flash để hậu kiểm kết quả trích xuất quang học (OCR).
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] font-bold uppercase tracking-wider gap-2 bg-white"
                onClick={handleOverallAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <RefreshCcw className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-amber-500" />
                )}
                Tạo nhận xét tổng quát (AI)
              </Button>
            </footer>
          </Card>

          <AnimatePresence>
            {overallFeedback !== null && overallFeedback !== undefined && overallFeedback !== '' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="border-amber-100 bg-amber-50/30 shadow-sm overflow-hidden">
                  <CardHeader className="py-3 px-6 bg-amber-100/50 border-b border-amber-100 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-800">Nhận xét tổng quan từ AI</CardTitle>
                      {overallFeedback !== submission.overallFeedback && (
                        <Badge variant="outline" className="ml-2 text-[9px] border-amber-300 text-amber-600 bg-amber-100/50">Đã chỉnh sửa</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSave}
                      disabled={isSaving || overallFeedback === submission.overallFeedback}
                      className="h-7 text-[10px] font-bold text-amber-700 hover:bg-amber-200"
                    >
                      {isSaving ? "Đang lưu..." : "Lưu nhận xét"}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <textarea
                      className="w-full h-40 p-6 text-sm text-amber-900 leading-relaxed font-medium bg-transparent border-none outline-none resize-none placeholder:text-amber-300"
                      value={overallFeedback}
                      onChange={(e) => {
                        setOverallFeedback(e.target.value);
                        setSubmission({ ...submission, overallFeedback: e.target.value });
                      }}
                      placeholder="Nhập nhận xét tổng quan..."
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Student answer detail modal */}
      <Dialog open={!!answerModal} onOpenChange={(open) => !open && setAnswerModal(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Câu {answerModal?.questionNum} — Đáp án học sinh
            </DialogTitle>
          </DialogHeader>
          {answerModal && (
            <div
              className="rounded-lg bg-slate-50 border border-slate-100 p-4 text-sm text-slate-700 leading-relaxed max-h-[65vh] overflow-y-auto"
              onMouseUp={(e) => handleTextSelection(e, answerModal.questionNum)}
            >
              {renderHighlightedText(answerModal.studentAnswer || '', answerModal.questionNum, false)}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Question detail modal */}
      <Dialog open={!!questionModal} onOpenChange={(open) => !open && setQuestionModal(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Câu {questionModal?.questionNum} — Nội dung & đáp án mẫu
            </DialogTitle>
          </DialogHeader>
          {questionModal && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nội dung câu hỏi</p>
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-slate-700 leading-relaxed whitespace-pre-wrap">
                  <MathText text={
                    questionModal.questionContent?.trim() &&
                    questionModal.questionContent.trim() !== UNAVAILABLE_QUESTION
                      ? questionModal.questionContent
                      : 'Nội dung câu hỏi chưa được lưu cho bài thi này.'
                  } />
                </div>
              </div>
              {questionModal.referenceAnswer && (
                <div>
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1.5">Đáp án / Rubric</p>
                  <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-3 text-blue-900 leading-relaxed whitespace-pre-wrap">
                    <MathText text={questionModal.referenceAnswer} />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Highlight Popup Menu */}
      {selectionBox && selectionBox.show && (
        <div
          id="highlight-popup"
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 w-64 animate-in fade-in zoom-in duration-200"
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">
              Thêm highlight
            </p>
            <div className="bg-yellow-100 px-2 py-1.5 rounded border border-yellow-200 text-xs italic line-clamp-2 text-yellow-900 mb-1">
              "{selectionBox.text}"
            </div>
            <Input
              autoFocus
              placeholder="Ghi chú (VD: Lỗi sai cơ bản)..."
              className="h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
              value={highlightNote}
              onChange={e => setHighlightNote(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddHighlight();
                if (e.key === 'Escape') setSelectionBox(null);
              }}
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] font-bold text-slate-500 hover:text-slate-700"
                onClick={() => setSelectionBox(null)}
              >
                Hủy
              </Button>
              <Button
                size="sm"
                className="h-7 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleAddHighlight}
              >
                Highlight
              </Button>
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-slate-200 rotate-45" />
        </div>
      )}
    </div>
  );
}
