import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

export interface LogEntry {
    id?: string;
    timestamp: string;
    userId: string;
    userName?: string;
    action: string;
    details: Record<string, any>;
    ip?: string; // Best effort, often not available in client-side only
    userAgent?: string;
}

export const logActivity = async (
    action: string,
    details: Record<string, any> = {}
) => {
    try {
        let user = auth.currentUser;

        // If user is null, wait a brief moment for auth state to resolve (handles race conditions on login/reload)
        // If user is null, wait a brief moment for auth state to resolve (handles race conditions on login/reload)
        if (!user) {
            user = await new Promise((resolve) => {
                const unsubscribe = onAuthStateChanged(auth, (u) => {
                    unsubscribe();
                    resolve(u);
                });
                // Timeout after 2 seconds
                setTimeout(() => {
                    unsubscribe(); // Ensure we don't leak if already resolved
                    resolve(null);
                }, 2000);
            });
        }

        if (!user) {
            console.warn(`[ActivityLog] Attempted to log '${action}' without authenticated user. Details:`, details);
            // We might still want to log it as 'Anonymous' or 'System' if it helps debugging
            // For now, adhere to security/privacy and return, or log with ID 'unknown'
            const entry: Omit<LogEntry, 'id'> = {
                timestamp: new Date().toISOString(),
                userId: 'unknown',
                userName: 'Anonymous / System',
                action,
                details,
                userAgent: navigator.userAgent
            };
            addDoc(collection(db, 'activity_logs'), entry).catch(err => {
                console.error('Failed to write activity log (anon):', err);
            });
            return;
        }

        const entry: Omit<LogEntry, 'id'> = {
            timestamp: new Date().toISOString(),
            userId: user.email || user.uid,
            userName: user.displayName || 'Unknown',
            action,
            details,
            userAgent: navigator.userAgent
        };

        // Await the write to ensure it's persisted before continuing
        // This prevents race conditions where page navigation cuts off the request
        await addDoc(collection(db, 'activity_logs'), entry);

        console.log(`[ActivityLog] ${action}`, details);
    } catch (e: any) {
        console.error('Error logging activity:', e);
        // We do strictly throw here to avoid breaking the user flow if logging fails,
        // but in high-security contexts you might WANT to throw.
    }
};
