import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ExamManagement from '@/pages/ExamManagement';
import QuestionBank from '@/pages/QuestionBank';
import SubmissionUpload from '@/pages/SubmissionUpload';
import SubmissionHistory from '@/pages/SubmissionHistory';
import Results from '@/pages/Results';
import ApproveQueue from '@/pages/ApproveQueue';
import Students from '@/pages/Students';
import { Toaster } from '@/components/ui/sonner';
import { LayoutDashboard, FileText, Upload, LogOut, ChevronRight, Library, BarChart3, CheckSquare, GraduationCap } from 'lucide-react';

function Navigation() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/exams', label: 'Thư viện đề thi', icon: FileText },
    { path: '/history', label: 'Lịch sử chấm bài', icon: BarChart3 },
    { path: '/students', label: 'Hồ sơ học sinh', icon: GraduationCap },
    { path: '/approve-queue', label: 'Hàng đợi duyệt', icon: CheckSquare },
    { path: '/questions', label: 'Ngân hàng câu hỏi', icon: Library },
    { path: '/upload', label: 'Chấm bài mới', icon: Upload },
  ];

  return (
    <nav className="flex-1 p-4 space-y-2">
      {navItems.map((item) => (
        <Link 
          key={item.path} 
          to={item.path}
          className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all ${
            isActive(item.path) ? 'sidebar-item-active' : 'sidebar-item-inactive'
          }`}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
          {isActive(item.path) && <ChevronRight className="w-3 h-3 ml-auto" />}
        </Link>
      ))}
    </nav>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('teacher_auth') === 'true' && !!localStorage.getItem('teacher_token');
  });

  const handleLogin = (payload: any) => {
    setIsAuthenticated(true);
    localStorage.setItem('teacher_auth', 'true');
    if (payload.token) {
      localStorage.setItem('teacher_token', payload.token);
    }
    if (payload.user) {
      localStorage.setItem('teacher_user', JSON.stringify(payload.user));
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('teacher_auth');
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('teacher_user');
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/*" 
            element={isAuthenticated ? (
              <div className="flex h-screen overflow-hidden">
                {/* Sidebar Navigation */}
                <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
                  <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-xl text-white shadow-lg">A</div>
                      <h1 className="text-lg font-bold tracking-tight text-white">AutoGrader AI</h1>
                    </div>
                  </div>
                  
                  <Navigation />

                  <div className="p-6 border-t border-slate-800 text-xs text-slate-500">
                    <p className="mb-2">Đang đăng nhập:</p>
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-300">GV. Nguyễn Văn A</strong>
                      <button 
                        onClick={handleLogout}
                        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                      >
                        <LogOut className="w-3 h-3" /> Thoát
                      </button>
                    </div>
                  </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                  <header className="h-16 border-b bg-white flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Hệ thống chấm bài MVP</h2>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-slate-200">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Trạng thái AI: Online
                      </div>
                    </div>
                  </header>
                  <main className="flex-1 overflow-auto p-8">
                    <div className="max-w-6xl mx-auto">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/exams" element={<ExamManagement />} />
                        <Route path="/history" element={<SubmissionHistory />} />
                        <Route path="/approve-queue" element={<ApproveQueue />} />
                        <Route path="/questions" element={<QuestionBank />} />
                        <Route path="/upload" element={<SubmissionUpload />} />
                        <Route path="/results/:id" element={<Results />} />
                        <Route path="/students" element={<Students />} />
                      </Routes>
                    </div>
                  </main>
                </div>
              </div>
            ) : <Navigate to="/login" />} 
          />
        </Routes>
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  );
}
