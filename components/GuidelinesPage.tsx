import React, { useState, useEffect } from 'react';
import { ArrowRight, BookOpen, Search, Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GuidelinesDocument } from '../types';
import { getGuidelines } from '../utils/cms/firestore';
import { createDefaultDocument } from '../utils/cms/migration';
import { GuidelinesRenderer } from './cms/GuidelinesRenderer';
import { GuidelinesEditor } from './cms/GuidelinesEditor';

interface GuidelinesPageProps {
  onBack: () => void;
}

const SkeletonLoader: React.FC = () => (
  <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 animate-pulse" dir="rtl">
    <div className="h-40 bg-slate-200 rounded-3xl"></div>
    <div className="h-8 bg-slate-200 w-48 rounded"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-48 bg-slate-200 rounded-3xl"></div>
      <div className="h-48 bg-slate-200 rounded-3xl"></div>
      <div className="h-48 bg-slate-200 rounded-3xl"></div>
    </div>
  </div>
);

export const GuidelinesPage: React.FC<GuidelinesPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [publishedDoc, setPublishedDoc] = useState<GuidelinesDocument | null>(null);
  const [draftDoc, setDraftDoc] = useState<GuidelinesDocument | null>(null);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDraft, setLoadingDraft] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [fallbackActive, setFallbackActive] = useState<boolean>(false);

  // Normalize user email
  const userEmail = user?.email?.trim().toLowerCase() || '';
  const isOhad = userEmail === 'ohad126@gmail.com';

  useEffect(() => {
    loadPublishedGuidelines();
  }, []);

  const loadPublishedGuidelines = async () => {
    setLoading(true);
    setFallbackActive(false);
    try {
      const docData = await getGuidelines('published');
      setPublishedDoc(docData);
    } catch (e) {
      console.warn('Firestore load failed. Using offline fallback:', e);
      // Safety Fallback: Load static default guidelines if firestore is offline or fails
      setPublishedDoc(createDefaultDocument());
      setFallbackActive(true);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditing = async () => {
    setLoadingDraft(true);
    try {
      const draft = await getGuidelines('draft');
      setDraftDoc(draft);
      setIsEditing(true);
    } catch (e) {
      console.error(e);
      alert('טעינת טיוטת העריכה נכשלה. אנא ודא שחיבור האינטרנט שלך פעיל.');
    } finally {
      setLoadingDraft(false);
    }
  };

  const handlePublishSuccess = (updatedDoc: GuidelinesDocument) => {
    setPublishedDoc(updatedDoc);
    setIsEditing(false);
  };

  // If editor is active, completely delegate to GuidelinesEditor workspace
  if (isEditing && draftDoc) {
    return (
      <GuidelinesEditor
        initialDoc={draftDoc}
        userEmail={userEmail}
        onExit={() => setIsEditing(false)}
        onPublishSuccess={handlePublishSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
      
      {/* Editor Banner for ohad126@gmail.com */}
      {isOhad && !loading && (
        <div className="bg-blue-600 text-white px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-3 z-40 select-none print:hidden shadow-md">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white font-black text-xs px-2.5 py-0.5 rounded-full">ממשק ניהול</span>
            <span className="text-xs font-bold">מחובר כ-ohad126@gmail.com. באפשרותך לערוך ולעצב את דף ההנחיות.</span>
          </div>
          <button
            onClick={handleStartEditing}
            disabled={loadingDraft}
            className="bg-white hover:bg-slate-50 text-blue-600 font-bold text-xs py-2 px-5 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{loadingDraft ? 'טוען טיוטה...' : 'עריכת הנחיות'}</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-800">הנחיות ומסמכים</h1>
              <p className="text-[10px] md:text-xs text-slate-500 font-bold tracking-wider">IFRAG - Israel Fungicide Resistance Action Group</p>
            </div>
          </div>
          
          {/* Dynamic Search Bar */}
          {!loading && (
            <div className="relative max-w-xs flex-1 hidden md:block">
              <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="חפש בהנחיות..."
                className="w-full text-xs font-bold border border-slate-200 pr-9 pl-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors bg-slate-100 hover:bg-blue-50 px-4 py-2 rounded-xl text-xs md:text-sm shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
            <span>חזרה למסך הראשי</span>
          </button>
        </div>
      </div>

      {/* Offline/Fallback Warning Banner */}
      {fallbackActive && (
        <div className="bg-amber-50 text-amber-800 border-b border-amber-200 px-6 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span>חיבור לשרת לא זמין. מציג הנחיות מובנות מברירת מחדל במצב קריאה בלבד.</span>
          <button onClick={loadPublishedGuidelines} className="underline hover:text-amber-950 font-black flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> רענן
          </button>
        </div>
      )}

      {/* Mobile Search input */}
      {!loading && (
        <div className="p-4 px-6 block md:hidden print:hidden border-b bg-white">
          <div className="relative w-full">
            <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חפש בהנחיות..."
              className="w-full text-xs font-bold border border-slate-200 pr-9 pl-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Body Content */}
      <div className="w-full">
        {loading ? (
          <SkeletonLoader />
        ) : publishedDoc ? (
          <GuidelinesRenderer doc={publishedDoc} searchTerm={searchTerm} />
        ) : (
          <div className="max-w-md mx-auto py-20 px-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-800">שגיאה בטעינת הדף</h3>
            <p className="text-slate-500 text-sm mt-2">לא ניתן לטעון את הנחיות האתר כעת.</p>
            <button
              onClick={loadPublishedGuidelines}
              className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all"
            >
              נסה שוב
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

