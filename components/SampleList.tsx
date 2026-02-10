import React, { useState, useEffect } from 'react';
import { Sample, SampleStatus, SampleEvent } from '../types';
import {
    Search,
    Filter,
    ArrowUpDown,
    Clock,
    CheckCircle2,
    Package,
    FlaskConical,
    ShieldCheck,
    Archive,
    X,
    MapPin,
    User,
    Calendar,
    Activity,
    ChevronRight,
    ClipboardList,
    Trash2,
    Edit2,
    Save
} from 'lucide-react';
import { useBioshield } from '../context/BioshieldContext';
import { useAuth } from '../context/AuthContext';

interface SampleListProps {
    samples: Sample[];
}

export const SampleList: React.FC<SampleListProps> = ({ samples }) => {
    const { selectedSampleId, selectSample, deleteSample, updateSample } = useBioshield();
    const { isAdmin, user } = useAuth(); // Added user for super-admin check
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [filterPathogen, setFilterPathogen] = useState<string>('ALL');
    const [selectedDetailedSample, setSelectedDetailedSample] = useState<Sample | null>(null);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<Sample>>({});

    // Sync with global selection
    useEffect(() => {
        if (selectedSampleId) {
            const sample = samples.find(s => s.id === selectedSampleId);
            if (sample) setSelectedDetailedSample(sample);
            setIsEditing(false); // Reset edit mode on change
        } else {
            setSelectedDetailedSample(null);
        }
    }, [selectedSampleId, samples]);

    const handleSelectSample = (sample: Sample | null) => {
        setSelectedDetailedSample(sample);
        selectSample(sample ? sample.id : null);
    };

    const handleStartEdit = () => {
        if (selectedDetailedSample) {
            setEditFormData({ ...selectedDetailedSample });
            setIsEditing(true);
        }
    };

    const handleSaveEdit = async () => {
        if (selectedDetailedSample && updateSample) {
            try {
                await updateSample(selectedDetailedSample.id, editFormData);
                // Update local state immediately for UI responsiveness
                setSelectedDetailedSample({ ...selectedDetailedSample, ...editFormData } as Sample);
                setIsEditing(false);
                alert('עודכן בהצלחה');
            } catch (e) {
                alert('שגיאה בעדכון: ' + e);
            }
        }
    };

    const filteredSamples = samples.filter(s => {
        const matchesSearch = s.internalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.crop.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.collectorName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
        const matchesPathogen = filterPathogen === 'ALL' || s.pathogen === filterPathogen;

        return matchesSearch && matchesStatus && matchesPathogen;
    });

    const getStatusIcon = (status: SampleStatus) => {
        switch (status) {
            case SampleStatus.SENT: return <Package className="w-4 h-4 text-blue-500" />;
            case SampleStatus.PENDING_LAB_CONFIRMATION: return <Clock className="w-4 h-4 text-amber-500" />;
            case SampleStatus.RECEIVED_LAB: return <FlaskConical className="w-4 h-4 text-purple-500" />;
            case SampleStatus.IN_TESTING: return <FlaskConical className="w-4 h-4 text-orange-500 animate-pulse" />;
            case SampleStatus.RESULTS_ENTERED: return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            default: return null;
        }
    };

    const getStatusColor = (status: SampleStatus) => {
        switch (status) {
            case SampleStatus.SENT: return 'bg-blue-50 text-blue-700 border-blue-100';
            case SampleStatus.PENDING_LAB_CONFIRMATION: return 'bg-amber-50 text-amber-700 border-amber-100';
            case SampleStatus.RECEIVED_LAB: return 'bg-purple-50 text-purple-700 border-purple-100';
            case SampleStatus.IN_TESTING: return 'bg-orange-50 text-orange-700 border-orange-100';
            case SampleStatus.RESULTS_ENTERED: return 'bg-green-50 text-green-700 border-green-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    // Helper for rendering inputs vs text
    const renderEditableField = (label: string, field: keyof Sample, type: string = 'text') => {
        if (isEditing) {
            return (
                <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{label}</p>
                    <input
                        type={type}
                        className="w-full bg-blue-50/50 border border-blue-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                        value={editFormData[field] as string || ''}
                        onChange={e => setEditFormData({ ...editFormData, [field]: e.target.value })}
                    />
                </div>
            );
        }
        // Fallback to static display
        const val = selectedDetailedSample ? selectedDetailedSample[field] : '-';
        return <DetailItem label={label} value={String(val || '-')} />;
    };


    // ... helper functions ... (getStatusIcon etc)

    return (
        <div className="space-y-6 animate-fade-in" dir="rtl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">רשימת הדגימות במערכת</h2>
                    <p className="text-slate-500 text-sm">מעקב שקוף אחר שרשרת הטיפול בדגימות מהשדה למעבדה</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="חיפוש לפי מזהה, גידול או שולח..."
                            className="input-clean pr-10 py-2.5 text-sm w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        className="input-clean py-2.5 text-sm w-full md:w-auto"
                        value={filterPathogen}
                        onChange={(e) => setFilterPathogen(e.target.value)}
                    >
                        <option value="ALL">כל הפתוגנים</option>
                        {Array.from(new Set(samples.map(s => s.pathogen))).map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>

                    <select
                        className="input-clean py-2.5 text-sm w-full md:w-auto"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">כל הסטטוסים</option>
                        {Object.values(SampleStatus).map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                {/* Desktop Table View */}
                <table className="w-full text-right border-collapse hidden md:table">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">מזהה דגימה</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">גידול</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">תאריך דיגום</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">שולח</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">מעבדה יעד</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">סטטוס עדכני</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredSamples.map((sample) => (
                            <tr
                                key={sample.id}
                                className="hover:bg-slate-50 transition-colors group cursor-pointer"
                                onClick={() => handleSelectSample(sample)}
                            >
                                <td className="px-6 py-4">
                                    <span className="font-black text-blue-600 tracking-tighter">{sample.internalId}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-700">{sample.crop}</div>
                                    <div className="text-[10px] text-slate-400">{sample.variety || 'ללא זן'}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {new Date(sample.date).toLocaleDateString('he-IL')}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                    {sample.collectorName}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {sample.lab}
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${getStatusColor(sample.status)}`}>
                                        {getStatusIcon(sample.status)}
                                        {sample.status}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                    {filteredSamples.map((sample) => (
                        <div
                            key={sample.id}
                            onClick={() => handleSelectSample(sample)}
                            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="font-black text-lg text-blue-600 tracking-tighter block mb-1">{sample.internalId}</span>
                                    <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(sample.date).toLocaleDateString('he-IL')}
                                    </span>
                                </div>
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${getStatusColor(sample.status)}`}>
                                    {getStatusIcon(sample.status)}
                                    <span className="max-w-[80px] truncate">{sample.status}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">גידול</p>
                                    <p className="text-sm font-bold text-slate-700">{sample.crop}</p>
                                    <p className="text-[10px] text-slate-400">{sample.variety || 'ללא זן'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">שולח</p>
                                    <p className="text-sm font-bold text-slate-700 truncate">{sample.collectorName}</p>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-50 flex justify-between items-center text-xs text-slate-500 font-medium">
                                <span>{sample.lab}</span>
                                <span className="text-blue-600 font-bold flex items-center">
                                    לפרטים מלאים
                                    <ChevronRight className="w-4 h-4 mr-1" />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredSamples.length === 0 && (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Search className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="font-bold text-slate-400">לא נמצאו דגימות התואמות לחיפוש</p>
                    </div>
                )}
            </div>

            {/* ... Modal ... */}
            {selectedDetailedSample && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" dir="rtl">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative">
                        <button
                            onClick={() => handleSelectSample(null)}
                            className="absolute top-6 left-6 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors z-10"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="overflow-y-auto flex-1">
                            <div className="p-10">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-10 border-b border-slate-100">
                                    <div>
                                        {/* Status & ID Header */}
                                        <div className="flex items-center gap-4 mb-3">
                                            <span className="text-4xl font-black text-blue-600 tracking-tighter">{selectedDetailedSample.internalId}</span>
                                            <div className={`px-4 py-1 rounded-full border text-sm font-bold ${getStatusColor(selectedDetailedSample.status)}`}>
                                                {selectedDetailedSample.status}
                                            </div>
                                        </div>
                                        {/* Title area (Crop / Variety) */}
                                        {isEditing ? (
                                            <div className="flex gap-4">
                                                <input
                                                    className="bg-slate-50 border p-2 rounded w-32"
                                                    value={editFormData.crop || ''}
                                                    onChange={e => setEditFormData({ ...editFormData, crop: e.target.value })}
                                                    placeholder="גידול"
                                                />
                                                <input
                                                    className="bg-slate-50 border p-2 rounded w-32"
                                                    value={editFormData.variety || ''}
                                                    onChange={e => setEditFormData({ ...editFormData, variety: e.target.value })}
                                                    placeholder="זן"
                                                />
                                            </div>
                                        ) : (
                                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                                {selectedDetailedSample.crop} • {selectedDetailedSample.variety || 'זן לא ידוע'}
                                            </h3>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 items-center">
                                        {(isAdmin || user?.email === 'ohad126@gmail.com') && (
                                            isEditing ? (
                                                <>
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl transition-all shadow-lg shadow-green-200"
                                                    >
                                                        <Save className="w-5 h-5" />
                                                        <span className="font-bold">שמור שינויים</span>
                                                    </button>
                                                    <button
                                                        onClick={() => { setIsEditing(false); setEditFormData({}); }}
                                                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-500 px-6 py-3 rounded-2xl transition-all"
                                                    >
                                                        <X className="w-5 h-5" />
                                                        <span className="font-bold">ביטול</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={handleStartEdit}
                                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl transition-all shadow-lg shadow-blue-200"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                    <span className="font-bold">עריכה מלאה</span>
                                                </button>
                                            )
                                        )}

                                        {/* Original Delete Button (Only Show if NOT editing to save space, or keep it?) */}
                                        {(!isEditing && (isAdmin || user?.email === 'ohad126@gmail.com')) && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this sample? This action cannot be undone.')) {
                                                        deleteSample(selectedDetailedSample.id);
                                                        handleSelectSample(null);
                                                    }
                                                }}
                                                className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl flex items-center gap-2 border border-red-100 transition-colors"
                                                title="מחיקת דגימה (מנהל בלבד)"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    <div className="lg:col-span-2 space-y-10">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <ClipboardList className="w-4 h-4" />
                                                פרטי דגימה מלאים
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
                                                {renderEditableField('יישוב / מועצה', 'municipality')}
                                                {renderEditableField('שם חלקה', 'plotName')}
                                                {renderEditableField('שיטת גידול', 'cultivationSystem')}
                                                {renderEditableField('פתוגן מטרה', 'pathogen')}
                                                {renderEditableField('מעבדה יעד', 'lab')}
                                                {renderEditableField('דחיפות', 'priority')}
                                                {renderEditableField('אזור', 'region')}

                                                {/* Coordinates Section */}
                                                {isEditing ? (
                                                    <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4 bg-blue-50/30 p-4 rounded-xl border border-blue-100">
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">קו רוחב (Lat)</p>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                                                value={editFormData.coordinates?.lat || ''}
                                                                onChange={e => setEditFormData({
                                                                    ...editFormData,
                                                                    coordinates: {
                                                                        lat: parseFloat(e.target.value) || 0,
                                                                        lng: editFormData.coordinates?.lng || 0
                                                                    }
                                                                })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">קו אורך (Lng)</p>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                                                value={editFormData.coordinates?.lng || ''}
                                                                onChange={e => setEditFormData({
                                                                    ...editFormData,
                                                                    coordinates: {
                                                                        lat: editFormData.coordinates?.lat || 0,
                                                                        lng: parseFloat(e.target.value) || 0
                                                                    }
                                                                })}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <DetailItem label="מיקום (GPS)" value={`${selectedDetailedSample.coordinates?.lat.toFixed(5)}, ${selectedDetailedSample.coordinates?.lng.toFixed(5)}`} />
                                                )}

                                                {/* Collector Section */}
                                                <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-200 mt-2">
                                                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">פרטי הדוגם</h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        {renderEditableField('שם הדוגם', 'collectorName')}
                                                        {renderEditableField('טלפון', 'collectorPhone')}
                                                        {renderEditableField('אימייל', 'collectorEmail')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {selectedDetailedSample.notes || isEditing ? (
                                            <div>
                                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">הערות שטח</h4>
                                                {isEditing ? (
                                                    <textarea
                                                        className="w-full bg-slate-50 border p-4 rounded-2xl h-32"
                                                        value={editFormData.notes || ''}
                                                        onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                                                    />
                                                ) : (
                                                    <div className="bg-white border-2 border-slate-100 p-6 rounded-2xl text-slate-600 text-sm italic italic leading-relaxed">
                                                        "{selectedDetailedSample.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}

                                        {/* Pesticide History */}
                                        {/* ... (Existing code for pesticide history, maybe add delete here too if needed, but keeping scope focused) ... */}
                                        {/* Keeping existing read-only view for now unless requested */}
                                        <div>
                                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <Activity className="w-4 h-4" />
                                                היסטוריית טיפולים שתועדה
                                            </h4>
                                            {isEditing ? (
                                                <div className="space-y-3">
                                                    {(editFormData.pesticideHistory || []).map((p, idx) => (
                                                        <div key={idx} className="flex flex-col gap-2 p-4 bg-blue-50/30 border border-blue-100 rounded-2xl relative group">
                                                            <button
                                                                onClick={() => {
                                                                    const newHistory = [...(editFormData.pesticideHistory || [])];
                                                                    newHistory.splice(idx, 1);
                                                                    setEditFormData({ ...editFormData, pesticideHistory: newHistory });
                                                                }}
                                                                className="absolute top-2 left-2 p-1 bg-white text-red-500 rounded-full shadow hover:bg-red-50"
                                                                title="מחק טיפול"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <input
                                                                    className="bg-white border p-1 rounded text-sm w-full"
                                                                    value={p.material}
                                                                    onChange={e => {
                                                                        const newHistory = [...(editFormData.pesticideHistory || [])];
                                                                        newHistory[idx] = { ...p, material: e.target.value };
                                                                        setEditFormData({ ...editFormData, pesticideHistory: newHistory });
                                                                    }}
                                                                    placeholder="חומר"
                                                                />
                                                                <input
                                                                    type="date"
                                                                    className="bg-white border p-1 rounded text-sm w-full"
                                                                    value={p.date}
                                                                    onChange={e => {
                                                                        const newHistory = [...(editFormData.pesticideHistory || [])];
                                                                        newHistory[idx] = { ...p, date: e.target.value };
                                                                        setEditFormData({ ...editFormData, pesticideHistory: newHistory });
                                                                    }}
                                                                />
                                                                <input
                                                                    className="bg-white border p-1 rounded text-sm w-full"
                                                                    value={p.dosage}
                                                                    onChange={e => {
                                                                        const newHistory = [...(editFormData.pesticideHistory || [])];
                                                                        newHistory[idx] = { ...p, dosage: e.target.value };
                                                                        setEditFormData({ ...editFormData, pesticideHistory: newHistory });
                                                                    }}
                                                                    placeholder="מינון"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const newHistory = [...(editFormData.pesticideHistory || [])];
                                                            newHistory.push({
                                                                id: Date.now().toString(),
                                                                material: '',
                                                                date: new Date().toISOString().split('T')[0],
                                                                dosage: '',
                                                                method: 'ריסוס' as any
                                                            });
                                                            setEditFormData({ ...editFormData, pesticideHistory: newHistory });
                                                        }}
                                                        className="w-full py-2 bg-blue-100 text-blue-600 rounded-xl font-bold hover:bg-blue-200 transition-colors text-sm flex items-center justify-center gap-2"
                                                    >
                                                        <Activity className="w-4 h-4" />
                                                        הוסף טיפול
                                                    </button>
                                                </div>
                                            ) : (
                                                selectedDetailedSample.pesticideHistory.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {selectedDetailedSample.pesticideHistory.map(p => (
                                                            <div key={p.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                                                                <div className="flex items-center gap-6 text-sm">
                                                                    <span className="font-black text-slate-800">{p.material}</span>
                                                                    <span className="text-slate-400">{p.date}</span>
                                                                    <span className="text-blue-600 font-bold">{p.dosage}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-400 text-sm italic">לא תועדה היסטוריית טיפולים</p>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {/* Audit Trail (Right Col) */}
                                    <div>
                                        {/* ... existing audit trail code ... */}
                                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <Activity className="w-4 h-4" />
                                            יומן פעולות (Audit Trail)
                                        </h4>
                                        <div className="relative pr-4 border-r border-slate-100 mr-2 space-y-8 py-2">
                                            {selectedDetailedSample.history?.length > 0 ? (
                                                selectedDetailedSample.history.map((event, idx) => (
                                                    <div key={event.id} className="relative">
                                                        <div className="absolute top-0 right-[-21px] w-4 h-4 rounded-full bg-white border-4 border-blue-500 z-10"></div>
                                                        <div className="animate-slide-in">
                                                            <p className="text-[10px] font-black text-blue-500 uppercase leading-none mb-1">{event.type}</p>
                                                            <p className="text-sm font-bold text-slate-800 mb-1">{event.description}</p>
                                                            <div className="flex items-center gap-4 text-[10px] text-slate-400">
                                                                <span className="font-bold">{new Date(event.timestamp).toLocaleString('he-IL')}</span>
                                                                <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold">{event.user}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-slate-400 text-sm italic">טרם תועדו פעולות במערכת החדשה</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
    <div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-black text-slate-800">{value}</p>
    </div>
);
