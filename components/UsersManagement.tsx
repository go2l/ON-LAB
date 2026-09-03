import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
    Trash2, 
    UserPlus, 
    Shield, 
    Check, 
    AlertCircle, 
    RefreshCw, 
    Edit2, 
    Phone, 
    Briefcase, 
    Building2, 
    User, 
    Search, 
    X, 
    Lock, 
    CheckCircle2 
} from 'lucide-react';
import { logActivity } from '../utils/logging';

export interface WhitelistedUser {
    email: string; // Document ID
    role: 'lab_admin' | 'sampler';
    fullName?: string;
    occupation?: string;
    company?: string;
    phone?: string;
    createdAt?: string;
    updatedAt?: string;
}

export const UsersManagement: React.FC = () => {
    const [users, setUsers] = useState<WhitelistedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Filter & Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | 'lab_admin' | 'sampler'>('ALL');

    // Add Form state
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<'lab_admin' | 'sampler'>('sampler');
    const [newFullName, setNewFullName] = useState('');
    const [newOccupation, setNewOccupation] = useState('');
    const [newCompany, setNewCompany] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Modal state
    const [editingUser, setEditingUser] = useState<WhitelistedUser | null>(null);
    const [editRole, setEditRole] = useState<'lab_admin' | 'sampler'>('sampler');
    const [editFullName, setEditFullName] = useState('');
    const [editOccupation, setEditOccupation] = useState('');
    const [editCompany, setEditCompany] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Fetch users from Firestore
    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const querySnapshot = await getDocs(collection(db, 'whitelist'));
            const userList: WhitelistedUser[] = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                userList.push({
                    email: docSnap.id,
                    role: (data.role as 'lab_admin' | 'sampler') || 'sampler',
                    fullName: data.fullName || '',
                    occupation: data.occupation || '',
                    company: data.company || '',
                    phone: data.phone || '',
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt
                });
            });
            userList.sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email));
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

    const showSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(null), 4000);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;

        setIsSubmitting(true);
        const emailKey = newEmail.trim().toLowerCase();

        try {
            const userData: any = {
                role: newRole,
                fullName: newFullName.trim(),
                occupation: newOccupation.trim(),
                company: newCompany.trim(),
                phone: newPhone.trim(),
                createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'whitelist', emailKey), userData);

            await logActivity('ADD_USER', { 
                email: emailKey, 
                role: newRole,
                fullName: userData.fullName,
                occupation: userData.occupation,
                company: userData.company,
                phone: userData.phone
            });

            await fetchUsers();

            setNewEmail('');
            setNewRole('sampler');
            setNewFullName('');
            setNewOccupation('');
            setNewCompany('');
            setNewPhone('');

            showSuccess(`המשתמש ${emailKey} נוסף בהצלחה למערכת!`);
        } catch (err: any) {
            console.error('Error adding user:', err);
            alert('שגיאה בהוספת משתמש: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenEdit = (user: WhitelistedUser) => {
        setEditingUser(user);
        setEditRole(user.role);
        setEditFullName(user.fullName || '');
        setEditOccupation(user.occupation || '');
        setEditCompany(user.company || '');
        setEditPhone(user.phone || '');
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setIsSavingEdit(true);
        const emailKey = editingUser.email;

        try {
            const updatedData: any = {
                role: editRole,
                fullName: editFullName.trim(),
                occupation: editOccupation.trim(),
                company: editCompany.trim(),
                phone: editPhone.trim(),
                updatedAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'whitelist', emailKey), updatedData, { merge: true });

            await logActivity('UPDATE_USER', { 
                email: emailKey, 
                role: editRole,
                fullName: updatedData.fullName,
                occupation: updatedData.occupation,
                company: updatedData.company,
                phone: updatedData.phone
            });

            setUsers(prev => prev.map(u => u.email === emailKey ? {
                ...u,
                role: editRole,
                fullName: updatedData.fullName,
                occupation: updatedData.occupation,
                company: updatedData.company,
                phone: updatedData.phone,
                updatedAt: updatedData.updatedAt
            } : u));

            setEditingUser(null);
            showSuccess(`פרטי המשתמש ${emailKey} עודכנו בהצלחה!`);
        } catch (err: any) {
            console.error('Error updating user:', err);
            alert('שגיאה בעדכון משתמש: ' + err.message);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeleteUser = async (emailToDelete: string) => {
        if (!window.confirm(`האם אתה בטוח שברצונך להסיר את הגישה למשתמש ${emailToDelete}?`)) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'whitelist', emailToDelete));
            await logActivity('DELETE_USER', { email: emailToDelete });
            setUsers(prev => prev.filter(u => u.email !== emailToDelete));
            showSuccess(`המשתמש ${emailToDelete} הוסר מהמערכת.`);
        } catch (err: any) {
            console.error('Error deleting user:', err);
            alert('שגיאה במחיקת משתמש: ' + err.message);
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query || 
                user.email.toLowerCase().includes(query) ||
                (user.fullName && user.fullName.toLowerCase().includes(query)) ||
                (user.occupation && user.occupation.toLowerCase().includes(query)) ||
                (user.company && user.company.toLowerCase().includes(query)) ||
                (user.phone && user.phone.includes(query));
            return matchesRole && matchesSearch;
        });
    }, [users, roleFilter, searchQuery]);

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in" dir="rtl">
            {/* Header Card */}
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <Shield className="w-7 h-7 text-blue-600" />
                            ניהול משתמשים והרשאות
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">
                            הוספה, עריכה וניהול פרטי המשתמשים המורשים במערכת (Whitelist)
                        </p>
                    </div>
                    <button
                        onClick={fetchUsers}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors border border-slate-200 text-sm font-bold"
                        title="רענן רשימה"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                        <span>רענן נתונים</span>
                    </button>
                </div>

                {/* Privacy Badge */}
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3 text-amber-800 text-xs md:text-sm font-medium mb-6">
                    <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                        <span className="font-bold">מידע מוגן ומאובטח:</span> פרטי המשתמשים (שם מלא, עיסוק, חברה, טלפון) חשופים למנהלי מערכת בלבד ולא ניתנים לצפייה על ידי דוגמי שטח או משתמשים כלליים.
                    </div>
                </div>

                {/* Success Banner */}
                {successMessage && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 text-sm font-bold mb-6 animate-fade-in">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 mb-6 border border-red-200 text-sm font-bold">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* ADD USER FORM */}
                <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200/80 mb-8">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center text-base">
                        <UserPlus className="w-5 h-5 ml-2 text-blue-600" />
                        הוספת משתמש חדש ל-Whitelist
                    </h3>

                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Email */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                    כתובת אימייל (Google Account) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="name@gmail.com"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                                />
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                    תפקיד והרשאה <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value as 'lab_admin' | 'sampler')}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm bg-white font-medium"
                                >
                                    <option value="sampler">דוגם שטח (Sampler)</option>
                                    <option value="lab_admin">מנהל מערכת (Lab Admin)</option>
                                </select>
                            </div>

                            {/* Full Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                    שם מלא
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                                    <input
                                        type="text"
                                        value={newFullName}
                                        onChange={(e) => setNewFullName(e.target.value)}
                                        placeholder="ישראל ישראלי"
                                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                                    />
                                </div>
                            </div>

                            {/* Occupation */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                    עיסוק / תפקיד מקצועי
                                </label>
                                <div className="relative">
                                    <Briefcase className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                                    <input
                                        type="text"
                                        value={newOccupation}
                                        onChange={(e) => setNewOccupation(e.target.value)}
                                        placeholder="לדוגמה: אגרונום, חוקר, מדריך"
                                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                                    />
                                </div>
                            </div>

                            {/* Company */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                    חברה / ארגון / מעסיק
                                </label>
                                <div className="relative">
                                    <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                                    <input
                                        type="text"
                                        value={newCompany}
                                        onChange={(e) => setNewCompany(e.target.value)}
                                        placeholder="לדוגמה: שה״מ, משרד החקלאות, מו״פ"
                                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                    מספר טלפון
                                </label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                                    <input
                                        type="tel"
                                        value={newPhone}
                                        onChange={(e) => setNewPhone(e.target.value)}
                                        placeholder="050-1234567"
                                        dir="ltr"
                                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm bg-white text-right"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md shadow-blue-200 text-sm"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>{isSubmitting ? 'מוסיף משתמש...' : 'הוסף משתמש ל-Whitelist'}</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="חיפוש לפי שם, אימייל, חברה, עיסוק או טלפון..."
                            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Role Filter Tabs */}
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setRoleFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                roleFilter === 'ALL'
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            הכל ({users.length})
                        </button>
                        <button
                            onClick={() => setRoleFilter('lab_admin')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                roleFilter === 'lab_admin'
                                    ? 'bg-white text-red-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            מנהלים ({users.filter(u => u.role === 'lab_admin').length})
                        </button>
                        <button
                            onClick={() => setRoleFilter('sampler')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                roleFilter === 'sampler'
                                    ? 'bg-white text-green-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            דוגמים ({users.filter(u => u.role === 'sampler').length})
                        </button>
                    </div>
                </div>

                {/* USERS TABLE */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">משתמש</th>
                                <th className="px-6 py-4">תפקיד במערכת</th>
                                <th className="px-6 py-4">עיסוק</th>
                                <th className="px-6 py-4">חברה / ארגון</th>
                                <th className="px-6 py-4">טלפון</th>
                                <th className="px-6 py-4 text-center">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredUsers.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        לא נמצאו משתמשים התואמים את הסינון
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.email} className="hover:bg-slate-50/80 transition-colors group">
                                        {/* User Identity (Full Name & Email) */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-xs shrink-0">
                                                    {(user.fullName?.[0] || user.email[0]).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                        <span>{user.fullName || user.email.split('@')[0]}</span>
                                                        {user.email === 'ohad126@gmail.com' && (
                                                            <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold border border-yellow-200">
                                                                בעלים
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-mono" dir="ltr">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role Badge */}
                                        <td className="px-6 py-4">
                                            {user.role === 'lab_admin' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 gap-1">
                                                    <Shield className="w-3 h-3" />
                                                    מנהל מערכת
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1">
                                                    <Check className="w-3 h-3" />
                                                    דוגם שטח
                                                </span>
                                            )}
                                        </td>

                                        {/* Occupation */}
                                        <td className="px-6 py-4 text-slate-600">
                                            {user.occupation ? (
                                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{user.occupation}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>

                                        {/* Company */}
                                        <td className="px-6 py-4 text-slate-600">
                                            {user.company ? (
                                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{user.company}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>

                                        {/* Phone */}
                                        <td className="px-6 py-4 text-slate-600">
                                            {user.phone ? (
                                                <a 
                                                    href={`tel:${user.phone}`}
                                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-mono hover:underline"
                                                    dir="ltr"
                                                >
                                                    <Phone className="w-3 h-3 text-blue-500" />
                                                    {user.phone}
                                                </a>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => handleOpenEdit(user)}
                                                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                    title="ערוך פרטי משתמש"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>

                                                {/* Delete Button */}
                                                {user.email !== 'ohad126@gmail.com' && (
                                                    <button
                                                        onClick={() => handleDeleteUser(user.email)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        title="מחק משתמש מהמערכת"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
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

            {/* EDIT USER MODAL */}
            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6" dir="rtl">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <Edit2 className="w-5 h-5 text-blue-600" />
                                    עריכת פרטי משתמש
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5 font-mono" dir="ltr">
                                    {editingUser.email}
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            {/* Email (Readonly) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                    כתובת אימייל (נעול לשינוי)
                                </label>
                                <div className="relative">
                                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                                    <input
                                        type="text"
                                        disabled
                                        value={editingUser.email}
                                        dir="ltr"
                                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm font-mono cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    תפקיד במערכת
                                </label>
                                <select
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value as 'lab_admin' | 'sampler')}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm bg-white font-medium"
                                >
                                    <option value="sampler">דוגם שטח (Sampler)</option>
                                    <option value="lab_admin">מנהל מערכת (Lab Admin)</option>
                                </select>
                            </div>

                            {/* Full Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    שם מלא
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                                    <input
                                        type="text"
                                        value={editFullName}
                                        onChange={(e) => setEditFullName(e.target.value)}
                                        placeholder="שם פרטי ומשפחה"
                                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            {/* Occupation */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    עיסוק / תפקיד מקצועי
                                </label>
                                <div className="relative">
                                    <Briefcase className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                                    <input
                                        type="text"
                                        value={editOccupation}
                                        onChange={(e) => setEditOccupation(e.target.value)}
                                        placeholder="לדוגמה: אגרונום שטח, חוקר מעבדה"
                                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            {/* Company */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    חברה / ארגון
                                </label>
                                <div className="relative">
                                    <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                                    <input
                                        type="text"
                                        value={editCompany}
                                        onChange={(e) => setEditCompany(e.target.value)}
                                        placeholder="לדוגמה: משרד החקלאות, שה״מ"
                                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    מספר טלפון
                                </label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                                    <input
                                        type="tel"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        placeholder="050-1234567"
                                        dir="ltr"
                                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm text-right"
                                    />
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors"
                                >
                                    ביטול
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingEdit}
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 disabled:opacity-50"
                                >
                                    {isSavingEdit ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>שומר שינויים...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            <span>שמור שינויים</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
