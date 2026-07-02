import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link, RotateCcw } from 'lucide-react';
import { handlePasteText } from '../../utils/cms/sanitization';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder = 'הקלד תוכן כאן...' }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync with prop value, avoiding cursors resetting
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleCommand = (command: string, valueStr = '') => {
    document.execCommand(command, false, valueStr);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const cleanHtml = handlePasteText(e);
    document.execCommand('insertHTML', false, cleanHtml);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const createLink = () => {
    const url = prompt('הכנס כתובת קישור (URL):', 'https://');
    if (url) {
      handleCommand('createLink', url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleCommand('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleCommand('italic');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleCommand('underline');
      }
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1 items-center select-none print:hidden">
        <button
          type="button"
          onClick={() => handleCommand('bold')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors"
          title="הדגשה (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleCommand('italic')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors"
          title="נטוי (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleCommand('underline')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors"
          title="קו תחתון (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-300 mx-1"></div>
        <button
          type="button"
          onClick={() => handleCommand('insertUnorderedList')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors"
          title="רשימת תבליטים"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleCommand('insertOrderedList')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors"
          title="רשימה ממוספרת"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-300 mx-1"></div>
        <button
          type="button"
          onClick={createLink}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors"
          title="הוסף קישור"
        >
          <Link className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleCommand('removeFormat')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors"
          title="נקה עיצוב"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Editable field */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className="p-4 min-h-[120px] max-h-[300px] overflow-y-auto focus:outline-none text-slate-700 leading-relaxed text-right prose prose-slate max-w-none text-sm md:text-base"
        dir="rtl"
        placeholder={placeholder}
      />
    </div>
  );
};
