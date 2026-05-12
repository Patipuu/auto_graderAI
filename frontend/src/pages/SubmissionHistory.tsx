import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, FileText, Calendar, User, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Submission {
  id: string;
  studentName: string;
  studentId: string;
  examId: string;
  examTitle: string;
  totalScore: number;
  totalQuestions: number;
  correctAnswers: number;
  gradedAt: string;
}

export default function SubmissionHistory() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

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

  const filteredSubmissions = submissions.filter(s => 
    (s.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.studentId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.examTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lịch sử chấm bài</h1>
          <p className="text-sm text-slate-500">Xem lại danh sách các bài thi đã được hệ thống chấm điểm.</p>
        </div>
      </div>

      <Card className="card-polish">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Tìm tên học sinh, ID hoặc tên đề..." 
              className="w-full pl-10 pr-4 h-10 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Tổng cộng: {filteredSubmissions.length} bài đã chấm
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="table-header-polish">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6 py-4 font-semibold text-xs">Học sinh</TableHead>
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
                            <div className="text-[10px] text-slate-400 font-mono">MSHS: {sub.studentId || '-'}</div>
                         </div>
                      </div>
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
                  <TableCell colSpan={5} className="text-center py-20 text-slate-400 italic bg-white">
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
