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
    ClipboardList
} from 'lucide-react';
import { useBioshield } from '../context/BioshieldContext';

interface SampleListProps {
    samples: Sample[];
}

export const SampleList: React.FC<SampleListProps> = ({ samples }) => {
    const { selectedSampleId, selectSample } = useBioshield();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [filterPathogen, setFilterPathogen] = useState<string>('ALL');
    const [selectedDetailedSample, setSelectedDetailedSample] = useState<Sample | null>(null);

    // Sync with global selection
    useEffect(() => {
        if (selectedSampleId) {
            const sample = samples.find(s => s.id === selectedSampleId);
            if (sample) setSelectedDetailedSample(sample);
        } else {
            setSelectedDetailedSample(null);
        }
    }, [selectedSampleId, samples]);

    const handleSelectSample = (sample: Sample | null) => {
        setSelectedDetailedSample(sample);
        selectSample(sample ? sample.id : null);
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

            {/* Detail Modal */}
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
                                        <div className="flex items-center gap-4 mb-3">
                                            <span className="text-4xl font-black text-blue-600 tracking-tighter">{selectedDetailedSample.internalId}</span>
                                            <div className={`px-4 py-1 rounded-full border text-sm font-bold ${getStatusColor(selectedDetailedSample.status)}`}>
                                                {selectedDetailedSample.status}
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                            {selectedDetailedSample.crop} • {selectedDetailedSample.variety || 'זן לא ידוע'}
                                        </h3>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100">
                                            <Calendar className="w-5 h-5 text-blue-500" />
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold leading-none mb-1">תאריך דיגום</p>
                                                <p className="text-xs font-bold text-slate-700">{new Date(selectedDetailedSample.date).toLocaleDateString('he-IL')}</p>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100">
                                            <MapPin className="w-5 h-5 text-red-500" />
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold leading-none mb-1">מיקום</p>
                                                <p className="text-xs font-bold text-slate-700">{selectedDetailedSample.region}</p>
                                            </div>
                                        </div>
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
                                                <DetailItem label="יישוב / מועצה" value={selectedDetailedSample.municipality || 'לא צויין'} />
                                                <DetailItem label="שם חלקה" value={selectedDetailedSample.plotName || 'לא צויין'} />
                                                <DetailItem label="שיטת גידול" value={selectedDetailedSample.cultivationSystem} />
                                                <DetailItem label="פתוגן מטרה" value={selectedDetailedSample.pathogen} />
                                                <DetailItem label="מעבדה יעד" value={selectedDetailedSample.lab || 'לא נבחרה'} />
                                                <DetailItem label="דחיפות" value={selectedDetailedSample.priority || 'רגיל'} />
                                                <DetailItem label="שולח" value={selectedDetailedSample.collectorName} />
                                                <DetailItem label="קואורדינטות" value={`${selectedDetailedSample.coordinates.lat.toFixed(4)}, ${selectedDetailedSample.coordinates.lng.toFixed(4)}`} />
                                            </div>
                                        </div>

                                        {selectedDetailedSample.notes && (
                                            <div>
                                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">הערות שטח</h4>
                                                <div className="bg-white border-2 border-slate-100 p-6 rounded-2xl text-slate-600 text-sm italic italic leading-relaxed">
                                                    "{selectedDetailedSample.notes}"
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <Activity className="w-4 h-4" />
                                                היסטוריית טיפולים שתועדה
                                            </h4>
                                            {selectedDetailedSample.pesticideHistory.length > 0 ? (
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
                                            )}
                                        </div>
                                    </div>

                                    <div>
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
