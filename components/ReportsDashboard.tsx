import React, { useState, useMemo } from 'react';
import { Sample, SensitivityTest, ResistanceCategory, SampleStatus } from '../types';
import * as XLSX from 'xlsx';
import {
    FileSpreadsheet,
    Plus,
    Trash2,
    Settings,
    Download,
    Eye,
    Filter,
    Calendar,
    MapPin,
    FlaskConical,
    Layout,
    Check,
    Database // Icon for backup
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { logActivity } from '../utils/logging';

interface ReportsDashboardProps {
    samples: Sample[];
    results: Record<string, SensitivityTest[]>;
}

type SheetType = 'SAMPLES_FULL' | 'LAB_RESULTS' | 'PESTICIDES' | 'SUMMARY';

interface SheetConfig {
    id: string;
    type: SheetType;
    name: string;
    isLocked?: boolean;
}

// Helper to get specific dates from history
const getEventDate = (sample: Sample, type: string): string | null => {
    const event = sample.history?.find(e => e.type === type);
    return event ? new Date(event.timestamp).toLocaleDateString('he-IL') : null;
};

const LAB_OPTIONS = [
    'כל המעבדות',
    'תחנת עדן - נדב ניצן',
    'בר אילן - יריב בן נעים'
];

import { useAuth } from '../context/AuthContext';

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ samples, results }) => {
    const { isAdmin } = useAuth();
    // 1. Filters State
    const [selectedLab, setSelectedLab] = useState('כל המעבדות');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // 2. Workbook State
    const [sheets, setSheets] = useState<SheetConfig[]>([
        { id: '1', type: 'SAMPLES_FULL', name: 'דגימות - פירוט מלא', isLocked: true }
    ]);
    const [activeSheetId, setActiveSheetId] = useState<string>('1');

    // 3. Filter Logic
    const filteredSamples = useMemo(() => {
        return samples.filter(sample => {
            // Lab Filter
            if (selectedLab !== 'כל המעבדות' && sample.lab !== selectedLab) return false;

            // Date Filter (Sampling Date)
            if (dateRange.start && new Date(sample.date) < new Date(dateRange.start)) return false;
            if (dateRange.end && new Date(sample.date) > new Date(dateRange.end)) return false;

            return true;
        });
    }, [samples, selectedLab, dateRange]);

    const activeSheet = sheets.find(s => s.id === activeSheetId);

    // 4. Data Generation Helpers
    const generateSheetData = (sheet: SheetConfig) => {
        switch (sheet.type) {
            case 'SAMPLES_FULL':
                return filteredSamples.map(sample => {
                    const sampleResults = results[sample.id] || [];
                    const worst = sampleResults.find(t => t.category === ResistanceCategory.R) ? 'R' :
                        sampleResults.find(t => t.category === ResistanceCategory.T) ? 'T' : '';

                    return {
                        'מזהה דגימה': sample.internalId,
                        'סטטוס': sample.status,
                        'תאריך דיגום': new Date(sample.date).toLocaleDateString('he-IL'),
                        'תאריך קבלה': getEventDate(sample, 'RECEIVED_LAB') || '-',
                        'דוגם': sample.collectorName,
                        'טלפון דוגם': sample.collectorPhone,
                        'דוא״ל דוגם': sample.collectorEmail,
                        'אזור': sample.region,
                        'יישוב': sample.municipality || '-',
                        'חלקה': sample.plotName || '-',
                        'נ.צ.': `${sample.coordinates.lat.toFixed(4)}, ${sample.coordinates.lng.toFixed(4)}`,
                        'גידול': sample.crop,
                        'זן': sample.variety || '-',
                        'פתוגן': sample.pathogen,
                        'מעבדה': sample.lab,
                        'מספר טיפולים': sample.pesticideHistory.length,
                        'מספר בדיקות': sampleResults.length,
                        'עמידות חמורה': worst
                    };
                });

            case 'LAB_RESULTS':
                return filteredSamples.flatMap(sample => {
                    const sampleRes = results[sample.id] || [];
                    return sampleRes.map(test => ({
                        'מזהה דגימה': sample.internalId,
                        'חומר': test.material,
                        'מינון (PPM)': test.dosage,
                        'קטגוריה': test.category,
                        'תאריך בדיקה': new Date(test.date).toLocaleDateString('he-IL'),
                        'מבצע': test.user,
                        'הערות': test.notes || '-'
                    }));
                });

            case 'PESTICIDES':
                return filteredSamples.flatMap(sample => {
                    return sample.pesticideHistory.map(p => ({
                        'מזהה דגימה': sample.internalId,
                        'תאריך טיפול': p.date,
                        'חומר': p.material,
                        'מינון': p.dosage,
                        'שיטה': p.method
                    }));
                });

            case 'SUMMARY':
                // Creating a pivot-like summary
                const summary: any[] = [];
                const groups = new Map();

                filteredSamples.forEach(s => {
                    const key = `${s.lab}|${s.region}|${s.crop}`;
                    if (!groups.has(key)) {
                        groups.set(key, { lab: s.lab, region: s.region, crop: s.crop, total: 0, resistant: 0 });
                    }
                    const group = groups.get(key);
                    group.total++;

                    const sampleResults = results[s.id] || [];
                    if (sampleResults.some(t => t.category === ResistanceCategory.R)) {
                        group.resistant++;
                    }
                });

                groups.forEach(g => {
                    summary.push({
                        'מעבדה': g.lab,
                        'אזור': g.region,
                        'גידול': g.crop,
                        'סה״כ דגימות': g.total,
                        'דגימות עם עמידות': g.resistant,
                        'אחוז עמידות': `${((g.resistant / g.total) * 100).toFixed(1)}%`
                    });
                });
                return summary;

            default: return [];
        }
    };

    const previewData = useMemo(() => {
        if (!activeSheet) return [];
        return generateSheetData(activeSheet);
    }, [activeSheet, filteredSamples, results]);

    const handleAddSheet = (type: SheetType) => {
        const nameMap: Record<SheetType, string> = {
            'SAMPLES_FULL': 'פירוט מלא',
            'LAB_RESULTS': 'תוצאות מעבדה',
            'PESTICIDES': 'טיפולי הדברה',
            'SUMMARY': 'סיכום מנהלים'
        };
        const newId = Date.now().toString();
        const newSheet: SheetConfig = {
            id: newId,
            type,
            name: `${nameMap[type]} ${sheets.filter(s => s.type === type).length + 1}`
        };
        setSheets([...sheets, newSheet]);
        setActiveSheetId(newId);
    };

    const handleRemoveSheet = (id: string) => {
        const sheet = sheets.find(s => s.id === id);
        if (sheet?.isLocked) return;

        const newSheets = sheets.filter(s => s.id !== id);
        setSheets(newSheets);
        if (activeSheetId === id) setActiveSheetId(newSheets[0].id);
    };

    const handleExport = async () => {
        const wb = XLSX.utils.book_new();
        // Set RTL for workbook if possible, otherwise per sheet
        wb.Workbook = { Views: [{ RTL: true }] };

        sheets.forEach(sheet => {
            const data = generateSheetData(sheet);
            const ws = XLSX.utils.json_to_sheet(data);

            // Set styles / RTL
            if (!ws['!views']) ws['!views'] = [];
            ws['!views'].push({ rightToLeft: true });

            // Auto-width columns (heuristic)
            if (data.length > 0) {
                const colWidths = Object.keys(data[0]).map(key => ({ wch: Math.max(key.length + 5, 15) }));
                ws['!cols'] = colWidths;
            }

            XLSX.utils.book_append_sheet(wb, ws, sheet.name);
        });

        const fileName = `ON-LAB-IL_Reports_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        await logActivity('EXPORT_DATA', { type: 'EXCEL', sheets: sheets.map(s => s.name) });
    };

    const handleFullBackup = async () => {
        if (!isAdmin) return;

        try {
            // Lazy load firestore functions to avoid top-level bundle weight if possible, 
            // but for now we use the imported ones or we need to import them.
            // Since we didn't add imports at top yet, let's assume we will via another edit or 
            // we can try to use the existing context if it exposed raw db access, but it doesn't fully.
            // Better to import what we need. 
            // WAIT - I need to add imports first. 
            // I will return the function body here and add imports in next step to be safe, 
            // or I can do it all if I replace a chunk that includes imports? 
            // The imports are at the top, this chunk is in the middle. 
            // I will do the button and logic here, and imports in another step.

            // Actually, I can't use 'collection' etc if not imported. 
            // check if they are imported... checking top of file... 
            // They are NOT imported.

            // I'll leave this placeholder for a second and assume I'll add imports in next step.
            // Or I can use the 'db' from firebaseConfig if I import it...

            // Let's implement the logic assuming imports exist, then add imports.

            const timestamp = new Date().toISOString();

            // 1. Fetch Samples
            const samplesSnap = await getDocs(collection(db, 'samples'));
            const samplesData = samplesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 2. Fetch Users
            const usersSnap = await getDocs(collection(db, 'users'));
            const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 3. Fetch Whitelist
            const whitelistSnap = await getDocs(collection(db, 'whitelist'));
            const whitelistData = whitelistSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const backupData = {
                metadata: {
                    version: '1.0',
                    exportDate: timestamp,
                    exportedBy: 'admin' // could get user email context
                },
                samples: samplesData,
                users: usersData,
                whitelist: whitelistData
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ON-LAB-IL_Full_Backup_${timestamp.split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            await logActivity('SYSTEM_BACKUP', { type: 'JSON_FULL' });

        } catch (e) {
            console.error('Backup failed:', e);
            alert('שגיאה ביצירת גיבוי: ' + e);
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-6 p-4 md:p-6 animate-fade-in text-right font-sans" dir="rtl">

            {/* 1. LEFT PANEL: Filters */}
            <div className="w-full lg:w-1/4 bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col gap-6">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-1">
                        <Filter className="w-5 h-5 text-blue-600" />
                        סינון נתונים
                    </h2>
                    <p className="text-xs text-slate-500">הגדרת היקף הנתונים לדו״ח</p>
                </div>

                <div className="space-y-6 overflow-y-auto pr-1">
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">מעבדה קולטת</label>
                        <select
                            value={selectedLab}
                            onChange={(e) => setSelectedLab(e.target.value)}
                            className="input-clean w-full text-sm py-2.5"
                        >
                            {LAB_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">טווח תאריכי דגימה</label>
                        <div className="space-y-2">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="input-clean w-full pl-10 text-xs"
                                    placeholder="מתאריך"
                                />
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="input-clean w-full pl-10 text-xs"
                                    placeholder="עד תאריך"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <FlaskConical className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-bold text-blue-800">דגימות בסינון</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800">{filteredSamples.length}</div>
                    </div>
                </div>
            </div>

            {/* 2. CENTER PANEL: Workbook Builder */}
            <div className="w-full lg:w-1/4 bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col gap-6">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-1">
                        <Settings className="w-5 h-5 text-blue-600" />
                        מבנה הקובץ
                    </h2>
                    <p className="text-xs text-slate-500">ניהול גליונות ותוכן</p>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">גליונות פעילים</label>
                        <div className="relative group">
                            <button className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                            {/* Dropdown Menu - Fixed hover gap */}
                            <div className="absolute left-0 top-full pt-2 w-48 hidden group-hover:block z-20">
                                <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-2">
                                    <button onClick={() => handleAddSheet('LAB_RESULTS')} className="w-full text-right p-2 text-xs font-bold hover:bg-slate-50 rounded-lg">תוצאות מעבדה</button>
                                    {isAdmin && (
                                        <button onClick={() => handleAddSheet('PESTICIDES')} className="w-full text-right p-2 text-xs font-bold hover:bg-slate-50 rounded-lg">טיפולי הדברה</button>
                                    )}
                                    <button onClick={() => handleAddSheet('SUMMARY')} className="w-full text-right p-2 text-xs font-bold hover:bg-slate-50 rounded-lg">סיכום עמידויות</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[400px]">
                        {sheets.map((sheet, idx) => (
                            <div
                                key={sheet.id}
                                onClick={() => setActiveSheetId(sheet.id)}
                                className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${activeSheetId === sheet.id
                                    ? 'bg-blue-50 border-blue-200 shadow-sm relative z-10'
                                    : 'bg-white border-slate-100 hover:border-blue-100'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold border border-slate-200 text-slate-400">{idx + 1}</span>
                                        <input
                                            value={sheet.name}
                                            onChange={(e) => setSheets(sheets.map(s => s.id === sheet.id ? { ...s, name: e.target.value } : s))}
                                            className={`bg-transparent font-bold text-sm outline-none w-32 focus:border-b ${activeSheetId === sheet.id ? 'border-blue-300' : 'border-transparent'}`}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    {!sheet.isLocked && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveSheet(sheet.id); }}
                                            className="text-slate-300 hover:text-red-500 p-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <div className="mt-2 text-[10px] text-slate-400 pr-9">
                                    {sheet.type === 'SAMPLES_FULL' && 'שורות: דגימות (חובה)'}
                                    {sheet.type === 'LAB_RESULTS' && 'שורות: בדיקות מעבדה'}
                                    {sheet.type === 'PESTICIDES' && 'שורות: טיפולי הדברה'}
                                    {sheet.type === 'SUMMARY' && 'טבלת ציר מסכמת'}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto">
                        <button
                            onClick={handleExport}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-100 flex items-center justify-center gap-3 transition-transform active:scale-95"
                        >
                            <Download className="w-5 h-5" />
                            הורדת קובץ Excel
                        </button>
                        <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">קובץ מאובטח • פורמט 2026</p>

                        {isAdmin && (
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <button
                                    onClick={handleFullBackup}
                                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-95 text-sm"
                                >
                                    <Database className="w-4 h-4" />
                                    גיבוי מערכת מלא (JSON)
                                </button>
                                <p className="text-center text-[10px] text-slate-300 mt-2">מיועד למנהלים בלבד</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. RIGHT PANEL: Live Preview */}
            <div className="flex-1 bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-50 rounded-xl">
                        <Eye className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">תצוגה מקדימה</h3>
                        <p className="text-xs text-slate-500">גליון פעיל: {activeSheet?.name} (עד 50 שורות)</p>
                    </div>
                </div>

                <div className="flex-1 overflow-auto border border-slate-100 rounded-2xl bg-slate-50/50">
                    <table className="w-full text-right bg-white text-sm">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                {previewData.length > 0 && Object.keys(previewData[0]).map(key => (
                                    <th key={key} className="px-4 py-3 text-xs font-black text-slate-500 uppercase whitespace-nowrap border-b border-slate-200">
                                        {key}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {previewData.length > 0 ? (
                                previewData.slice(0, 50).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                        {Object.values(row).map((val: any, i) => (
                                            <td key={i} className="px-4 py-2.5 text-xs text-slate-600 border-l border-slate-50 last:border-0 whitespace-nowrap truncate max-w-[200px]" title={String(val)}>
                                                {val}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td className="p-12 text-center text-slate-400 font-medium">
                                        {filteredSamples.length === 0 ? 'אין דגימות התואמות את הסינון' : 'טוען נתונים...'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
