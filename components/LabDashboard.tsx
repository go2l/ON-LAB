import React, { useState, useEffect } from 'react';
import { Sample, ResistanceCategory, SampleStatus, SensitivityTest, FieldTrialTest, TrialConclusion } from '../types';
import { useBioshield } from '../context/BioshieldContext';
import { formatDate } from '../utils/dateFormatter';
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
  Pill,
  Sprout,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface LabDashboardProps {
  samples: Sample[];
  onUpdateStatus: (id: string, status: SampleStatus) => void;
  onSaveResult: (
    sampleId: string,
    result: { id: string, material: string, dosage: string, category: ResistanceCategory }[],
    newStatus?: SampleStatus,
    labStatus?: 'פעילה' | 'בשימור' | 'נהרסה' | 'לא רלוונטי'
  ) => void;
}

export const LabDashboard: React.FC<LabDashboardProps> = ({ samples, onUpdateStatus, onSaveResult }) => {
  const { results, toggleArchive, updateSample } = useBioshield();
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [filterLab, setFilterLab] = useState('ALL');
  const [filterPathogen, setFilterPathogen] = useState('ALL');

  const [sensitivityTests, setSensitivityTests] = useState<SensitivityTest[]>([]);
  const [newTest, setNewTest] = useState<Partial<SensitivityTest>>({ material: '', dosage: '', category: ResistanceCategory.S });
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [labStatus, setLabStatus] = useState<'פעילה' | 'בשימור' | 'נהרסה' | 'לא רלוונטי'>('פעילה');

  // Field Trials State
  const [fieldTrials, setFieldTrials] = useState<FieldTrialTest[]>([]);
  const [newTrial, setNewTrial] = useState<Partial<FieldTrialTest>>({
    isolateId: '',
    plantVariety: '',
    plantCount: 5,
    testDate: new Date().toISOString().split('T')[0],
    inoculationDate: new Date().toISOString().split('T')[0],
    treatmentMaterial: '',
    dosage: '',
    diseaseSeverityControl: 80,
    diseaseSeverityTreated: 20,
    efficacyRate: 75,
    conclusion: 'רגיש בשטח',
    notes: '',
    user: 'חוקר מעבדה (AM)'
  });
  const [editingTrialId, setEditingTrialId] = useState<string | null>(null);
  const [showTrialForm, setShowTrialForm] = useState(false);

  type SortKey = 'internalId' | 'date' | 'region' | 'crop' | 'status';
  type SortOrder = 'asc' | 'desc';
  const [sortKey, setSortKey] = useState<SortKey>('internalId');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    if (selectedSample) {
      const existingTests = results[selectedSample.id] || [];
      setSensitivityTests([...existingTests]);
      setLabStatus(selectedSample.labStatus || 'פעילה');
      setFieldTrials(selectedSample.fieldTrials || []);
    } else {
      setSensitivityTests([]);
      setLabStatus('פעילה');
      setFieldTrials([]);
    }
    setEditingTestId(null);
    setNewTest({ material: '', dosage: '', category: ResistanceCategory.S });

    setEditingTrialId(null);
    setShowTrialForm(false);
    setNewTrial({
      isolateId: '',
      plantVariety: '',
      plantCount: 5,
      testDate: new Date().toISOString().split('T')[0],
      inoculationDate: new Date().toISOString().split('T')[0],
      treatmentMaterial: '',
      dosage: '',
      diseaseSeverityControl: 80,
      diseaseSeverityTreated: 20,
      efficacyRate: 75,
      conclusion: 'רגיש בשטח',
      notes: '',
      user: 'חוקר מעבדה (AM)'
    });
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

  const sortedSamples = [...filteredSamples].sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc' 
        ? valA.localeCompare(valB, 'he-IL') 
        : valB.localeCompare(valA, 'he-IL');
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
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
    if (selectedSample) {
      const newStatus = (sensitivityTests.length > 0 || fieldTrials.length > 0) ? SampleStatus.RESULTS_ENTERED : SampleStatus.RECEIVED_LAB;
      onSaveResult(selectedSample.id, sensitivityTests, newStatus, labStatus, fieldTrials);
      alert("היסטוריית הבדיקות וניסויי השטח נשמרו בהצלחה.");
    }
  };

  const calculateEfficacy = (control: number, treated: number): { efficacy: number; conclusion: TrialConclusion } => {
    if (!control || control <= 0) return { efficacy: 0, conclusion: 'תוצאה גבולית' };
    const eff = Math.round((1 - (treated / control)) * 100);
    let conclusion: TrialConclusion = 'תוצאה גבולית';
    if (eff >= 75) {
      conclusion = 'רגיש בשטח';
    } else if (eff <= 40) {
      conclusion = 'עמיד בשטח';
    }
    return { efficacy: eff, conclusion };
  };

  const handleSeverityChange = (field: 'diseaseSeverityControl' | 'diseaseSeverityTreated', value: number) => {
    setNewTrial(prev => {
      const control = field === 'diseaseSeverityControl' ? value : (prev.diseaseSeverityControl || 0);
      const treated = field === 'diseaseSeverityTreated' ? value : (prev.diseaseSeverityTreated || 0);
      const { efficacy, conclusion } = calculateEfficacy(control, treated);
      return {
        ...prev,
        [field]: value,
        efficacyRate: efficacy,
        conclusion
      };
    });
  };

  const addFieldTrial = () => {
    if (!newTrial.treatmentMaterial || !newTrial.dosage) {
      alert("נא למלא חומר נבדק ומינון.");
      return;
    }

    if (editingTrialId) {
      setFieldTrials(prev => prev.map(t =>
        t.id === editingTrialId
          ? {
              ...t,
              isolateId: newTrial.isolateId || '',
              plantVariety: newTrial.plantVariety || '',
              plantCount: Number(newTrial.plantCount) || 5,
              testDate: newTrial.testDate || new Date().toISOString().split('T')[0],
              inoculationDate: newTrial.inoculationDate || new Date().toISOString().split('T')[0],
              treatmentMaterial: newTrial.treatmentMaterial!,
              dosage: newTrial.dosage!,
              diseaseSeverityControl: Number(newTrial.diseaseSeverityControl) || 0,
              diseaseSeverityTreated: Number(newTrial.diseaseSeverityTreated) || 0,
              efficacyRate: Number(newTrial.efficacyRate) || 0,
              phytotoxicity: newTrial.phytotoxicity || 'אין',
              conclusion: newTrial.conclusion || 'תוצאה גבולית',
              notes: newTrial.notes,
              user: 'חוקר מעבדה (AM)'
            }
          : t
      ));
      setEditingTrialId(null);
    } else {
      const trialToAdd: FieldTrialTest = {
        id: Date.now().toString(),
        sampleId: selectedSample?.id || '',
        isolateId: newTrial.isolateId || '',
        plantVariety: newTrial.plantVariety || '',
        plantCount: Number(newTrial.plantCount) || 5,
        testDate: newTrial.testDate || new Date().toISOString().split('T')[0],
        inoculationDate: newTrial.inoculationDate || new Date().toISOString().split('T')[0],
        treatmentMaterial: newTrial.treatmentMaterial!,
        dosage: newTrial.dosage!,
        diseaseSeverityControl: Number(newTrial.diseaseSeverityControl) || 0,
        diseaseSeverityTreated: Number(newTrial.diseaseSeverityTreated) || 0,
        efficacyRate: Number(newTrial.efficacyRate) || 0,
        phytotoxicity: newTrial.phytotoxicity || 'אין',
        conclusion: newTrial.conclusion || 'תוצאה גבולית',
        notes: newTrial.notes,
        user: 'חוקר מעבדה (AM)'
      };
      setFieldTrials(prev => [trialToAdd, ...prev]);
    }

    setNewTrial({
      isolateId: '',
      plantVariety: '',
      plantCount: 5,
      testDate: new Date().toISOString().split('T')[0],
      inoculationDate: new Date().toISOString().split('T')[0],
      treatmentMaterial: '',
      dosage: '',
      diseaseSeverityControl: 80,
      diseaseSeverityTreated: 20,
      efficacyRate: 75,
      conclusion: 'רגיש בשטח',
      notes: '',
      user: 'חוקר מעבדה (AM)'
    });
    setShowTrialForm(false);
  };

  const editFieldTrial = (trial: FieldTrialTest) => {
    setNewTrial(trial);
    setEditingTrialId(trial.id);
    setShowTrialForm(true);
  };

  const removeFieldTrial = (id: string) => {
    if (confirm("האם למחוק ניסוי זה?")) {
      setFieldTrials(prev => prev.filter(t => t.id !== id));
      if (editingTrialId === id) {
        setEditingTrialId(null);
        setNewTrial({
          isolateId: '',
          plantVariety: '',
          plantCount: 5,
          testDate: new Date().toISOString().split('T')[0],
          inoculationDate: new Date().toISOString().split('T')[0],
          treatmentMaterial: '',
          dosage: '',
          diseaseSeverityControl: 80,
          diseaseSeverityTreated: 20,
          efficacyRate: 75,
          conclusion: 'רגיש בשטח',
          notes: '',
          user: 'חוקר מעבדה (AM)'
        });
      }
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

        <div className="flex items-center gap-2 px-2 text-xs">
          <span className="text-slate-400 font-bold shrink-0">מיון לפי:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="flex-1 bg-white border border-slate-200 rounded-xl py-1.5 px-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
          >
            <option value="internalId">מספר דגימה</option>
            <option value="date">תאריך דיגום</option>
            <option value="region">אזור</option>
            <option value="crop">גידול</option>
            <option value="status">סטטוס</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm flex items-center justify-center shrink-0 w-8 h-8"
            title={sortOrder === 'asc' ? 'סדר עולה' : 'סדר יורד'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[600px] pl-2 scrollbar-thin">
          {sortedSamples.map(sample => (
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

            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
              <DetailItem label="אזור" value={selectedSample.region} />
              <DetailItem label="גידול" value={selectedSample.crop} />
              <DetailItem label="פתוגן" value={selectedSample.pathogen} />
              <DetailItem label="תאריך דיגום" value={formatDate(selectedSample.date)} />
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">סטטוס דגימה</p>
                <select
                  value={labStatus}
                  onChange={(e) => setLabStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="פעילה">פעילה</option>
                  <option value="בשימור">בשימור</option>
                  <option value="נהרסה">נהרסה</option>
                  <option value="לא רלוונטי">לא רלוונטי</option>
                </select>
              </div>
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
                                <span className="text-xs text-slate-500">{formatDate(test.date || Date.now())}</span>
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

                {/* Advanced Lab Tests (Field Trials) Module */}
                <div className="bg-slate-50 p-8 rounded-[28px] border border-slate-100 mt-8">
                  <h4 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center justify-between">
                    <span className="flex items-center">
                      <Sprout className="w-5 h-5 ml-3 text-green-600 animate-pulse" />
                      בדיקות מעבדה מתקדמות (ניסוי צמח שלם / שטח)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTrialForm(!showTrialForm);
                        if (showTrialForm && editingTrialId) {
                          setEditingTrialId(null);
                          setNewTrial({
                            isolateId: '',
                            plantVariety: '',
                            plantCount: 5,
                            testDate: new Date().toISOString().split('T')[0],
                            inoculationDate: new Date().toISOString().split('T')[0],
                            treatmentMaterial: '',
                            dosage: '',
                            diseaseSeverityControl: 80,
                            diseaseSeverityTreated: 20,
                            efficacyRate: 75,
                            conclusion: 'רגיש בשטח',
                            notes: '',
                            user: 'חוקר מעבדה (AM)'
                          });
                        }
                      }}
                      className="text-xs bg-white text-blue-600 hover:bg-blue-50 border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm font-bold"
                    >
                      {showTrialForm ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          סגור טופס
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          {editingTrialId ? 'ערוך ניסוי' : 'הוסף ניסוי שטח'}
                        </>
                      )}
                    </button>
                  </h4>

                  {/* Field Trial Add/Edit Form */}
                  {showTrialForm && (
                    <div className={`mb-8 bg-white p-6 rounded-2xl border transition-all ${editingTrialId ? 'border-amber-200 shadow-md ring-4 ring-amber-50' : 'border-slate-100'}`}>
                      <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                        {editingTrialId ? 'עריכת פרטי ניסוי שטח' : 'פרטי ניסוי צמח שלם חדש'}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 mr-1">מזהה תבדיד</label>
                          <input
                            type="text"
                            value={newTrial.isolateId}
                            onChange={(e) => setNewTrial({ ...newTrial, isolateId: e.target.value })}
                            className="input-clean bg-slate-50 text-sm"
                            placeholder="לדוגמה: ISO-001"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 mr-1">זן מארח (פונדקאי)</label>
                          <input
                            type="text"
                            value={newTrial.plantVariety}
                            onChange={(e) => setNewTrial({ ...newTrial, plantVariety: e.target.value })}
                            className="input-clean bg-slate-50 text-sm"
                            placeholder="לדוגמה: בלאק ביוטי"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 mr-1">מספר צמחים בניסוי</label>
                          <input
                            type="number"
                            min="1"
                            value={newTrial.plantCount}
                            onChange={(e) => setNewTrial({ ...newTrial, plantCount: Number(e.target.value) })}
                            className="input-clean bg-slate-50 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 mr-1">פיטוטוקסיות</label>
                          <select
                            value={newTrial.phytotoxicity}
                            onChange={(e) => setNewTrial({ ...newTrial, phytotoxicity: e.target.value })}
                            className="input-clean bg-slate-50 text-sm"
                          >
                            <option value="אין">אין</option>
                            <option value="קלה">קלה</option>
                            <option value="בינונית">בינונית</option>
                            <option value="קשה">קשה</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 mr-1">תאריך זריעה/ביצוע</label>
                          <input
                            type="date"
                            value={newTrial.testDate}
                            onChange={(e) => setNewTrial({ ...newTrial, testDate: e.target.value })}
                            className="input-clean bg-slate-50 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 mr-1">תאריך הדבקה</label>
                          <input
                            type="date"
                            value={newTrial.inoculationDate}
                            onChange={(e) => setNewTrial({ ...newTrial, inoculationDate: e.target.value })}
                            className="input-clean bg-slate-50 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 mr-1">חומר הגנה / תכשיר</label>
                          <input
                            type="text"
                            value={newTrial.treatmentMaterial}
                            onChange={(e) => setNewTrial({ ...newTrial, treatmentMaterial: e.target.value })}
                            className="input-clean bg-slate-50 text-sm"
                            placeholder="שם התכשיר"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 mr-1">מינון (ריכוז / סמ"ק)</label>
                          <input
                            type="text"
                            value={newTrial.dosage}
                            onChange={(e) => setNewTrial({ ...newTrial, dosage: e.target.value })}
                            className="input-clean bg-slate-50 text-sm"
                            placeholder="לדוגמה: 0.2%"
                          />
                        </div>
                      </div>

                      {/* Sliders for Disease Severity */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-red-600 font-bold">חומרת מחלה בקבוצת ביקורת:</span>
                            <span className="bg-red-50 text-red-600 px-2.5 py-0.5 rounded-lg">{newTrial.diseaseSeverityControl}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={newTrial.diseaseSeverityControl}
                            onChange={(e) => handleSeverityChange('diseaseSeverityControl', Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                          />
                          <p className="text-[10px] text-slate-400">אחוז הפגיעה בצמחים שלא טופלו בחומר (רמת ההדבקה)</p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-blue-600 font-bold">חומרת מחלה בקבוצה מטופלת:</span>
                            <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-lg">{newTrial.diseaseSeverityTreated}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={newTrial.diseaseSeverityTreated}
                            onChange={(e) => handleSeverityChange('diseaseSeverityTreated', Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                          <p className="text-[10px] text-slate-400">אחוז הפגיעה בצמחים שטופלו בתכשיר</p>
                        </div>
                      </div>

                      {/* Calculation results & Final conclusions */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 items-center">
                        <div className="md:col-span-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 flex flex-col justify-center items-center h-full">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">יעילות הדברה מחושבת</span>
                          <span className="text-2xl font-black text-blue-600 mt-1">{newTrial.efficacyRate}%</span>
                        </div>

                        <div className="md:col-span-4 space-y-2">
                          <label className="text-xs font-bold text-slate-500 mr-1">מסקנת הניסוי</label>
                          <select
                            value={newTrial.conclusion}
                            onChange={(e) => setNewTrial({ ...newTrial, conclusion: e.target.value as TrialConclusion })}
                            className="input-clean bg-slate-50 text-sm font-bold"
                          >
                            <option value="רגיש בשטח">רגיש בשטח (יעיל ≥ 75%)</option>
                            <option value="עמיד בשטח">עמיד בשטח (יעיל ≤ 40%)</option>
                            <option value="תוצאה גבולית">תוצאה גבולית (41% - 74%)</option>
                          </select>
                        </div>

                        <div className="md:col-span-4 space-y-2">
                          <label className="text-xs font-bold text-slate-500 mr-1">הערות לניסוי</label>
                          <input
                            type="text"
                            value={newTrial.notes || ''}
                            onChange={(e) => setNewTrial({ ...newTrial, notes: e.target.value })}
                            className="input-clean bg-slate-50 text-sm"
                            placeholder="לדוגמה: סימני נבילה קלים"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setShowTrialForm(false);
                            setEditingTrialId(null);
                            setNewTrial({
                              isolateId: '',
                              plantVariety: '',
                              plantCount: 5,
                              testDate: new Date().toISOString().split('T')[0],
                              inoculationDate: new Date().toISOString().split('T')[0],
                              treatmentMaterial: '',
                              dosage: '',
                              diseaseSeverityControl: 80,
                              diseaseSeverityTreated: 20,
                              efficacyRate: 75,
                              conclusion: 'רגיש בשטח',
                              notes: '',
                              user: 'חוקר מעבדה (AM)'
                            });
                          }}
                          className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          ביטול
                        </button>
                        <button
                          type="button"
                          onClick={addFieldTrial}
                          className={`font-bold px-6 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 text-white shadow-sm ${editingTrialId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                          <Save className="w-4 h-4" />
                          {editingTrialId ? 'עדכן ניסוי' : 'שמור ניסוי'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of existing trials */}
                  {fieldTrials.length > 0 ? (
                    <div className="space-y-4">
                      {fieldTrials.map(trial => {
                        const isResistant = trial.conclusion === 'עמיד בשטח';
                        const isSensitive = trial.conclusion === 'רגיש בשטח';
                        const isBorderline = trial.conclusion === 'תוצאה גבולית';

                        return (
                          <div key={trial.id} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-green-200 transition-all">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                {/* Header info */}
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="text-xs bg-slate-100 text-slate-700 font-black px-2.5 py-1 rounded-lg">
                                    תבדיד: {trial.isolateId || 'לא מוגדר'}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {formatDate(trial.testDate)} • זן: {trial.plantVariety || 'לא מוגדר'} ({trial.plantCount} צמחים)
                                  </span>
                                  <span className={`text-xs font-black px-2.5 py-1 rounded-lg mr-auto md:mr-0 ${
                                    isSensitive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    isResistant ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                    'bg-amber-50 text-amber-700 border border-amber-100'
                                  }`}>
                                    {trial.conclusion}
                                  </span>
                                </div>

                                {/* Material and dosage details */}
                                <div className="flex flex-wrap gap-6 items-center">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block">תכשיר נבדק</span>
                                    <span className="text-sm font-black text-slate-800">{trial.treatmentMaterial} ({trial.dosage})</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block">חומרת מחלה</span>
                                    <span className="text-xs font-bold text-slate-600">ביקורת: {trial.diseaseSeverityControl}% | מטופל: {trial.diseaseSeverityTreated}%</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block">פיטוטוקסיות</span>
                                    <span className={`text-xs font-bold ${trial.phytotoxicity !== 'אין' ? 'text-amber-600 font-extrabold' : 'text-slate-600'}`}>
                                      {trial.phytotoxicity}
                                    </span>
                                  </div>
                                  {trial.notes && (
                                    <div className="flex-1 min-w-[150px]">
                                      <span className="text-[10px] font-bold text-slate-400 block">הערות</span>
                                      <span className="text-xs text-slate-600 italic">{trial.notes}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Efficacy progress bar */}
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-500">מדד יעילות הדברה:</span>
                                    <span className={isSensitive ? 'text-emerald-600' : isResistant ? 'text-rose-600' : 'text-amber-600'}>
                                      {trial.efficacyRate}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                                    <div
                                      style={{ width: `${Math.max(0, Math.min(100, trial.efficacyRate))}%` }}
                                      className={`h-full rounded-full transition-all ${
                                        isSensitive ? 'bg-emerald-500' :
                                        isResistant ? 'bg-rose-500' :
                                        'bg-amber-500'
                                      }`}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 md:border-r border-slate-100 md:pr-4 md:mr-4 justify-end">
                                <button
                                  type="button"
                                  onClick={() => editFieldTrial(trial)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                                  title="ערוך ניסוי"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeFieldTrial(trial.id)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-50 transition-colors"
                                  title="מחק ניסוי"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-white rounded-2xl border border-dashed border-slate-200">
                      <p className="text-sm text-slate-400 font-medium">טרם בוצעו ניסויי צמח שלם/שטח עבור דגימה זו.</p>
                      <button
                        type="button"
                        onClick={() => setShowTrialForm(true)}
                        className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-bold underline"
                      >
                        לחץ כאן להוספת הניסוי הראשון
                      </button>
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
