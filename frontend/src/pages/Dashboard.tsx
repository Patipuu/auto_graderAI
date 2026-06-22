import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PlusCircle, FileText, Upload, CheckSquare, BarChart3, Users, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalExams: 0,
    totalSubmissions: 0,
    avgScore: 0,
    needsReview: 0,
    latestSubmission: null as any
  });
  const [duplicateStudentIds, setDuplicateStudentIds] = useState<Array<{
    studentId: string;
    count: number;
    submissions: Array<{ id: string; studentName?: string; examTitle?: string; studentClass?: string }>;
  }>>([]);

  const fetchData = async () => {
    try {
      const [examsRes, subRes, dupRes] = await Promise.all([
        fetch('/api/exams'),
        fetch('/api/submissions'),
        fetch('/api/submissions/duplicates/student-ids'),
      ]);
      const exams = await examsRes.json();
      const submissions = await subRes.json();
      if (dupRes.ok) {
        const dupData = await dupRes.json();
        setDuplicateStudentIds(dupData.duplicates || []);
      }
      
      const totalExams = exams.length;
      const totalSubmissions = submissions.length;
      const avgScore = totalSubmissions > 0 
        ? submissions.reduce((acc: number, s: any) => acc + s.totalScore, 0) / totalSubmissions 
        : 0;

      const needsReview = submissions.filter((s: any) => s.requiresManualReview).length;
      const sortedSubmissions = [...submissions].sort((a: any, b: any) => new Date(b.processedAt || 0).getTime() - new Date(a.processedAt || 0).getTime());
      const latestSubmission = sortedSubmissions[0] || null;

      setStats({ totalExams, totalSubmissions, avgScore, needsReview, latestSubmission });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmStudent = async (studentId: string) => {
    if (!confirm(`Bạn có chắc chắn xác nhận các bài làm có MSHS ${studentId} đều của cùng 1 học sinh?`)) {
      return;
    }
    try {
      const res = await fetch('/api/submissions/duplicates/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.message || 'Có lỗi xảy ra khi xác nhận.');
      }
    } catch (error) {
      console.error(error);
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tổng quan hệ thống</h1>
          <p className="text-sm text-slate-500">Xem thống kê và quản lý hoạt động chấm bài của bạn.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/upload">
            {/* <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95 px-6">
              <Upload className="w-4 h-4" /> Chấm bài mới
            </Button> */}
          </Link>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          { label: "Tổng số đề thi", value: stats.totalExams, icon: FileText, color: "text-blue-600", bg: "bg-blue-50", link: "/exams" },
          { label: "Bài đã chấm", value: stats.totalSubmissions, icon: CheckSquare, color: "text-green-600", bg: "bg-green-50", link: "/history" },
          { label: "Điểm trung bình", value: stats.avgScore.toFixed(1), icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50", link: "/history" },
          { label: "Cần xử lý", value: stats.needsReview, icon: Users, color: "text-orange-600", bg: "bg-orange-50", link: "/history" },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={item}>
            <Link to={stat.link} className="block group">
              <Card className="card-polish transition-all group-hover:shadow-md group-hover:border-blue-200 group-hover:-translate-y-0.5">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                      <div className="text-2xl font-bold mt-1 group-hover:text-blue-600 transition-colors">{stat.value}</div>
                    </div>
                    <div className={`p-2 rounded-lg ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {duplicateStudentIds.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
          <CardHeader className="py-3 px-5 border-b border-amber-100">
            <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Cảnh báo MSHS trùng ({duplicateStudentIds.length} mã)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 max-h-56 overflow-y-auto">
            {duplicateStudentIds.map((group) => (
              <div key={group.studentId} className="rounded-xl border border-amber-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-black font-mono text-amber-900">{group.studentId}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      {group.count} bài làm
                    </span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-6 text-[10px] px-2 py-0 border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                      onClick={() => handleConfirmStudent(group.studentId)}
                    >
                      Xác nhận cùng 1 HS
                    </Button>
                  </div>
                </div>
                <ul className="space-y-1">
                  {group.submissions.map((sub) => (
                    <li key={sub.id} className="text-[11px] text-slate-600">
                      <Link to={`/results/${sub.id}`} className="font-semibold text-blue-700 hover:underline">
                        {sub.studentName || 'Không tên'}
                      </Link>
                      <span className="text-slate-400"> · {sub.examTitle || 'Không rõ đề'}</span>
                      {sub.studentClass && <span className="text-slate-400"> · {sub.studentClass}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-polish md:col-span-2">
          <CardHeader className="border-b border-slate-50 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Thao tác nhanh</CardTitle>
            <Link to="/history" className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">Xem lịch sử</Link>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-2 gap-4">
            <Link to="/upload" className="group">
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center gap-4 transition-all hover:bg-white hover:border-blue-200 hover:shadow-md group-active:scale-[0.98]">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="block font-bold text-slate-800">Tải bài nộp</span>
                  <span className="text-[10px] text-slate-400 font-medium">Bắt đầu quá trình chấm AI</span>
                </div>
              </div>
            </Link>
            <Link to="/exams" className="group">
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center gap-4 transition-all hover:bg-white hover:border-blue-200 hover:shadow-md group-active:scale-[0.98]">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="block font-bold text-slate-800">Tạo đề thi</span>
                  <span className="text-[10px] text-slate-400 font-medium">Cấu hình đáp án mẫu</span>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="card-polish">
          <CardHeader className="border-b border-slate-50 py-4 px-6">
            <CardTitle className="text-base font-bold">Hoạt động mới nhất</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {stats.totalSubmissions === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  Chưa có hoạt động nào.
                </div>
              ) : (
                <Link to={`/results/${stats.latestSubmission?.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-transparent hover:border-slate-200 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <CheckSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-800">Bài chấm mới nhất: {stats.latestSubmission?.studentName || 'Ẩn danh'}</h4>
                    <p className="text-[10px] text-slate-500">{stats.latestSubmission?.examTitle || 'Không rõ đề thi'} • {new Date(stats.latestSubmission?.processedAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
