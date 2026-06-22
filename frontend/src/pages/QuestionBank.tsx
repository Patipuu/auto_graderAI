import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Trash2, Search, FileUp, Library, Database, CheckCircle2, 
  AlertTriangle, Eye, EyeOff, Sigma, Plus, ArrowLeft, ArrowRight, Check, Sparkles, Loader2 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import MathText from '@/components/MathText';
import VisualFormulaBuilder from '@/components/VisualFormulaBuilder';

interface Question {
  id: string;
  content: string;
  type: 'trac-nghiem' | 'tu-luan';
  options?: string[];
  correctAnswer: string;
  subject: string;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  createdAt: string;
}

export default function QuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSubject, setImportSubject] = useState('Chung');
  const [importDifficulty, setImportDifficulty] = useState<'Dễ' | 'Trung bình' | 'Khó'>('Trung bình');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

  // States for 2-step Import Wizard and Visual Formula Builder
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [parsedQuestions, setParsedQuestions] = useState<Partial<Question>[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [activeBuilderTarget, setActiveBuilderTarget] = useState<{
    qIdx: number;
    field: 'content' | 'option' | 'correctAnswer';
    oIdx?: number;
  } | null>(null);

  // Helper for opening formula builder targeting a specific field
  const openFormulaBuilder = (
    qIdx: number,
    field: 'content' | 'option' | 'correctAnswer',
    oIdx?: number
  ) => {
    setActiveBuilderTarget({ qIdx, field, oIdx });
    setIsBuilderOpen(true);
  };

  // Helper for inserting math expression into targeted input field
  const handleInsertFormula = (latex: string) => {
    if (!activeBuilderTarget) return;
    const { qIdx, field, oIdx } = activeBuilderTarget;

    // Support inserting into Step 1 Textarea
    if (qIdx === -1) {
      const targetId = 'step1-textarea';
      const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
      if (el) {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const val = importText;
        const newVal = val.substring(0, start) + latex + val.substring(end);
        setImportText(newVal);
        setTimeout(() => {
          el.focus();
          const newPos = start + latex.length;
          el.setSelectionRange(newPos, newPos);
        }, 50);
      } else {
        setImportText(prev => prev + latex);
      }
      return;
    }

    const newQuestions = [...parsedQuestions];
    const q = { ...newQuestions[qIdx] };

    let targetId = '';
    if (field === 'content') {
      targetId = `q-content-${qIdx}`;
      const val = q.content || '';
      const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
      if (el) {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        q.content = val.substring(0, start) + latex + val.substring(end);
      } else {
        q.content = val + latex;
      }
    } else if (field === 'option' && typeof oIdx === 'number') {
      targetId = `q-opt-${qIdx}-${oIdx}`;
      const opts = [...(q.options || [])];
      const val = opts[oIdx] || '';
      const el = document.getElementById(targetId) as HTMLInputElement | null;
      if (el) {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        opts[oIdx] = val.substring(0, start) + latex + val.substring(end);
      } else {
        opts[oIdx] = val + latex;
      }
      q.options = opts;
    } else if (field === 'correctAnswer') {
      targetId = `q-ans-${qIdx}`;
      const val = q.correctAnswer || '';
      const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
      if (el) {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        q.correctAnswer = val.substring(0, start) + latex + val.substring(end);
      } else {
        q.correctAnswer = val + latex;
      }
    }

    newQuestions[qIdx] = q;
    setParsedQuestions(newQuestions);

    // Refocus target
    setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.focus();
      }
    }, 50);
  };

  // Structured Manual Edit Handlers
  const handleContentChange = (qIdx: number, val: string) => {
    setParsedQuestions(prev => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], content: val };
      return copy;
    });
  };

  const handleOptionChange = (qIdx: number, oIdx: number, val: string) => {
    setParsedQuestions(prev => {
      const copy = [...prev];
      const q = { ...copy[qIdx] };
      const opts = [...(q.options || [])];
      opts[oIdx] = val;
      q.options = opts;
      copy[qIdx] = q;
      return copy;
    });
  };

  const handleCorrectAnswerChange = (qIdx: number, val: string) => {
    setParsedQuestions(prev => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], correctAnswer: val };
      return copy;
    });
  };

  const handleTypeChange = (qIdx: number, val: 'trac-nghiem' | 'tu-luan') => {
    setParsedQuestions(prev => {
      const copy = [...prev];
      const q = { ...copy[qIdx], type: val };
      if (val === 'trac-nghiem') {
        q.options = q.options && q.options.length > 0 ? q.options : ['', '', '', ''];
        q.correctAnswer = ['A', 'B', 'C', 'D'].includes(q.correctAnswer) ? q.correctAnswer : 'A';
      } else {
        q.options = undefined;
        if (['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
          q.correctAnswer = '';
        }
      }
      copy[qIdx] = q;
      return copy;
    });
  };

  const handleSubjectChange = (qIdx: number, val: string) => {
    setParsedQuestions(prev => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], subject: val };
      return copy;
    });
  };

  const handleDifficultyChange = (qIdx: number, val: 'Dễ' | 'Trung bình' | 'Khó') => {
    setParsedQuestions(prev => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], difficulty: val };
      return copy;
    });
  };

  const handleDeleteParsedQuestion = (qIdx: number) => {
    setParsedQuestions(prev => prev.filter((_, idx) => idx !== qIdx));
  };

  const handleAddEmptyQuestion = () => {
    setParsedQuestions(prev => [
      ...prev,
      {
        content: '',
        type: 'trac-nghiem',
        options: ['', '', '', ''],
        correctAnswer: 'A',
        subject: importSubject || 'Chung',
        difficulty: importDifficulty || 'Trung bình'
      }
    ]);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/questions');
      const data = await res.json();
      setQuestions(data);
    } catch (err) {
      toast.error('Lỗi khi tải ngân hàng câu hỏi');
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    try {
      const res = await fetch(`/api/questions/${questionToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Đã xóa câu hỏi khỏi ngân hàng');
        fetchQuestions();
        if (selectedQuestion?.id === questionToDelete) setSelectedQuestion(null);
        setQuestionToDelete(null);
        setIsDeleting(false);
      }
    } catch (err) {
      toast.error('Lỗi khi xóa câu hỏi');
    }
  };

  const handleParse = async () => {
    if (!importText.trim() && !importFile) {
      toast.error('Vui lòng dán văn bản hoặc chọn file để phân tích');
      return;
    }

    setIsParsing(true);
    try {
      let res: Response;
      if (importFile) {
        const formData = new FormData();
        formData.append('file', importFile);
        formData.append('subject', importSubject);
        formData.append('difficulty', importDifficulty);
        res = await fetch('/api/questions/parse-preview-file', {
          method: 'POST',
          body: formData
        });
      } else {
        res = await fetch('/api/questions/parse-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: importText,
            subject: importSubject,
            difficulty: importDifficulty
          })
        });
      }

      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.questions) {
        setParsedQuestions(payload.questions);
        setImportStep(2);
        toast.success(`Đã phân tích thành công ${payload.questions.length} câu hỏi. Vui lòng kiểm tra lại!`);
      } else {
        toast.error(payload.message || 'Không thể phân tích dữ liệu câu hỏi');
      }
    } catch (err) {
      toast.error('Lỗi kết nối đến dịch vụ phân tích');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveFinal = async () => {
    if (parsedQuestions.length === 0) {
      toast.error('Không có câu hỏi nào để lưu');
      return;
    }

    // Validate fields locally
    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i];
      if (!q.content?.trim()) {
        toast.error(`Câu hỏi số ${i + 1} bị trống nội dung`);
        return;
      }
      if (q.type === 'trac-nghiem') {
        if (!q.options || q.options.length === 0) {
          toast.error(`Câu hỏi số ${i + 1} (Trắc nghiệm) thiếu các lựa chọn A, B, C, D`);
          return;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j]?.trim()) {
            toast.error(`Lựa chọn ${String.fromCharCode(65 + j)} của câu hỏi số ${i + 1} không được để trống`);
            return;
          }
        }
      }
      if (!q.correctAnswer?.trim()) {
        toast.error(`Đáp án câu hỏi số ${i + 1} không được bỏ trống`);
        return;
      }
    }

    try {
      const res = await fetch('/api/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: parsedQuestions })
      });

      const payload = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Đã lưu thành công ${payload.count || 0} câu hỏi vào ngân hàng`);
        setIsImporting(false);
        setImportStep(1);
        setImportText('');
        setImportFile(null);
        setParsedQuestions([]);
        fetchQuestions();
      } else {
        toast.error(payload.message || 'Lỗi khi lưu câu hỏi vào ngân hàng');
      }
    } catch (err) {
      toast.error('Lỗi kết nối cơ sở dữ liệu');
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchSearch = q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        q.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType ? q.type === filterType : true;
    const matchDifficulty = filterDifficulty ? q.difficulty === filterDifficulty : true;
    const matchSubject = filterSubject ? q.subject === filterSubject : true;
    
    return matchSearch && matchType && matchDifficulty && matchSubject;
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ngân hàng câu hỏi</h1>
          <p className="text-sm text-slate-500">Quản lý kho câu hỏi dùng chung cho các kỳ thi.</p>
        </div>
        <Dialog open={isImporting} onOpenChange={(open) => {
          setIsImporting(open);
          if (!open) {
            setImportStep(1);
            setParsedQuestions([]);
          }
        }}>
          <DialogTrigger render={
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm">
              <FileUp className="w-4 h-4" /> Import câu hỏi
            </Button>
          } />
          <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[92vh] flex flex-col p-0 border-none rounded-3xl shadow-2xl overflow-hidden">
            <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
              <div className="flex flex-col gap-1.5">
                <DialogTitle className="text-xl font-bold text-slate-850">
                  {importStep === 1 ? 'Import câu hỏi từ văn bản chuẩn' : 'Kiểm tra & Hiệu chỉnh câu hỏi'}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-colors duration-200 ${
                    importStep === 1 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    Bước 1: Nguồn dữ liệu
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-350" />
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-colors duration-200 ${
                    importStep === 2 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    Bước 2: Xem trước & Sửa công thức
                  </span>
                </div>
              </div>
            </DialogHeader>

            {importStep === 1 ? (
              /* ==================== STEP 1: INPUT DATA ==================== */
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Panel: Configuration & Guidelines */}
                    <div className="col-span-1 space-y-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phân loại mặc định</Label>
                          <Input 
                            placeholder="Môn học (Vd: Toán, Lý...)" 
                            className="h-10 rounded-xl border-slate-200"
                            value={importSubject}
                            onChange={e => setImportSubject(e.target.value)}
                          />
                          <select 
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                            value={importDifficulty}
                            onChange={e => setImportDifficulty(e.target.value as any)}
                          >
                            <option value="Dễ">Dễ</option>
                            <option value="Trung bình">Trung bình</option>
                            <option value="Khó">Khó</option>
                          </select>
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                          <p className="text-[10px] font-bold text-blue-700 uppercase mb-2">Mẫu Trắc nghiệm:</p>
                          <div className="text-[10px] text-blue-600 font-mono italic whitespace-pre leading-relaxed">
                            1. Một cộng một bằng mấy?{"\n"}
                            A. 1{"\n"}
                            B. 2{"\n"}
                            C. 3{"\n"}
                            D. 4{"\n"}
                            Đáp án: B
                          </div>
                        </div>
                        <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-2xl">
                          <p className="text-[10px] font-bold text-amber-700 uppercase mb-2">Mẫu Tự luận:</p>
                          <div className="text-[10px] text-amber-600 font-mono italic whitespace-pre leading-relaxed">
                            2. Nêu ý nghĩa lịch sử?{"\n"}
                            Đáp án: Ý nghĩa là...
                          </div>
                        </div>
                        <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl">
                          <p className="text-[10px] font-bold text-purple-700 uppercase mb-2">🧮 Mẫu có công thức Toán:</p>
                          <div className="text-[10px] text-purple-600 font-mono italic whitespace-pre leading-relaxed">
                            3. Tính $\int_0^1 x^2 dx${"\n"}
                            A. $\frac{'{'}1{'}'}{'{'}2{'}'}${"\n"}
                            B. $\frac{'{'}1{'}'}{'{'}3{'}'}${"\n"}
                            Đáp án: B{"\n\n"}
                            <span className="text-purple-400">Dùng $...$ cho công thức</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Panel: File Upload & Textarea */}
                    <div className="col-span-2 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tải file lên (Word, PDF, TXT)</Label>
                        <div className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
                          <Input
                            type="file"
                            accept=".txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="h-10 bg-white rounded-xl border-slate-200"
                            onChange={e => setImportFile(e.target.files?.[0] || null)}
                          />
                          {importFile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-[10px] font-bold text-red-500 uppercase hover:bg-red-50"
                              onClick={() => setImportFile(null)}
                            >
                              Xóa
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hoặc Dán văn bản câu hỏi</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold uppercase gap-1 text-purple-700 border-purple-100 hover:bg-purple-50 hover:text-purple-800 rounded-lg px-2.5 transition-all shadow-sm active:scale-95"
                            onClick={() => openFormulaBuilder(-1, 'content')}
                          >
                            <Sigma className="w-3.5 h-3.5" /> Dựng công thức (🧮)
                          </Button>
                        </div>
                        <textarea
                          id="step1-textarea"
                          className="w-full h-64 p-4 border border-slate-200 rounded-2xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                          placeholder={`Dán nội dung từ Word/Text theo mẫu bên trái...\n\nVí dụ câu hỏi toán:\n1. Tính tích phân $\\int_0^1 x^2 dx$\nA. $\\frac{1}{2}$\nB. $\\frac{1}{3}$\nĐáp án: B`}
                          value={importText}
                          onChange={e => setImportText(e.target.value)}
                        />
                        {/* Live Math Preview in Step 1 */}
                        {importText.trim() && (
                          <div className="border border-purple-200 bg-white rounded-2xl overflow-hidden mt-3 shadow-sm">
                            <div className="bg-purple-50 border-b border-purple-100 px-4 py-2 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-widest flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-purple-650" /> Xem trước văn bản đã dựng (Live Preview)
                              </span>
                            </div>
                            <div className="p-4 max-h-48 overflow-y-auto space-y-2 bg-slate-50/20">
                              {importText.split('\n').map((line, i) => (
                                <div key={i} className="text-sm text-slate-700 leading-relaxed min-h-[1.2rem]">
                                  {line.trim() ? <MathText text={line} compact /> : <span className="block h-3" />}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="p-6 border-t bg-slate-50">
                  <DialogClose render={
                    <Button variant="ghost" className="font-bold rounded-xl" onClick={() => setIsImporting(false)}>
                      Hủy bỏ
                    </Button>
                  } />
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 px-8 rounded-xl font-bold gap-2" 
                    onClick={handleParse}
                    disabled={isParsing || (!importText.trim() && !importFile)}
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang phân tích...
                      </>
                    ) : (
                      <>
                        Tiến hành phân tích <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              /* ==================== STEP 2: EDIT & REVIEW ==================== */
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                  
                  {/* Visual Editor Guide Banner */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-2xl flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-650 mt-0.5 animate-pulse" />
                    <div>
                      <p className="text-xs font-bold text-purple-800">Trình biên soạn toán học trực quan và thông minh</p>
                      <p className="text-[10px] text-purple-600 font-semibold leading-relaxed mt-0.5">
                        Nhấp nút <span className="bg-purple-100 px-1 py-0.5 rounded text-purple-700 font-bold">🧮 Dựng công thức</span> bên cạnh mỗi ô nhập liệu để mở Trình thiết lập công thức Toán trực quan. Công thức toán sẽ được dựng thành các ký hiệu đẹp mắt ngay lập tức bên dưới.
                      </p>
                    </div>
                  </div>

                  {/* List of Parsed Questions */}
                  <div className="space-y-6">
                    {parsedQuestions.map((q, idx) => (
                      <Card key={idx} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all bg-white relative">
                        {/* Left vertical border color decoration */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${q.type === 'trac-nghiem' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                        
                        {/* Question Card Header */}
                        <div className="pl-5 pr-4 py-3 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-sm">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-700">Câu hỏi</span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Type selector */}
                            <select
                              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-750 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                              value={q.type}
                              onChange={e => handleTypeChange(idx, e.target.value as any)}
                            >
                              <option value="trac-nghiem">Trắc nghiệm</option>
                              <option value="tu-luan">Tự luận</option>
                            </select>

                            {/* Subject */}
                            <input
                              type="text"
                              placeholder="Môn học"
                              className="h-8 w-24 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-750 outline-none focus:ring-1 focus:ring-blue-500"
                              value={q.subject}
                              onChange={e => handleSubjectChange(idx, e.target.value)}
                            />

                            {/* Difficulty */}
                            <select
                              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-750 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                              value={q.difficulty}
                              onChange={e => handleDifficultyChange(idx, e.target.value as any)}
                            >
                              <option value="Dễ">Dễ</option>
                              <option value="Trung bình">Trung bình</option>
                              <option value="Khó">Khó</option>
                            </select>

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() => handleDeleteParsedQuestion(idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Question Card Body */}
                        <div className="p-5 space-y-4">
                          
                          {/* Content Input */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nội dung câu hỏi</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] font-bold uppercase gap-1 text-purple-700 border-purple-100 hover:bg-purple-50 hover:text-purple-800 rounded-lg px-2.5 transition-all shadow-sm active:scale-95"
                                onClick={() => openFormulaBuilder(idx, 'content')}
                              >
                                <Sigma className="w-3.5 h-3.5" /> Dựng công thức (🧮)
                              </Button>
                            </div>
                            <textarea
                              id={`q-content-${idx}`}
                              rows={2}
                              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                              placeholder="Nhập nội dung câu hỏi..."
                              value={q.content}
                              onChange={e => handleContentChange(idx, e.target.value)}
                            />
                            {/* Live Math Render */}
                            {q.content?.trim() && (
                              <div className="p-3 bg-purple-50/20 border border-purple-50/50 rounded-xl text-xs text-slate-700 shadow-inner">
                                <span className="text-[9px] font-bold text-purple-400 uppercase block mb-1">Dựng công thức trực quan:</span>
                                <div className="py-1">
                                  <MathText text={q.content} compact />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Options if Multiple Choice */}
                          {q.type === 'trac-nghiem' && q.options && (
                            <div className="space-y-3 pt-2">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Các phương án A, B, C, D</Label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {q.options.map((opt, oIdx) => {
                                  const label = String.fromCharCode(65 + oIdx);
                                  return (
                                    <div key={oIdx} className="space-y-1.5 p-3.5 rounded-xl border border-slate-100 bg-slate-50/30 relative">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500">Lựa chọn {label}</span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="w-6 h-6 rounded-md text-purple-650 hover:bg-purple-100 hover:text-purple-700"
                                          onClick={() => openFormulaBuilder(idx, 'option', oIdx)}
                                          title="Chèn công thức toán"
                                        >
                                          <Sigma className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                      <Input
                                        id={`q-opt-${idx}-${oIdx}`}
                                        className="h-9 rounded-lg border-slate-200 bg-white"
                                        placeholder={`Nội dung phương án ${label}...`}
                                        value={opt}
                                        onChange={e => handleOptionChange(idx, oIdx, e.target.value)}
                                      />
                                      {/* Option live Math Preview */}
                                      {opt?.trim() && (
                                        <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-100 min-h-[30px] flex items-center shadow-sm">
                                          <MathText text={opt} compact />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Correct Answer Input */}
                          <div className="grid grid-cols-1 gap-1.5 pt-2">
                            {q.type === 'trac-nghiem' ? (
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đáp án đúng</Label>
                                <select
                                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                  value={q.correctAnswer}
                                  onChange={e => handleCorrectAnswerChange(idx, e.target.value)}
                                >
                                  <option value="A">Phương án A</option>
                                  <option value="B">Phương án B</option>
                                  <option value="C">Phương án C</option>
                                  <option value="D">Phương án D</option>
                                </select>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đáp án đúng / Hướng dẫn chấm</Label>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] font-bold uppercase gap-1 text-purple-700 border-purple-100 hover:bg-purple-50 hover:text-purple-800 rounded-lg px-2.5 transition-all shadow-sm active:scale-95"
                                    onClick={() => openFormulaBuilder(idx, 'correctAnswer')}
                                  >
                                    <Sigma className="w-3.5 h-3.5" /> Dựng công thức (🧮)
                                  </Button>
                                </div>
                                <textarea
                                  id={`q-ans-${idx}`}
                                  rows={2}
                                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                                  placeholder="Nhập nội dung đáp án tự luận..."
                                  value={q.correctAnswer}
                                  onChange={e => handleCorrectAnswerChange(idx, e.target.value)}
                                />
                                {/* Live Answer Math Preview */}
                                {q.correctAnswer?.trim() && (
                                  <div className="p-3 bg-purple-50/20 border border-purple-50/50 rounded-xl text-xs text-slate-700 shadow-inner">
                                    <span className="text-[9px] font-bold text-purple-400 uppercase block mb-1">Dựng công thức trực quan:</span>
                                    <div className="py-1">
                                      <MathText text={q.correctAnswer} compact />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                        </div>
                      </Card>
                    ))}
                    
                    {/* Add manual question button */}
                    <Button
                      variant="outline"
                      className="w-full py-6 border-dashed border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/10 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 transition-all font-bold text-xs"
                      onClick={handleAddEmptyQuestion}
                    >
                      <Plus className="w-4.5 h-4.5" /> Thêm câu hỏi thủ công mới
                    </Button>
                  </div>
                </div>

                <DialogFooter className="p-6 border-t bg-slate-50 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    className="font-bold rounded-xl gap-1.5"
                    onClick={() => {
                      setImportStep(1);
                      setParsedQuestions([]);
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" /> Quay lại
                  </Button>
                  <Button
                    className="bg-purple-650 hover:bg-purple-700 text-white font-bold px-8 rounded-xl gap-2 shadow-lg shadow-purple-650/15"
                    onClick={handleSaveFinal}
                  >
                    <Check className="w-4 h-4" /> Hoàn tất & Lưu vào kho
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
           <Card className="card-polish">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-4">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Bộ lọc & Tìm kiếm</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400">TÌM KIẾM</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <Input 
                      placeholder="Tìm nội dung..." 
                      className="pl-8 h-9 text-xs border-slate-200 rounded-lg"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label className="text-[10px] font-bold text-slate-400">BỘ LỌC</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <select 
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      value={filterType}
                      onChange={e => setFilterType(e.target.value)}
                    >
                      <option value="">Tất cả loại câu hỏi</option>
                      <option value="trac-nghiem">Trắc nghiệm</option>
                      <option value="tu-luan">Tự luận</option>
                    </select>
                    
                    <select 
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      value={filterDifficulty}
                      onChange={e => setFilterDifficulty(e.target.value)}
                    >
                      <option value="">Tất cả độ khó</option>
                      <option value="Dễ">Dễ</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Khó">Khó</option>
                    </select>
                    
                    <select 
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      value={filterSubject}
                      onChange={e => setFilterSubject(e.target.value)}
                    >
                      <option value="">Tất cả môn học</option>
                      {Array.from(new Set(questions.map(q => q.subject))).map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
           </Card>
           
           <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl relative overflow-hidden">
             <div className="relative z-10">
               <div className="flex items-center gap-2 mb-4 text-blue-400">
                  <Database className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Kho dữ liệu</span>
               </div>
               <div className="space-y-1">
                  <p className="text-3xl font-black">{questions.length}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng câu hỏi</p>
               </div>
             </div>
             <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-600/20 blur-3xl rounded-full" />
           </div>
        </div>

        <div className="md:col-span-3">
          <Card className="card-polish">
            <CardContent className="p-0">
               <Table>
                 <TableHeader className="table-header-polish">
                   <TableRow>
                     <TableHead className="px-6 py-4 font-semibold text-xs">Nội dung</TableHead>
                     <TableHead className="px-6 py-4 font-semibold text-xs">Loại</TableHead>
                     <TableHead className="px-6 py-4 font-semibold text-xs">Độ khó</TableHead>
                     <TableHead className="px-6 py-4 font-semibold text-xs text-right">Chi tiết</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredQuestions.length > 0 ? (
                     filteredQuestions.map((q) => (
                        <TableRow 
                          key={q.id} 
                          className="group hover:bg-slate-50/50 cursor-pointer border-b border-slate-50 last:border-0"
                          onClick={() => setSelectedQuestion(q)}
                        >
                          <TableCell className="px-6 py-4 max-w-[400px]">
                            <p className="text-sm font-bold text-slate-800 line-clamp-1"><MathText text={q.content} compact /></p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{q.subject}</p>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge variant="outline" className={`text-[9px] font-bold uppercase ${q.type === 'trac-nghiem' ? 'border-blue-100 text-blue-600 bg-blue-50' : 'border-amber-100 text-amber-600 bg-amber-50'}`}>
                              {q.type === 'trac-nghiem' ? 'Trắc nghiệm' : 'Tự luận'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-[11px] font-medium text-slate-500">{q.difficulty}</TableCell>
                          <TableCell className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-blue-600 uppercase">Xem</Button>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setQuestionToDelete(q.id);
                                   setIsDeleting(true);
                                 }}
                               >
                                  <Trash2 className="w-4 h-4" />
                               </Button>
                             </div>
                          </TableCell>
                        </TableRow>
                     ))
                   ) : (
                     <TableRow>
                       <TableCell colSpan={4} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-30">
                            <Library className="w-16 h-16" />
                            <div>
                               <p className="font-bold text-lg text-slate-900">Chưa có câu hỏi nào</p>
                               <p className="text-xs">Hãy Import câu hỏi để bắt đầu.</p>
                            </div>
                          </div>
                       </TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        <DialogContent className="sm:max-w-[600px] border-none rounded-2xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px] font-bold border-blue-200 text-blue-600 uppercase">
                {selectedQuestion?.type === 'trac-nghiem' ? 'Trắc nghiệm' : 'Tự luận'}
              </Badge>
              <span className="text-[10px] font-bold text-slate-300">ID: {selectedQuestion?.id}</span>
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900 leading-snug">
               <MathText text={selectedQuestion?.content} />
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            {selectedQuestion?.type === 'trac-nghiem' && selectedQuestion.options && (
              <div className="grid grid-cols-1 gap-3">
                {selectedQuestion.options.map((opt, idx) => {
                  const label = String.fromCharCode(65 + idx);
                  const isCorrect = label === selectedQuestion.correctAnswer;
                  return (
                    <div key={label} className={`flex items-center gap-4 p-4 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${isCorrect ? 'bg-green-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                          {label}
                       </div>
                       <span className={`text-sm font-medium ${isCorrect ? 'text-green-700' : 'text-slate-600'}`}>
                         <MathText text={opt} />
                       </span>
                       {isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />}
                    </div>
                  );
                })}
              </div>
            )}
            
            {selectedQuestion?.type === 'tu-luan' && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đáp án chuẩn / Hướng dẫn chấm</p>
                <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-2xl text-sm italic text-amber-900 font-medium whitespace-pre-wrap leading-relaxed">
                  <MathText text={selectedQuestion.correctAnswer} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <Button className="w-full bg-slate-900 hover:bg-slate-800 rounded-xl font-bold h-11" onClick={() => setSelectedQuestion(null)}>
              Đóng xem chi tiết
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">Xác nhận xóa câu hỏi?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
               Hành động này không thể hoàn tác. Câu hỏi sẽ bị xóa vĩnh viễn khỏi ngân hàng dữ liệu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel variant="outline" size="default" className="rounded-xl font-semibold">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteQuestion}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold px-6"
            >
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VisualFormulaBuilder
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onInsert={handleInsertFormula}
      />
    </div>
  );
}
