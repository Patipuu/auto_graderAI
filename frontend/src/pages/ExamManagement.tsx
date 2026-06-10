import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Search, FileEdit, MoreVertical, FileText, AlertTriangle, Library, Check, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MathText from '@/components/MathText';

interface RubricItem {
  id: string;
  description: string;
  points: number;
}

interface RubricGroup {
  id: string;
  title: string;
  items: RubricItem[];
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  questionCount: number;
  answerKey: { [key: number]: string };
  questionPoints?: { [key: number]: number };
  rubricGroups?: { [key: number]: RubricGroup[] };
  totalPoints?: number;
  questionIds?: string[];
  createdAt: string;
}

export default function ExamManagement() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const [newExam, setNewExam] = useState({ title: '', subject: '', questionCount: 10 });
  const [creationMode, setCreationMode] = useState<'manual' | 'bank'>('manual');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [bankTypeFilter, setBankTypeFilter] = useState<'all' | 'trac-nghiem' | 'tu-luan'>('all');
  const [bankDifficultyFilter, setBankDifficultyFilter] = useState<'all' | 'Dễ' | 'Trung bình' | 'Khó'>('all');
  const [bankSubjectFilter, setBankSubjectFilter] = useState<string>('all');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPreviewingBankQ, setIsPreviewingBankQ] = useState(false);
  const [bankQToPreview, setBankQToPreview] = useState<any>(null);
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);

  useEffect(() => {
    fetchExams();
    fetchBankQuestions();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/exams');
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (err) {
      console.error("Fetch exams error:", err);
    }
  };

  const fetchBankQuestions = async () => {
    try {
      const res = await fetch('/api/questions');
      if (res.ok) {
        const data = await res.json();
        setBankQuestions(data);
      }
    } catch (err) {
      console.error("Fetch bank error:", err);
    }
  };

  const getExamQuestions = (exam: Exam) => {
    if (!exam.questionIds || exam.questionIds.length === 0) return [];
    return exam.questionIds.map(id => bankQuestions.find(q => q.id === id)).filter(Boolean);
  };

  const buildDefaultPoints = (count: number) => {
    const points: { [key: number]: number } = {};
    for (let i = 1; i <= count; i++) points[i] = 1;
    return points;
  };

  const createDefaultRubricGroup = (qNum: number, maxPoints = 1): RubricGroup => ({
    id: `q${qNum}-g${Date.now()}`,
    title: 'Nội dung chính',
    items: [
      {
        id: `q${qNum}-i${Date.now()}`,
        description: 'Đạt ý chính theo yêu cầu đề bài',
        points: Math.max(0.25, Math.round(maxPoints * 4) / 4),
      },
    ],
  });

  const roundPoint = (value: number) => Math.max(0.25, Math.round((Number(value) || 0.25) * 4) / 4);

  const getRubricGroups = (exam: Exam, qNum: number): RubricGroup[] => {
    const existing = exam.rubricGroups?.[qNum];
    if (existing && existing.length > 0) return existing;

    const answer = exam.answerKey?.[qNum] || '';
    const point = exam.questionPoints?.[qNum] ?? 1;
    if (!answer.trim()) return [createDefaultRubricGroup(qNum, point)];

    return [{
      id: `q${qNum}-g-legacy`,
      title: 'Rubric đã nhập',
      items: answer
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map((line, index) => ({
          id: `q${qNum}-legacy-${index + 1}`,
          description: line,
          points: roundPoint(point / Math.max(1, answer.split('\n').filter(Boolean).length)),
        })),
    }];
  };

  const rubricTotal = (groups: RubricGroup[]) =>
    groups.reduce((sum, group) => sum + group.items.reduce((itemSum, item) => itemSum + Number(item.points || 0), 0), 0);

  const rubricGroupsToText = (groups: RubricGroup[]) =>
    groups
      .map(group => [
        group.title,
        ...group.items.map(item => `- ${item.description}: ${Number(item.points || 0).toFixed(2)}đ`),
      ].join('\n'))
      .join('\n\n');

  const handleAddExam = async () => {
    if (!newExam.title || !newExam.subject) {
      toast.error('Vui lòng nhập đầy đủ thông tin đề thi');
      return;
    }
    
    let answerKey: { [key: number]: string } = {};
    let questionCount = newExam.questionCount;

    if (creationMode === 'bank') {
      if (selectedQuestionIds.length === 0) {
        toast.error('Vui lòng chọn ít nhất 1 câu hỏi từ ngân hàng');
        return;
      }
      questionCount = selectedQuestionIds.length;
      // Map selected bank questions to answer key
      selectedQuestionIds.forEach((id, index) => {
        const q = bankQuestions.find(bq => bq.id === id);
        if (q) answerKey[index + 1] = q.correctAnswer;
      });
    } else {
      // Manual mode: empty answer key
      for (let i = 1; i <= questionCount; i++) {
        answerKey[i] = '';
      }
    }
    const questionPoints = buildDefaultPoints(questionCount);

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...newExam, 
          questionCount, 
          answerKey,
          questionPoints,
          rubricGroups: {},
          questionIds: creationMode === 'bank' ? selectedQuestionIds : []
        })
      });
      if (res.ok) {
        toast.success('Đã tạo đề thi mới thành công');
        setIsAdding(false);
        setNewExam({ title: '', subject: '', questionCount: 10 });
        setSelectedQuestionIds([]);
        fetchExams();
      }
    } catch (err) {
      toast.error('Lỗi khi tạo đề');
    }
  };

  const handleUpdateExam = async () => {
    if (!editingExam || !editingExam.title || !editingExam.subject) return;

    try {
      const res = await fetch(`/api/exams/${editingExam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingExam)
      });
      if (res.ok) {
        toast.success('Cập nhật đề thi thành công');
        setIsEditing(false);
        setEditingExam(null);
        fetchExams();
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật đề thi');
    }
  };

  const confirmDelete = async (id: string) => {
    setExamToDelete(id);
    setIsDeleting(true);
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;

    try {
      const res = await fetch(`/api/exams/${examToDelete}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Đã xóa đề thi');
        setIsDeleting(false);
        setExamToDelete(null);
        fetchExams();
      }
    } catch (err) {
      toast.error('Lỗi khi xóa đề thi');
    }
  };

  const [isEditingKey, setIsEditingKey] = useState(false);
  const [examForKey, setExamForKey] = useState<Exam | null>(null);
  const [essayModes, setEssayModes] = useState<Record<number, boolean>>({});

  // ... (existing effects and fetch functions)

  const handleUpdateAnswerKey = async () => {
    if (!examForKey) return;

    try {
      const normalizedExam = {
        ...examForKey,
        questionPoints: buildDefaultPoints(examForKey.questionCount),
        rubricGroups: examForKey.rubricGroups || {},
      };
      Object.entries(examForKey.questionPoints || {}).forEach(([key, value]) => {
        normalizedExam.questionPoints[Number(key)] = Math.max(0.25, Math.round((Number(value) || 1) * 4) / 4);
      });
      const res = await fetch(`/api/exams/${examForKey.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedExam)
      });
      if (res.ok) {
        toast.success('Đã cập nhật đáp án mẫu');
        setIsEditingKey(false);
        setExamForKey(null);
        fetchExams();
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật đáp án');
    }
  };

  const filteredExams = exams.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        e.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = filterSubject ? e.subject === filterSubject : true;
    const dateStr = e.createdAt ? new Date(e.createdAt).toISOString().split('T')[0] : '';
    const matchDate = filterDate ? dateStr === filterDate : true;
    return matchSearch && matchSubject && matchDate;
  });

  const bankSubjects = Array.from(new Set(bankQuestions.map(q => q.subject))).filter(Boolean);

  const filteredBankQuestions = bankQuestions.filter(q => {
    const matchesSearch = q.content.toLowerCase().includes(bankSearchQuery.toLowerCase());
    const matchesType = bankTypeFilter === 'all' || q.type === bankTypeFilter;
    const matchesDifficulty = bankDifficultyFilter === 'all' || q.difficulty === bankDifficultyFilter;
    const matchesSubject = bankSubjectFilter === 'all' || q.subject === bankSubjectFilter;
    return matchesSearch && matchesType && matchesDifficulty && matchesSubject;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Thư viện đề thi</h1>
          <p className="text-sm text-slate-500">Quản lý danh sách đề thi và cấu hình đáp án mẫu.</p>
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger
            render={
              <Button size="default" className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95 px-6">
                <Plus className="w-4 h-4" /> Thêm đề mới
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-xl font-bold">Tạo đề thi mới</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tên đề thi</Label>
                  <Input 
                    id="title" 
                    placeholder="Kiểm tra giữa kỳ I" 
                    className="h-11 rounded-xl"
                    value={newExam.title}
                    onChange={e => setNewExam({...newExam, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Môn học</Label>
                  <Input 
                    id="subject" 
                    placeholder="Toán học"
                    className="h-11 rounded-xl"
                    value={newExam.subject}
                    onChange={e => setNewExam({...newExam, subject: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                 <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phương thức tạo câu hỏi</Label>
                 <Tabs defaultValue="manual" className="w-full" onValueChange={(v) => setCreationMode(v as any)}>
                    <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-100 p-1 rounded-xl">
                      <TabsTrigger value="manual" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Nhập thủ công</TabsTrigger>
                      <TabsTrigger value="bank" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Lấy từ ngân hàng</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="manual" className="pt-4 animate-in fade-in-50 duration-300">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="count" className="text-xs font-bold text-slate-600">Tổng số câu hỏi</Label>
                          <Input 
                            id="count" 
                            type="number"
                            className="h-11 rounded-xl w-32"
                            value={newExam.questionCount}
                            onChange={e => setNewExam({...newExam, questionCount: parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                           <p className="text-xs text-blue-700 font-medium leading-relaxed">
                             <span className="font-black uppercase tracking-wider block mb-1">Chế độ thủ công</span>
                             Bạn sẽ tự cấu hình số lượng câu hỏi và sau đó thiết lập đáp án mẫu (Trắc nghiệm hoặc Tự luận) cho từng câu ở bước tiếp theo.
                           </p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="bank" className="pt-4 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex flex-col gap-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input 
                            placeholder="Tìm trong ngân hàng..." 
                            className="pl-9 h-11 rounded-xl"
                            value={bankSearchQuery}
                            onChange={e => setBankSearchQuery(e.target.value)}
                          />
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <select 
                            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                            value={bankTypeFilter}
                            onChange={(e) => setBankTypeFilter(e.target.value as any)}
                          >
                            <option value="all">Tất cả loại</option>
                            <option value="trac-nghiem">Trắc nghiệm</option>
                            <option value="tu-luan">Tự luận</option>
                          </select>

                          <select 
                            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                            value={bankDifficultyFilter}
                            onChange={(e) => setBankDifficultyFilter(e.target.value as any)}
                          >
                            <option value="all">Độ khó</option>
                            <option value="Dễ">Dễ</option>
                            <option value="Trung bình">Trung bình</option>
                            <option value="Khó">Khó</option>
                          </select>

                          <select 
                            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                            value={bankSubjectFilter}
                            onChange={(e) => setBankSubjectFilter(e.target.value)}
                          >
                            <option value="all">Môn học</option>
                            {bankSubjects.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>

                          {(bankTypeFilter !== 'all' || bankDifficultyFilter !== 'all' || bankSubjectFilter !== 'all' || bankSearchQuery !== '') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-9 text-[10px] font-bold text-red-500 uppercase tracking-wider"
                              onClick={() => {
                                setBankTypeFilter('all');
                                setBankDifficultyFilter('all');
                                setBankSubjectFilter('all');
                                setBankSearchQuery('');
                              }}
                            >
                              Xóa lọc
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30 shadow-inner">
                        <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100">
                          {filteredBankQuestions.length > 0 ? (
                            filteredBankQuestions.map(q => (
                              <div 
                                key={q.id} 
                                className={cn(
                                  "flex items-start gap-4 p-4 transition-all cursor-pointer group",
                                  selectedQuestionIds.includes(q.id) ? "bg-blue-50/50" : "hover:bg-white bg-transparent"
                                )}
                                onClick={() => {
                                  if (selectedQuestionIds.includes(q.id)) {
                                    setSelectedQuestionIds(prev => prev.filter(id => id !== q.id));
                                  } else {
                                    setSelectedQuestionIds(prev => [...prev, q.id]);
                                  }
                                }}
                              >
                                <Checkbox 
                                  id={`q-${q.id}`}
                                  checked={selectedQuestionIds.includes(q.id)}
                                  onCheckedChange={() => {}} 
                                  className={cn(
                                    "mt-1 rounded-md border-2",
                                    selectedQuestionIds.includes(q.id) ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200"
                                  )}
                                />
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={cn(
                                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5",
                                      q.type === 'trac-nghiem' ? "text-blue-600 border-blue-200 bg-blue-50" : "text-amber-600 border-amber-200 bg-amber-50"
                                    )}>
                                      {q.type === 'trac-nghiem' ? 'TN' : 'TL'}
                                    </Badge>
                                    <Badge variant="ghost" className="text-[10px] font-bold text-slate-400 bg-white">
                                      {q.difficulty}
                                    </Badge>
                                    <span className="text-[10px] text-slate-400 font-medium ml-auto">ID: {q.id}</span>
                                  </div>
                                  <p className={cn(
                                    "text-sm font-semibold leading-relaxed transition-colors",
                                    selectedQuestionIds.includes(q.id) ? "text-blue-900" : "text-slate-700"
                                  )}>
                                    <MathText text={q.content} />
                                  </p>
                                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <span className="flex items-center gap-1">
                                      <Library className="w-3 h-3" /> {q.subject}
                                    </span>
                                    {q.type === 'trac-nghiem' && (
                                       <span className="text-blue-500 font-black">Lựa chọn: {q.correctAnswer}</span>
                                    )}
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon-xs" 
                                  className="mt-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBankQToPreview(q);
                                    setIsPreviewingBankQ(true);
                                  }}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </div>
                            ))
                          ) : (
                            <div className="py-20 text-center space-y-3 opacity-40">
                               <Search className="w-12 h-12 mx-auto text-slate-300" />
                               <p className="text-sm font-medium italic">Không tìm thấy câu hỏi phù hợp</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm">
                             {selectedQuestionIds.length}
                           </div>
                           <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Câu hỏi đã chọn</span>
                         </div>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="h-8 text-[11px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 uppercase" 
                           onClick={(e) => {
                             e.stopPropagation();
                             setSelectedQuestionIds([]);
                           }}
                           disabled={selectedQuestionIds.length === 0}
                         >
                           Bỏ chọn tất cả
                         </Button>
                      </div>
                    </TabsContent>
                 </Tabs>
              </div>
            </div>
            <DialogFooter className="p-6 border-t border-slate-50">
              <DialogClose render={<Button variant="ghost" className="font-semibold rounded-xl" />}>
                Hủy
              </DialogClose>
              <Button 
                variant="default"
                size="default"
                className="bg-blue-600 hover:bg-blue-700 font-bold px-10 rounded-xl transition-all active:scale-95 shadow-md shadow-blue-100" 
                onClick={handleAddExam}
              >
                Xác nhận tạo đề
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Answer Key Dialog */}
        <Dialog open={isEditingKey} onOpenChange={setIsEditingKey}>
          <DialogContent className="w-[96vw] sm:max-w-[96vw] h-[92vh] max-h-[92vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
            <DialogHeader className="p-6 border-b bg-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black text-slate-900 leading-none">Cấu hình đáp án & rubric</DialogTitle>
                    <p className="text-sm text-slate-400 mt-1 font-medium">{examForKey?.title} • {examForKey?.subject}</p>
                  </div>
                </div>
                <div className="flex gap-4 items-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Trắc nghiệm</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Tự luận</span>
                   </div>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-blue-800 leading-relaxed">
                Nhập rubric theo dàn ý, bước giải và thang điểm 0.25. Với công thức toán, có thể dùng ký hiệu gọn như <code className="font-mono bg-white px-1 rounded">x^2 + 2x + 1 = 0</code> hoặc LaTeX trong từng bước.
              </div>
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
                {examForKey && Array.from({ length: examForKey.questionCount }).map((_, i) => {
                  const qNum = i + 1;
                  const isEssay = essayModes[qNum] || (examForKey.answerKey?.[qNum]?.length > 1);
                  const currentPoint = examForKey.questionPoints?.[qNum] ?? 1;
                  const currentRubricGroups = getRubricGroups(examForKey, qNum);
                  const currentRubricTotal = rubricTotal(currentRubricGroups);
                  // Get linked bank question if available
                  const linkedQuestion = examForKey.questionIds?.[i] 
                    ? bankQuestions.find(q => q.id === examForKey.questionIds![i]) 
                    : null;
                  
                  return (
                    <Card key={qNum} className={cn(
                      "p-5 rounded-2xl border transition-all duration-300",
                      isEssay ? "border-amber-200 bg-amber-50/20" : "border-slate-100 hover:shadow-md hover:border-blue-200 bg-white"
                    )}>
                      <div className="flex items-center justify-between mb-4">
                         <Badge variant="outline" className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                            isEssay ? "border-amber-200 text-amber-600 bg-white" : "border-slate-200 text-slate-400"
                         )}>
                            Câu {qNum}
                         </Badge>
                         <button 
                           onClick={() => setEssayModes(prev => ({ ...prev, [qNum]: !isEssay }))}
                           className="text-[9px] font-bold text-blue-600 hover:underline uppercase"
                         >
                           Chuyển sang {isEssay ? 'Trắc nghiệm' : 'Tự luận'}
                         </button>
                      </div>

                      {/* Display question content from bank if available */}
                      {linkedQuestion && (
                        <div className="mb-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nội dung câu hỏi</p>
                          <p className="text-sm font-semibold text-slate-800 leading-relaxed"><MathText text={linkedQuestion.content} /></p>
                        </div>
                      )}

                      <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Điểm câu</span>
                        <Input
                          type="number"
                          min="0.25"
                          step="0.25"
                          value={currentPoint}
                          onChange={(e) => {
                            const point = Math.max(0.25, Math.round((parseFloat(e.target.value) || 1) * 4) / 4);
                            const questionPoints = { ...(examForKey.questionPoints || buildDefaultPoints(examForKey.questionCount)), [qNum]: point };
                            setExamForKey({ ...examForKey, questionPoints });
                          }}
                          className="h-9 w-24 text-center text-sm font-black"
                        />
                      </div>

                      {isEssay ? (
                        <>
                        <textarea
                          placeholder={`Nhập rubric/dàn ý/thang điểm. Ví dụ:\n- Ý 1: 0.25đ\n- Ý 2: 0.5đ\n- Ý 3: 0.25đ\nToán: bước 1 đúng 0.25, bước 2 đúng 0.5, kết luận đúng 0.25`}
                          className="w-full h-24 p-3 text-xs bg-white border border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono placeholder:text-slate-300 whitespace-pre-wrap leading-relaxed"
                          value={examForKey.answerKey[qNum] || ''}
                          onChange={(e) => {
                            const newKey = { ...examForKey.answerKey, [qNum]: e.target.value };
                            setExamForKey({ ...examForKey, answerKey: newKey });
                          }}
                        />
                        <div className="mt-3 space-y-3">
                          <div className={cn(
                            "flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-[10px] font-bold",
                            Math.abs(currentRubricTotal - currentPoint) > 0.001 ? "border-amber-200 text-amber-700" : "border-emerald-100 text-emerald-700"
                          )}>
                            <span>Rubric groups: {currentRubricTotal.toFixed(2)} / {Number(currentPoint).toFixed(2)} điểm</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 rounded-lg px-2 text-[10px]"
                              onClick={() => {
                                const nextGroups = [...currentRubricGroups, createDefaultRubricGroup(qNum, 0.25)];
                                const rubricGroups = { ...(examForKey.rubricGroups || {}), [qNum]: nextGroups };
                                const newKey = { ...examForKey.answerKey, [qNum]: rubricGroupsToText(nextGroups) };
                                setExamForKey({ ...examForKey, rubricGroups, answerKey: newKey });
                              }}
                            >
                              <Plus className="h-3 w-3" /> Nhóm
                            </Button>
                          </div>

                          <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1">
                            {currentRubricGroups.map((group, groupIndex) => (
                              <div key={group.id} className="rounded-xl border border-amber-100 bg-white p-3">
                                <div className="mb-3 flex items-center gap-2">
                                  <Input
                                    value={group.title}
                                    onChange={(e) => {
                                      const nextGroups = currentRubricGroups.map((g, idx) => idx === groupIndex ? { ...g, title: e.target.value } : g);
                                      const rubricGroups = { ...(examForKey.rubricGroups || {}), [qNum]: nextGroups };
                                      const newKey = { ...examForKey.answerKey, [qNum]: rubricGroupsToText(nextGroups) };
                                      setExamForKey({ ...examForKey, rubricGroups, answerKey: newKey });
                                    }}
                                    className="h-11 text-sm font-bold"
                                    placeholder="Tên nhóm tiêu chí"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-11 w-11 p-0 text-slate-400 hover:text-red-600"
                                    onClick={() => {
                                      const nextGroups = currentRubricGroups.filter((_, idx) => idx !== groupIndex);
                                      const rubricGroups = { ...(examForKey.rubricGroups || {}), [qNum]: nextGroups };
                                      const newKey = { ...examForKey.answerKey, [qNum]: rubricGroupsToText(nextGroups) };
                                      setExamForKey({ ...examForKey, rubricGroups, answerKey: newKey });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  {group.items.map((item, itemIndex) => (
                                    <div key={item.id} className="grid grid-cols-[1fr_110px_40px] gap-2">
                                      <Input
                                        value={item.description}
                                        onChange={(e) => {
                                          const nextGroups = currentRubricGroups.map((g, idx) => idx === groupIndex ? {
                                            ...g,
                                            items: g.items.map((it, ii) => ii === itemIndex ? { ...it, description: e.target.value } : it)
                                          } : g);
                                          const rubricGroups = { ...(examForKey.rubricGroups || {}), [qNum]: nextGroups };
                                          const newKey = { ...examForKey.answerKey, [qNum]: rubricGroupsToText(nextGroups) };
                                          setExamForKey({ ...examForKey, rubricGroups, answerKey: newKey });
                                        }}
                                        className="h-11 text-sm"
                                        placeholder="Tiêu chí chấm"
                                      />
                                      <Input
                                        type="number"
                                        min="0.25"
                                        step="0.25"
                                        value={item.points}
                                        onChange={(e) => {
                                          const point = roundPoint(parseFloat(e.target.value));
                                          const nextGroups = currentRubricGroups.map((g, idx) => idx === groupIndex ? {
                                            ...g,
                                            items: g.items.map((it, ii) => ii === itemIndex ? { ...it, points: point } : it)
                                          } : g);
                                          const rubricGroups = { ...(examForKey.rubricGroups || {}), [qNum]: nextGroups };
                                          const newKey = { ...examForKey.answerKey, [qNum]: rubricGroupsToText(nextGroups) };
                                          setExamForKey({ ...examForKey, rubricGroups, answerKey: newKey });
                                        }}
                                        className="h-11 text-center text-sm font-black"
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-11 w-10 p-0 text-slate-400 hover:text-red-600"
                                        onClick={() => {
                                          const nextGroups = currentRubricGroups.map((g, idx) => idx === groupIndex ? {
                                            ...g,
                                            items: g.items.filter((_, ii) => ii !== itemIndex)
                                          } : g).filter(g => g.items.length > 0);
                                          const rubricGroups = { ...(examForKey.rubricGroups || {}), [qNum]: nextGroups };
                                          const newKey = { ...examForKey.answerKey, [qNum]: rubricGroupsToText(nextGroups) };
                                          setExamForKey({ ...examForKey, rubricGroups, answerKey: newKey });
                                        }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="mt-2 h-8 gap-1 rounded-lg text-[10px] font-bold text-blue-600"
                                  onClick={() => {
                                    const nextGroups = currentRubricGroups.map((g, idx) => idx === groupIndex ? {
                                      ...g,
                                      items: [...g.items, { id: `q${qNum}-i${Date.now()}`, description: '', points: 0.25 }]
                                    } : g);
                                    const rubricGroups = { ...(examForKey.rubricGroups || {}), [qNum]: nextGroups };
                                    const newKey = { ...examForKey.answerKey, [qNum]: rubricGroupsToText(nextGroups) };
                                    setExamForKey({ ...examForKey, rubricGroups, answerKey: newKey });
                                  }}
                                >
                                  <Plus className="h-3 w-3" /> Thêm tiêu chí
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                        </>
                      ) : (
                        <>
                        {/* Display answer options from bank for multiple choice */}
                        {linkedQuestion?.options && (
                          <div className="mb-4 space-y-2">
                            {linkedQuestion.options.map((opt: string, optIdx: number) => {
                              const label = String.fromCharCode(65 + optIdx);
                              const isSelected = examForKey.answerKey[qNum] === label;
                              return (
                                <div key={label} className={cn(
                                  "flex items-center gap-3 p-3 rounded-xl border text-sm transition-all",
                                  isSelected ? "bg-blue-50 border-blue-200 text-blue-700 font-bold" : "bg-slate-50/50 border-slate-100 text-slate-600"
                                )}>
                                  <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                                    isSelected ? "bg-blue-600 text-white" : "bg-white text-slate-400 border"
                                  )}>
                                    {label}
                                  </div>
                                  <span className="flex-1"><MathText text={opt} /></span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex gap-2">
                          {['A', 'B', 'C', 'D'].map(choice => (
                            <button
                              key={choice}
                              type="button"
                              onClick={() => {
                                const newKey = { ...examForKey.answerKey, [qNum]: choice };
                                setExamForKey({ ...examForKey, answerKey: newKey });
                              }}
                              className={cn(
                                "flex-1 h-10 rounded-xl text-xs font-black transition-all transform active:scale-95",
                                examForKey.answerKey[qNum] === choice
                                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100 scale-105"
                                  : "bg-slate-100 text-slate-400 border border-transparent hover:bg-slate-200"
                              )}
                            >
                              {choice}
                            </button>
                          ))}
                        </div>
                        </>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
            <DialogFooter className="p-6 border-t bg-white sticky bottom-0">
              <div className="mr-auto rounded-xl bg-slate-50 px-4 py-2 text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tổng điểm đề</p>
                <p className="text-lg font-black text-slate-900">
                  {examForKey
                    ? (Object.values(examForKey.questionPoints || buildDefaultPoints(examForKey.questionCount)) as number[]).reduce((sum, point) => sum + Number(point || 0), 0).toFixed(2)
                    : '0.00'}
                </p>
              </div>
              <DialogClose render={<Button variant="ghost" className="font-bold px-8" />}>
                Hủy bỏ
              </DialogClose>
              <Button 
                className="bg-slate-900 hover:bg-black text-white font-black px-12 h-12 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95" 
                onClick={handleUpdateAnswerKey}
              >
                Xác nhận lưu cấu hình
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Chỉnh sửa đề thi</DialogTitle>
            </DialogHeader>
            {editingExam && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tên đề thi</Label>
                  <Input 
                    id="edit-title" 
                    className="h-11"
                    value={editingExam.title}
                    onChange={e => setEditingExam({...editingExam, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-subject" className="text-xs font-bold uppercase tracking-wider text-slate-500">Môn học</Label>
                  <Input 
                    id="edit-subject" 
                    className="h-11"
                    value={editingExam.subject}
                    onChange={e => setEditingExam({...editingExam, subject: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-count" className="text-xs font-bold uppercase tracking-wider text-slate-500">Số câu hỏi</Label>
                  <Input 
                    id="edit-count" 
                    type="number"
                    className="h-11"
                    value={editingExam.questionCount}
                    onChange={e => setEditingExam({...editingExam, questionCount: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" className="font-semibold" />}>
                Hủy
              </DialogClose>
              <Button className="bg-blue-600 hover:bg-blue-700 font-semibold px-8 transition-all active:scale-95" onClick={handleUpdateExam}>Lưu thay đổi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
          <AlertDialogContent className="rounded-2xl border-none">
            <AlertDialogHeader className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">Xác nhận xóa đề thi</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-slate-500">
                Hành động này không thể hoàn tác. Mọi bài làm đã chấm liên quan đến đề thi này cũng sẽ bị xóa khỏi hệ thống.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
              <AlertDialogCancel variant="outline" size="default" className="rounded-xl font-semibold border-slate-200">Hủy</AlertDialogCancel>
              <AlertDialogAction className="rounded-xl font-semibold bg-red-500 hover:bg-red-600 shadow-md shadow-red-100" onClick={handleDeleteExam}>
                Xác nhận xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card className="card-polish">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Tìm kiếm đề thi..." 
              className="pl-10 h-10 bg-white border-slate-200 text-sm focus:ring-blue-500 rounded-xl" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select 
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
          >
            <option value="">Tất cả môn</option>
            {Array.from(new Set(exams.map(e => e.subject).filter(Boolean))).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          
          <input 
            type="date"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />

          <div className="ml-auto text-[10px] font-bold text-slate-400 uppercase truncate">
             Hiển thị {filteredExams.length} đề thi
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="table-header-polish">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6 py-4 font-semibold">Tên đề</TableHead>
                <TableHead className="px-6 py-4 font-semibold">Môn học</TableHead>
                <TableHead className="px-6 py-4 font-semibold">Số câu</TableHead>
                <TableHead className="px-6 py-4 font-semibold">Ngày tạo</TableHead>
                <TableHead className="px-6 py-4 font-semibold text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredExams.map((exam) => (
                  <motion.tr 
                    key={exam.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => {
                      setExamForKey(exam);
                      setIsEditingKey(true);
                    }}
                  >
                    <TableCell className="px-6 py-4">
                      <div className="font-bold text-slate-800">{exam.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {exam.id}</div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] uppercase tracking-wider">{exam.subject}</Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-medium">{exam.questionCount} câu hỏi</span>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {(exam.totalPoints || (Object.values(exam.questionPoints || {}) as number[]).reduce((sum, point) => sum + Number(point || 0), 0) || exam.questionCount).toFixed(2)} điểm
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-slate-400 text-xs font-medium">
                      {new Date(exam.createdAt).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewExam(exam);
                            setIsPreviewing(true);
                          }}
                          title="Xem kỳ thi"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-green-600 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExamForKey(exam);
                            setIsEditingKey(true);
                          }}
                          title="Cấu hình đáp án"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingExam(exam);
                            setIsEditing(true);
                          }}
                        >
                          <FileEdit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(exam.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="group-hover:hidden">
                         <MoreVertical className="w-4 h-4 ml-auto text-slate-300" />
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredExams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-400 italic bg-white">
                    <div className="flex flex-col items-center gap-2">
                       <FileText className="w-10 h-10 text-slate-100" />
                       <p className="text-sm">Chưa có đề thi nào trong thư viện.</p>
                       <Button variant="link" className="text-blue-600 text-xs font-bold uppercase" onClick={() => setIsAdding(true)}>Tạo đề ngay</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <footer className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           <span>Trang 1 / 1</span>
           <div className="flex gap-4">
              <button disabled className="opacity-30 flex items-center gap-1 hover:text-blue-600 transition-colors">Trước</button>
              <button disabled className="opacity-30 flex items-center gap-1 hover:text-blue-600 transition-colors">Tiếp theo</button>
           </div>
        </footer>
      </Card>

      {/* Exam Preview Dialog */}
      <Dialog open={isPreviewing} onOpenChange={setIsPreviewing}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 border-b bg-white">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-100">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900 leading-none">Chi tiết đề thi</DialogTitle>
                <p className="text-sm text-slate-400 mt-1 font-medium">{previewExam?.title} • {previewExam?.subject}</p>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
            <div className="space-y-6">
              {previewExam && getExamQuestions(previewExam).length > 0 ? (
                getExamQuestions(previewExam).map((q, idx) => (
                  <Card key={q.id} className="p-6 rounded-2xl border-slate-100 shadow-sm bg-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-slate-900 text-white font-black">Câu {idx + 1}</Badge>
                        <Badge variant="outline" className={cn(
                          "text-[10px] font-bold uppercase",
                          q.type === 'trac-nghiem' ? "border-blue-200 text-blue-600" : "border-amber-200 text-amber-600"
                        )}>
                          {q.type === 'trac-nghiem' ? 'Trắc nghiệm' : 'Tự luận'}
                        </Badge>
                      </div>
                      <Badge variant="ghost" className="text-[10px] font-medium text-slate-400">ID: {q.id}</Badge>
                    </div>
                    <p className="text-base font-bold text-slate-800 mb-6 leading-relaxed"><MathText text={q.content} /></p>
                    
                    {q.type === 'trac-nghiem' && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt, i) => {
                          const label = String.fromCharCode(65 + i);
                          const isCorrect = label === q.correctAnswer;
                          return (
                            <div key={label} className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border text-sm",
                              isCorrect ? "bg-green-50 border-green-200 text-green-700 font-bold" : "bg-slate-50 border-slate-100 text-slate-600"
                            )}>
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                                isCorrect ? "bg-green-600 text-white" : "bg-white text-slate-400 border"
                              )}>
                                {label}
                              </div>
                              <MathText text={opt} />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'tu-luan' && (
                      <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-[10px] font-bold text-amber-700 uppercase mb-2">Đáp án mẫu / Hướng dẫn:</p>
                        <p className="text-sm text-amber-900 italic font-medium"><MathText text={q.correctAnswer} /></p>
                      </div>
                    )}
                  </Card>
                ))
              ) : (
                <div className="py-20 text-center space-y-4 opacity-50">
                  <Library className="w-16 h-16 mx-auto text-slate-300" />
                  <p className="text-slate-500 font-medium italic">Kỳ thi này được cấu hình thủ công hoặc không có dữ liệu câu hỏi chi tiết.</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-white">
            <Button className="w-full bg-slate-900 hover:bg-black text-white font-black h-12 rounded-2xl" onClick={() => setIsPreviewing(false)}>
              Đóng xem chi tiết
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Question Preview Dialog */}
      <Dialog open={isPreviewingBankQ} onOpenChange={setIsPreviewingBankQ}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl p-0">
          <div className="p-6 bg-white rounded-t-xl">
             <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-2 py-0.5",
                  bankQToPreview?.type === 'trac-nghiem' ? "text-blue-600 border-blue-200" : "text-amber-600 border-amber-200"
                )}>
                  {bankQToPreview?.type === 'trac-nghiem' ? 'Trắc nghiệm' : 'Tự luận'}
                </Badge>
                <Badge variant="ghost" className="text-[10px] font-bold text-slate-400">
                  {bankQToPreview?.difficulty}
                </Badge>
             </div>
             <h3 className="text-lg font-bold text-slate-800 leading-relaxed mb-6"><MathText text={bankQToPreview?.content} /></h3>
             
             {bankQToPreview?.type === 'trac-nghiem' && bankQToPreview?.options && (
               <div className="space-y-2 mb-6">
                 {bankQToPreview.options.map((opt: string, i: number) => {
                   const label = String.fromCharCode(65 + i);
                   const isCorrect = label === bankQToPreview.correctAnswer;
                   return (
                     <div key={label} className={cn(
                        "p-3 rounded-xl border text-sm flex items-center gap-3",
                        isCorrect ? "bg-green-50 border-green-200 text-green-700 font-bold" : "bg-slate-50 border-slate-100 text-slate-600"
                     )}>
                       <div className={cn(
                         "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                         isCorrect ? "bg-green-600 text-white" : "bg-white text-slate-400 border"
                       )}>
                         {label}
                       </div>
                       <MathText text={opt} />
                     </div>
                   );
                 })}
               </div>
             )}

             {bankQToPreview?.type === 'tu-luan' && (
               <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 mb-6">
                 <p className="text-[10px] font-bold text-amber-700 uppercase mb-2">Đáp án mẫu:</p>
                 <p className="text-sm text-amber-900 italic"><MathText text={bankQToPreview.correctAnswer} /></p>
               </div>
             )}
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50 rounded-b-xl">
             <Button className="w-full bg-slate-900 hover:bg-black text-white font-bold h-10 rounded-xl" onClick={() => setIsPreviewingBankQ(false)}>Đóng lại</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
