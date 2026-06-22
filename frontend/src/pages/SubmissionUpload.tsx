import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, FileUp, CheckCircle2, Loader2, Sparkles, AlertCircle, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiGradingService } from '@/services/aiGradingService';

export default function SubmissionUpload() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetch('/api/exams').then(res => res.json()).then(data => setExams(data));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !selectedExamId) {
      toast.error('Vui lòng chọn đề thi và tải lên ít nhất một ảnh bài làm');
      return;
    }

    const exam = exams.find(e => e.id === selectedExamId);
    setIsProcessing(true);
    setProgress(15);

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Step 1: Read all files to base64 in parallel and compress images
      const compressAndRead = (f: File, maxW = 2000, maxH = 2000, quality = 0.9): Promise<{ base64: string; type: string; name: string }> => {
        return new Promise((resolve) => {
          if (f.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({ base64, type: f.type, name: f.name });
            };
            reader.readAsDataURL(f);
            return;
          }

          const img = new Image();
          img.src = URL.createObjectURL(f);
          img.onload = () => {
            URL.revokeObjectURL(img.src);
            let width = img.width;
            let height = img.height;

            if (width > maxW || height > maxH) {
              if (width > height) {
                height = Math.round((height * maxW) / width);
                width = maxW;
              } else {
                width = Math.round((width * maxH) / height);
                height = maxH;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL('image/jpeg', quality);
              const base64 = dataUrl.split(',')[1];
              resolve({ base64, type: 'image/jpeg', name: f.name });
            } else {
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve({ base64, type: f.type || 'image/jpeg', name: f.name });
              };
              reader.readAsDataURL(f);
            }
          };
          img.onerror = () => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({ base64, type: f.type || 'image/jpeg', name: f.name });
            };
            reader.readAsDataURL(f);
          };
        });
      };

      toast.info(`Đang nén và chuyển đổi ${files.length} trang bài làm...`);
      const filePayloads = await Promise.all(files.map(f => compressAndRead(f)));
      const base64Images = filePayloads.map(fp => fp.base64);
      const mimeTypes = filePayloads.map(fp => fp.type);
      setProgress(35);

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
      }, 1200);

      // Step 2: AI Processing (Sends list of images)
      toast.info('Gemini AI đang chấm bài (đọc tất cả các trang)...');
      const aiResult = await aiGradingService.gradeSubmission(
        base64Images,
        mimeTypes,
        selectedExamId,
        exam.gradingType
      );

      if (progressInterval) clearInterval(progressInterval);
      setProgress(95);

      // Step 3: Save to local DB via API
      const studentImages = filePayloads.map(fp => `data:${fp.type};base64,${fp.base64}`);
      
      const saveRes = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          examTitle: exam.title,
          ...aiResult,
          studentImage: studentImages, // Array of base64 images
          gradingType: exam.gradingType || 'HYBRID',
          fileType: files[0].type || 'image/jpeg'
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
                  className={`border-2 border-dashed rounded-2xl transition-all ${
                    files.length > 0
                      ? 'border-blue-200 bg-blue-50/5 p-6'
                      : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-slate-50 p-12 text-center cursor-pointer'
                  }`}
                  onClick={files.length > 0 ? undefined : () => document.getElementById('file-upload')?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    multiple
                  />

                  {files.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" onClick={(e) => e.stopPropagation()}>
                      {files.map((f, idx) => {
                        const isImage = f.type.startsWith('image/');
                        return (
                          <div
                            key={idx}
                            className="relative group/item border border-slate-200 rounded-xl p-3 bg-white hover:border-blue-400 transition-all flex flex-col justify-between"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setFiles(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-1 shadow-sm transition-colors z-10"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <div className="space-y-2">
                              <div className="aspect-[4/3] bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-slate-100">
                                {isImage ? (
                                  <img
                                    src={URL.createObjectURL(f)}
                                    alt={f.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <FileUp className="w-8 h-8 text-slate-400" />
                                )}
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-800 truncate" title={f.name}>
                                  Trang {idx + 1}: {f.name}
                                </p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">
                                  {(f.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer aspect-[4/3]"
                      >
                        <Plus className="w-6 h-6 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500">Thêm trang</span>
                      </div>
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
                disabled={files.length === 0 || !selectedExamId || isProcessing}
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
