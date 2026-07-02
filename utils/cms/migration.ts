import { GuidelinesDocument } from '../../types';

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Migration helper to ensure backward and forward compatibility of document schemas.
 */
export function migrateSchema(doc: any): GuidelinesDocument {
  if (!doc) {
    return createDefaultDocument();
  }

  const schemaVersion = doc.schemaVersion || 0;

  if (schemaVersion > CURRENT_SCHEMA_VERSION) {
    console.warn(`Document schema version (${schemaVersion}) is newer than current supported version (${CURRENT_SCHEMA_VERSION}). Loading as-is.`);
    return doc as GuidelinesDocument;
  }

  let migrated = { ...doc };

  if (schemaVersion < 1) {
    migrated.schemaVersion = 1;
    
    migrated.theme = {
      fontFamily: migrated.theme?.fontFamily || 'Assistant',
      primaryColor: migrated.theme?.primaryColor || '#2563eb',
      backgroundColor: migrated.theme?.backgroundColor || '#f8fafc',
      titleSize: migrated.theme?.titleSize || 28,
      textSize: migrated.theme?.textSize || 16,
      alignment: migrated.theme?.alignment || 'right',
      showShadow: migrated.theme?.showShadow !== undefined ? migrated.theme.showShadow : true,
      showBorder: migrated.theme?.showBorder !== undefined ? migrated.theme.showBorder : true,
    };

    migrated.blocks = (migrated.blocks || []).map((b: any, index: number) => {
      const blockId = b.id || `block_${Date.now()}_${index}`;
      return {
        id: blockId,
        type: b.type || 'text',
        title: b.title || '',
        content: b.content || '',
        isHidden: b.isHidden !== undefined ? b.isHidden : false,
        isCollapsed: b.isCollapsed !== undefined ? b.isCollapsed : false,
        icon: b.icon || '',
        customBgColor: b.customBgColor || undefined,
        customBorderColor: b.customBorderColor || undefined,
        createdAt: b.createdAt || new Date().toISOString(),
        createdBy: b.createdBy || 'system',
        updatedAt: b.updatedAt || new Date().toISOString(),
        updatedBy: b.updatedBy || 'system',
        data: {
          mediaId: b.data?.mediaId || undefined,
          imageTitle: b.data?.imageTitle || '',
          altText: b.data?.altText || '',
          fileName: b.data?.fileName || '',
          fileSize: b.data?.fileSize || '',
          fileDesc: b.data?.fileDesc || '',
          url: b.data?.url || '',
          embedType: b.data?.embedType || undefined,
          items: b.data?.items || [],
        }
      };
    });

    migrated.draftVersion = migrated.draftVersion || 0;
    migrated.publishedVersion = migrated.publishedVersion || 0;
  }

  return migrated as GuidelinesDocument;
}

/**
 * Returns a default guidelines document structure matching the original hardcoded page contents.
 */
export function createDefaultDocument(): GuidelinesDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    theme: {
      fontFamily: 'Assistant',
      primaryColor: '#2563eb',
      backgroundColor: '#f8fafc',
      titleSize: 28,
      textSize: 16,
      alignment: 'right',
      showShadow: true,
      showBorder: true,
    },
    draftVersion: 0,
    publishedVersion: 0,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
    blocks: [
      {
        id: 'intro_section',
        type: 'card',
        title: 'ברוכים הבאים לפורטל המידע הלאומי לעמידות',
        content: 'מערכת זו פותחה על ידי ארגון IFRAG במטרה לנטר, לנהל ולמפות את תמונת המצב של עמידות פתוגנים לחומרי הדברה בישראל. המידע הנאסף משמש חקלאים, מדריכים וחוקרים לקבלת החלטות מושכלות בזמן אמת.',
        isHidden: false,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
        data: {}
      },
      {
        id: 'how_it_works_title',
        type: 'title',
        title: 'איך המערכת עובדת?',
        content: '',
        isHidden: false,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
        data: {}
      },
      {
        id: 'step_1_collect',
        type: 'card',
        title: '1. איסוף מהשטח',
        content: 'פקחים ומדריכים דוגמים חלקות חשודות בשטח, ומזינים את פרטי הדגימה (מיקום, גידול, היסטוריית ריסוסים) ישירות לאפליקציה.',
        isHidden: false,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
        data: {}
      },
      {
        id: 'step_2_testing',
        type: 'card',
        title: '2. בדיקת מעבדה',
        content: 'הדגימות נשלחות למעבדות המוסמכות, שם נבדקת רגישות הפתוגן לחומרים הפעילים השונים. התוצאות מוזנות למערכת המרכזית.',
        isHidden: false,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
        data: {}
      },
      {
        id: 'step_3_map',
        type: 'card',
        title: '3. תמונת מצב',
        content: 'הנתונים מעובדים למפות חום וגרפים בזמן אמת, המאפשרים לזהות מוקדי התפרצות ולהמליץ על פרוטוקולי טיפול יעילים.',
        isHidden: false,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
        data: {}
      },
      {
        id: 'contact_section',
        type: 'warning',
        title: 'זקוקים לעזרה נוספת?',
        content: 'צוות התמיכה של המיזם זמין לכל שאלה מקצועית או טכנית. ניתן ליצור קשר באמצעות כפתור התמיכה.',
        isHidden: false,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
        data: {}
      }
    ]
  };
}
