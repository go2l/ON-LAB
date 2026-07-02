import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Trash2, FileText, Image as ImageIcon, Search, Check, AlertCircle } from 'lucide-react';
import { GuidelinesMedia } from '../../types';
import { getAllGuidelinesMedia, saveGuidelinesMedia, deleteGuidelinesMedia } from '../../utils/cms/firestore';
import { compressImage } from '../../utils/cms/compression';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from '../../utils/cms/validation';

interface MediaPickerProps {
  onSelect: (mediaId: string, fileName: string, fileSize: string) => void;
  onClose: () => void;
  userEmail: string;
  allowedTypes?: 'images' | 'all';
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  onSelect,
  onClose,
  userEmail,
  allowedTypes = 'all'
}) => {
  const [mediaList, setMediaList] = useState<GuidelinesMedia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [altText, setAltText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const items = await getAllGuidelinesMedia();
      setMediaList(items);
    } catch (e) {
      console.error('Failed to load media library:', e);
      setError('שגיאה בטעינת ספריית המדיה.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to format bytes to human readable string
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFile = async (file: File) => {
    setError(null);
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Check extension
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError(`סוג קובץ לא נתמך. מותרים רק: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    // Filter by images if restricted
    const isImage = file.type.startsWith('image/');
    if (allowedTypes === 'images' && !isImage) {
      setError('אנא בחר קובץ תמונה בלבד לבלוק זה.');
      return;
    }

    setUploading(true);
    try {
      let finalBase64 = '';
      let finalSize = file.size;

      if (isImage) {
        // Compress images automatically in-browser!
        finalBase64 = await compressImage(file, 1200, 1200, 0.75);
        // Estimate size of compressed base64
        const stringLength = finalBase64.length - 'data:image/jpeg;base64,'.length;
        finalSize = Math.round(stringLength * 0.75);
      } else {
        // Direct read for documents
        finalBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('קריאת קובץ נכשלה'));
          reader.readAsDataURL(file);
        });
      }

      // Check max size after compression
      if (finalSize > MAX_FILE_SIZE_BYTES) {
        setError(`הקובץ גדול מדי (${formatBytes(finalSize)}). המגבלה המרבית היא 1MB.`);
        setUploading(false);
        return;
      }

      // Save to guidelines_media collection
      const mediaId = await saveGuidelinesMedia(
        file.name,
        file.type,
        finalBase64,
        finalSize,
        altText || file.name.split('.')[0] || 'מדיה מועלית',
        userEmail
      );

      // Reset alt text & reload list
      setAltText('');
      await loadMedia();
      
      // Auto-select uploaded file
      onSelect(mediaId, file.name, formatBytes(finalSize));
    } catch (e) {
      console.error('Upload failed:', e);
      setError('העלאת הקובץ נכשלה. אנא נסה שוב.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDelete = async (e: React.MouseEvent, mediaId: string) => {
    e.stopPropagation();
    if (!confirm('האם אתה בטוח שברצונך למחוק קובץ זה לצמיתות? פעולה זו עלולה לשבור בלוקים שמפנים אליו.')) {
      return;
    }
    try {
      await deleteGuidelinesMedia(mediaId, userEmail);
      loadMedia();
    } catch (e) {
      setError('מחיקת הקובץ נכשלה.');
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const filteredMedia = mediaList.filter(item => {
    const matchesSearch = item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.altText.toLowerCase().includes(searchTerm.toLowerCase());
    const isImg = item.type.startsWith('image/');
    
    if (allowedTypes === 'images') {
      return matchesSearch && isImg;
    }
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-800">בחירת קובץ ומדיה</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">נהל והעלה קבצי עזר ומדיה להנחיות</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
          
          {/* Left: Upload and Settings */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">טקסט חלופי לתמונה (מומלץ לנגישות)</label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="תיאור קצר של התמונה למקרא מסך..."
                className="w-full text-sm font-bold border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                dragOver 
                  ? 'border-blue-500 bg-blue-50/50' 
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={allowedTypes === 'images' ? 'image/*' : '.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx'}
                className="hidden"
              />
              
              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                  <p className="text-sm font-bold text-blue-600">מעבד ומעלה קובץ...</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 text-blue-600 p-4 rounded-full">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">גרור והשלך קובץ לכאן או לחץ לבחירה</p>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      {allowedTypes === 'images' 
                        ? 'תמונות בלבד (JPEG, PNG, WebP) עד 1MB' 
                        : 'תמונות ומסמכים (PDF, Word) עד 1MB'
                      }
                    </p>
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-xl flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right: Media Library List */}
          <div className="flex flex-col min-h-[300px] border-r border-slate-100 pr-0 md:pr-6">
            <div className="relative mb-4">
              <Search className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="חפש בספריית המדיה..."
                className="w-full text-sm font-bold border border-slate-200 pr-10 pl-4 py-3 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px]">
              {loading ? (
                <div className="text-center py-12 text-slate-400 text-sm font-bold">טוען ספריית מדיה...</div>
              ) : filteredMedia.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm font-bold">לא נמצאו קבצים בספרייה.</div>
              ) : (
                filteredMedia.map((item) => {
                  const isImage = item.type.startsWith('image/');
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelect(item.id, item.fileName, formatBytes(item.fileSize))}
                      className="border border-slate-200 hover:border-blue-500 p-3 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isImage ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border bg-slate-100 shrink-0">
                            <img src={item.base64} alt={item.altText} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate" title={item.fileName}>
                            {item.fileName}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {formatBytes(item.fileSize)} • {isImage ? 'תמונה' : 'מסמך'}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => handleDelete(e, item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                        title="מחק לצמיתות"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 px-6 rounded-xl transition-all text-sm"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};
