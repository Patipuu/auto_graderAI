import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, GraduationCap, User, BookOpen, Star, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ExamRecord {
  examId: string;
  examTitle: string;
  totalScore: number;
  processedAt: string;
}

interface StudentProfile {
  studentId: string;
  studentName: string;
  studentClass: string;
  averageScore: number;
  academicPerformance: string;
  exams: ExamRecord[];
}

export default function Students() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/students');
      if (!res.ok) throw new Error('Failed to fetch students');
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      toast.error('Lỗi khi tải dữ liệu học sinh');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'Giỏi': return 'text-green-600 bg-green-50 border-green-200';
      case 'Khá': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Trung bình': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const filteredStudents = students.filter(s => {
    const term = searchTerm.toLowerCase();
    return (s.studentName || '').toLowerCase().includes(term) ||
           (s.studentId || '').toLowerCase().includes(term) ||
           (s.studentClass || '').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-blue-600" />
            Hồ sơ Học sinh
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tổng hợp kết quả học tập và đánh giá học lực của học sinh.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Tìm theo Tên, MSHS, Lớp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-slate-200 bg-white"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchStudents} className="shrink-0 h-10 w-10">
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : 'text-slate-500'}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Đang tải dữ liệu...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <User className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Không tìm thấy học sinh</h2>
          <p className="text-sm text-slate-500 mt-1">Hãy thử tìm kiếm với từ khóa khác.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.map((student, idx) => (
            <Card key={idx} className="card-polish group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-0">
                <div className="p-5 border-b border-slate-100 flex items-start gap-4 bg-gradient-to-br from-white to-slate-50/50">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold text-lg">
                    {student.studentName ? student.studentName.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 truncate text-base" title={student.studentName}>
                      {student.studentName || 'Không tên'}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {student.studentId && (
                        <Badge variant="outline" className="text-[10px] font-mono text-slate-500 bg-white">
                          #{student.studentId}
                        </Badge>
                      )}
                      {student.studentClass && (
                        <Badge variant="outline" className="text-[10px] text-slate-600 bg-slate-100 border-transparent">
                          Lớp {student.studentClass}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Điểm TB</div>
                    <div className="text-2xl font-black text-slate-800 tracking-tighter">
                      {student.averageScore.toFixed(1)}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center items-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Học Lực</div>
                    <Badge variant="outline" className={`font-bold px-3 py-1 text-xs border ${getPerformanceColor(student.academicPerformance)}`}>
                      {student.academicPerformance}
                    </Badge>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" /> Các bài đã kiểm tra ({student.exams.length})
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {student.exams.map((exam, eIdx) => (
                      <div key={eIdx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white hover:border-slate-300 transition-colors group/item">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-bold text-slate-700 truncate" title={exam.examTitle}>
                            {exam.examTitle}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(exam.processedAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-black text-slate-700">{exam.totalScore.toFixed(1)}</span>
                          <Star className={`w-3 h-3 ${exam.totalScore >= 8 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
