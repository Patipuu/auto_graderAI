import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, Search, FileUp, Library, Database, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import MathText from '@/components/MathText';

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
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSubject, setImportSubject] = useState('Chung');
  const [importDifficulty, setImportDifficulty] = useState<'Dễ' | 'Trung bình' | 'Khó'>('Trung bình');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

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

  const parseQuestions = (text: string): Partial<Question>[] => {
    // Split by "Câu [số]:" or just "[số]." at the start of a line
    const questionsRaw = text.split(/(?:\n|^)(?:Câu\s*)?\d+[:.]\s+/i).filter(q => q.trim().length > 5);
    const parsed: Partial<Question>[] = [];

    questionsRaw.forEach(qBlock => {
      const lines = qBlock.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) return;

      const content = lines[0];
      const rest = lines.slice(1);
      
      let options: string[] = [];
      let correctAnswer = '';
      let type: 'trac-nghiem' | 'tu-luan' = 'trac-nghiem';

      rest.forEach(line => {
        const optMatch = line.match(/^([A-D])[:.]\s*(.*)/i);
        if (optMatch) {
          options.push(optMatch[2]);
          return;
        }

        const ansMatch = line.match(/^Đáp án[:\s]*([A-D]|.+)/i);
        if (ansMatch) {
          const ans = ansMatch[1].trim();
          if (['A', 'B', 'C', 'D'].includes(ans.toUpperCase()) && options.length > 0) {
            correctAnswer = ans.toUpperCase();
          } else {
            type = 'tu-luan';
            correctAnswer = ans;
          }
        }
      });

      // Final check for type
      if (options.length === 0) type = 'tu-luan';

      parsed.push({
        content,
        type,
        options: type === 'trac-nghiem' ? options : undefined,
        correctAnswer: correctAnswer || (type === 'trac-nghiem' ? 'A' : 'Chưa có đáp án'),
        subject: importSubject,
        difficulty: importDifficulty
      });
    });

    return parsed;
  };

  const handleImport = async () => {
    if (!importText.trim() && !importFile) {
      toast.error('Vui lòng dán văn bản hoặc chọn file để import');
      return;
    }

    try {
      let res: Response;
      if (importFile) {
        const formData = new FormData();
        formData.append('file', importFile);
        formData.append('subject', importSubject);
        formData.append('difficulty', importDifficulty);
        res = await fetch('/api/questions/import-file', {
          method: 'POST',
          body: formData
        });
      } else {
        res = await fetch('/api/questions/import-text', {
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
      if (res.ok) {
        toast.success(`Đã thêm ${payload.count || 0} câu hỏi vào ngân hàng`);
        setIsImporting(false);
        setImportText('');
        setImportFile(null);
        fetchQuestions();
      } else {
        toast.error(payload.message || 'Không import được câu hỏi');
      }
    } catch (err) {
      toast.error('Lỗi khi import dữ liệu');
    }
  };

  const filteredQuestions = questions.filter(q => 
    q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ngân hàng câu hỏi</h1>
          <p className="text-sm text-slate-500">Quản lý kho câu hỏi dùng chung cho các kỳ thi.</p>
        </div>
        <Dialog open={isImporting} onOpenChange={setIsImporting}>
          <DialogTrigger render={
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm">
              <FileUp className="w-4 h-4" /> Import câu hỏi
            </Button>
          } />
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-xl font-bold">Import từ văn bản chuẩn</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1 space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phân loại mặc định</Label>
                       <Input 
                         placeholder="Môn học (Vd: Toán, Lý...)" 
                         className="h-10 rounded-xl"
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

                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="text-[10px] font-bold text-blue-700 uppercase mb-2">Mẫu Trắc nghiệm:</p>
                      <div className="text-[10px] text-blue-600 font-mono italic whitespace-pre">
                        1. Một cộng một bằng mấy?{"\n"}
                        A. 1{"\n"}
                        B. 2{"\n"}
                        C. 3{"\n"}
                        D. 4{"\n"}
                        Đáp án: B
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                      <p className="text-[10px] font-bold text-amber-700 uppercase mb-2">Mẫu Tự luận:</p>
                      <div className="text-[10px] text-amber-600 font-mono italic whitespace-pre">
                        2. Nêu ý nghĩa lịch sử?{"\n"}
                        Đáp án: Ý nghĩa là...
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nội dung câu hỏi</Label>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
                    <Input
                      type="file"
                      accept=".txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="h-10 bg-white"
                      onChange={e => setImportFile(e.target.files?.[0] || null)}
                    />
                    {importFile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[10px] font-bold text-red-500 uppercase"
                        onClick={() => setImportFile(null)}
                      >
                        Xóa file
                      </Button>
                    )}
                  </div>
                  <textarea 
                    className="w-full h-80 p-4 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Dán nội dung từ Word/Text theo mẫu bên trái, hoặc chọn file .txt/.docx/.pdf ở trên..."
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 border-t">
              <DialogClose render={<Button variant="ghost" className="font-semibold" />}>
                Hủy
              </DialogClose>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 px-8" 
                onClick={handleImport}
                disabled={!importText.trim() && !importFile}
              >
                Tiến hành nạp kho
              </Button>
            </DialogFooter>
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
                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{q.content}</p>
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
    </div>
  );
}
