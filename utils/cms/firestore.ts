import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  writeBatch, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { GuidelinesDocument, GuidelinesMedia, GuidelinesRevision, GuidelinesAuditEvent } from '../../types';
import { migrateSchema, createDefaultDocument } from './migration';

/**
 * Load guidelines document (either 'draft' or 'published')
 */
export async function getGuidelines(documentId: 'draft' | 'published'): Promise<GuidelinesDocument> {
  const docRef = doc(db, 'guidelines', documentId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    // If published doc doesn't exist, we fall back to draft first.
    // If draft also doesn't exist, return default.
    if (documentId === 'published') {
      try {
        const draftDoc = await getGuidelines('draft');
        return draftDoc;
      } catch (e) {
        return createDefaultDocument();
      }
    }
    return createDefaultDocument();
  }
  
  return migrateSchema(docSnap.data());
}

/**
 * Save draft guidelines to Firestore with optimistic concurrency check
 */
export async function saveGuidelinesDraft(
  docData: GuidelinesDocument, 
  userEmail: string, 
  expectedVersion: number
): Promise<number> {
  const docRef = doc(db, 'guidelines', 'draft');
  const docSnap = await getDoc(docRef);
  
  let currentVersion = 0;
  if (docSnap.exists()) {
    const data = docSnap.data();
    currentVersion = data.draftVersion || 0;
  }
  
  if (currentVersion > expectedVersion) {
    throw new Error('concurrency_conflict');
  }

  const nextVersion = expectedVersion + 1;
  const updatedDoc: any = {
    ...docData,
    draftVersion: nextVersion,
    updatedAt: serverTimestamp(),
    updatedBy: userEmail
  };

  await setDoc(docRef, updatedDoc);

  // Write audit log
  await logCmsAudit('draft_saved', userEmail);

  return nextVersion;
}

/**
 * Discard draft: Copies published guidelines doc into draft doc.
 */
export async function discardDraft(userEmail: string): Promise<GuidelinesDocument> {
  const publishedDoc = await getGuidelines('published');
  const draftRef = doc(db, 'guidelines', 'draft');
  
  // Reset draft version increment
  const updatedDraft = {
    ...publishedDoc,
    draftVersion: (publishedDoc.draftVersion || 0) + 1,
    updatedAt: serverTimestamp(),
    updatedBy: userEmail
  };
  
  await setDoc(draftRef, updatedDraft);
  await logCmsAudit('draft_saved', userEmail);
  return migrateSchema(updatedDraft);
}

/**
 * Publish draft guidelines: Updates published doc, saves a revision backup, and logs audit event.
 */
export async function publishGuidelines(
  draftDoc: GuidelinesDocument, 
  userEmail: string
): Promise<number> {
  const batch = writeBatch(db);
  const nextPublishVersion = (draftDoc.publishedVersion || 0) + 1;

  // 1. Write published doc
  const publishedRef = doc(db, 'guidelines', 'published');
  const publishedDoc: GuidelinesDocument = {
    ...draftDoc,
    publishedVersion: nextPublishVersion,
    draftVersion: draftDoc.draftVersion,
    updatedAt: serverTimestamp(),
    updatedBy: userEmail,
    publishedAt: serverTimestamp(),
    publishedBy: userEmail
  };
  batch.set(publishedRef, publishedDoc);

  // 2. Also keep draft in sync
  const draftRef = doc(db, 'guidelines', 'draft');
  batch.set(draftRef, publishedDoc);

  // 3. Backup current published state to revisions
  const revisionId = `rev_${Date.now()}`;
  const revisionRef = doc(db, 'guidelines_revisions', revisionId);
  const revisionData: GuidelinesRevision = {
    id: revisionId,
    type: 'published_backup',
    blocks: draftDoc.blocks,
    theme: draftDoc.theme,
    version: nextPublishVersion,
    timestamp: serverTimestamp(),
    createdBy: userEmail
  };
  batch.set(revisionRef, revisionData);

  // 4. Log event in audit logs
  const auditId = `audit_${Date.now()}`;
  const auditRef = doc(db, 'guidelines_audit', auditId);
  const auditData: GuidelinesAuditEvent = {
    id: auditId,
    action: 'published',
    timestamp: serverTimestamp(),
    user: userEmail
  };
  batch.set(auditRef, auditData);

  await batch.commit();

  // Enforce backup retention (keep last 30 revisions) asynchronously
  enforceRevisionRetention(30).catch(err => console.error('Retention error:', err));

  return nextPublishVersion;
}

/**
 * Deletes older revisions to keep only the last N versions
 */
