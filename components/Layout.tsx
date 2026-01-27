import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Map as MapIcon,
  LayoutDashboard,
  Beaker,
  Users,
  FileText,
  Menu,
  Bell,
  Search,
  X
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeView,
  onViewChange
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);

  const navigation = [
    { name: 'דף הבית', view: 'map', icon: LayoutDashboard },
    { name: 'דגימות חדשות', view: 'add', icon: Plus },
    { name: 'רשימת הדגימות', view: 'list', icon: FileText },
    { name: 'מעקב מעבדה (נדרשת הרשאה)', view: 'lab', icon: Beaker },
    { name: 'ניהול משתמשים', view: 'users', icon: Users },
    { name: 'מפות ודוחות', view: 'reports', icon: ShieldCheck },
  ];

  return (
    <div className="flex h-screen bg-slate-100 font-sans" dir="rtl">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile: Fixed Drawer, Desktop: Static Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 bg-white shadow-xl transition-transform duration-300 md:translate-x-0 md:static md:flex flex-col border-l border-slate-200 
          ${isSidebarOpen ? 'translate-x-0 w-64' : 'translate-x-full md:w-20 md:translate-x-0'}`}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          {(isSidebarOpen || window.innerWidth < 768) && (
            <div className="animate-fade-in group">
              <h1 className="text-xl font-bold text-blue-800 leading-tight">ON-LAB-IL</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">הפורטל הלאומי לאיגוד המידע לעמידות לפונגצידים</p>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors hidden md:block"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1">
          {navigation.map((item) => (
            <button
              key={item.view}
              onClick={() => {
                onViewChange(item.view);
                // Close sidebar on mobile after selection
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center p-3 rounded-xl transition-all group ${activeView === item.view
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200 font-bold'
                : 'text-slate-500 hover:bg-slate-50 font-medium'
                }`}
            >
              <item.icon className={`w-5 h-5 ${isSidebarOpen ? 'ml-3' : 'mx-auto md:mx-auto'}`} />
              {(isSidebarOpen || window.innerWidth < 768) && <span className="text-sm">{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4">
            <div className={`flex items-center ${(!isSidebarOpen && window.innerWidth >= 768) && 'justify-center'}`}>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">AM</div>
              {(isSidebarOpen || window.innerWidth < 768) && (
                <div className="mr-3 overflow-hidden">
                  <p className="text-xs font-bold text-slate-700 truncate">משתמש מערכת</p>
                  <p className="text-[10px] text-slate-400 truncate">מנהל מערכת</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-20">
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Hamburger Trigger */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -mr-2 text-slate-500 hover:bg-slate-50 rounded-lg md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="relative w-full max-w-sm hidden md:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="חיפוש דגימות, חוקרים או אזורים..."
                className="w-full bg-slate-50 border-none rounded-xl py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4 space-x-reverse">
            <button className="md:hidden p-2 text-slate-400">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 md:p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl relative transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 left-2 w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-6 md:h-8 w-[1px] bg-slate-200 mx-1 md:mx-2"></div>
            <div className="flex items-center mr-1 md:mr-2">
              <span className="text-sm font-bold text-slate-600 ml-3 hidden sm:block">26 בינואר, 2026</span>
              <div className="p-1.5 md:p-2 bg-slate-50 rounded-xl">
                <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>

          <footer className="mt-8 md:mt-12 py-6 md:py-8 border-t border-slate-200 text-center">
            <p className="text-[10px] md:text-xs text-slate-400">© 2026 ON-LAB-IL - הפורטל הלאומי לאיגוד המידע לעמידות לפונגצידים. כל הזכויות שמורות.</p>
          </footer>
        </main>
      </div>
    </div>
  );
};
