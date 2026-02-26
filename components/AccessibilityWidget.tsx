import React, { useState, useEffect } from 'react';
import {
    Accessibility,
    X,
    Type,
    Sun,
    Eye,
    Link as LinkIcon,
    RefreshCcw,
    Minus,
    Plus
} from 'lucide-react';

export const AccessibilityWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [fontSize, setFontSize] = useState(100); // Percentage
    const [isHighContrast, setIsHighContrast] = useState(false);
    const [isGrayscale, setIsGrayscale] = useState(false);
    const [highlightLinks, setHighlightLinks] = useState(false);
    const [readableFont, setReadableFont] = useState(false);

    // Apply effects
    useEffect(() => {
        document.documentElement.style.fontSize = `${fontSize}%`;
    }, [fontSize]);

    useEffect(() => {
        if (isHighContrast) {
            document.documentElement.classList.add('high-contrast');
            document.body.style.backgroundColor = '#000';
            document.body.style.color = '#fff';
            document.querySelectorAll('*').forEach((el: any) => {
                el.style.borderColor = '#fff';
            });
        } else {
            document.documentElement.classList.remove('high-contrast');
            document.body.style.backgroundColor = '';
            document.body.style.color = '';
            document.querySelectorAll('*').forEach((el: any) => {
                el.style.borderColor = '';
            });
        }
    }, [isHighContrast]);

    useEffect(() => {
        if (isGrayscale) {
            document.documentElement.style.filter = 'grayscale(100%)';
        } else {
            document.documentElement.style.filter = '';
        }
    }, [isGrayscale]);

    useEffect(() => {
        if (highlightLinks) {
            document.body.classList.add('highlight-links');
            const style = document.createElement('style');
            style.id = 'a11y-links';
            style.innerHTML = `
                a, button { 
                    text-decoration: underline !important; 
                    font-weight: bold !important;
                    outline: 2px solid yellow !important;
                }
            `;
            document.head.appendChild(style);
        } else {
            document.body.classList.remove('highlight-links');
            const style = document.getElementById('a11y-links');
            if (style) style.remove();
        }
    }, [highlightLinks]);

    useEffect(() => {
        if (readableFont) {
            document.body.classList.add('readable-font');
            const style = document.createElement('style');
            style.id = 'a11y-font';
            style.innerHTML = `
                * { 
                   font-family: Arial, Helvetica, sans-serif !important;
                }
            `;
            document.head.appendChild(style);
        } else {
            document.body.classList.remove('readable-font');
            const style = document.getElementById('a11y-font');
            if (style) style.remove();
        }
    }, [readableFont]);


    const resetAll = () => {
        setFontSize(100);
        setIsHighContrast(false);
        setIsGrayscale(false);
        setHighlightLinks(false);
        setReadableFont(false);
    };

    return (
        <div className="fixed bottom-4 left-4 z-50 font-sans" dir="rtl">
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
                    aria-label="פתח תפריט נגישות"
                >
                    <Accessibility className="w-8 h-8" />
                </button>
            )}

            {/* Menu Panel */}
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden border border-slate-200 animate-fade-in">
                    <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Accessibility className="w-5 h-5" />
                            תפריט נגישות
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-blue-700 p-1 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Font Size */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Type className="w-4 h-4 text-slate-400" />
                                גודל טקסט ({fontSize}%)
                            </label>
                            <div className="flex bg-slate-100 rounded-xl p-1">
                                <button
                                    onClick={() => setFontSize(Math.max(80, fontSize - 10))}
                                    className="flex-1 p-2 hover:bg-white rounded-lg transition-colors text-slate-600 flex justify-center"
                                    aria-label="הקטן טקסט"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setFontSize(Math.min(150, fontSize + 10))}
                                    className="flex-1 p-2 hover:bg-white rounded-lg transition-colors text-slate-600 flex justify-center"
                                    aria-label="הגדל טקסט"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* Toggles Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setIsHighContrast(!isHighContrast)}
                                className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all border ${isHighContrast ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-transparent hover:bg-slate-100 text-slate-600'
                                    }`}
                            >
                                <Sun className="w-5 h-5" />
                                <span className="text-xs font-bold">ניגודיות גבוהה</span>
                            </button>

                            <button
                                onClick={() => setIsGrayscale(!isGrayscale)}
                                className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all border ${isGrayscale ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-transparent hover:bg-slate-100 text-slate-600'
                                    }`}
                            >
                                <Eye className="w-5 h-5" />
                                <span className="text-xs font-bold">גווני אפור</span>
                            </button>

                            <button
                                onClick={() => setHighlightLinks(!highlightLinks)}
                                className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all border ${highlightLinks ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-transparent hover:bg-slate-100 text-slate-600'
                                    }`}
                            >
                                <LinkIcon className="w-5 h-5" />
                                <span className="text-xs font-bold">הדגשת קישורים</span>
                            </button>

                            <button
                                onClick={() => setReadableFont(!readableFont)}
                                className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all border ${readableFont ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-transparent hover:bg-slate-100 text-slate-600'
                                    }`}
                            >
                                <Type className="w-5 h-5" />
                                <span className="text-xs font-bold">גופן קריא</span>
                            </button>
                        </div>

                        <div className="h-px bg-slate-100" />

                        <button
                            onClick={resetAll}
                            className="w-full py-3 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-colors"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            איפוס הגדרות
                        </button>

                        <div className="text-center">
                            <a href="#" className="text-[10px] text-blue-500 underline">הצהרת נגישות</a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
