import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, FileText, Calendar, User, BarChart, TrendingDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Submission {
  id: string;
  studentName: string;
  studentId: string;
  studentClass?: string;
  examId: string;
  examTitle: string;
  totalScore: number;
  totalQuestions: number;
  correctAnswers: number;
  gradedAt: string;
}

const getClassBadgeColor = (className?: string) => {
  if (!className) return '';
  const name = className.toUpperCase().trim();
  if (name.startsWith('10')) return 'text-green-600 bg-green-50 border-green-200';
  if (name.startsWith('11')) return 'text-blue-600 bg-blue-50 border-blue-200';
  if (name.startsWith('12')) return 'text-red-600 bg-red-50 border-red-200';
  return 'text-slate-600 bg-slate-50 border-slate-200';
};

export default function SubmissionHistory() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const [stats, setStats] = useState<any[]>([]);
  const [statsFilter, setStatsFilter] = useState('');
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    fetchSubmissions();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/submissions/stats/error-rate');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/submissions');
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (s.studentName || '').toLowerCase().includes(q) ||
      (s.studentId || '').toLowerCase().includes(q) ||
      (s.studentClass || '').toLowerCase().includes(q) ||
      (s.examTitle || '').toLowerCase().includes(q);

    const matchClass = filterClass ? (s.studentClass || '') === filterClass : true;

    const gradedDateStr = s.gradedAt ? new Date(s.gradedAt).toISOString().split('T')[0] : '';
    const matchDate = filterDate ? gradedDateStr === filterDate : true;

    return matchSearch && matchClass && matchDate;
  });

  const filteredStats = statsFilter ? stats.filter((s: any) => s.examId === statsFilter) : stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lịch sử chấm bài</h1>
          <p className="text-sm text-slate-500">Xem lại danh sách các bài thi đã được hệ thống chấm điểm.</p>
        </div>
      </div>

      {/* Error Rate Statistics Section */}
      <Card className="card-polish">
        <div
          className="p-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setShowStats(!showStats)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Thống kê câu làm sai nhiều nhất</h3>
              <p className="text-[10px] text-slate-500">Phân tích tỉ lệ trả lời sai trên tất cả các bài đã chấm</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {stats.length > 0 && (
              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                Top {Math.min(5, filteredStats.length)} câu sai nhiều nhất
              </Badge>
            )}
            {showStats ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </div>

        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="p-0 border-b border-slate-100">
                <div className="p-4 bg-slate-50/50 flex justify-end">
                  <select
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                    value={statsFilter}
                    onChange={e => setStatsFilter(e.target.value)}
                  >
                    <option value="">Tất cả đề thi</option>
                    {Array.from(new Set(stats.map((s: any) => s.examId))).map(examId => {
                      const title = stats.find((s: any) => s.examId === examId)?.examTitle || 'Đề không xác định';
                      return <option key={examId as string} value={examId as string}>{title}</option>
                    })}
                  </select>
                </div>

                {filteredStats.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-6 py-3 font-semibold text-xs w-16 text-center">Top</TableHead>
                        <TableHead className="px-6 py-3 font-semibold text-xs">Đề thi</TableHead>
                        <TableHead className="px-6 py-3 font-semibold text-xs">Câu số</TableHead>
                        <TableHead className="px-6 py-3 font-semibold text-xs">Loại</TableHead>
                        <TableHead className="px-6 py-3 font-semibold text-xs">Tỉ lệ làm sai</TableHead>
                        <TableHead className="px-6 py-3 font-semibold text-xs text-right">Tổng bài</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStats.slice(0, 5).map((stat: any, index: number) => (
                        <TableRow key={`${stat.examId}-${stat.questionNum}`} className="hover:bg-slate-50/50">
                          <TableCell className="px-6 py-3 text-center">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs font-black ${index === 0 ? 'bg-red-100 text-red-600' :
                                index === 1 ? 'bg-orange-100 text-orange-600' :
                                  index === 2 ? 'bg-amber-100 text-amber-600' :
                                    'bg-slate-100 text-slate-600'
                              }`}>
                              {index + 1}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <span className="text-xs font-bold text-slate-700">{stat.examTitle}</span>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Badge variant="outline" className="font-mono bg-white">Câu {stat.questionNum}</Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Badge variant="secondary" className={`text-[9px] uppercase ${stat.questionType === 'trac-nghiem' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                stat.questionType === 'tu-luan' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                  'bg-slate-100 text-slate-500'
                              }`}>
                              {stat.questionType === 'trac-nghiem' ? 'Trắc nghiệm' :
                                stat.questionType === 'tu-luan' ? 'Tự luận' : 'Khác'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${stat.errorRate > 70 ? 'bg-red-500' : stat.errorRate > 40 ? 'bg-orange-400' : 'bg-amber-400'}`}
                                  style={{ width: `${stat.errorRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-black text-slate-700">{stat.errorRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3 text-right">
                            <span className="text-xs font-medium text-slate-500">{stat.incorrectCount} / {stat.totalSubmissions}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-sm italic">Chưa có đủ dữ liệu thống kê.</p>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <Card className="card-polish">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Tìm kiếm..."
              className="w-full pl-10 pr-4 h-10 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
          >
            <option value="">Tất cả lớp</option>
            {Array.from(new Set(submissions.map(s => s.studentClass).filter(Boolean)))
              .sort((a, b) => (a as string).localeCompare(b as string, 'vi', { numeric: true }))
              .map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
          </select>

          <input
            type="date"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />

          <div className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Tổng cộng: {filteredSubmissions.length} bài
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="table-header-polish">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6 py-4 font-semibold text-xs">Học sinh</TableHead>
                <TableHead className="px-6 py-4 font-semibold text-xs">Lớp</TableHead>
                <TableHead className="px-6 py-4 font-semibold text-xs">Đề thi</TableHead>
                <TableHead className="px-6 py-4 font-semibold text-xs">Kết quả</TableHead>
                <TableHead className="px-6 py-4 font-semibold text-xs">Ngày chấm</TableHead>
                <TableHead className="px-6 py-4 font-semibold text-xs text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredSubmissions.map((sub) => (
                  <motion.tr
                    key={sub.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{sub.studentName || 'Học sinh ẩn danh'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            MSHS: {sub.studentId || '-'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {sub.studentClass ? (
                        <Badge variant="outline" className={`text-xs font-bold uppercase ${getClassBadgeColor(sub.studentClass)}`}>
                          {sub.studentClass}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Chưa có lớp</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">{sub.examTitle}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-blue-600">{sub.totalScore.toFixed(1)}</span>
                          <span className="text-xs text-slate-400">/ 10</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${sub.totalQuestions ? (sub.correctAnswers / sub.totalQuestions) * 100 : 0}%` }} />
                          </div>
                          <span className="text-[9px] font-bold text-slate-400">{sub.correctAnswers}/{sub.totalQuestions}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-slate-400 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(sub.gradedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Link to={`/results/${sub.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="h-3 w-3" /> Chi tiết
                        </Button>
                      </Link>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredSubmissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-400 italic bg-white">
                    <div className="flex flex-col items-center gap-4">
                      <BarChart className="w-12 h-12 text-slate-100" />
                      <div>
                        <p className="text-sm font-bold">Chưa có dữ liệu bài chấm</p>
                        <p className="text-xs opacity-60">Các kết quả chấm bài sẽ xuất hiện tại đây.</p>
                      </div>
                      <Link to="/upload">
                        <Button variant="outline" className="text-blue-600 border-blue-200 text-xs font-bold uppercase">Bắt đầu chấm ngay</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
