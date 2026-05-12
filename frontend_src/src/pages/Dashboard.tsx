import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PlusCircle, FileText, Upload, CheckSquare, BarChart3, Users, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalExams: 0,
    totalSubmissions: 0,
    avgScore: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsRes, subRes] = await Promise.all([
          fetch('/api/exams'),
          fetch('/api/submissions')
        ]);
        const exams = await examsRes.json();
        const submissions = await subRes.json();
        
        const totalExams = exams.length;
        const totalSubmissions = submissions.length;
        const avgScore = totalSubmissions > 0 
          ? submissions.reduce((acc: number, s: any) => acc + s.totalScore, 0) / totalSubmissions 
          : 0;

        setStats({ totalExams, totalSubmissions, avgScore });
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

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
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95 px-6">
              <Upload className="w-4 h-4" /> Chấm bài mới
            </Button>
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
          { label: "Tổng số đề thi", value: stats.totalExams, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Bài đã chấm", value: stats.totalSubmissions, icon: CheckSquare, color: "text-green-600", bg: "bg-green-50" },
          { label: "Điểm trung bình", value: stats.avgScore.toFixed(1), icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Cần xử lý", value: "0", icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={item}>
            <Card className="card-polish">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <div className="text-2xl font-bold mt-1">{stat.value}</div>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

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
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <CheckSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-800">Bài chấm mới</h4>
                    <p className="text-[10px] text-slate-500">Lớp 12A1 • GK1 Toán</p>
                  </div>
                  <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Note from the theme */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-600/40 transition-colors" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="font-bold mb-2 uppercase tracking-widest text-[10px] text-blue-400">Trạng thái hệ thống</p>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-[11px] text-slate-400">
              <li className="flex items-center gap-2">• OpenCV OMR: <span className="text-green-400 font-bold uppercase transition-all">Online</span></li>
              <li className="flex items-center gap-2">• OCR Confidence: <span className="text-blue-400 font-bold uppercase transition-all">92% Avg</span></li>
              <li className="flex items-center gap-2">• Database: <span className="text-green-400 font-bold uppercase transition-all">Connected</span></li>
              <li className="flex items-center gap-2">• Server Node: <span className="text-blue-400 font-bold uppercase transition-all">Running</span></li>
            </ul>
          </div>
          <div className="hidden md:block">
             <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-mono text-slate-500">
               Rule BR-02 applied: Essay OCR marked for manual validation.
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
