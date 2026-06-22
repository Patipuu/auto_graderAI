import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, GraduationCap, User, BookOpen, Star, RefreshCcw, LayoutGrid, List, Columns, FileText, Table, X, Calendar, Trophy, FileBadge } from 'lucide-react';
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
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedPerformance, setSelectedPerformance] = useState('all');
  const [layout, setLayout] = useState('grid');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);

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

  const getPerformanceBgColor = (performance: string) => {
    switch (performance) {
      case 'Giỏi': return 'bg-green-500';
      case 'Khá': return 'bg-blue-500';
      case 'Trung bình': return 'bg-amber-500';
      default: return 'bg-red-500';
    }
  };

  const classes = useMemo(() => {
    const cls = new Set(students.map(s => s.studentClass).filter(Boolean));
    return Array.from(cls).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students]);

  const performances = useMemo(() => {
    const perf = new Set(students.map(s => s.academicPerformance).filter(Boolean));
    return Array.from(perf).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Sắp xếp theo lớp học (class) rồi tới tên học sinh
    result.sort((a, b) => {
      const classA = a.studentClass || '';
      const classB = b.studentClass || '';
      if (classA !== classB) return classA.localeCompare(classB, undefined, { numeric: true, sensitivity: 'base' });
      return (a.studentName || '').localeCompare(b.studentName || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    // Lọc dữ liệu
    result = result.filter(s => {
      const term = searchTerm.toLowerCase();
      const matchSearch = (s.studentName || '').toLowerCase().includes(term) ||
        (s.studentId || '').toLowerCase().includes(term) ||
        (s.studentClass || '').toLowerCase().includes(term);
      const matchClass = selectedClass === 'all' || s.studentClass === selectedClass;
      const matchPerf = selectedPerformance === 'all' || s.academicPerformance === selectedPerformance;
      return matchSearch && matchClass && matchPerf;
    });

    return result;
  }, [students, searchTerm, selectedClass, selectedPerformance]);

  const renderStudentModal = () => {
    if (!selectedStudent) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedStudent(null)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-br from-white to-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold text-2xl shadow-inner border border-blue-200">
                {selectedStudent.studentName ? selectedStudent.studentName.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedStudent.studentName || 'Không tên'}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="font-mono text-slate-500 bg-white">#{selectedStudent.studentId}</Badge>
                  <Badge variant="secondary" className="text-slate-600 bg-slate-100">Lớp {selectedStudent.studentClass}</Badge>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedStudent(null)} className="rounded-full hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-500" />
            </Button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Điểm Trung Bình</div>
                  <div className="text-3xl font-black text-slate-800">{selectedStudent.averageScore.toFixed(1)}</div>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <FileBadge className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Học Lực</div>
                  <div className={`font-bold text-lg ${getPerformanceColor(selectedStudent.academicPerformance).split(' ')[0]}`}>
                    {selectedStudent.academicPerformance}
                  </div>
                </div>
              </div>
            </div>
            
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Lịch sử bài kiểm tra ({selectedStudent.exams.length})
            </h3>
            
            <div className="space-y-3">
              {selectedStudent.exams.length > 0 ? selectedStudent.exams.map((exam, eIdx) => (
                <div key={eIdx} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors flex items-center justify-between group">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-500 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 mb-1">{exam.examTitle}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(exam.processedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Điểm số</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl font-black text-slate-800">{exam.totalScore.toFixed(1)}</span>
                      <Star className={`w-4 h-4 ${exam.totalScore >= 8 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  Học sinh chưa có bài kiểm tra nào.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredStudents.map((student, idx) => (
        <Card key={idx} className="card-polish group hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => setSelectedStudent(student)}>
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
  );

  const renderTable = () => (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
          <tr>
            <th className="p-4 font-semibold">Học sinh</th>
            <th className="p-4 font-semibold text-center w-24">Điểm TB</th>
            <th className="p-4 font-semibold text-center w-32">Học lực</th>
            <th className="p-4 font-semibold">Kiểm tra gần nhất</th>
            <th className="p-4 font-semibold text-right w-32">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredStudents.map((student, idx) => {
            const latestExam = student.exams?.[0];
            return (
              <tr key={idx} className="hover:bg-blue-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedStudent(student)}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold">
                      {student.studentName ? student.studentName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{student.studentName || 'Không tên'}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono">#{student.studentId}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="font-medium text-slate-600">Lớp {student.studentClass}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <span className="text-lg font-black text-slate-800">{student.averageScore.toFixed(1)}</span>
                </td>
                <td className="p-4 text-center">
                  <Badge variant="outline" className={`font-bold px-2.5 py-0.5 text-xs border ${getPerformanceColor(student.academicPerformance)}`}>
                    {student.academicPerformance}
                  </Badge>
                </td>
                <td className="p-4">
                  {latestExam ? (
                    <div>
                      <div className="font-semibold text-slate-700 text-sm truncate max-w-[250px]" title={latestExam.examTitle}>{latestExam.examTitle}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-sm">{latestExam.totalScore.toFixed(1)} đ</span>
                        <span className="text-slate-300">•</span>
                        <span>{new Date(latestExam.processedAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Chưa có bài kiểm tra</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100" onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); }}>Chi tiết</Button>
                    <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100" onClick={(e) => e.stopPropagation()}>PDF</Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );

  const renderCompact = () => (
    <div className="flex flex-col gap-2">
      {filteredStudents.map((student, idx) => {
        const latestExam = student.exams?.[0];
        return (
          <div key={idx} className="flex items-center justify-between p-3 px-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all hover:border-blue-300 group cursor-pointer" onClick={() => setSelectedStudent(student)}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold text-sm">
                {student.studentName ? student.studentName.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="w-[200px] shrink-0">
                <div className="font-bold text-slate-900 truncate" title={student.studentName}>{student.studentName || 'Không tên'}</div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">Lớp {student.studentClass} <span className="text-slate-300 mx-1">•</span> <span className="font-mono text-slate-400">#{student.studentId}</span></div>
              </div>
              <div className="flex-1 min-w-0 px-4 hidden md:block">
                {latestExam ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-700 truncate" title={latestExam.examTitle}>
                        {latestExam.examTitle}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {new Date(latestExam.processedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 italic flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Chưa có bài kiểm tra
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6 shrink-0 pl-4">
              <Badge variant="outline" className={`font-bold px-3 py-1 text-xs border hidden sm:flex ${getPerformanceColor(student.academicPerformance)}`}>
                {student.academicPerformance}
              </Badge>
              <div className="text-right w-16">
                <div className="text-2xl font-black text-slate-800 leading-none">{student.averageScore.toFixed(1)}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  );

  const renderHorizontal = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {filteredStudents.map((student, idx) => {
        const latestExam = student.exams?.[0];
        return (
          <Card key={idx} className="hover:shadow-md transition-all duration-300 overflow-hidden border-slate-200 hover:border-blue-300 cursor-pointer" onClick={() => setSelectedStudent(student)}>
            <div className="flex h-[110px]">
              <div className="p-4 border-r border-slate-100 flex-1 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50/50 min-w-0">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold text-xl shadow-inner">
                  {student.studentName ? student.studentName.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 truncate text-[15px]" title={student.studentName}>
                    {student.studentName || 'Không tên'}
                  </h3>
                  <div className="flex flex-col gap-1.5 mt-1.5">
                    <span className="text-xs font-mono text-slate-400">#{student.studentId}</span>
                    <Badge variant="secondary" className="text-[10px] font-semibold text-slate-600 bg-slate-100 w-fit hover:bg-slate-200 border-transparent rounded-md px-1.5">Lớp {student.studentClass}</Badge>
                  </div>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-center min-w-[150px] bg-white">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-2xl font-black text-slate-800 tracking-tighter">{student.averageScore.toFixed(1)}</div>
                  <Badge variant="outline" className={`font-bold px-2 py-0.5 text-[10px] border ${getPerformanceColor(student.academicPerformance)}`}>
                    {student.academicPerformance}
                  </Badge>
                </div>
                <div className="border-t border-slate-100 pt-2 mt-auto">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Bài gần nhất</div>
                  {latestExam ? (
                    <div className="text-xs text-slate-700 truncate font-semibold" title={latestExam.examTitle}>
                      {latestExam.examTitle}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">Chưa có bài</div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  );

  const renderKanban = () => {
    const perfOrder = ['Giỏi', 'Khá', 'Trung bình', 'Yếu', 'Kém'];
    const kanbanGroups = perfOrder.map(perf => ({
      performance: perf,
      students: filteredStudents.filter(s => s.academicPerformance === perf)
    })).filter(group => group.students.length > 0);

    const otherStudents = filteredStudents.filter(s => !perfOrder.includes(s.academicPerformance));
    if (otherStudents.length > 0) {
      kanbanGroups.push({ performance: 'Khác', students: otherStudents });
    }

    return (
      <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory min-h-[600px] custom-scrollbar">
        {kanbanGroups.map((group, gIdx) => (
          <div key={gIdx} className="snap-start shrink-0 w-[320px] flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200 max-h-[80vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl shadow-sm z-10">
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getPerformanceBgColor(group.performance)} shadow-sm`}></div>
                <span className="text-[15px]">{group.performance}</span>
              </div>
              <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-bold px-2.5">
                {group.students.length}
              </Badge>
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {group.students.map((student, idx) => (
                <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex items-center justify-between cursor-pointer group" onClick={() => setSelectedStudent(student)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {student.studentName ? student.studentName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 text-[13px] truncate" title={student.studentName}>{student.studentName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                        Lớp {student.studentClass}
                      </div>
                    </div>
                  </div>
                  <div className="text-xl font-black text-slate-800 pl-3 shrink-0">{student.averageScore.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (layout) {
      case 'table': return renderTable();
      case 'compact': return renderCompact();
      case 'horizontal': return renderHorizontal();
      case 'kanban': return renderKanban();
      case 'grid':
      default: return renderGrid();
    }
  };

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
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Tìm theo Tên, MSHS, Lớp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-slate-200 bg-slate-50 focus-visible:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <select
              className="h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:w-[130px] transition-all hover:bg-slate-100"
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
            >
              <option value="all">Tất cả lớp</option>
              {classes.map(c => <option key={c} value={c}>Lớp {c}</option>)}
            </select>

            <select
              className="h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:w-[150px] transition-all hover:bg-slate-100"
              value={selectedPerformance}
              onChange={e => setSelectedPerformance(e.target.value)}
            >
              <option value="all">Tất cả học lực</option>
              {performances.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-t-0 border-slate-100 pt-3 lg:pt-0">
          <div className="hidden xl:flex items-center text-sm font-medium text-slate-500 mr-1">
            Giao diện:
          </div>
          <div className="relative flex-1 lg:flex-none">
            <select
              className="h-10 pl-9 pr-8 rounded-md border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 w-full lg:w-[240px] appearance-none cursor-pointer hover:bg-blue-100 transition-colors"
              value={layout}
              onChange={e => setLayout(e.target.value)}
            >
              <option value="grid">Kiểu Lưới Thẻ</option>
              <option value="table">Dạng Bảng Dữ Liệu</option>
              <option value="compact">Danh Sách Hàng Rút Gọn</option>
              <option value="horizontal">Thẻ Tóm Tắt Ngang</option>
              <option value="kanban">Chia Nhóm Theo Học Lực</option>
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-600">
              {layout === 'grid' && <LayoutGrid className="w-4 h-4" />}
              {layout === 'table' && <Table className="w-4 h-4" />}
              {layout === 'compact' && <List className="w-4 h-4" />}
              {layout === 'horizontal' && <FileText className="w-4 h-4" />}
              {layout === 'kanban' && <Columns className="w-4 h-4" />}
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>

          <Button variant="outline" size="icon" onClick={fetchStudents} className="shrink-0 h-10 w-10 border-slate-200 bg-white hover:bg-slate-50 transition-colors">
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : 'text-slate-600'}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 bg-white/50 rounded-2xl border border-slate-200/50 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Đang tải dữ liệu...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <User className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Không tìm thấy học sinh</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Không có dữ liệu phù hợp với điều kiện lọc hiện tại. Hãy thử tìm kiếm hoặc chọn bộ lọc khác.</p>
          <Button variant="outline" onClick={() => { setSearchTerm(''); setSelectedClass('all'); setSelectedPerformance('all'); }} className="mt-6 border-slate-200">
            Xóa bộ lọc
          </Button>
        </div>
      ) : (
        renderContent()
      )}
      {selectedStudent && renderStudentModal()}
    </div>
  );
}
