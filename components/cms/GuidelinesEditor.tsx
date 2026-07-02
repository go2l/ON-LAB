import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Trash2, Copy, Eye, EyeOff, ArrowUp, ArrowDown, Palette, Save, 
  UploadCloud, Download, RefreshCw, FileText, CheckCircle, AlertCircle, X, 
  Smartphone, Tablet, Monitor, History, Sparkles, Undo, Redo, Settings, ChevronDown, ChevronUp, CopyCheck,
  Image as ImageIcon
} from 'lucide-react';

import { GuidelinesDocument, GuidelinesBlock, GuidelinesTheme, GuidelinesRevision } from '../../types';
import { 
  saveGuidelinesDraft, 
  publishGuidelines, 
  discardDraft, 
  restoreRevision,
  getGuidelines
} from '../../utils/cms/firestore';
import { validateDocumentBeforePublish, ValidationError, estimatePayloadSize, MAX_DOC_PAYLOAD_BYTES } from '../../utils/cms/validation';
import { sanitizeHtml } from '../../utils/cms/sanitization';
import { createDefaultDocument } from '../../utils/cms/migration';

import { RichTextEditor } from './RichTextEditor';
import { MediaPicker } from './MediaPicker';
import { RevisionHistory } from './RevisionHistory';
import { GuidelinesRenderer } from './GuidelinesRenderer';

interface GuidelinesEditorProps {
  initialDoc: GuidelinesDocument;
  userEmail: string;
  onExit: () => void;
  onPublishSuccess: (updatedDoc: GuidelinesDocument) => void;
}

type EditorTab = 'edit' | 'preview' | 'diff' | 'theme';
type DeviceType = 'desktop' | 'tablet' | 'mobile';

