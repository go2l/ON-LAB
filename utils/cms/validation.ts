import { GuidelinesBlock, GuidelinesDocument } from '../../types';

// Constants
export const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'];
export const MAX_DOC_PAYLOAD_BYTES = 800 * 1024; // 800KB for safety

export interface ValidationError {
  blockId?: string;
  field?: string;
  message: string;
}

/**
 * Validate URL to prevent unsafe protocols
 */
export function isValidUrl(url: string): boolean {
  if (!url) return true; // empty is valid (optional)
  const trimmed = url.trim();
  if (trimmed.startsWith('#')) return true; // Internal anchor
  if (trimmed.startsWith('mailto:')) return true; // Mail link
  
  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (e) {
    // Check if it's a relative URL or mailto or simple string, return false for absolute without protocol
    return false;
  }
}

/**
 * Validate Embed URLs (allow YouTube, Google Maps, Google Drive iframe URLs)
 */
export function validateEmbedUrl(url: string, type: 'youtube' | 'google-maps' | 'google-drive'): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  
  if (type === 'youtube') {
    return trimmed.includes('youtube.com') || trimmed.includes('youtu.be');
  }
  if (type === 'google-maps') {
    return trimmed.includes('google.com/maps') || trimmed.includes('maps.google.com');
  }
  if (type === 'google-drive') {
    return trimmed.includes('drive.google.com');
  }
  return false;
}

/**
 * Validate file name extension
 */
export function isValidFileExtension(fileName: string): boolean {
  const parts = fileName.split('.');
  if (parts.length < 2) return false;
  const ext = parts.pop()?.toLowerCase();
  return ext ? ALLOWED_EXTENSIONS.includes(ext) : false;
}

/**
 * Estimates the size of the Firestore document payload in bytes
 */
export function estimatePayloadSize(doc: Partial<GuidelinesDocument>): number {
  const jsonStr = JSON.stringify(doc);
  return new Blob([jsonStr]).size;
}

/**
 * Validates a single block
 */
export function validateBlock(block: GuidelinesBlock): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!block.id) {
    errors.push({ message: 'מזהה בלוק חסר (block ID stability error)' });
  }

  if (block.type === 'image') {
    if (!block.data.altText || block.data.altText.trim() === '') {
      errors.push({
        blockId: block.id,
        field: 'altText',
        message: `בבלוק תמונה "${block.title || 'ללא כותרת'}", שדה טקסט חלופי (Alt Text) הוא חובה לנגישות.`
      });
    }
  }

  if (block.type === 'link') {
    if (!block.data.url || block.data.url.trim() === '') {
      errors.push({
        blockId: block.id,
        field: 'url',
        message: `בבלוק קישור "${block.title || 'ללא כותרת'}", חובה להזין כתובת קישור (URL).`
      });
    } else if (!isValidUrl(block.data.url)) {
      errors.push({
        blockId: block.id,
        field: 'url',
        message: `בבלוק קישור "${block.title || 'ללא כותרת'}", כתובת הקישור שהוזנה אינה תקינה או משתמשת בפרוטוקול לא מאושר (רק http, https, mailto, או #).`
      });
    }
  }

  if (block.type === 'embed') {
    if (!block.data.url || block.data.url.trim() === '') {
      errors.push({
        blockId: block.id,
        field: 'url',
        message: `בבלוק הטמעה "${block.title || 'ללא כותרת'}", חובה להזין כתובת הטמעה.`
      });
    } else if (!block.data.embedType) {
      errors.push({
        blockId: block.id,
        field: 'embedType',
        message: `בבלוק הטמעה "${block.title || 'ללא כותרת'}", חובה לבחור סוג הטמעה.`
      });
    } else if (!validateEmbedUrl(block.data.url, block.data.embedType)) {
      errors.push({
        blockId: block.id,
        field: 'url',
        message: `בבלוק הטמעה "${block.title || 'ללא כותרת'}", כתובת ההטמעה אינה תואמת את הספק שנבחר (${block.data.embedType}).`
      });
    }
  }

  if (block.type === 'file') {
    if (!block.data.mediaId) {
      errors.push({
        blockId: block.id,
        field: 'mediaId',
        message: `בבלוק קובץ להורדה "${block.title || 'ללא כותרת'}", לא צורף קובץ.`
      });
    }
    if (!block.data.fileName || block.data.fileName.trim() === '') {
      errors.push({
        blockId: block.id,
        field: 'fileName',
        message: `בבלוק קובץ להורדה "${block.title || 'ללא כותרת'}", חסר שם קובץ.`
      });
    }
  }

  return errors;
}

/**
 * Full document validation before publishing
 */
export function validateDocumentBeforePublish(doc: GuidelinesDocument): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check blocks
  if (!doc.blocks || doc.blocks.length === 0) {
    errors.push({ message: 'לא ניתן לפרסם מסמך ריק ללא בלוקים.' });
  } else {
    doc.blocks.forEach(block => {
      errors.push(...validateBlock(block));
    });
  }

  // Check payload size
  const payloadSize = estimatePayloadSize(doc);
  if (payloadSize > MAX_DOC_PAYLOAD_BYTES) {
    errors.push({
      message: `גודל המסמך הכולל (${(payloadSize / 1024).toFixed(1)}KB) חורג מהמגבלה המותרת (${(MAX_DOC_PAYLOAD_BYTES / 1024).toFixed(0)}KB). אנא הקטן את כמות המידע או הסר בלוקים.`
    });
  }

  return errors;
}
