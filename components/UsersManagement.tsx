import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Trash2, UserPlus, Shield, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface WhitelistedUser {
    email: string; // Document ID
    role: 'lab_admin' | 'sampler';
}

export const UsersManagement: React.FC = () => {
    const [users, setUsers] = useState<WhitelistedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form state
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<'lab_admin' | 'sampler'>('sampler');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch users from Firestore
    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const querySnapshot = await getDocs(collection(db, 'whitelist'));
            const userList: WhitelistedUser[] = [];
            querySnapshot.forEach((doc) => {
                // The Document ID is the email
                userList.push({
                    email: doc.id,
                    role: doc.data().role as 'lab_admin' | 'sampler'
                });
            });
            setUsers(userList);
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError('שגיאה בטעינת משתמשים: ' + (err.message || 'אנא נסה שנית'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;

        setIsSubmitting(true);
        const emailKey = newEmail.trim().toLowerCase();

        try {
            // Add to Firestore using the email as the Document ID
            await setDoc(doc(db, 'whitelist', emailKey), {
                role: newRole
            });

            // Update local state or re-fetch
            await fetchUsers();

            // Reset form
            setNewEmail('');
            setNewRole('sampler');
            alert('משתמש נוסף בהצלחה!');
        } catch (err: any) {
            console.error('Error adding user:', err);
            alert('שגיאה בהוספת משתמש: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (emailToDelete: string) => {
        if (!window.confirm(`האם אתה בטוח שברצונך להסיר את הגישה למשתמש ${emailToDelete}?`)) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'whitelist', emailToDelete));
            // Optimistic update
            setUsers(prev => prev.filter(u => u.email !== emailToDelete));
        } catch (err: any) {
            console.error('Error deleting user:', err);
            alert('שגיאה במחיקת משתמש: ' + err.message);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in" dir="rtl">
            <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">ניהול משתמשים והרשאות</h2>
                        <p className="text-slate-500 text-sm">הוספה והסרה של משתמשים מורשים (Whitelist)</p>
                    </div>
                    <button
                        onClick={fetchUsers}
                        className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                        title="רענן רשימה"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* ADD USER FORM */}
                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 mb-8">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center">
                        <UserPlus className="w-5 h-5 ml-2 text-blue-600" />
                        הוספת משתמש חדש
                    </h3>
                    <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-slate-500 mb-1">כתובת אימייל (Gmail)</label>
                            <input
                                type="email"
                                required
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="name@gmail.com"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <label className="block text-xs font-bold text-slate-500 mb-1">תפקיד</label>
                            <select
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value as 'lab_admin' | 'sampler')}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white"
                            >
                                <option value="sampler">דוגם (Sampler)</option>
                                <option value="lab_admin">מנהל (Admin)</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200 h-[42px]"
                        >
                            {isSubmitting ? 'מוסיף...' : 'הוסף ל-Whitelist'}
                        </button>
                    </form>
                </div>

                {/* USERS LIST */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center mb-6">
                        <AlertCircle className="w-5 h-5 ml-2" />
                        {error}
                    </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">כתובת אימייל</th>
                                <th className="px-6 py-4">תפקיד במערכת</th>
                                <th className="px-6 py-4">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {users.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                        לא נמצאו משתמשים ברשימה
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.email} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {user.email}
                                            {user.email === 'ohad126@gmail.com' && (
                                                <span className="mr-2 text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">בעלים</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.role === 'lab_admin' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                    <Shield className="w-3 h-3 ml-1" />
                                                    מנהל מערכת
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                    <Check className="w-3 h-3 ml-1" />
                                                    דוגם שטח
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.email !== 'ohad126@gmail.com' && (
                                                <button
                                                    onClick={() => handleDeleteUser(user.email)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="מחק משתמש"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {loading && (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
        </div>
    );
};
