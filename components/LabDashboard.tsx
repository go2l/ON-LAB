import React, { useState } from 'react';
import { Sample, ResistanceCategory, SampleStatus } from '../types';
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
  onSaveResult: (sampleId: string, result: ResistanceCategory) => void;
}

export const LabDashboard: React.FC<LabDashboardProps> = ({ samples, onUpdateStatus, onSaveResult }) => {
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [summaryResistance, setSummaryResistance] = useState<ResistanceCategory>(ResistanceCategory.S);
  const [searchTerm, setSearchTerm] = useState('');

  const [sensitivityTests, setSensitivityTests] = useState<{ id: string, material: string, dosage: string, category: ResistanceCategory }[]>([]);
  const [newTest, setNewTest] = useState({ material: '', dosage: '', category: ResistanceCategory.S });

  const pendingSamples = samples.filter(s =>
    (s.internalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.region.toLowerCase().includes(searchTerm.toLowerCase())) &&
    s.status !== SampleStatus.RESULTS_ENTERED &&
    s.status !== SampleStatus.ARCHIVED
  );

  const handleConfirmReceipt = () => {
    if (selectedSample) {
      onUpdateStatus(selectedSample.id, SampleStatus.RECEIVED_LAB);
      setSelectedSample({ ...selectedSample, status: SampleStatus.RECEIVED_LAB });
    }
  };

  const addSensitivityTest = () => {
    if (!newTest.material || !newTest.dosage) return;
    setSensitivityTests([...sensitivityTests, { ...newTest, id: Date.now().toString() }]);
    setNewTest({ material: '', dosage: '', category: ResistanceCategory.S });
  };

  const removeSensitivityTest = (id: string) => {
    setSensitivityTests(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveResult = () => {
    if (selectedSample) {
      onSaveResult(selectedSample.id, summaryResistance);
      onUpdateStatus(selectedSample.id, SampleStatus.RESULTS_ENTERED);
      setSelectedSample(null);
      setSensitivityTests([]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in pb-12" dir="rtl">
      {/* Sidebar: Specimen Queue */}
      <div className="lg:col-span-4 space-y-6">
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="font-extrabold text-slate-800 flex items-center">
            <ClipboardList className="w-5 h-5 ml-2 text-blue-600" />
            תור עבודה למעבדה
          </h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold shadow-sm">
            {pendingSamples.length} דגימות
          </span>
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
          {pendingSamples.map(sample => (
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
                <div className="bg-slate-50 p-8 rounded-[28px] border border-slate-100">
                  <h4 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center">
                    <FlaskConical className="w-5 h-5 ml-3 text-blue-600" />
                    פירוט מבחני רגישות (חומר-מינון-תגובה)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-white p-6 rounded-2xl border border-slate-100">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 mr-1">חומר פעיל</label>
                      <input
                        type="text"
                        value={newTest.material}
                        onChange={(e) => setNewTest({ ...newTest, material: e.target.value })}
                        className="input-clean bg-slate-50"
                        placeholder="שם החומר"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 mr-1">מינון (PPM)</label>
                      <input
                        type="text"
                        value={newTest.dosage}
                        onChange={(e) => setNewTest({ ...newTest, dosage: e.target.value })}
                        className="input-clean bg-slate-50"
                        placeholder="מינון"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 mr-1">תגובת התבדיד</label>
                      <select
                        value={newTest.category}
                        onChange={(e) => setNewTest({ ...newTest, category: e.target.value as ResistanceCategory })}
                        className="input-clean bg-slate-50"
                      >
                        {Object.values(ResistanceCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div className="self-end">
                      <button
                        onClick={addSensitivityTest}
                        className="w-full bg-blue-600 text-white font-black py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center"
                      >
                        <Plus className="w-5 h-5 ml-2" />
                        הוסף מבחן
                      </button>
                    </div>
                  </div>

                  {sensitivityTests.length > 0 && (
                    <div className="space-y-2">
                      {sensitivityTests.map(test => (
                        <div key={test.id} className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                          <div className="flex gap-8">
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400">חומר</span><span className="text-sm font-black">{test.material}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400">מינון</span><span className="text-sm font-bold">{test.dosage}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400">תגובה</span><span className="text-xs font-black text-blue-600">{test.category}</span></div>
                          </div>
                          <button onClick={() => removeSensitivityTest(test.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary Score */}
                <div className="bg-slate-50 p-8 rounded-[28px] border border-slate-100">
                  <h4 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center">
                    <ShieldCheck className="w-5 h-5 ml-3 text-blue-600" />
                    סיווג עמידות סופי (סיכום)
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {Object.values(ResistanceCategory).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSummaryResistance(cat)}
                        className={`py-4 px-6 rounded-2xl border-2 font-black transition-all text-sm flex-1 min-w-[140px] ${summaryResistance === cat
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 scale-105'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-blue-200'
                          }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveResult}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[20px] transition-all flex items-center justify-center shadow-xl shadow-blue-100 text-lg"
                >
                  <Save className="ml-3 w-6 h-6" />
                  <span>חתימה ושמירת תוצאה במערכת</span>
                </button>
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
