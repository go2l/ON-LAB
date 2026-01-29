import React from 'react';
import { ArrowRight, BookOpen, FileText, Activity, Map, Database, ShieldCheck } from 'lucide-react';

interface GuidelinesPageProps {
    onBack: () => void;
}

export const GuidelinesPage: React.FC<GuidelinesPageProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2 rounded-xl text-white">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800">הנחיות ומסמכים</h1>
                            <p className="text-xs text-slate-500 font-bold tracking-wider">IFRAG - Israel Fungicide Resistance Action Group</p>
                        </div>
                    </div>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors bg-slate-100 hover:bg-blue-50 px-4 py-2 rounded-xl"
                    >
                        <ArrowRight className="w-4 h-4" />
                        <span>חזרה למסך הראשי</span>
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">

                {/* Intro Section */}
                <section className="animate-fade-in">
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-bl-full -mr-32 -mt-32 opacity-50 pointer-events-none"></div>

                        <h2 className="text-3xl font-black text-slate-800 mb-6 relative z-10">ברוכים הבאים לפורטל המידע הלאומי לעמידות</h2>
                        <p className="text-lg text-slate-600 leading-relaxed max-w-2xl relative z-10">
                            מערכת זו פותחה על ידי ארגון IFRAG במטרה לנטר, לנהל ולמפות את תמונת המצב של עמידות פתוגנים לחומרי הדברה בישראל.
                            המידע הנאסף משמש חקלאים, מדריכים וחוקרים לקבלת החלטות מושכלות בזמן אמת.
                        </p>
                    </div>
                </section>

                {/* How it works */}
                <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                        <Activity className="w-6 h-6 text-blue-500" />
                        איך המערכת עובדת?
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6 text-green-600">
                                <Map className="w-7 h-7" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 mb-3">1. איסוף מהשטח</h4>
                            <p className="text-slate-500 leading-relaxed">
                                פקחים ומדריכים דוגמים חלקות חשודות בשטח, ומזינים את פרטי הדגימה (מיקום, גידול, היסטוריית ריסוסים) ישירות לאפליקציה.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-purple-600">
                                <Database className="w-7 h-7" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 mb-3">2. בדיקת מעבדה</h4>
                            <p className="text-slate-500 leading-relaxed">
                                הדגימות נשלחות למעבדות המוסמכות, שם נבדקת רגישות הפתוגן לחומרים הפעילים השונים. התוצאות מוזנות למערכת המרכזית.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                                <ShieldCheck className="w-7 h-7" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 mb-3">3. תמונת מצב</h4>
                            <p className="text-slate-500 leading-relaxed">
                                הנתונים מעובדים למפות חום וגרפים בזמן אמת, המאפשרים לזהות מוקדי התפרצות ולהמליץ על פרוטוקולי טיפול יעילים.
                            </p>
                        </div>
                    </div>
                </section>



                {/* Contact */}
                <section className="bg-slate-900 text-white rounded-3xl p-10 md:p-16 text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <h3 className="text-2xl font-black mb-4">זקוקים לעזרה נוספת?</h3>
                    <p className="text-slate-400 mb-8 max-w-xl mx-auto">
                        צוות התמיכה של המיזם זמין לכל שאלה מקצועית או טכנית.
                    </p>
                    <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-lg shadow-blue-900/50">
                        צרו קשר עם התמיכה
                    </button>
                </section>

            </div>
        </div>
    );
};
