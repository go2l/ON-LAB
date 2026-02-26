import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, getDocs, where, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { LogEntry } from '../utils/logging';
import { Calendar, Filter, Download, Search, ShieldAlert, User, Clock, CheckCircle2, XCircle, FileSpreadsheet, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';

export const ActivityLogPage: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterUser, setFilterUser] = useState('');
    const [filterAction, setFilterAction] = useState('ALL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        setLoading(true);
        // Using onSnapshot for real-time updates
        const q = query(
            collection(db, 'activity_logs'),
            orderBy('timestamp', 'desc'),
            limit(200)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as LogEntry));
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching logs:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Manual refresh is no longer strictly needed with onSnapshot, but we can keep it for peace of mind or network reconnects
    const handleRefresh = () => {
        // trigger re-mount or just log
        console.log("Refreshing logs...");
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesUser = log.userId.toLowerCase().includes(filterUser.toLowerCase()) ||
                (log.userName && log.userName.toLowerCase().includes(filterUser.toLowerCase()));
            const matchesAction = filterAction === 'ALL' || log.action === filterAction;

            let matchesDate = true;
            if (dateRange.start) {
                matchesDate = matchesDate && new Date(log.timestamp) >= new Date(dateRange.start);
            }
            if (dateRange.end) {
                const endDate = new Date(dateRange.end);
                endDate.setHours(23, 59, 59, 999);
                matchesDate = matchesDate && new Date(log.timestamp) <= endDate;
            }

            return matchesUser && matchesAction && matchesDate;
        });
    }, [logs, filterUser, filterAction, dateRange]);

    const clearFilters = () => {
        setFilterUser('');
        setFilterAction('ALL');
        setDateRange({ start: '', end: '' });
    };

    const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

    const handleExport = () => {
        const data = filteredLogs.map(log => ({
            'תאריך': new Date(log.timestamp).toLocaleString('he-IL'),
            'משתמש': log.userName || log.userId,
            'פעולה': log.action,
            'פרטים': JSON.stringify(log.details)
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // RTL
        if (!ws['!views']) ws['!views'] = [];
        ws['!views'].push({ rightToLeft: true });

        XLSX.utils.book_append_sheet(wb, ws, "Activity Log");
        XLSX.writeFile(wb, `Activity_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const getActionColor = (action: string) => {
        if (action.includes('DELETE')) return 'bg-red-100 text-red-700 border-red-200';
        if (action.includes('UPDATE')) return 'bg-amber-100 text-amber-700 border-amber-200';
        if (action.includes('LOGIN')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (action.includes('CREATE') || action.includes('ADD')) return 'bg-green-100 text-green-700 border-green-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-fade-in" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-blue-600" />
                        יומן פעילות מערכת
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">תיעוד פעולות קריטיות ושינויים במערכת (Activity Log)</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl font-bold hover:bg-green-100 transition-colors border border-green-200"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        ייצוא לאקסל
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 bg-slate-50 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-100 transition-colors border border-slate-200"
                        title="רענן את כל העמוד"
                    >
                        <Clock className="w-4 h-4" />
                        רענן
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Filters */}
                <div className="w-full lg:w-1/4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm h-fit">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-blue-600" />
                        סינון לוגים
                    </h3>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400">משתמש</label>
                            <div className="relative">
                                <User className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={filterUser}
                                    onChange={(e) => setFilterUser(e.target.value)}
                                    placeholder="חפש לפי שם או אימייל..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={clearFilters}
                                className="text-xs text-blue-600 hover:text-blue-800 font-bold underline"
                            >
                                נקה סינון
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400">סוג פעולה</label>
                            <select
                                value={filterAction}
                                onChange={(e) => setFilterAction(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                            >
                                <option value="ALL">כל הפעולות</option>
                                {uniqueActions.map(action => (
                                    <option key={action} value={action}>{action}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400">טווח תאריכים</label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm mb-2"
                            />
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl">
                            <span className="text-sm font-bold text-blue-800">סה״כ רשומות</span>
                            <span className="text-xl font-black text-blue-600">{filteredLogs.length}</span>
                        </div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="flex-1 bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase sticky top-0">
                                <tr>
                                    <th className="px-6 py-4">זמן</th>
                                    <th className="px-6 py-4">משתמש</th>
                                    <th className="px-6 py-4">פעולה</th>
                                    <th className="px-6 py-4">פרטים</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-slate-400">
                                            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                            <div>טוען נתונים...</div>
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-slate-400 font-medium">
                                            לא נמצאו רשומות התואמות את החיפוש
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap" dir="ltr">
                                                {new Date(log.timestamp).toLocaleString('he-IL')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-700">{log.userName}</div>
                                                <div className="text-xs text-slate-400" dir="ltr">{log.userId}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 font-mono max-w-md overflow-x-auto">
                                                    {JSON.stringify(log.details)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
