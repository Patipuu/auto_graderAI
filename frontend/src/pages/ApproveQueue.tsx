import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CheckCircle2, FileText, AlertCircle, Sparkles, Send } from 'lucide-react';
import MathText from '@/components/MathText';
import { motion, AnimatePresence } from 'framer-motion';

export default function ApproveQueue() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/submissions/queue');
      if (res.ok) {
        const data = await res.json();
        setQueue(data);
      }
    } catch (err) {
      toast.error('Lỗi khi tải danh sách cần duyệt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (item: any) => {
    try {
      // First, get the full submission
      const res = await fetch(`/api/submissions/${item.submissionId}`);
      if (!res.ok) throw new Error('Submission not found');
      const submission = await res.json();

      // Find and update the result
      const newResults = submission.results.map((r: any) =>
        r.questionNum === item.questionNum
          ? { ...r, score: item.suggestedScore }
          : r
      );

      // Recalculate
      const newTotal = newResults.reduce((acc: number, curr: any) => acc + curr.score, 0);

      await fetch(`/api/submissions/${item.submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: newResults, totalScore: newTotal })
      });

      toast.success(`Đã duyệt điểm cho câu ${item.questionNum} của học sinh ${item.studentName} lớp ${item.studentClass}`);
      setQueue(queue.filter(q => !(q.submissionId === item.submissionId && q.questionNum === item.questionNum)));
    } catch (err) {
      toast.error('Lỗi khi duyệt điểm');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Đang tải danh sách chờ duyệt...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hàng đợi kiểm duyệt</h1>
          <p className="text-sm text-slate-500">Các câu tự luận AI không chắc chắn, cần giáo viên xem xét lại.</p>
        </div>
        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
          {queue.length} câu cần duyệt
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {queue.map((item, index) => (
            <motion.div
              key={`${item.submissionId}-${item.questionNum}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full flex flex-col card-polish border-amber-100 shadow-md hover:shadow-lg transition-all overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-200" />
                <CardHeader className="p-4 pb-2 border-b border-slate-50">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="font-mono bg-slate-50 text-slate-600">Câu {item.questionNum}</Badge>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gợi ý AI</span>
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-black text-amber-600">{Number(item.suggestedScore).toFixed(2)}</span>
                        <span className="text-xs text-slate-400">/ {Number(item.maxScore).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-sm font-bold truncate flex items-center gap-2 text-slate-700">
                    <FileText className="w-4 h-4 text-blue-500" /> {item.examTitle}
                  </CardTitle>
                  <p className="text-xs font-medium text-slate-500 mt-1">Học sinh: <span className="font-bold text-slate-700">{item.studentName}</span></p>
                  <p className="text-xs font-medium text-slate-500 mt-1">Lớp: <span className="font-bold text-slate-700">{item.studentClass}</span></p>
                </CardHeader>
                <CardContent className="p-4 flex-1 flex flex-col gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Đáp án học sinh:</span>
                      <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-h-24 overflow-y-auto whitespace-pre-wrap font-medium">
                        <MathText text={item.studentAnswer || '(Trống)'} />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Rubric / Đáp án mẫu:</span>
                      <div className="text-xs bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 max-h-24 overflow-y-auto whitespace-pre-wrap text-blue-900 line-clamp-3">
                        <MathText text={item.referenceAnswer} />
                      </div>
                    </div>
                    {item.feedback && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                          <Sparkles className="w-3 h-3 text-amber-500" /> Lý do chấm (AI):
                        </span>
                        <div className="text-xs bg-amber-50 p-2.5 rounded-lg border border-amber-100 italic text-amber-800 line-clamp-2">
                          <MathText text={item.feedback} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <div className="flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 ring-amber-500 ring-offset-1 transition-all">
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        max={item.maxScore}
                        value={item.suggestedScore}
                        onChange={(e) => {
                          const newScore = parseFloat(e.target.value);
                          const newQueue = [...queue];
                          const idx = newQueue.findIndex(q => q.submissionId === item.submissionId && q.questionNum === item.questionNum);
                          if (idx !== -1) {
                            newQueue[idx].suggestedScore = isNaN(newScore) ? 0 : Math.min(newScore, item.maxScore);
                            setQueue(newQueue);
                          }
                        }}
                        className="h-10 text-center font-black border-0 bg-transparent rounded-none flex-1 focus-visible:ring-0 px-2"
                      />
                    </div>
                    <Button
                      className="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                      onClick={() => handleApprove(item)}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Duyệt
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {queue.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800">Tuyệt vời!</h2>
            <p className="text-slate-500 mt-2">Hàng đợi trống. Bạn đã duyệt hết tất cả các câu cần thiết.</p>
          </div>
        )}
      </div>
    </div>
  );
}
