import React, { useState, useEffect } from 'react';
import { Sample, ResistanceCategory, SampleStatus, SensitivityTest } from '../types';
import { useBioshield } from '../context/BioshieldContext';
import {
  Beaker,
  FlaskConical,
  ClipboardList,
  CheckCircle2,
  ChevronLeft,
  Search,
  Save,
  AlertCircle,
  Clock,
  ShieldCheck,
  Archive,
  Plus,
  Trash2,
  Pill
} from 'lucide-react';

interface LabDashboardProps {
  samples: Sample[];
  onUpdateStatus: (id: string, status: SampleStatus) => void;
  onSaveResult: (sampleId: string, result: { id: string, material: string, dosage: string, category: ResistanceCategory }[], newStatus?: SampleStatus) => void;
}

export const LabDashboard: React.FC<LabDashboardProps> = ({ samples, onUpdateStatus, onSaveResult }) => {
  const { results, toggleArchive } = useBioshield();
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [filterLab, setFilterLab] = useState('ALL');
  const [filterPathogen, setFilterPathogen] = useState('ALL');

  const [sensitivityTests, setSensitivityTests] = useState<SensitivityTest[]>([]);
  const [newTest, setNewTest] = useState<Partial<SensitivityTest>>({ material: '', dosage: '', category: ResistanceCategory.S });
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSample) {
      const existingTests = results[selectedSample.id] || [];
      setSensitivityTests([...existingTests]);
    } else {
      setSensitivityTests([]);
    }
    setEditingTestId(null);
    setNewTest({ material: '', dosage: '', category: ResistanceCategory.S });
  }, [selectedSample, results]);

  const filteredSamples = samples.filter(s => {
    const matchesSearch = s.internalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.region.toLowerCase().includes(searchTerm.toLowerCase());

    // Filters
    const matchesLab = filterLab === 'ALL' || s.lab === filterLab;
    const matchesPathogen = filterPathogen === 'ALL' || s.pathogen === filterPathogen;

    // Archive Logic
    const matchesView = viewMode === 'active' ? !s.isArchived : s.isArchived;

    return matchesSearch && matchesLab && matchesPathogen && matchesView;
  });

  const handleConfirmReceipt = () => {
    if (selectedSample) {
      onUpdateStatus(selectedSample.id, SampleStatus.RECEIVED_LAB);
      setSelectedSample({ ...selectedSample, status: SampleStatus.RECEIVED_LAB });
    }
  };

  const addSensitivityTest = () => {
    if (!newTest.material || !newTest.dosage) return;

    if (editingTestId) {
      // Update existing test
      setSensitivityTests(prev => prev.map(t =>
        t.id === editingTestId
          ? { ...t, material: newTest.material!, dosage: newTest.dosage!, category: newTest.category!, notes: newTest.notes, user: 'חוקר מעבדה (AM)', date: new Date().toISOString() }
          : t
      ));
      setEditingTestId(null);
    } else {
      // Add new test
      const testToAdd: SensitivityTest = {
        id: Date.now().toString(),
        material: newTest.material!,
        dosage: newTest.dosage!,
        category: newTest.category || ResistanceCategory.S,
        date: new Date().toISOString(),
        user: 'חוקר מעבדה (AM)',
        notes: newTest.notes
      };
      setSensitivityTests(prev => [testToAdd, ...prev]);
    }
    setNewTest({ material: '', dosage: '', category: ResistanceCategory.S, notes: '' });
  };

  const editTest = (test: SensitivityTest) => {
    setNewTest(test);
    setEditingTestId(test.id);
  };

  const removeSensitivityTest = (id: string) => {
    if (confirm("האם למחוק בדיקה זו?")) {
      setSensitivityTests(prev => prev.filter(t => t.id !== id));
      if (editingTestId === id) {
        setEditingTestId(null);
        setNewTest({ material: '', dosage: '', category: ResistanceCategory.S });
      }
    }
  };

  const handleSaveResult = () => {
    if (selectedSample && sensitivityTests.length > 0) {
      // Use atomic update: Save results AND update status in one go
      onSaveResult(selectedSample.id, sensitivityTests, SampleStatus.RESULTS_ENTERED);
      // Removed separate onUpdateStatus call to prevent race condition
      alert("היסטוריית הבדיקות נשמרה בהצלחה.");
    } else {
      alert("יש להזין לפחות תוצאת בדיקה אחת לפני השמירה.");
    }
  };

  const handleArchiveSample = () => {
    if (selectedSample) {
      if (confirm("האם להעביר דגימה זו לארכיון? היא תוסתר מתור העבודה השוטף.")) {
        toggleArchive(selectedSample.id, true);
        setSelectedSample(null);
      }
    }
  };

  const handleRestoreSample = () => {
    if (selectedSample) {
      if (confirm("האם להחזיר דגימה זו לרשימה הפעילה?")) {
        toggleArchive(selectedSample.id, false);
        setSelectedSample(null);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in pb-12" dir="rtl">
      {/* Sidebar: Specimen Queue */}
      {/* Sidebar: Specimen Queue */}
      <div className="lg:col-span-4 space-y-6">
        <div className="flex flex-col gap-4 mb-2 px-2">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 flex items-center">
              <ClipboardList className="w-5 h-5 ml-2 text-blue-600" />
              תור עבודה למעבדה
            </h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold shadow-sm">
              {filteredSamples.length} דגימות
            </span>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => { setViewMode('active'); setSelectedSample(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              פעיל
            </button>
            <button
              onClick={() => { setViewMode('archived'); setSelectedSample(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'archived' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              ארכיון (מוסתר)
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-1 mb-2">
          <select
            value={filterLab}
            onChange={(e) => setFilterLab(e.target.value)}
            className="input-clean py-2 text-xs"
          >
            <option value="ALL">כל המעבדות</option>
            {Array.from(new Set(samples.map(s => s.lab))).filter(Boolean).map(lab => (
              <option key={lab} value={lab}>{lab}</option>
            ))}
          </select>
          <select
            value={filterPathogen}
            onChange={(e) => setFilterPathogen(e.target.value)}
            className="input-clean py-2 text-xs"
          >
            <option value="ALL">כל הפתוגנים</option>
            {Array.from(new Set(samples.map(s => s.pathogen))).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="חיפוש דגימה (מזהה/אזור)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-[20px] py-3 pr-10 pl-4 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
          />
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[600px] pl-2 scrollbar-thin">
          {filteredSamples.map(sample => (
            <button
              key={sample.id}
              onClick={() => setSelectedSample(sample)}
              className={`w-full text-right p-5 rounded-[24px] border transition-all group relative overflow-hidden ${selectedSample?.id === sample.id
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 translate-x-[-4px]'
                : 'bg-white border-slate-100 hover:border-blue-200 text-slate-600 shadow-sm'
                }`}
            >
              <div className="flex justify-between items-start relative z-10">
                <p className={`text-sm font-black ${selectedSample?.id === sample.id ? 'text-white' : 'text-slate-800'}`}>
                  {sample.internalId}
                </p>
                <div className={`text-[10px] px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider ${selectedSample?.id === sample.id
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-50 text-blue-500'
                  }`}>
                  {sample.status}
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs relative z-10">
                <span className={`flex-1 font-medium ${selectedSample?.id === sample.id ? 'text-blue-50' : 'text-slate-400'}`}>
                  {sample.region} • {sample.crop}
                </span>
                <ChevronLeft className={`w-4 h-4 transition-transform ${selectedSample?.id === sample.id ? 'translate-x-[-2px]' : 'opacity-0'}`} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Area: Result Entry & Details */}
      <div className="lg:col-span-8">
        {selectedSample ? (
          <div className="bg-white rounded-[32px] border border-slate-200 p-10 shadow-sm animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-2 bg-blue-600"></div>

            <div className="flex justify-between items-start mb-10 pb-8 border-b border-slate-50">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-black text-slate-800">{selectedSample.internalId}</h2>
                  <div className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center ${selectedSample.status === SampleStatus.PENDING_LAB_CONFIRMATION
                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                    : 'bg-purple-50 text-purple-600 border-purple-100'
                    }`}>
                    <Clock className="w-3 h-3 ml-1.5" />
                    {selectedSample.status === SampleStatus.PENDING_LAB_CONFIRMATION ? 'ממתין לאישור קבלה' : 'פענוח בתהליך'}
                  </div>
                </div>
                <p className="text-slate-500 font-medium">פרוטוקול עיבוד דגימה מעבדתי - ON-LAB-IL</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl">
                <Beaker className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              <DetailItem label="אזור" value={selectedSample.region} />
              <DetailItem label="גידול" value={selectedSample.crop} />
              <DetailItem label="פתוגן" value={selectedSample.pathogen} />
              <DetailItem label="תאריך דיגום" value={new Date(selectedSample.date).toLocaleDateString('he-IL')} />
            </div>

            {selectedSample.status === SampleStatus.PENDING_LAB_CONFIRMATION ? (
              <div className="bg-amber-50 rounded-3xl p-12 text-center border border-amber-100">
                <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-6" />
                <h3 className="text-xl font-black text-amber-900 mb-2">טרם אושרה קבלת הדגימה הפיזית</h3>
                <p className="text-amber-700/70 mb-8 max-w-md mx-auto">יש לוודא שהדגימה הגיעה למעבדה וקיימת התאמה בין המזהה הדיגיטלי לתווית שעל השקית.</p>
                <button
                  onClick={handleConfirmReceipt}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black py-4 px-10 rounded-2xl transition-all shadow-lg shadow-amber-200 flex items-center justify-center mx-auto"
                >
                  <ShieldCheck className="ml-3 w-5 h-5" />
                  <span>אשר קבלת דגימה פיזית</span>
                </button>
              </div>
            ) : (
              <div className="space-y-10 animate-fade-in">
                {/* Sensitivity Tests Module */}
                {/* Sensitivity Tests Module */}
                <div className="bg-slate-50 p-8 rounded-[28px] border border-slate-100">
                  <h4 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center justify-between">
                    <span className="flex items-center">
                      <FlaskConical className="w-5 h-5 ml-3 text-blue-600" />
                      היסטוריית בדיקות רגישות
                    </span>
                    <span className="text-xs bg-slate-200 text-slate-600 px-3 py-1 rounded-full">{sensitivityTests.length} בדיקות</span>
                  </h4>

                  {/* Add/Edit Form */}
                  <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 bg-white p-6 rounded-2xl border ${editingTestId ? 'border-amber-200 shadow-md ring-4 ring-amber-50' : 'border-slate-100'}`}>
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-xs font-bold text-slate-500 mr-1">חומר פעיל</label>
                      <input
                        type="text"
                        value={newTest.material}
                        onChange={(e) => setNewTest({ ...newTest, material: e.target.value })}
                        className="input-clean bg-slate-50"
                        placeholder="שם החומר"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 mr-1">מינון (PPM)</label>
                      <input
                        type="text"
                        value={newTest.dosage}
                        onChange={(e) => setNewTest({ ...newTest, dosage: e.target.value })}
                        className="input-clean bg-slate-50"
                        placeholder="מינון"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-xs font-bold text-slate-500 mr-1">תגובת התבדיד</label>
                      <select
                        value={newTest.category}
                        onChange={(e) => setNewTest({ ...newTest, category: e.target.value as ResistanceCategory })}
                        className="input-clean bg-slate-50"
                      >
                        {Object.values(ResistanceCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 mr-1">הערות</label>
                      <input
                        type="text"
                        value={newTest.notes || ''}
                        onChange={(e) => setNewTest({ ...newTest, notes: e.target.value })}
                        className="input-clean bg-slate-50"
                        placeholder="אופציונלי"
                      />
                    </div>
                    <div className="md:col-span-2 self-end">
                      <button
                        onClick={addSensitivityTest}
                        className={`w-full font-black py-3 rounded-xl transition-all flex items-center justify-center ${editingTestId
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                          }`}
                      >
                        {editingTestId ? (
                          <>
                            <Save className="w-4 h-4 ml-2" />
                            עדכן
                          </>
                        ) : (
                          <>
                            <Plus className="w-5 h-5 ml-2" />
                            הוסף
                          </>
                        )}
                      </button>
                      {editingTestId && (
                        <button
                          onClick={() => { setEditingTestId(null); setNewTest({ material: '', dosage: '', category: ResistanceCategory.S, notes: '' }); }}
                          className="w-full mt-2 text-xs font-bold text-slate-400 hover:text-slate-600"
                        >
                          ביטול עריכה
                        </button>
                      )}
                    </div>
                  </div>

                  {/* History List */}
                  {sensitivityTests.length > 0 && (
                    <div className="space-y-3">
                      {sensitivityTests.map(test => (
                        <div key={test.id} className="flex flex-col md:flex-row md:items-center justify-between bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:border-blue-200 transition-all group gap-4">
                          <div className="flex flex-wrap gap-4 md:gap-6 items-center flex-1">
                            <div className="flex flex-col min-w-[100px] md:min-w-[120px]">
                              <span className="text-[10px] font-bold text-slate-400">חומר</span>
                              <span className="text-sm font-black">{test.material}</span>
                            </div>
                            <div className="flex flex-col min-w-[60px] md:min-w-[80px]">
                              <span className="text-[10px] font-bold text-slate-400">מינון</span>
                              <span className="text-sm font-bold">{test.dosage}</span>
                            </div>
                            <div className="flex flex-col min-w-[100px] md:min-w-[140px]">
                              <span className="text-[10px] font-bold text-slate-400">תגובה</span>
                              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 w-fit">{test.category}</span>
                            </div>
                            <div className="flex flex-col flex-1 min-w-[160px]">
                              <span className="text-[10px] font-bold text-slate-400">הערות ופרטים</span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-slate-500">{new Date(test.date || Date.now()).toLocaleDateString('he-IL')}</span>
                                <span className="text-slate-300 hidden md:inline">•</span>
                                <span className="text-xs text-slate-500">{test.user}</span>
                                {test.notes && (
                                  <>
                                    <span className="text-slate-300 hidden md:inline">•</span>
                                    <span className="text-xs text-slate-600 italic truncate max-w-[150px]">{test.notes}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 md:border-r border-slate-100 md:pr-4 md:mr-4 justify-end md:justify-start">
                            <button
                              onClick={() => editTest(test)}
                              className="p-2 bg-slate-50 md:bg-transparent rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                              title="ערוך בדיקה"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            <button
                              onClick={() => removeSensitivityTest(test.id)}
                              className="p-2 bg-slate-50 md:bg-transparent rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                              title="מחק בדיקה"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  {/* Archive Button (Only visible if not already archived) */}
                  {!selectedSample.isArchived && (
                    <button
                      onClick={handleArchiveSample}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-5 px-6 rounded-[20px] transition-all flex items-center justify-center order-2 md:order-1"
                      title="הסתר מהתור והעבר לארכיון"
                    >
                      <Archive className="ml-2 w-5 h-5" />
                      <span>ארכב (הסתר)</span>
                    </button>
                  )}

                  {/* Restore Button (Only visible if archived) */}
                  {selectedSample.isArchived && (
                    <button
                      onClick={handleRestoreSample}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[20px] transition-all flex items-center justify-center shadow-xl shadow-blue-100 text-lg"
                    >
                      <ClipboardList className="ml-3 w-6 h-6" />
                      <span>שחזר לתור עבודה</span>
                    </button>
                  )}

                  {/* Save Button (Only visible involved in active workflow) */}
                  {!selectedSample.isArchived && (
                    <button
                      onClick={handleSaveResult}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black py-5 px-8 rounded-[20px] transition-all flex items-center justify-center shadow-xl shadow-blue-100 text-lg md:flex-[2] order-1 md:order-2"
                    >
                      <Save className="ml-3 w-6 h-6" />
                      <span>שמירת עדכונים</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
            <div className="w-24 h-24 bg-white rounded-[24px] shadow-sm flex items-center justify-center mb-6">
              <Beaker className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-3">בחירת דגימה לעיבוד</h3>
            <p className="text-slate-500 max-w-sm font-medium leading-relaxed">אנא בחר דגימה מתור ההמתנה בצד ימין כדי לאשר קבלה, להזין תוצאות מעבדה ולבצע סיווג עמידות.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
    <p className="text-sm font-black text-slate-800">{value}</p>
  </div>
);