export async function enforceRevisionRetention(maxRevisions = 30): Promise<void> {
  const revisionsRef = collection(db, 'guidelines_revisions');
  const q = query(revisionsRef, orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  if (snapshot.size > maxRevisions) {
    const docsToDelete = snapshot.docs.slice(maxRevisions);
    for (const d of docsToDelete) {
      await deleteDoc(d.ref);
    }
  }
}

/**
 * Save Media file to its own guidelines_media collection
 */
export async function saveGuidelinesMedia(
  fileName: string,
  type: string,
  base64: string,
  fileSize: number,
  altText: string,
  userEmail: string
): Promise<string> {
  const mediaId = `media_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const mediaRef = doc(db, 'guidelines_media', mediaId);
  
  const mediaData: GuidelinesMedia = {
    id: mediaId,
    fileName,
    type,
    base64,
    fileSize,
    altText,
    createdAt: serverTimestamp(),
    createdBy: userEmail
  };

  await setDoc(mediaRef, mediaData);
  await logCmsAudit('media_uploaded', userEmail);
  return mediaId;
}

/**
 * Delete a media item by ID
 */
export async function deleteGuidelinesMedia(mediaId: string, userEmail: string): Promise<void> {
  const mediaRef = doc(db, 'guidelines_media', mediaId);
  await deleteDoc(mediaRef);
  await logCmsAudit('media_deleted', userEmail);
}

/**
 * Load a media document by ID
 */
export async function getGuidelinesMedia(mediaId: string): Promise<GuidelinesMedia | null> {
  const mediaRef = doc(db, 'guidelines_media', mediaId);
  const mediaSnap = await getDoc(mediaRef);
  if (!mediaSnap.exists()) return null;
  return mediaSnap.data() as GuidelinesMedia;
}

/**
 * Load all previously uploaded media items (for media library)
 */
export async function getAllGuidelinesMedia(): Promise<GuidelinesMedia[]> {
  const mediaRef = collection(db, 'guidelines_media');
  const q = query(mediaRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as GuidelinesMedia);
}

/**
 * Load revision history list
 */
export async function getGuidelinesRevisions(): Promise<GuidelinesRevision[]> {
  const revisionsRef = collection(db, 'guidelines_revisions');
  const q = query(revisionsRef, orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as GuidelinesRevision);
}

/**
 * Rollback to a specific revision.
 * Saves current draft as a new revision first, then overwrites draft with selected revision's blocks/theme.
 */
export async function restoreRevision(
  revision: GuidelinesRevision, 
  currentDraft: GuidelinesDocument,
  userEmail: string
): Promise<GuidelinesDocument> {
  const batch = writeBatch(db);

  // 1. Create a revision backup of the current draft state first (safety first!)
  const backupRevId = `rev_pre_restore_${Date.now()}`;
  const backupRevRef = doc(db, 'guidelines_revisions', backupRevId);
  const backupData: GuidelinesRevision = {
    id: backupRevId,
    type: 'published_backup',
    blocks: currentDraft.blocks,
    theme: currentDraft.theme,
    version: currentDraft.draftVersion,
    timestamp: serverTimestamp(),
    createdBy: userEmail
  };
  batch.set(backupRevRef, backupData);

  // 2. Overwrite the draft with the target revision contents
  const nextDraftVersion = (currentDraft.draftVersion || 0) + 1;
  const draftRef = doc(db, 'guidelines', 'draft');
  const updatedDraft = {
    ...currentDraft,
    blocks: revision.blocks,
    theme: revision.theme,
    draftVersion: nextDraftVersion,
    updatedAt: serverTimestamp(),
    updatedBy: userEmail
  };
  batch.set(draftRef, updatedDraft);

  // 3. Create Audit entry
  const auditId = `audit_${Date.now()}`;
  const auditRef = doc(db, 'guidelines_audit', auditId);
  const auditData: GuidelinesAuditEvent = {
    id: auditId,
    action: 'restored',
    timestamp: serverTimestamp(),
    user: userEmail
  };
  batch.set(auditRef, auditData);

  await batch.commit();
  return migrateSchema(updatedDraft);
}

/**
 * Write a clean event to guidelines_audit
 */
export async function logCmsAudit(
  action: GuidelinesAuditEvent['action'], 
  userEmail: string
): Promise<void> {
  try {
    const auditId = `audit_${Date.now()}_${Math.floor(Math.random() * 100)}`;
    const auditRef = doc(db, 'guidelines_audit', auditId);
    const auditData: GuidelinesAuditEvent = {
      id: auditId,
      action,
      timestamp: serverTimestamp(),
      user: userEmail
    };
    await setDoc(mediaRefClean(auditRef), auditData);
  } catch (e) {
    // Fail silently so it doesn't block the UI
    console.error('Audit logging failed:', e);
  }
}

// Small helper to avoid syntax issues if doc is created
function mediaRefClean(ref: any) {
  return ref;
}
