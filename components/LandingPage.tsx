import React, { useEffect } from 'react';
import { ShieldCheck, ChevronRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Assuming AuthContext provides 'user'

  useEffect(() => {
    if (user) {
      navigate('/map');
    }
  }, [user, navigate]);

  const handleEnter = () => {
    navigate('/login');
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
            <img
              src="/logo.png"
              alt="ON-LAB Logo"
              className="w-64 md:w-80 h-auto drop-shadow-2xl mb-8 hover:scale-105 transition-transform duration-500"
            />
            <p className="text-blue-400 font-bold tracking-[0.3em] text-[11px] uppercase">
              IFRAG - Israel Fungicide Resistance Action Group
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl shadow-blue-200/40 border border-slate-100 flex flex-col gap-6 animate-fade-in-up">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-800">כניסה למערכת</h2>
            <p className="text-slate-500 text-sm">פורטל רשמי - איגוד המידע לעמידות</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleEnter}
              className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95"
            >
              <span>כניסה למערכת</span>
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              disabled
              className="w-full bg-white border-2 border-slate-100 text-slate-400 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 cursor-not-allowed opacity-60"
            >
              {/* Google Icon SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4" />
                <path d="M12.24 24.0008C15.4765 24.0008 18.2059 22.9382 20.1945 21.1039L16.3275 18.1055C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.24 24.0008Z" fill="#34A853" />
                <path d="M5.50253 14.3003C5.00236 12.8099 5.00236 11.1961 5.50253 9.70575V6.61481H1.5166C-0.185517 10.0056 -0.185517 14.0004 1.5166 17.3912L5.50253 14.3003Z" fill="#FBBC05" />
                <path d="M12.24 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.24 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.61481L5.50253 9.70575C6.45064 6.86173 9.10947 4.74966 12.24 4.74966Z" fill="#EA4335" />
              </svg>
              <span>התחברות עם Google</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
            <Lock className="w-3 h-3" />
            <span>Secure Connection 2026</span>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-20 animate-fade-in opacity-40 hover:opacity-100 transition-opacity">
          <p className="text-xs font-bold text-slate-500 tracking-wide flex items-center gap-4">
            <span className="h-[1px] w-8 bg-slate-300"></span>
            המערכת פותחה על ידי אוהד נוריאל
            <span className="h-[1px] w-8 bg-slate-300"></span>
          </p>
        </div>
      </div>
    </div>
  );
};