export const GuidelinesEditor: React.FC<GuidelinesEditorProps> = ({
  initialDoc,
  userEmail,
  onExit,
  onPublishSuccess
}) => {
  // Document state
  const [doc, setDoc] = useState<GuidelinesDocument>(initialDoc);
  const [publishedDoc, setPublishedDoc] = useState<GuidelinesDocument | null>(null);
  
  // App navigation and workspace states
  const [activeTab, setActiveTab] = useState<EditorTab>('edit');
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  
  // History states for Undo/Redo
  const [undoStack, setUndoStack] = useState<GuidelinesBlock[][]>([]);
  const [redoStack, setRedoStack] = useState<GuidelinesBlock[][]>([]);

  // Modals & Panels toggles
  const [activeMediaBlockId, setActiveMediaBlockId] = useState<string | null>(null);
  const [mediaPickerType, setMediaPickerType] = useState<'images' | 'all'>('all');
  const [showRevisions, setShowRevisions] = useState<boolean>(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [concurrencyConflict, setConcurrencyConflict] = useState<boolean>(false);
  const [serverVersion, setServerVersion] = useState<number>(0);

  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load published document for Diff View
  useEffect(() => {
    getGuidelines('published')
      .then(res => setPublishedDoc(res))
      .catch(err => console.error('Error fetching published doc for diff:', err));
  }, []);

  // Monitor network connection status
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Keyboard shortcut listener (Ctrl+S, Ctrl+Z, Ctrl+Y, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          triggerSave();
        } else if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          triggerUndo();
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          triggerRedo();
        }
      } else if (e.key === 'Escape' && activeTab === 'preview') {
        setActiveTab('edit');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc, undoStack, redoStack, activeTab]);

  // Unsaved changes browser prompt
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = 'יש לך שינויים שלא נשמרו. האם לצאת בכל זאת?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Push state to undo stack before modifications
  const saveStateToHistory = (currentBlocks: GuidelinesBlock[]) => {
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(currentBlocks))]);
    setRedoStack([]); // clear redo stack on new action
  };

  const triggerUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(doc.blocks))]);
    
    setDoc(prev => ({ ...prev, blocks: previous }));
    setHasChanges(true);
    triggerAutosave();
  };

  const triggerRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(doc.blocks))]);
    
    setDoc(prev => ({ ...prev, blocks: next }));
    setHasChanges(true);
    triggerAutosave();
  };

  // Safe update wrapper for blocks
  const updateBlocks = (newBlocks: GuidelinesBlock[]) => {
    saveStateToHistory(doc.blocks);
    setDoc(prev => ({ ...prev, blocks: newBlocks }));
    setHasChanges(true);
    triggerAutosave();
  };

  // Debounced Autosave
  const triggerAutosave = () => {
    setSaveStatus('idle');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      if (!isOffline) {
        executeAutosave();
      }
    }, 5000); // 5 seconds of inactivity
  };

  const executeAutosave = async () => {
    if (isSaving || isOffline) return;
    setSaveStatus('saving');
    try {
      const nextVersion = await saveGuidelinesDraft(doc, userEmail, doc.draftVersion);
      setDoc(prev => ({ ...prev, draftVersion: nextVersion }));
      setHasChanges(false);
      setSaveStatus('saved');
    } catch (err: any) {
      if (err.message === 'concurrency_conflict') {
        setSaveStatus('error');
        // Fetch current server version
        const serverDoc = await getGuidelines('draft');
        setServerVersion(serverDoc.draftVersion);
        setConcurrencyConflict(true);
      } else {
        setSaveStatus('error');
      }
    }
  };

  const triggerSave = async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const nextVersion = await saveGuidelinesDraft(doc, userEmail, doc.draftVersion);
      setDoc(prev => ({ ...prev, draftVersion: nextVersion }));
      setHasChanges(false);
      setSaveStatus('saved');
      alert('הטיוטה נשמרה בהצלחה!');
    } catch (err: any) {
      if (err.message === 'concurrency_conflict') {
        setSaveStatus('error');
        const serverDoc = await getGuidelines('draft');
        setServerVersion(serverDoc.draftVersion);
        setConcurrencyConflict(true);
      } else {
        setSaveStatus('error');
        alert('אין לך הרשאת עריכה או שהתרחשה שגיאת תקשורת.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Conflict Resolution
  const resolveConflict = async (action: 'overwrite' | 'reload') => {
    setConcurrencyConflict(false);
    if (action === 'overwrite') {
      // Overwrite server using the latest version
      setDoc(prev => ({ ...prev, draftVersion: serverVersion }));
      setTimeout(() => {
        triggerSave();
      }, 300);
    } else if (action === 'reload') {
      // Reload from server
      setIsSaving(true);
      try {
        const serverDoc = await getGuidelines('draft');
        setDoc(serverDoc);
        setUndoStack([]);
        setRedoStack([]);
        setHasChanges(false);
        setSaveStatus('idle');
        alert('התוכן נטען מחדש מהשרת.');
      } catch (e) {
        alert('טעינה מחדש נכשלה.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Publish flow with pre-validations
  const handlePublishClick = () => {
    const errors = validateDocumentBeforePublish(doc);
    setValidationErrors(errors);
    if (errors.length > 0) {
      setActiveTab('edit'); // switch to edit tab to let them fix errors
      alert('נמצאו שגיאות המונעות פרסום. אנא תקן אותן.');
      return;
    }
    setShowConfirmPublish(true);
  };

  const executePublish = async () => {
    setShowConfirmPublish(false);
    setIsPublishing(true);
    try {
      const nextPubVersion = await publishGuidelines(doc, userEmail);
      const updatedDoc = { 
        ...doc, 
        publishedVersion: nextPubVersion,
        publishedAt: new Date(),
        publishedBy: userEmail
      };
      setDoc(updatedDoc);
      setPublishedDoc(updatedDoc);
      setHasChanges(false);
      setSaveStatus('saved');
      alert('ההנחיות פורסמו בהצלחה לכלל המשתמשים!');
      onPublishSuccess(updatedDoc);
    } catch (e) {
      console.error(e);
      alert('הפרסום נכשל. ודא שיש לך הרשאת כתיבה.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הטיוטה הנוכחית ולשחזר את הגרסה המפורסמת לאחרונה?')) return;
    setIsSaving(true);
    try {
      const restored = await discardDraft(userEmail);
      setDoc(restored);
      setUndoStack([]);
      setRedoStack([]);
      setHasChanges(false);
      setSaveStatus('idle');
      alert('הטיוטה נמחקה והוחזרה למצב המפורסם.');
    } catch (e) {
      alert('ביטול הטיוטה נכשל.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!confirm('אזהרה: פעולה זו תמחק את כל הבלוקים והעיצובים ותחזיר את הדף להגדרות ברירת המחדל המקוריות. האם להמשיך?')) return;
    saveStateToHistory(doc.blocks);
    const defaultDoc = createDefaultDocument();
    setDoc(prev => ({
      ...prev,
      blocks: defaultDoc.blocks,
      theme: defaultDoc.theme
    }));
    setHasChanges(true);
    triggerAutosave();
  };

  const handleRestoreBackup = async (revision: GuidelinesRevision) => {
    setShowRevisions(false);
    setIsSaving(true);
    try {
      const restored = await restoreRevision(revision, doc, userEmail);
      setDoc(restored);
      setUndoStack([]);
      setRedoStack([]);
      setHasChanges(false);
      setSaveStatus('saved');
      alert('הגיבוי שוחזר בהצלחה כטיוטה חדשה!');
    } catch (e) {
      alert('שחזור הגיבוי נכשל.');
    } finally {
      setIsSaving(false);
    }
  };

  // Block Manipulation functions
  const addBlock = (type: GuidelinesBlock['type']) => {
    const newBlock: GuidelinesBlock = {
      id: `block_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      title: type === 'title' ? 'כותרת מקטע חדשה' : 'בלוק חדש',
      content: '',
      isHidden: false,
      isCollapsed: false,
      createdAt: new Date().toISOString(),
      createdBy: userEmail,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail,
      data: {
        items: type === 'list' ? ['פריט רשימה ראשון'] : [],
      }
    };
    updateBlocks([...doc.blocks, newBlock]);
  };

  const duplicateBlock = (block: GuidelinesBlock) => {
    const cloned: GuidelinesBlock = JSON.parse(JSON.stringify(block));
    cloned.id = `block_${Date.now()}_cloned_${Math.floor(Math.random() * 1000)}`;
    cloned.title = `${cloned.title} (העתק)`;
    cloned.createdAt = new Date().toISOString();
    cloned.createdBy = userEmail;
    cloned.updatedAt = new Date().toISOString();
    cloned.updatedBy = userEmail;
    
    // Find index of original block and insert after it
    const index = doc.blocks.findIndex(b => b.id === block.id);
    const updated = [...doc.blocks];
    updated.splice(index + 1, 0, cloned);
    updateBlocks(updated);
  };

  const deleteBlock = (blockId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק בלוק זה?')) return;
    updateBlocks(doc.blocks.filter(b => b.id !== blockId));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= doc.blocks.length) return;
    
    const updated = [...doc.blocks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    updateBlocks(updated);
  };

  const handleBlockChange = (blockId: string, fields: Partial<GuidelinesBlock>) => {
    const updated = doc.blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          ...fields,
          updatedAt: new Date().toISOString(),
          updatedBy: userEmail
        };
      }
      return b;
    });
    updateBlocks(updated);
  };

  const handleBlockDataChange = (blockId: string, dataFields: any) => {
    const updated = doc.blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          data: {
            ...b.data,
            ...dataFields
          },
          updatedAt: new Date().toISOString(),
          updatedBy: userEmail
        };
      }
      return b;
    });
    updateBlocks(updated);
  };

  // Export / Import
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(doc, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `bioshield_guidelines_draft_${doc.draftVersion}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.blocks || !parsed.theme) {
          throw new Error('קובץ לא תקין');
        }
        saveStateToHistory(doc.blocks);
        setDoc(prev => ({
          ...prev,
          blocks: parsed.blocks,
          theme: parsed.theme
        }));
        setHasChanges(true);
        triggerAutosave();
        alert('הייבוא בוצע בהצלחה!');
      } catch (err) {
        alert('ייבוא נכשל: קובץ JSON שבור או שאינו מובנה כראוי.');
      }
    };
    reader.readAsText(file);
  };

  // Payload indicators
  const docPayloadBytes = estimatePayloadSize(doc);
  const docPayloadPercentage = Math.min(100, Math.round((docPayloadBytes / MAX_DOC_PAYLOAD_BYTES) * 100));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans" dir="rtl">
      
      {/* Editor Control Header */}
      <div className="bg-slate-900 text-white shadow-md z-30 sticky top-0 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-black flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              עורך הנחיות ומסמכים
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span>גרסת טיוטה: {doc.draftVersion}</span>
              <span>•</span>
              <span>גרסה מפורסמת: {doc.publishedVersion}</span>
              {doc.draftVersion > doc.publishedVersion && (
                <span className="bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
                  טיוטה חדשה יותר
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Status Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {isOffline ? (
            <span className="bg-red-500/20 text-red-300 font-bold text-xs py-1 px-3 rounded-full flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              חיבור לא זמין (אופליין)
            </span>
          ) : (
            <span className={`text-xs font-bold py-1 px-3 rounded-full flex items-center gap-1.5 ${
              saveStatus === 'saving' ? 'bg-blue-500/20 text-blue-300' :
              saveStatus === 'saved' ? 'bg-green-500/20 text-green-300' :
              saveStatus === 'error' ? 'bg-red-500/20 text-red-300' : 'text-slate-400'
            }`}>
              {saveStatus === 'saving' && <><RefreshCw className="w-3 h-3 animate-spin" /> שומר טיוטה...</>}
              {saveStatus === 'saved' && <><CheckCircle className="w-3 h-3" /> טיוטה נשמרה</>}
              {saveStatus === 'error' && <><AlertCircle className="w-3 h-3" /> שגיאה בשמירה</>}
            </span>
          )}

          {/* Undo/Redo Buttons */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={triggerUndo}
              disabled={undoStack.length === 0}
              className="p-2 hover:bg-slate-700 text-slate-300 hover:text-white rounded disabled:opacity-30 disabled:hover:bg-transparent"
              title="בטל פעולה (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={triggerRedo}
              disabled={redoStack.length === 0}
              className="p-2 hover:bg-slate-700 text-slate-300 hover:text-white rounded disabled:opacity-30 disabled:hover:bg-transparent"
              title="בצע שוב (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowRevisions(true)}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 font-bold text-xs py-2 px-3 rounded-xl transition-all"
            title="היסטוריית גרסאות"
          >
            <History className="w-4 h-4 text-blue-400" />
            <span>היסטוריה</span>
          </button>

          <button
            onClick={handleDiscardDraft}
            className="bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-200 font-bold text-xs py-2 px-3 rounded-xl transition-all"
            title="מחק טיוטה ושחזר גרסה שפורסמה"
          >
            בטל טיוטה
          </button>

          <button
            onClick={triggerSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 disabled:bg-blue-400"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'שומר...' : 'שמור טיוטה'}</span>
          </button>

          <button
            onClick={handlePublishClick}
            disabled={isPublishing}
            className="bg-green-600 hover:bg-green-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 disabled:bg-green-400"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isPublishing ? 'מפרסם...' : 'פרסם באתר'}</span>
          </button>

          <button onClick={onExit} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Editor Sub-Tabs & Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        
        {/* Sidebar Tabs navigation */}
        <aside className="w-full md:w-64 bg-white border-l border-slate-200 flex flex-col justify-between shrink-0 select-none">
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-slate-400 font-bold text-xs">
              <span>תפריט עבודה</span>
              <Settings className="w-4 h-4" />
            </div>
            
            <nav className="p-3 space-y-1">
              <button
                onClick={() => setActiveTab('edit')}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-bold transition-all text-right ${
                  activeTab === 'edit' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>בלוקי תוכן ({doc.blocks.length})</span>
              </button>
              
              <button
                onClick={() => setActiveTab('theme')}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-bold transition-all text-right ${
                  activeTab === 'theme' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>עיצוב וגופנים</span>
              </button>

              <button
                onClick={() => setActiveTab('preview')}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-bold transition-all text-right ${
                  activeTab === 'preview' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>תצוגה מקדימה</span>
              </button>

              <button
                onClick={() => setActiveTab('diff')}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-bold transition-all text-right ${
                  activeTab === 'diff' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>השוואת שינויים (Diff)</span>
              </button>
            </nav>
          </div>

          {/* Import/Export + Payload indicator */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                <span>נפח מסמך Firestore</span>
                <span className={docPayloadBytes > MAX_DOC_PAYLOAD_BYTES ? 'text-red-500 font-black' : ''}>
                  {docPayloadPercentage}% ({(docPayloadBytes / 1024).toFixed(1)} KB)
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${docPayloadPercentage}%` }} 
                  className={`h-full transition-all ${
                    docPayloadPercentage > 90 ? 'bg-red-500' : docPayloadPercentage > 70 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg border border-slate-200 hover:bg-white text-slate-600 transition-colors"
                title="ייצא קובץ JSON למחשב"
              >
                <Download className="w-3.5 h-3.5" />
                ייצוא
              </button>
              
              <label 
                className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg border border-slate-200 hover:bg-white text-slate-600 transition-colors cursor-pointer"
                title="ייבא קובץ JSON"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                ייבוא
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>

            <button
              onClick={handleResetToDefault}
              className="w-full text-center py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-colors"
            >
              איפוס לברירת מחדל
            </button>
          </div>
        </aside>

        {/* Main Work Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 min-h-0 flex flex-col">
          
          {/* TAB 1: Edit Blocks list */}
          {activeTab === 'edit' && (
            <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
              
              {/* Validation errors warning */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border-r-4 border-red-500 rounded-2xl p-4 text-xs font-bold text-red-800 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-black">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span>יש לתקן את השגיאות הבאות לפני שניתן יהיה לפרסם:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err.message}</li>
                    ))}
                  </ul>
                  <button 
                    onClick={() => setValidationErrors([])} 
                    className="text-blue-600 hover:underline mt-2 inline-block"
                  >
                    התעלם והמשך לערוך
                  </button>
                </div>
              )}

              {/* Block List */}
              <div className="space-y-4">
                {doc.blocks.map((block, index) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    index={index}
                    totalBlocks={doc.blocks.length}
                    onChange={(fields) => handleBlockChange(block.id, fields)}
                    onDataChange={(fields) => handleBlockDataChange(block.id, fields)}
                    onDelete={() => deleteBlock(block.id)}
                    onDuplicate={() => duplicateBlock(block)}
                    onMoveUp={() => moveBlock(index, 'up')}
                    onMoveDown={() => moveBlock(index, 'down')}
                    onOpenMediaPicker={(type) => {
                      setActiveMediaBlockId(block.id);
                      setMediaPickerType(type);
                    }}
                  />
                ))}
              </div>

              {/* Add block toolbar */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h4 className="text-xs font-black text-slate-400 tracking-wider mb-4">הוסף בלוק תוכן חדש</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                  {(['text', 'title', 'list', 'image', 'file', 'link', 'card', 'warning'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addBlock(type)}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-slate-600 hover:text-blue-600 transition-all gap-2"
                    >
                      <Plus className="w-5 h-5 shrink-0" />
                      <span className="text-[10px] font-black uppercase">{type === 'card' ? 'כרטיס' : type === 'warning' ? 'אזהרה' : type === 'text' ? 'טקסט' : type === 'title' ? 'כותרת' : type === 'list' ? 'רשימה' : type === 'image' ? 'תמונה' : type === 'file' ? 'קובץ' : 'קישור'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Theme settings */}
          {activeTab === 'theme' && (
            <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-lg font-black text-slate-800 border-b pb-4">הגדרות עיצוב וצבעים</h3>
                
                {/* Font selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">גופן דף ההנחיות</label>
                  <select
                    value={doc.theme.fontFamily}
                    onChange={(e) => {
                      saveStateToHistory(doc.blocks);
                      setDoc(prev => ({ ...prev, theme: { ...prev.theme, fontFamily: e.target.value } }));
                      setHasChanges(true);
                      triggerAutosave();
                    }}
                    className="w-full border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-bold"
                  >
                    <option value="Assistant">Assistant (ברירת מחדל)</option>
                    <option value="Rubik">Rubik</option>
                    <option value="Heebo">Heebo</option>
                    <option value="Serif">Serif</option>
                    <option value="Monospace">Monospace</option>
                  </select>
                </div>

                {/* Primary color colorpicker */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">צבע ראשי (לחצנים, כותרות)</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={doc.theme.primaryColor}
                      onChange={(e) => {
                        setDoc(prev => ({ ...prev, theme: { ...prev.theme, primaryColor: e.target.value } }));
                        setHasChanges(true);
                        triggerAutosave();
                      }}
                      className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer overflow-hidden p-0"
                    />
                    <input
                      type="text"
                      value={doc.theme.primaryColor}
                      onChange={(e) => {
                        setDoc(prev => ({ ...prev, theme: { ...prev.theme, primaryColor: e.target.value } }));
                        setHasChanges(true);
                        triggerAutosave();
                      }}
                      className="border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-bold text-left w-32"
                    />
                  </div>
                </div>

                {/* Background Color */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">צבע רקע הדף</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={doc.theme.backgroundColor}
                      onChange={(e) => {
                        setDoc(prev => ({ ...prev, theme: { ...prev.theme, backgroundColor: e.target.value } }));
                        setHasChanges(true);
                        triggerAutosave();
                      }}
                      className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer overflow-hidden p-0"
                    />
                    <select
                      value={doc.theme.backgroundColor}
                      onChange={(e) => {
                        setDoc(prev => ({ ...prev, theme: { ...prev.theme, backgroundColor: e.target.value } }));
                        setHasChanges(true);
                        triggerAutosave();
                      }}
                      className="border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-bold"
                    >
                      <option value="#f8fafc">בהיר (Slate-50)</option>
                      <option value="#ffffff">לבן נקי</option>
                      <option value="#f1f5f9">אפור רך (Slate-100)</option>
                      <option value="#fafaf9">בז' רך (Stone-50)</option>
                    </select>
                  </div>
                </div>

                {/* Alignments */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">יישור טקסט ברירת מחדל</label>
                  <div className="flex gap-2">
                    {(['right', 'center', 'left'] as const).map(align => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => {
                          setDoc(prev => ({ ...prev, theme: { ...prev.theme, alignment: align } }));
                          setHasChanges(true);
                          triggerAutosave();
                        }}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          doc.theme.alignment === align 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {align === 'right' ? 'ימין (RTL)' : align === 'center' ? 'מרכז' : 'שמאל'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Sizes ranges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">גודל כותרת ברירת מחדל ({doc.theme.titleSize}px)</label>
                    <input
                      type="range"
                      min="20"
                      max="48"
                      value={doc.theme.titleSize}
                      onChange={(e) => {
                        setDoc(prev => ({ ...prev, theme: { ...prev.theme, titleSize: parseInt(e.target.value) } }));
                        setHasChanges(true);
                        triggerAutosave();
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">גודל טקסט ברירת מחדל ({doc.theme.textSize}px)</label>
                    <input
                      type="range"
                      min="14"
                      max="24"
                      value={doc.theme.textSize}
                      onChange={(e) => {
                        setDoc(prev => ({ ...prev, theme: { ...prev.theme, textSize: parseInt(e.target.value) } }));
                        setHasChanges(true);
                        triggerAutosave();
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Shadows & Borders options */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={doc.theme.showShadow}
                      onChange={(e) => {
                        setDoc(prev => ({ ...prev, theme: { ...prev.theme, showShadow: e.target.checked } }));
                        setHasChanges(true);
                        triggerAutosave();
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>הצג צל על כרטיסיות</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={doc.theme.showBorder}
                      onChange={(e) => {
                        setDoc(prev => ({ ...prev, theme: { ...prev.theme, showBorder: e.target.checked } }));
                        setHasChanges(true);
                        triggerAutosave();
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>הצג גבול דק (Borders)</span>
                  </label>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: Responsive Preview */}
          {activeTab === 'preview' && (
            <div className="flex-1 flex flex-col h-full bg-slate-200">
              
              {/* Responsive Size Selector */}
              <div className="bg-white p-3 border-b flex items-center justify-center gap-2 select-none print:hidden shadow-sm shrink-0">
                <button
                  onClick={() => setDevice('desktop')}
                  className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all ${
                    device === 'desktop' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                  title="תצוגת מחשב"
                >
                  <Monitor className="w-4 h-4" />
                  <span>מחשב</span>
                </button>
                <button
                  onClick={() => setDevice('tablet')}
                  className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all ${
                    device === 'tablet' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                  title="תצוגת טאבלט"
                >
                  <Tablet className="w-4 h-4" />
                  <span>טאבלט (768px)</span>
                </button>
                <button
                  onClick={() => setDevice('mobile')}
                  className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all ${
                    device === 'mobile' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                  title="תצוגת סלולרי"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>סלולרי (375px)</span>
                </button>
              </div>

              {/* Preview container */}
              <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start">
                <div 
                  style={{
                    width: device === 'mobile' ? '375px' : device === 'tablet' ? '768px' : '100%',
                    maxWidth: '100%',
                    minHeight: '80vh'
                  }}
                  className="bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-300 transition-all duration-300"
                >
                  <GuidelinesRenderer doc={doc} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Compare Diff View */}
          {activeTab === 'diff' && (
            <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="border-b pb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">השוואת שינויים (טיוטה מול גרסה מפורסמת)</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">ראה אילו מקטעים השתנו, נוספו או נמחקו מאז הפרסום האחרון</p>
                  </div>
                </div>

                {!publishedDoc ? (
                  <div className="text-center py-12 text-slate-400 font-bold">טוען גרסה מפורסמת...</div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Visual Diff rendering */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">סיכום מספרי של בלוקים</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold">
                        <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                          <span className="text-slate-400 block mb-1">סך הכל בטיוטה</span>
                          <span className="text-lg text-slate-800">{doc.blocks.length} בלוקים</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                          <span className="text-slate-400 block mb-1">סך הכל במפורסם</span>
                          <span className="text-lg text-slate-800">{publishedDoc.blocks.length} בלוקים</span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {doc.blocks.map(draftBlock => {
                        const pubBlock = publishedDoc.blocks.find(b => b.id === draftBlock.id);
                        const isNew = !pubBlock;
                        const isModified = pubBlock && (pubBlock.title !== draftBlock.title || pubBlock.content !== draftBlock.content || pubBlock.type !== draftBlock.type || pubBlock.isHidden !== draftBlock.isHidden);

                        return (
                          <div 
                            key={draftBlock.id} 
                            className={`p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${
                              isNew ? 'bg-green-50/50' : isModified ? 'bg-blue-50/40' : ''
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs font-black text-slate-800">{draftBlock.title || '(ללא כותרת)'}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black uppercase">
                                  {draftBlock.type}
                                </span>
                                {isNew && <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded font-black">חדש</span>}
                                {isModified && <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-black">עודכן</span>}
                                {draftBlock.isHidden && <span className="text-[9px] bg-slate-400 text-white px-1.5 py-0.5 rounded font-black">מוסתר</span>}
                              </div>
                              <div 
                                className="text-xs text-slate-500 truncate max-w-2xl" 
                                dangerouslySetInnerHTML={{ __html: draftBlock.content.slice(0, 150) }}
                              />
                            </div>

                            {/* Old vs New Title changes visual indication */}
                            {isModified && pubBlock && (
                              <div className="text-[10px] text-slate-400 max-w-sm border-r pr-4 border-slate-200">
                                <div className="line-through">ישן: {pubBlock.title}</div>
                                <div className="text-blue-600 font-bold">חדש: {draftBlock.title}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Display deleted blocks */}
                      {publishedDoc.blocks
                        .filter(pubBlock => !doc.blocks.some(draftBlock => draftBlock.id === pubBlock.id))
                        .map(deletedBlock => (
                          <div key={deletedBlock.id} className="p-4 bg-red-50/50 flex justify-between items-center text-slate-500">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-black line-through">{deletedBlock.title || '(ללא כותרת)'}</span>
                                <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-black">נמחק</span>
                              </div>
                              <p className="text-xs truncate max-w-md line-through">{deletedBlock.content}</p>
                            </div>
                          </div>
                        ))}
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAL 1: Media Picker Overlay */}
      {activeMediaBlockId && (
        <MediaPicker
          allowedTypes={mediaPickerType}
          userEmail={userEmail}
          onClose={() => setActiveMediaBlockId(null)}
          onSelect={(mediaId, fileName, fileSize) => {
            handleBlockDataChange(activeMediaBlockId, { mediaId, fileName, fileSize });
            setActiveMediaBlockId(null);
          }}
        />
      )}

      {/* MODAL 2: Revision History Overlay */}
      {showRevisions && (
        <RevisionHistory
          isLoading={isSaving}
          onClose={() => setShowRevisions(false)}
          onRestore={handleRestoreBackup}
        />
      )}

      {/* MODAL 3: Concurrency Conflict Resolution dialog */}
      {concurrencyConflict && (
        <div className="fixed inset-0 bg-slate-900/80 z-[110] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-red-200">
            <div className="text-red-500 mb-4 flex items-center gap-2">
              <AlertCircle className="w-8 h-8 shrink-0" />
              <h3 className="text-lg font-black">התנגשות עריכה (Concurrency Conflict)</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6 font-bold">
              משתמש אחר (או כרטיסייה אחרת שלך) שמר שינויים בדף ההנחיות מאז שפתחת אותו.
              <br />
              הגרסה שלך: <span className="text-slate-800 underline">#{doc.draftVersion}</span> | הגרסה בשרת: <span className="text-red-600 underline">#{serverVersion}</span>
              <br />
              שמירה כעת תדרוס את השינויים שלהם.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => resolveConflict('reload')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all text-sm"
              >
                טען מחדש מהשרת (בטל את השינויים המקומיים שלי)
              </button>
              <button
                onClick={() => resolveConflict('overwrite')}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl transition-all text-sm"
              >
                דרוס שינויים (כפה את הגרסה שלי על השרת)
              </button>
              <button
                onClick={() => setConcurrencyConflict(false)}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold py-2.5 px-4 rounded-xl transition-all text-xs"
              >
                חזור למסך העריכה לבדיקה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Publish Confirmation Dialog */}
      {showConfirmPublish && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-800 mb-2">אישור פרסום הנחיות</h3>
            <p className="text-sm text-slate-500 font-bold mb-4">
              האם אתה בטוח שברצונך לפרסם את הגרסה הנוכחית לאתר? 
              <br />
              השינויים יוצגו מיד לכל המשתמשים. המערכת תיצור אוטומטית נקודת שחזור (גיבוי) של הגרסה הנוכחית.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmPublish(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 px-5 rounded-xl transition-all text-sm"
              >
                ביטול
              </button>
              <button
                onClick={executePublish}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm flex items-center gap-1.5 shadow-md shadow-green-200"
              >
                <CheckCircle className="w-4 h-4" />
                אשר ופרסם כעת
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

/**
 * Single Block Editor card layout
 */
interface BlockEditorProps {
  block: GuidelinesBlock;
  index: number;
  totalBlocks: number;
  onChange: (fields: Partial<GuidelinesBlock>) => void;
  onDataChange: (dataFields: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOpenMediaPicker: (type: 'images' | 'all') => void;
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  block,
  index,
  totalBlocks,
  onChange,
  onDataChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onOpenMediaPicker
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Lists management
  const handleAddItem = () => {
    const items = [...(block.data?.items || []), 'פריט רשימה חדש'];
    onDataChange({ items });
  };

  const handleUpdateItem = (idx: number, val: string) => {
    const items = [...(block.data?.items || [])];
    items[idx] = val;
    onDataChange({ items });
  };

  const handleDeleteItem = (idx: number) => {
    const items = (block.data?.items || []).filter((_, i) => i !== idx);
    onDataChange({ items });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
      
      {/* Editor Block Header */}
      <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center justify-between gap-4 select-none">
        
        {/* Block metadata and Type badge */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-black uppercase tracking-wider">
            {block.type === 'card' ? 'כרטיס' : block.type === 'warning' ? 'אזהרה' : block.type === 'text' ? 'טקסט חופשי' : block.type === 'title' ? 'כותרת ראשית' : block.type === 'list' ? 'רשימת נקודות' : block.type === 'image' ? 'תמונה' : block.type === 'file' ? 'קובץ הורדה' : 'קישור'}
          </span>
          <input
            type="text"
            value={block.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="הכנס כותרת לבלוק..."
            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 font-bold text-slate-800 focus:outline-none px-1 text-sm sm:text-base w-48 sm:w-64 md:w-80"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          
          {/* Collapse/Expand Toggle */}
          <button 
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            title={collapsed ? 'פתח עריכה' : 'מזער'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          {/* Visibility toggle */}
          <button
            type="button"
            onClick={() => onChange({ isHidden: !block.isHidden })}
            className={`p-2 rounded-lg hover:bg-slate-100 transition-colors ${block.isHidden ? 'text-red-500' : 'text-slate-400 hover:text-slate-600'}`}
            title={block.isHidden ? 'מוסתר מהציבור (לחץ להצגה)' : 'גלוי לציבור (לחץ להסתרה)'}
          >
            {block.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Collapsible status */}
          {block.type !== 'title' && (
            <div className="flex items-center gap-1 text-[11px] select-none">
              <span className="text-slate-400 font-bold hidden sm:inline">תצוגה:</span>
              <select
                value={block.data.collapseMode || (block.isCollapsed ? 'closed' : 'none')}
                onChange={(e) => onDataChange({ collapseMode: e.target.value })}
                className="border border-slate-200 bg-white p-1 rounded-lg focus:outline-none focus:border-blue-500 font-bold text-slate-600 text-[11px] cursor-pointer"
              >
                <option value="none">מוצג תמיד</option>
                <option value="open">כרטיסייה פתוחה</option>
                <option value="closed">כרטיסייה סגורה</option>
              </select>
            </div>
          )}

          {/* Duplicate Button */}
          <button
            type="button"
            onClick={onDuplicate}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            title="שכפל בלוק"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Reordering Controls */}
          <div className="flex bg-slate-200/50 rounded-lg p-0.5">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-white"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === totalBlocks - 1}
              className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-white"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Delete Block */}
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="מחק בלוק"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Block Body */}
      {!collapsed && (
        <div className="p-6 space-y-4">
          
          {/* Custom controls per block type */}
          
          {/* Block type: LIST */}
          {block.type === 'list' && (
            <div className="space-y-3 border-b pb-4">
              <label className="text-xs font-bold text-slate-500 block">נקודות ופריטי הרשימה</label>
              <div className="space-y-2">
                {(block.data?.items || []).map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateItem(idx, e.target.value)}
                      placeholder={`נקודה #${idx + 1}`}
                      className="flex-1 text-sm font-bold border border-slate-200 p-2 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(idx)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-xl"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>הוסף פריט לרשימה</span>
                </button>
              </div>
            </div>
          )}

          {/* Block type: IMAGE */}
          {block.type === 'image' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b pb-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block">תמונת המקטע</label>
                {block.data.mediaId ? (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-5 h-5 text-blue-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]" title={block.data.fileName}>
                        {block.data.fileName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenMediaPicker('images')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-500"
                    >
                      החלף תמונה
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenMediaPicker('images')}
                    className="w-full border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 py-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-600 transition-all font-bold text-xs"
                  >
                    <Plus className="w-5 h-5" />
                    <span>בחר או העלה תמונה</span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">טקסט חלופי (Alt Text - חובה לנגישות)</label>
                  <input
                    type="text"
                    value={block.data.altText || ''}
                    onChange={(e) => onDataChange({ altText: e.target.value })}
                    placeholder="הקלד תיאור תמונה קצר למקראי מסך..."
                    className="w-full text-sm font-bold border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">כותרת תמונה (מוצגת מתחת לתמונה)</label>
                  <input
                    type="text"
                    value={block.data.imageTitle || ''}
                    onChange={(e) => onDataChange({ imageTitle: e.target.value })}
                    placeholder="כותרת הסבר קצרה..."
                    className="w-full text-sm font-bold border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Block type: FILE */}
          {block.type === 'file' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b pb-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block">קובץ להורדה</label>
                {block.data.mediaId ? (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-700 block truncate" title={block.data.fileName}>
                          {block.data.fileName}
                        </span>
                        {block.data.fileSize && <span className="text-[10px] text-slate-400 font-bold">{block.data.fileSize}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenMediaPicker('all')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-500 shrink-0"
                    >
                      החלף קובץ
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenMediaPicker('all')}
                    className="w-full border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 py-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-600 transition-all font-bold text-xs"
                  >
                    <Plus className="w-5 h-5" />
                    <span>בחר או העלה קובץ (PDF, Word)</span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">שם קובץ לתצוגה</label>
                  <input
                    type="text"
                    value={block.data.fileName || ''}
                    onChange={(e) => onDataChange({ fileName: e.target.value })}
                    placeholder="שם כפתור ההורדה באתר..."
                    className="w-full text-sm font-bold border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">תיאור קצר של הקובץ</label>
                  <input
                    type="text"
                    value={block.data.fileDesc || ''}
                    onChange={(e) => onDataChange({ fileDesc: e.target.value })}
                    placeholder="לדוגמה: פרוטוקול טיפול מלא בפורמט PDF"
                    className="w-full text-sm font-bold border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Block type: LINK */}
          {block.type === 'link' && (
            <div className="space-y-2 border-b pb-4">
              <label className="text-xs font-bold text-slate-500 block">כתובת הקישור (URL - נפתח בלשונית חדשה)</label>
              <input
                type="text"
                value={block.data.url || ''}
                onChange={(e) => onDataChange({ url: e.target.value })}
                placeholder="https://example.com/guide-pdf"
                className="w-full text-sm font-bold border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-blue-500 text-left"
                dir="ltr"
              />
            </div>
          )}

          {/* Rich Content Editor for block body text (only for blocks that support content) */}
          {block.type !== 'title' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">תוכן המקטע (טקסט עשיר)</label>
              <RichTextEditor
                value={block.content}
                onChange={(html) => onChange({ content: sanitizeHtml(html) })}
                placeholder="הקלד את תוכן המדריך כאן..."
              />
            </div>
          )}
          {/* Custom style overrides (border, background) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">צבע רקע מותאם לבלוק</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={block.customBgColor || '#ffffff'}
                  onChange={(e) => onChange({ customBgColor: e.target.value })}
                  className="w-8 h-8 rounded border border-slate-200 cursor-pointer overflow-hidden p-0"
                />
                <input
                  type="text"
                  value={block.customBgColor || ''}
                  onChange={(e) => onChange({ customBgColor: e.target.value })}
                  placeholder="ברירת מחדל (לבן)"
                  className="text-xs border border-slate-200 p-1.5 rounded-lg w-28 text-left font-bold text-slate-600 focus:outline-none focus:border-blue-500"
                />
                {block.customBgColor && (
                  <button
                    type="button"
                    onClick={() => onChange({ customBgColor: undefined })}
                    className="text-[10px] text-red-500 font-bold hover:underline shrink-0"
                  >
                    אפס
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">צבע מסגרת מותאם לבלוק</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={block.customBorderColor || '#e2e8f0'}
                  onChange={(e) => onChange({ customBorderColor: e.target.value })}
                  className="w-8 h-8 rounded border border-slate-200 cursor-pointer overflow-hidden p-0"
                />
                <input
                  type="text"
                  value={block.customBorderColor || ''}
                  onChange={(e) => onChange({ customBorderColor: e.target.value })}
                  placeholder="ברירת מחדל (אפור)"
                  className="text-xs border border-slate-200 p-1.5 rounded-lg w-28 text-left font-bold text-slate-600 focus:outline-none focus:border-blue-500"
                />
                {block.customBorderColor && (
                  <button
                    type="button"
                    onClick={() => onChange({ customBorderColor: undefined })}
                    className="text-[10px] text-red-500 font-bold hover:underline shrink-0"
                  >
                    אפס
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
