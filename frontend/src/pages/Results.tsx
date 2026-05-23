import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, Download, User, BookOpen, Save, ShieldCheck, Sparkles, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiGradingService } from '@/services/aiGradingService';
import MathText from '@/components/MathText';

export default function Results() {
  const { id } = useParams();
  const [submission, setSubmission] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState<number[]>([]);
  const [overallFeedback, setOverallFeedback] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/submissions/${id}`);
        if (!res.ok) throw new Error('Submission not found');
        const data = await res.json();
        setSubmission(data);
        setOverallFeedback(data.overallFeedback || '');
      } catch (err) {
        toast.error('Không tìm thấy kết quả');
      } finally {
        setIsLoading(false);
      }
    };
    fetchResult();
  }, [id]);

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });
      if (res.ok) {
        toast.success('Bảng điểm đã được lưu thành công');
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="card-polish">
            <div className="h-20 bg-slate-900 relative">
               <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 border-4 border-white rounded-2xl shadow-xl bg-slate-50 overflow-hidden">
                  <div className="w-20 h-20 flex items-center justify-center bg-slate-100 text-slate-300">
                    <User className="w-10 h-10" />
                  </div>
               </div>
            </div>
            <CardContent className="pt-14 text-center pb-8 px-6">
              <h3 className="text-lg font-black text-slate-900 capitalize leading-tight">{submission.studentName || 'Học sinh ẩn danh'}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Căn cước: {id?.slice(0, 8)}</p>
              
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
        </div>

        {/* Detailed Results Table */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="card-polish">
            <CardHeader className="border-b border-slate-50 py-4 px-6 flex flex-row items-center justify-between bg-slate-50/30">
              <CardTitle className="text-base font-bold">Phân tích chi tiết câu trả lời</CardTitle>
              <div className="flex gap-2">
                 <Badge variant="outline" className="bg-white text-[10px] font-bold border-slate-200">
                   {submission.results?.length || 0} CÂU HỎI
                 </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="table-header-polish">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6 py-4 w-20">TT</TableHead>
                    <TableHead className="px-6 py-4">Học sinh trả lời</TableHead>
                    <TableHead className="px-6 py-4">Trạng thái AI</TableHead>
                    <TableHead className="px-6 py-4">Thang điểm</TableHead>
                    <TableHead className="px-6 py-4">Nhận xét chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submission.results?.map((res: any) => (
                    <TableRow key={res.questionNum} className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-6 py-4 font-bold text-slate-400 font-mono text-xs">#{res.questionNum}</TableCell>
                      <TableCell className="px-6 py-4 font-bold text-slate-700 align-top">
                        <div className="max-w-[260px] max-h-28 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs leading-relaxed">
                          {res.studentAnswer ? <MathText text={res.studentAnswer} /> : <span className="text-slate-300 italic">Chưa đọc được</span>}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {res.isCorrect ? (
                            <div className="flex items-center gap-1.5 text-green-600">
                               <CheckCircle2 className="w-3.5 h-3.5" />
                               <span className="text-[10px] font-bold uppercase tracking-wider">Chính xác</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-red-500">
                               <XCircle className="w-3.5 h-3.5" />
                               <span className="text-[10px] font-bold uppercase tracking-wider">Sai lệch</span>
                            </div>
                          )}
                          <Button 
                            variant="ghost" 
                            size="xs" 
                            className="h-6 w-fit text-[9px] font-black uppercase text-blue-600 hover:bg-blue-50 border border-blue-100 px-2"
                            onClick={() => handleAIReevaluate(res.questionNum)}
                            disabled={isEvaluating.includes(res.questionNum)}
                          >
                            {isEvaluating.includes(res.questionNum) ? (
                              <RefreshCcw className="w-2.5 h-2.5 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="w-2.5 h-2.5 mr-1 text-amber-500" />
                            )}
                            AI Chấm lại
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-1">
                           <Input 
                            type="number" 
                            step="0.25"
                            min="0"
                            max={res.maxScore || 1}
                            value={res.score} 
                            onChange={(e) => handleScoreChange(res.questionNum, e.target.value)}
                            className="w-14 h-8 text-center text-xs font-bold border-slate-200 focus:ring-blue-500 bg-white" 
                          />
                          <span className="text-[10px] font-bold text-slate-400">/ {Number(res.maxScore || 1).toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top">
                        <div className="text-[11px] text-slate-600 leading-relaxed min-w-[280px] max-w-[420px] max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-white border border-slate-100 p-3">
                          <MathText text={res.feedback} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!submission.results && (
                     <TableRow>
                       <TableCell colSpan={5} className="text-center py-20 bg-white">
                         <div className="flex flex-col items-center gap-2">
                           <AlertCircle className="w-8 h-8 text-slate-100" />
                           <p className="text-sm text-slate-400">Không có dữ liệu chi tiết cho bài thi này.</p>
                         </div>
                       </TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
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
            {overallFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="border-amber-100 bg-amber-50/30 shadow-sm overflow-hidden">
                   <CardHeader className="py-3 px-6 bg-amber-100/50 border-b border-amber-100 flex flex-row items-center gap-2">
                     <Sparkles className="w-4 h-4 text-amber-600" />
                     <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-800">Nhận xét tổng quan từ AI</CardTitle>
                   </CardHeader>
                   <CardContent className="p-6">
                      <p className="text-sm text-amber-900 leading-relaxed font-medium italic max-h-56 overflow-y-auto whitespace-pre-wrap pr-2">
                        <MathText text={overallFeedback} />
                      </p>
                   </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
