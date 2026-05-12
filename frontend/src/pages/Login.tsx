import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Lock, User } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: (payload: any) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đăng nhập thành công');
        onLogin(data);
      } else {
        toast.error('Sai tài khoản hoặc mật khẩu');
      }
    } catch (err) {
      toast.error('Lỗi hệ thống');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden">
          <CardHeader className="space-y-4 text-center pt-10 pb-6 bg-slate-50/50 border-b border-slate-100">
            <div className="flex justify-center">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg ring-4 ring-blue-100">A</div>
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight text-slate-900 uppercase">AutoGrader AI</CardTitle>
              <CardDescription className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px]">
                Hệ thống chấm điểm AI chuyên nghiệp
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 p-8">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[10px] font-bold text-slate-400 border-none uppercase tracking-widest ml-1">Tên đăng nhập</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input 
                    id="username" 
                    placeholder="admin" 
                    className="h-12 pl-10 border-slate-200 rounded-xl focus:ring-blue-600 bg-slate-50/50"
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" title="password" className="text-[10px] items-center font-bold text-slate-400 border-none uppercase tracking-widest ml-1">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="h-12 pl-10 border-slate-200 rounded-xl focus:ring-blue-600 bg-slate-50/50"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-8 pt-0">
              <Button className="w-full h-12 text-sm font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-xl transition-all active:scale-95" disabled={isLoading} type="submit">
                {isLoading ? 'ĐANG XÁC THỰC...' : 'BẮT ĐẦU LÀM VIỆC'}
              </Button>
            </CardFooter>
          </form>
        </Card>
        <p className="mt-8 text-center text-[10px] text-slate-500 italic uppercase tracking-widest font-bold">
          Dùng admin / admin • teacher / password
        </p>
      </motion.div>
    </div>
  );
}
