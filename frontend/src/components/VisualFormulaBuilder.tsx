import React, { useState, useEffect, useRef } from 'react';
import { Sigma, Check, X, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Declare math-field custom element and global Window properties
declare global {
  interface Window {
    MathfieldElement?: any;
  }
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        ref?: React.RefObject<any>;
        class?: string;
        'virtual-keyboard-mode'?: string;
      };
      [elemName: string]: any;
    }
  }
}

interface VisualFormulaBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
}

export default function VisualFormulaBuilder({ isOpen, onClose, onInsert }: VisualFormulaBuilderProps) {
  const [loaded, setLoaded] = useState(false);
  const [latexVal, setLatexVal] = useState('');
  const mfRef = useRef<any>(null);

  // Load MathLive from CDN if not already loaded
  useEffect(() => {
    if (!isOpen) return;

    if (window.customElements.get('math-field')) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/mathlive';
    script.async = true;
    script.onload = () => {
      setLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load MathLive library from CDN');
    };
    document.body.appendChild(script);

    return () => {
      // Keep script loaded globally
    };
  }, [isOpen]);

  // Handle focus and configuration when open
  useEffect(() => {
    if (!loaded || !isOpen || !mfRef.current) return;

    const mf = mfRef.current;
    
    // Configure MathLive Options
    mf.virtualKeyboardMode = 'manual'; // Show keyboard toggle button inside field
    
    // Clear initial state
    mf.value = '';
    setLatexVal('');

    // Focus field
    setTimeout(() => {
      mf.focus();
    }, 100);

    const handleInput = (e: any) => {
      setLatexVal(e.target.value);
    };

    mf.addEventListener('input', handleInput);

    return () => {
      mf.removeEventListener('input', handleInput);
    };
  }, [loaded, isOpen]);

  if (!isOpen) return null;

  // Insert structured templates using MathLive's insert command
  const insertTemplate = (latex: string) => {
    const mf = mfRef.current;
    if (mf) {
      mf.insert(latex);
      mf.focus();
    }
  };

  const handleKeyboardToggle = () => {
    const mf = mfRef.current;
    if (mf) {
      // Trigger virtual keyboard show
      if (window.MathfieldElement) {
        window.MathfieldElement.keyboard?.show();
      }
      mf.focus();
    }
  };

  const handleSubmit = () => {
    const mf = mfRef.current;
    const value = mf ? mf.value : latexVal;
    if (value.trim()) {
      onInsert(`$${value}$`);
      onClose();
    }
  };

  const shortcuts = [
    { label: 'Phân số', latex: '\\frac{#0}{#1}', icon: '½' },
    { label: 'Căn bậc 2', latex: '\\sqrt{#0}', icon: '√' },
    { label: 'Số mũ', latex: '{#0}^{#1}', icon: 'xⁿ' },
    { label: 'Chỉ số dưới', latex: '{#0}_{#1}', icon: 'xᵢ' },
    { label: 'Tích phân', latex: '\\int_{#0}^{#1}{#2\\,dx}', icon: '∫' },
    { label: 'Giới hạn', latex: '\\lim_{{#0} \\to {#1}}{#2}', icon: 'lim' },
    { label: 'Tổng Sigma', latex: '\\sum_{{#0}}^{{#1}}{#2}', icon: 'Σ' },
    { label: 'Ngoặc tròn', latex: '\\left( #0 \\right)', icon: '( )' },
    { label: 'Hệ PT 2 dòng', latex: '\\begin{cases} #0 \\\\ #1 \\end{cases}', icon: '{' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[640px] rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden transform scale-100 transition-all duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-650 text-white flex items-center justify-center shadow-lg shadow-purple-600/20">
              <Sigma className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-850">Nhập công thức Toán trực tiếp</h2>
              <p className="text-[11px] text-slate-500 font-semibold">Gõ trực tiếp vào ô, nhấn các ô trống để điền số</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Editor Body */}
        <div className="p-6 space-y-5">
          {!loaded ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Đang tải Math Editor...</p>
            </div>
          ) : (
            <>
              {/* Shortcut buttons toolbar */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Mẫu chèn nhanh</span>
                <div className="flex flex-wrap gap-1.5">
                  {shortcuts.map(shortcut => (
                    <button
                      key={shortcut.label}
                      type="button"
                      onClick={() => insertTemplate(shortcut.latex)}
                      title={shortcut.label}
                      className="h-8 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all active:scale-95 shadow-sm"
                    >
                      <span className="mr-1 text-[13px] text-purple-600 font-semibold">{shortcut.icon}</span>
                      {shortcut.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleKeyboardToggle}
                    title="Mở bàn phím ảo đầy đủ"
                    className="h-8 px-3 text-xs font-bold rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-700 transition-all active:scale-95 shadow-sm flex items-center gap-1"
                  >
                    <Keyboard className="w-3.5 h-3.5" /> Bàn phím ảo
                  </button>
                </div>
              </div>

              {/* Math Editor Box */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Bảng vẽ công thức</span>
                <div className="border border-purple-100 rounded-2xl p-1 bg-gradient-to-r from-purple-50/20 to-blue-50/20 shadow-inner">
                  <math-field
                    ref={mfRef}
                    class="w-full min-h-[90px] text-xl p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none block font-semibold"
                    virtual-keyboard-mode="manual"
                  />
                </div>
                <p className="text-[10px] text-slate-400 italic">Mẹo: Sử dụng các phím mũi tên hoặc nhấn chuột để di chuyển giữa các phần số tử/mẫu.</p>
              </div>

              {/* Code output preview */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mã LaTeX tạo ra</span>
                  <span className="text-[9px] font-mono text-slate-500 select-all">{latexVal || mfRef.current?.value || 'Trống'}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="rounded-xl font-bold h-10 text-xs px-4"
          >
            Hủy bỏ
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!loaded || (!latexVal.trim() && !mfRef.current?.value?.trim())}
            className="bg-purple-650 hover:bg-purple-700 text-white rounded-xl font-bold h-10 text-xs px-6 shadow-lg shadow-purple-650/15"
          >
            <Check className="w-4 h-4 mr-1.5" /> Xác nhận & Chèn
          </Button>
        </div>

      </div>
    </div>
  );
}
