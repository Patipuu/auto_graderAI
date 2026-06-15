import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, FileUp, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiGradingService } from '@/services/aiGradingService';

export default function SubmissionUpload() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetch('/api/exams').then(res => res.json()).then(data => setExams(data));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedExamId) {
      toast.error('Vui lòng chọn đề thi và tệp tin bài làm');
      return;
    }

    const exam = exams.find(e => e.id === selectedExamId);
    setIsProcessing(true);
    setProgress(20);

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Step 1: Read file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;
      setProgress(40);

      // Simulate progress during AI processing
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            if (progressInterval) clearInterval(progressInterval);
            return 95;
          }
          const increment = Math.max(1, (95 - prev) * 0.05);
          return Math.min(95, prev + increment);
        });
      }, 1000);

      // Step 2: AI Processing
      toast.info('Đang gửi bài cho AI xử lý...');
      const aiResult = await aiGradingService.gradeSubmission(base64, file.type || 'image/jpeg', selectedExamId, exam.gradingType);

      if (progressInterval) clearInterval(progressInterval);
      setProgress(95);

      // Step 3: Save to local DB via API
      const saveRes = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          examTitle: exam.title,
          ...aiResult,
          studentImage: `data:${file.type};base64,${base64}`,
          gradingType: exam.gradingType || 'HYBRID',
          fileType: file.type
        })
      });

      const savedSubmission = await saveRes.json();
      setProgress(100);
      toast.success('Chấm bài hoàn tất!');

      setTimeout(() => {
        navigate(`/results/${savedSubmission.id}`);
      }, 500);

    } catch (error) {
      toast.error('Có lỗi xảy ra trong quá trình xử lý');
      console.error(error);
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tiến hành chấm bài</h1>
          <p className="text-sm text-slate-500">Tải tệp tin bài làm để bắt đầu phân tích dữ liệu với Gemini AI.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="card-polish">
            <CardHeader className="border-b border-slate-50 py-4 px-6">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileUp className="w-4 h-4 text-blue-600" />
                Cấu hình tải lên
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bước 1: Chọn đề thi mẫu</Label>
                <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                  <SelectTrigger className="h-11 border-slate-200 focus:ring-blue-500 rounded-xl">
                    <SelectValue placeholder="Chọn đề thi đã tạo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map(e => (
                      <SelectItem key={e.id} value={e.id} className="cursor-pointer">
                        <div className="flex flex-col items-start">
                          <span className="font-bold">{e.title}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{e.subject}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bước 2: Tải tệp bài làm</Label>
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer group ${file ? 'border-green-200 bg-green-50/20' : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-slate-50'}`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                  />

                  {file ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-white shadow-md border border-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{file.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-red-500 hover:bg-red-50 hover:text-red-600 border-red-100 h-8 rounded-lg text-xs">Hủy bỏ & tải lại</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 text-slate-300 rounded-2xl flex items-center justify-center mx-auto group-hover:text-blue-500 transition-colors">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Kéo thả tệp vào đây</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">Hoặc nhấn để chọn từ máy tính (Hỗ trợ JPG, PNG, PDF)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-3 p-6 bg-blue-50 rounded-2xl border border-blue-100 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Xử lý bởi Gemini 1.5 Flash...
                    </div>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5 bg-blue-100" />
                  <p className="text-[10px] text-blue-400 italic">Đang trích xuất OCR và phân tích ngữ nghĩa...</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t border-slate-50 bg-slate-50/30 p-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <AlertCircle className="w-3 h-3" /> Chuẩn bị dữ liệu
              </div>
              <Button
                size="lg"
                className="gap-2 px-10 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:shadow-none"
                disabled={!file || !selectedExamId || isProcessing}
                onClick={handleUpload}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang chấm...
                  </>
                ) : (
                  <>Bắt đầu phân tích AI</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="card-polish bg-slate-900 border-none">
            <CardHeader>
              <CardTitle className="text-black text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Khả năng của AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { t: "OCR Tự động", d: "Nhận diện chữ viết tay từ ảnh chụp.", icon: CheckCircle2 },
                { t: "Semantic Review", d: "Chấm điểm tự luận ngắn theo nội dung.", icon: CheckCircle2 },
                { t: "PDF Report", d: "Xuất báo cáo tự động sau khi kết thúc.", icon: CheckCircle2 }
              ].map((i, idx) => (
                <div key={idx} className="flex gap-3">
                  <i.icon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{i.t}</p>
                    <p className="text-[10px] text-slate-400 leading-normal">{i.d}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gợi ý</p>
            <p className="text-[10px] text-slate-500 leading-relaxed italic">
              Để kết quả tốt nhất, hãy đảm bảo ảnh chụp không bị lóa và chữ viết rõ ràng. Hệ thống tự động căn chỉnh vùng OMR.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
