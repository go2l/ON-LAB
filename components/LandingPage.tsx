import React, { useState } from 'react';
import { ShieldCheck, ChevronRight, Binary, Fingerprint, Lock, ShieldAlert, Cpu } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'AUTHORIZED'>('IDLE');
  const [progress, setProgress] = useState(0);

  const startScan = () => {
    setStatus('SCANNING');
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => setStatus('AUTHORIZED'), 500);
      }
      setProgress(p);
    }, 120);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 flex items-center justify-center overflow-hidden font-sans">
      {/* Abstract Background Patterns */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#1e40af 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      <div className="relative z-20 max-w-4xl w-full px-6 flex flex-col items-center text-center">

        {/* Branding Area */}
        <div className="mb-12 animate-fade-in">
          <div className="flex flex-col items-center mb-6">
            <div className="p-4 bg-white rounded-[28px] shadow-xl shadow-blue-100/50 border border-blue-50 mb-6 group hover:scale-105 transition-transform duration-500">
              <ShieldCheck className="w-16 h-16 text-blue-600" />
            </div>
            <div className="space-y-1">
              <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-800">
                PORTAL<span className="text-blue-600">SHIELD</span><span className="text-blue-200 text-2xl font-light">.IL</span>
              </h1>
              <p className="text-blue-400 font-bold tracking-[0.3em] text-[11px] uppercase">
                Israel Information Association Portal
              </p>
            </div>
          </div>
        </div>

        {/* Professional Login Card style for Entry */}
        <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl shadow-blue-200/40 border border-slate-100 relative overflow-hidden">

          {status === 'IDLE' && (
            <div className="space-y-10 animate-fade-in-up">
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-black text-slate-800">אימות גישה למערכת</h2>
                <p className="text-slate-500 text-sm leading-relaxed px-4">
                  לצורך גישה למאגרי המידע הלאומיים של עמידות פתוגנים, יש לבצע אימות פרוטוקול אבטחה.
                </p>
              </div>

              <button
                onClick={startScan}
                className="w-full group relative bg-blue-600 hover:bg-blue-700 text-white font-black py-5 px-8 rounded-2xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center overflow-hidden active:scale-95"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                <Fingerprint className="w-6 h-6 ml-3" />
                <span className="text-lg">התחל אימות ביומטרי</span>
              </button>

              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                <div className="flex flex-col items-center group">
                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                    <Lock className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 mt-2">SECURE</span>
                </div>
                <div className="flex flex-col items-center group">
                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                    <Cpu className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 mt-2">ENCRYPT</span>
                </div>
                <div className="flex flex-col items-center group">
                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                    <ShieldAlert className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 mt-2">MONITOR</span>
                </div>
              </div>
            </div>
          )}

          {status === 'SCANNING' && (
            <div className="space-y-12 animate-fade-in py-4">
              <div className="relative h-48 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="50%" cy="50%" r="80" fill="none" strokeWidth="8" className="stroke-slate-100" />
                  <circle cx="50%" cy="50%" r="80" fill="none" strokeWidth="8" className="stroke-blue-600 transition-all duration-300"
                    style={{ strokeDasharray: '502.4', strokeDashoffset: `${502.4 - (progress / 100) * 502.4}`, strokeLinecap: 'round' }} />
                </svg>
                <div className="flex flex-col items-center z-10">
                  <span className="text-5xl font-black text-slate-800">{Math.round(progress)}%</span>
                  <span className="text-[11px] text-blue-500 font-bold tracking-widest mt-2 uppercase">Authenticating</span>
                </div>
              </div>
              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-2 uppercase">
                  <span>Security Protocol</span>
                  <span>Processing</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            </div>
          )}

          {status === 'AUTHORIZED' && (
            <div className="space-y-10 animate-fade-in-up">
              <div className="w-24 h-24 bg-green-500 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-green-200 ring-8 ring-green-50">
                <ShieldCheck className="w-12 h-12 text-white" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-black text-slate-800">הגישה אושרה</h2>
                <p className="text-slate-500 font-medium text-sm leading-relaxed px-6">
                  תהליך האימות הושלם בהצלחה. החיבור מאובטח ומנותב לשרתי איגוד המידע.
                </p>
              </div>
              <button
                onClick={onEnter}
                className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 px-8 rounded-2xl transition-all flex items-center justify-center shadow-2xl group active:scale-95"
              >
                <span>כניסה ללוח הבקרה</span>
                <ChevronRight className="mr-3 w-6 h-6 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}

        </div>

        {/* Footer Info */}
        <div className="mt-20 animate-fade-in opacity-40 hover:opacity-100 transition-opacity">
          <p className="text-[11px] font-bold text-slate-500 tracking-[0.2em] flex items-center gap-4">
            <span className="h-[1px] w-8 bg-slate-300"></span>
            OFFICIAL GOVERNMENT DATA PORTAL // 2026
            <span className="h-[1px] w-8 bg-slate-300"></span>
          </p>
        </div>
      </div>
    </div>
  );
};
