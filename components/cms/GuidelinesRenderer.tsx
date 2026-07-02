import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, HelpCircle, AlertTriangle, Info, List, Image as ImageIcon, FileText, Youtube, MapPin, HardDrive, ChevronDown, ChevronUp } from 'lucide-react';
import { GuidelinesDocument, GuidelinesBlock, GuidelinesTheme, GuidelinesMedia } from '../../types';
import { getGuidelinesMedia } from '../../utils/cms/firestore';

interface GuidelinesRendererProps {
  doc: GuidelinesDocument;
  searchTerm?: string;
}

/**
 * Helper to slugify block titles for anchor links
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0590-\u05FFa-z0-9-]/g, ''); // supports Hebrew Unicode range
}

export const GuidelinesRenderer: React.FC<GuidelinesRendererProps> = ({ doc, searchTerm = '' }) => {
  const { theme, blocks } = doc;
  const [activeAnchor, setActiveAnchor] = useState<string>('');

  // Enforce font family mapping
  const getFontFamily = (font: string) => {
    switch (font) {
      case 'Rubik': return 'Rubik, sans-serif';
      case 'Heebo': return 'Heebo, sans-serif';
      case 'Assistant': return 'Assistant, sans-serif';
      case 'Monospace': return 'monospace';
      case 'Serif': return 'serif';
      default: return 'system-ui, -apple-system, sans-serif';
    }
  };

  const styleSettings: React.CSSProperties = {
    fontFamily: getFontFamily(theme.fontFamily),
    backgroundColor: theme.backgroundColor,
    textAlign: theme.alignment === 'left' ? 'left' : theme.alignment === 'center' ? 'center' : 'right',
  };

  // Filter blocks by search term (case-insensitive)
  const filteredBlocks = blocks.filter(b => {
    if (b.isHidden) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const matchesTitle = b.title?.toLowerCase().includes(term);
    const matchesContent = b.content?.toLowerCase().includes(term);
    const matchesItems = b.data?.items?.some(item => item.toLowerCase().includes(term));
    return matchesTitle || matchesContent || matchesItems;
  });

  // Table of Contents
  const tocBlocks = blocks.filter(b => !b.isHidden && (b.type === 'title' || (b.type === 'card' && b.title)));

  // Estimated Reading Time
  const calculateReadingTime = (): number => {
    let wordCount = 0;
    blocks.forEach(b => {
      if (b.isHidden) return;
      wordCount += (b.title || '').split(/\s+/).length;
      wordCount += (b.content || '').split(/\s+/).length;
      (b.data?.items || []).forEach(item => {
        wordCount += item.split(/\s+/).length;
      });
    });
    return Math.max(1, Math.round(wordCount / 200)); // 200 words per minute average
  };

  return (
    <div style={styleSettings} className="min-h-screen pb-20 pt-6 px-4 md:px-8 print:bg-white print:text-black" dir="rtl">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Table of Contents / Sidebar (only visible if TOC exists and on large screens) */}
        {tocBlocks.length > 0 && (
          <aside className="hidden lg:block lg:col-span-1 sticky top-28 self-start bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <h4 className="text-sm font-bold text-slate-400 mb-4 tracking-wider flex items-center gap-2">
              <List className="w-4 h-4 text-blue-600" />
              תוכן העניינים
            </h4>
            <nav className="space-y-2">
              {tocBlocks.map(b => {
                const slug = slugify(b.title);
                return (
                  <a
                    key={b.id}
                    href={`#${slug}`}
                    onClick={() => setActiveAnchor(slug)}
                    className={`block text-sm font-bold py-2 px-3 rounded-lg transition-all border-r-2 ${
                      activeAnchor === slug 
                        ? 'border-blue-600 bg-blue-50 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    {b.title}
                  </a>
                );
              })}
            </nav>

            <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400 font-bold">
              <div>זמן קריאה משוער: כ-{calculateReadingTime()} דק'</div>
              {doc.publishedAt && (
                <div className="mt-2 text-[10px]">
                  עודכן לאחרונה: {new Date(doc.publishedAt.seconds ? doc.publishedAt.seconds * 1000 : doc.publishedAt).toLocaleDateString('he-IL')}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Blocks Render Section */}
        <div className={`col-span-1 ${tocBlocks.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-6`}>
          {filteredBlocks.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
              <p className="text-slate-500 font-bold">לא נמצאו הנחיות המתאימות לחיפוש שלך.</p>
            </div>
          ) : (
            filteredBlocks.map(block => (
              <GuidelinesBlockRenderer 
                key={block.id} 
                block={block} 
                theme={theme} 
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Component to safely load and render images from the guidelines_media collection
 */
const GuidelinesImage: React.FC<{ mediaId: string; altText: string; className?: string }> = ({ mediaId, altText, className }) => {
  const [media, setMedia] = useState<GuidelinesMedia | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    getGuidelinesMedia(mediaId)
      .then(res => {
        if (isMounted) {
          setMedia(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [mediaId]);

  if (loading) {
    return <div className="w-full h-48 bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold">טוען תמונה...</div>;
  }

  if (error || !media) {
    return (
      <div className="w-full h-48 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 p-4">
        <ImageIcon className="w-8 h-8 mb-2" />
        <span className="text-xs font-bold">שגיאה בטעינת המדיה (הקובץ הוסר או שאינו זמין)</span>
      </div>
    );
  }

  return (
    <img 
      src={media.base64} 
      alt={altText || media.altText} 
      className={className || "w-full h-auto rounded-2xl shadow-sm"}
      loading="lazy"
    />
  );
};

/**
 * Component to handle asynchronous file download from guidelines_media
 */
const GuidelinesFileDownloader: React.FC<{ mediaId: string; fileName: string; fileSize?: string; fileDesc?: string }> = ({ mediaId, fileName, fileSize, fileDesc }) => {
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const media = await getGuidelinesMedia(mediaId);
      if (!media) {
        throw new Error('קובץ לא נמצא');
      }

      // Download file using blob link
      const link = document.createElement('a');
      link.href = media.base64;
      link.download = fileName || media.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      setError('הורדת הקובץ נכשלה. אנא נסה שוב מאוחר יותר.');
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h5 className="font-bold text-slate-800 text-sm md:text-base">{fileName || 'קובץ להורדה'}</h5>
          {fileDesc && <p className="text-xs text-slate-500 mt-1">{fileDesc}</p>}
          {fileSize && <span className="text-[10px] text-slate-400 font-bold bg-slate-100 py-0.5 px-1.5 rounded mt-2 inline-block">{fileSize}</span>}
        </div>
      </div>
      <div className="w-full md:w-auto">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm disabled:bg-blue-300"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'מוריד...' : 'הורד מדריך'}</span>
        </button>
        {error && <p className="text-[10px] text-red-500 font-bold mt-1 text-center md:text-right">{error}</p>}
      </div>
    </div>
  );
};

/**
 * Component to handle HTML embeds (YouTube / Maps / Drive) using a clean allowlist
 */
const GuidelinesEmbed: React.FC<{ url: string; type: 'youtube' | 'google-maps' | 'google-drive' }> = ({ url, type }) => {
  // Convert watch URLs to embed URLs for YouTube
  const getEmbedUrl = () => {
    if (type === 'youtube') {
      if (url.includes('embed/')) return url;
      try {
        if (url.includes('youtu.be/')) {
          const id = url.split('youtu.be/')[1]?.split('?')[0];
          return `https://www.youtube.com/embed/${id}`;
        }
        const urlParams = new URLSearchParams(new URL(url).search);
        const v = urlParams.get('v');
        return v ? `https://www.youtube.com/embed/${v}` : url;
      } catch (e) {
        return url;
      }
    }
    return url;
  };

  const getEmbedIcon = () => {
    if (type === 'youtube') return <Youtube className="w-5 h-5 text-red-500" />;
    if (type === 'google-maps') return <MapPin className="w-5 h-5 text-green-500" />;
    return <HardDrive className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="space-y-3">
      <div className="bg-slate-100/50 rounded-xl p-2 px-3 text-xs text-slate-500 font-bold flex items-center gap-2 border border-slate-200/60">
        {getEmbedIcon()}
        <span>תוכן מוטמע ({type})</span>
      </div>
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
        <iframe
          src={getEmbedUrl()}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="Embedded content"
        />
      </div>
    </div>
  );
};

/**
 * Core Block Renderer with Error Boundary fallback logic
 */
class BlockErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error rendering CMS block:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center text-xs font-bold">
          שגיאה בטעינת רכיב זה. אנא פנה למנהל האתר.
        </div>
      );
    }
    return this.props.children;
  }
}

