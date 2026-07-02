import React, { useState, useEffect } from 'react';
import { History, X, RotateCcw, Calendar, User, Layers, ArrowLeft } from 'lucide-react';
import { GuidelinesRevision } from '../../types';
import { getGuidelinesRevisions } from '../../utils/cms/firestore';

interface RevisionHistoryProps {
  onRestore: (revision: GuidelinesRevision) => void;
  onClose: () => void;
  isLoading: boolean;
}

export const RevisionHistory: React.FC<RevisionHistoryProps> = ({
  onRestore,
  onClose,
  isLoading: actionLoading
}) => {
  const [revisions, setRevisions] = useState<GuidelinesRevision[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRevisions();
  }, []);

  const loadRevisions = async () => {
    setLoading(true);
    try {
      const items = await getGuidelinesRevisions();
      setRevisions(items);
    } catch (e) {
      console.error('Error loading revisions:', e);
      setError('טעינת היסטוריית הגרסאות נכשלה.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (revision: GuidelinesRevision) => {
    const confirmMsg = `שים לב! שחזור לגרסה ${revision.version} יחליף את הטיוטה הנוכחית שלך.\n` +
                       `לפני השחזור, המערכת תיצור אוטומטית גיבוי נוסף של הטיוטה הנוכחית שלך.\n` +
                       `האם אתה בטוח שברצונך להמשיך?`;
    if (confirm(confirmMsg)) {
      onRestore(revision);
    }
  };

  const formatTimestamp = (ts: any): string => {
    if (!ts) return 'תאריך לא ידוע';
    // Firestore timestamp
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">היסטוריית גרסאות וגיבויים</h3>
              <p className="text-xs text-slate-400 font-bold mt-1">צפה בגרסאות קודמות ושחזר אותן בעת הצורך</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm font-bold animate-pulse">
              טוען היסטוריית גרסאות...
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-xl text-center">
              {error}
            </div>
          ) : revisions.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm font-bold">
              אין גיבויים זמינים כעת. (גיבוי נוצר אוטומטית בכל פעם שאתה מפרסם שינויים).
            </div>
          ) : (
            <div className="relative border-r border-slate-200 pr-6 space-y-6">
              {revisions.map((rev, index) => (
                <div key={rev.id} className="relative">
                  {/* Timeline point */}
                  <span className="absolute -right-[31px] top-1 bg-blue-600 text-white rounded-full w-4 h-4 border-2 border-white shadow-sm ring-4 ring-blue-50"></span>
                  
                  {/* Card content */}
                  <div className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 p-4 rounded-2xl transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          גרסה {rev.version}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {index === 0 ? '(גיבוי אחרון)' : ''}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-bold">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatTimestamp(rev.timestamp)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {rev.createdBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {rev.blocks?.length || 0} בלוקים
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleRestore(rev)}
                      disabled={actionLoading}
                      className="shrink-0 flex items-center gap-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{actionLoading ? 'משחזר...' : 'שחזר'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 px-6 rounded-xl transition-all text-sm flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>סגור</span>
          </button>
        </div>
      </div>
    </div>
  );
};