interface BlockRendererProps {
  block: GuidelinesBlock;
  theme: GuidelinesTheme;
}

const GuidelinesBlockRenderer: React.FC<BlockRendererProps> = ({ block, theme }) => {
  const collapseMode = block.data?.collapseMode || (block.isCollapsed ? 'closed' : 'none');
  const isCollapsible = collapseMode === 'open' || collapseMode === 'closed';
  const [collapsed, setCollapsed] = useState<boolean>(collapseMode === 'closed');

  useEffect(() => {
    setCollapsed(collapseMode === 'closed');
  }, [collapseMode]);

  const blockClass = `bg-white rounded-3xl p-6 md:p-8 transition-all relative overflow-hidden ${
    theme.showShadow ? 'shadow-sm hover:shadow-md' : ''
  } ${theme.showBorder ? 'border border-slate-200' : ''}`;

  const blockStyle: React.CSSProperties = {};
  if (block.customBgColor) {
    blockStyle.backgroundColor = block.customBgColor;
  }
  if (block.customBorderColor) {
    blockStyle.borderColor = block.customBorderColor;
    blockStyle.borderWidth = '1px';
    blockStyle.borderStyle = 'solid';
  }

  const renderInnerContent = () => {
    switch (block.type) {
      case 'card':
      case 'text':
        return (
          <div 
            className="text-slate-600 leading-relaxed text-right prose prose-slate max-w-none"
            style={{ fontSize: `${theme.textSize}px` }}
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        );

      case 'list':
        return (
          <div className="space-y-4">
            {block.content && (
              <div 
                className="text-slate-500 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            )}
            <ul className="list-disc list-inside space-y-2 text-right pr-4 text-slate-600">
              {(block.data?.items || []).map((item, idx) => (
                <li key={idx} className="leading-relaxed" style={{ fontSize: `${theme.textSize}px` }}>{item}</li>
              ))}
            </ul>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-3">
            {block.data.mediaId && (
              <div className="space-y-3">
                <GuidelinesImage 
                  mediaId={block.data.mediaId} 
                  altText={block.data.altText || block.data.imageTitle || 'תמונה'} 
                />
                {block.data.imageTitle && (
                  <p className="text-xs text-slate-400 font-bold text-center">{block.data.imageTitle}</p>
                )}
              </div>
            )}
            {block.content && (
              <div 
                className="text-slate-500 mt-4 leading-relaxed prose prose-sm max-w-none text-right"
                style={{ fontSize: `${theme.textSize}px` }}
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            )}
          </div>
        );

      case 'file':
        return block.data.mediaId ? (
          <GuidelinesFileDownloader
            mediaId={block.data.mediaId}
            fileName={block.data.fileName || block.title || 'מדריך'}
            fileSize={block.data.fileSize}
            fileDesc={block.data.fileDesc || block.content}
          />
        ) : null;

      case 'link':
        return (
          <div className="space-y-4">
            <a
              href={block.data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-500 font-bold underline transition-colors cursor-pointer"
              style={{ fontSize: `${theme.textSize}px` }}
            >
              <span>{block.title || 'קישור חיצוני'}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            {block.content && (
              <div 
                className="text-slate-500 text-sm leading-relaxed prose prose-sm"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            )}
          </div>
        );

      case 'warning':
        return (
          <div 
            className="text-amber-700 text-sm leading-relaxed prose max-w-none"
            style={{ fontSize: `${theme.textSize}px` }}
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        );

      case 'embed':
        return block.data.url && block.data.embedType ? (
          <GuidelinesEmbed 
            url={block.data.url} 
            type={block.data.embedType} 
          />
        ) : null;

      default:
        return null;
    }
  };

  const renderContent = () => {
    const hasCustomStyles = !!block.customBgColor || !!block.customBorderColor;

    if (block.type === 'title') {
      return (
        <h2 
          id={slugify(block.title)}
          style={{ fontSize: `${theme.titleSize}px` }} 
          className="font-black text-slate-800 border-b pb-4 mb-2 flex items-center justify-between"
        >
          <span>{block.title}</span>
          {block.icon && <span className="text-2xl">{block.icon}</span>}
        </h2>
      );
    }

    if (block.type === 'card' || block.type === 'image' || block.type === 'embed' || hasCustomStyles) {
      return (
        <div className={blockClass} style={blockStyle}>
          {block.title && (
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center justify-between">
              <span>{block.title}</span>
              {block.icon && <span className="text-xl">{block.icon}</span>}
            </h3>
          )}
          {renderInnerContent()}
        </div>
      );
    }

    switch (block.type) {
      case 'warning':
        return (
          <div 
            className="bg-amber-50 border-r-4 border-amber-500 rounded-2xl p-6 flex gap-4 text-right"
            style={blockStyle}
          >
            <div className="text-amber-500 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2 flex-1">
              <h4 className="font-bold text-amber-800 text-base">{block.title || 'הודעה חשובה'}</h4>
              {renderInnerContent()}
            </div>
          </div>
        );

      default:
        // for text, list, file, link blocks without custom color overrides
        return (
          <div className="space-y-4">
            {block.title && (
              <h3 className="text-lg font-bold text-slate-800 flex items-center justify-between">
                <span>{block.title}</span>
                {block.icon && <span className="text-lg">{block.icon}</span>}
              </h3>
            )}
            {renderInnerContent()}
          </div>
        );
    }
  };

  return (
    <BlockErrorBoundary>
      {isCollapsible ? (
        <div className={blockClass} style={blockStyle}>
          <div 
            className="flex items-center justify-between cursor-pointer select-none" 
            onClick={() => setCollapsed(!collapsed)}
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
              {block.icon && <span className="text-lg shrink-0">{block.icon}</span>}
              <span>{block.title || 'לחץ להרחבה'}</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-100 text-slate-400 font-bold px-2 py-0.5 rounded-lg">
                {collapsed ? 'הצג' : 'כווץ'}
              </span>
              {collapsed ? (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>
          {!collapsed && (
            <div className="mt-6 border-t pt-6">
              {renderInnerContent()}
            </div>
          )}
        </div>
      ) : (
        renderContent()
      )}
    </BlockErrorBoundary>
  );
};
