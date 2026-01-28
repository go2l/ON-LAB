import React, { useState } from 'react';

// Lazy load LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = React.lazy(() =>
  import('./LocationPicker').then(module => ({ default: module.LocationPicker }))
);
import {
  Sample,
  Region,
  Crop,
  Pathogen,
  CultivationSystem,
  ApplicationMethod,
  PesticideTreatment,
  SampleStatus
} from '../types';
import {
  ClipboardCheck,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Leaf,
  Bug,
  Beaker,
  AlertTriangle,
  FileText,
  Pill,
  Plus,
  Trash2,
  Navigation,
  Printer,
  User,
  Mail,
  Phone
} from 'lucide-react';

interface FieldIntakeProps {
  onSave: (sample: Omit<Sample, 'id' | 'status' | 'internalId' | 'history'>) => string;
}

export const FieldIntake: React.FC<FieldIntakeProps> = ({ onSave }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    collectorName: '',
    collectorPhone: '',
    collectorEmail: '',
    region: Region.ARAVA,
    crop: Crop.TOMATO,
    variety: '',
    cultivationSystem: CultivationSystem.GREENHOUSE,
    pathogen: Pathogen.BOTRYTIS,
    municipality: '',
    plotName: '',
    lab: 'תחנת עדן - נדב ניצן',
    priority: 'רגיל',
    notes: '',
    coordinates: { lat: 31.5, lng: 34.8 },
    pesticideHistory: [] as PesticideTreatment[],
  });

  const [customCrop, setCustomCrop] = useState('');
  const [useCustomCrop, setUseCustomCrop] = useState(false);

  const [newPesticide, setNewPesticide] = useState({
    material: '',
    date: new Date().toISOString().split('T')[0],
    dosage: '',
    method: ApplicationMethod.SPRAYING,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const addPesticide = () => {
    if (!newPesticide.material || !newPesticide.dosage) return;
    const treatment: PesticideTreatment = {
      ...newPesticide,
      id: Date.now().toString(),
    };
    setFormData(prev => ({
      ...prev,
      pesticideHistory: [...prev.pesticideHistory, treatment]
    }));
    setNewPesticide({
      material: '',
      date: new Date().toISOString().split('T')[0],
      dosage: '',
      method: ApplicationMethod.SPRAYING,
    });
  };

  const removePesticide = (id: string) => {
    setFormData(prev => ({
      ...prev,
      pesticideHistory: prev.pesticideHistory.filter(p => p.id !== id)
    }));
  };

  const handleGetGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(prev => ({
          ...prev,
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        }));
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) {
      nextStep();
      return;
    }

    setIsSubmitting(true);
    const finalCrop = useCustomCrop ? customCrop : formData.crop;

    // Simulate network delay
    setTimeout(() => {
      const finalId = onSave({
        ...formData,
        crop: finalCrop as any,
        date: new Date().toISOString(),
      });
      setGeneratedId(finalId);
      setIsSubmitting(false);
    }, 1500);
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 5));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  if (generatedId) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center animate-fade-in bg-white rounded-[32px] shadow-sm border border-slate-100 p-12" dir="rtl">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-2">דגימה נקלטה בהצלחה!</h2>
        <p className="text-slate-500 mb-8 font-medium">הנתונים נשמרו במערכת ON-LAB-IL.</p>

        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 mb-10">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">מזהה דגימה ייחודי (Sample ID)</p>
          <div className="text-5xl font-black text-blue-600 tracking-wider mb-4">{generatedId}</div>
          <p className="text-sm text-slate-600 font-bold">נא לרשום מספר זה בצורה ברורה על שקית הדגימה</p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => window.print()}
            className="btn-secondary px-10 py-4 flex items-center justify-center gap-3"
          >
            <Printer className="w-5 h-5" />
            <span>הדפסת תווית דגימה</span>
          </button>
          <button
            onClick={() => {
              setGeneratedId(null); setStep(1); setFormData({
                ...formData,
                pesticideHistory: [],
                notes: '',
                variety: '',
                plotName: '',
              });
            }}
            className="btn-primary px-10 py-4"
          >
            <span>הוספת דגימה חדשה</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 animate-fade-in" dir="rtl">
      {/* Header & Stepper */}
      <div className="mb-8 md:mb-12 text-center">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-6 md:mb-8">הזנת דגימת שטח חדשה</h2>

        {/* Progress Stepper */}
        <div className="mb-12 relative px-4">
          <div className="absolute top-1/2 left-8 right-8 h-1 bg-slate-100 -translate-y-1/2 z-0" />
          <div className="flex justify-between relative z-10">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-black transition-all shadow-sm ${step >= s ? 'bg-blue-600 text-white scale-110 shadow-blue-100' : 'bg-white text-slate-300 border-2 border-slate-50'
                  }`}
              >
                {step > s ? <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" /> : s}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 px-1">
            <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider ${step >= 1 ? 'text-blue-600' : 'text-slate-300'}`}>פרטי דוגם</span>
            <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider ${step >= 2 ? 'text-blue-600' : 'text-slate-300'}`}>ביולוגיה</span>
            <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider ${step >= 3 ? 'text-blue-600' : 'text-slate-300'}`}>מיקום</span>
            <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider ${step >= 4 ? 'text-blue-600' : 'text-slate-300'}`}>הדברה</span>
            <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider ${step >= 5 ? 'text-blue-600' : 'text-slate-300'}`}>סיכום</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[32px] md:rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-16">
        <div className="flex items-center gap-4 mb-12">
          <div className="p-3 bg-blue-50 rounded-2xl">
            {step === 1 && <User className="w-8 h-8 text-blue-600" />}
            {step === 2 && <Leaf className="w-8 h-8 text-blue-600" />}
            {step === 3 && <MapPin className="w-8 h-8 text-blue-600" />}
            {step === 4 && <Pill className="w-8 h-8 text-blue-600" />}
            {step === 5 && <ClipboardCheck className="w-8 h-8 text-blue-600" />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">
              {step === 1 && 'פרטי הדוגם / היחידה'}
              {step === 2 && 'פרטי הדגימה (צמח ופתוגן)'}
              {step === 3 && 'מיקום ותפעול'}
              {step === 4 && 'היסטוריית טיפולים בהדברה'}
              {step === 5 && 'סיכום ואישור לשליחה'}
            </h2>
            <p className="text-slate-400 font-medium">אנא מלא את כל השדות בצורה מדויקת</p>
          </div>
        </div>

        {/* Step 1: Collector Details */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormGroup label="שם מלא של הדוגם" icon={<User className="w-4 h-4 ml-2 text-blue-500" />}>
                <input
                  type="text"
                  required
                  value={formData.collectorName}
                  onChange={(e) => setFormData({ ...formData, collectorName: e.target.value })}
                  className="input-clean"
                  placeholder="למשל: ישראל ישראלי"
                />
              </FormGroup>

              <FormGroup label="מספר טלפון" icon={<Phone className="w-4 h-4 ml-2 text-green-500" />}>
                <input
                  type="tel"
                  required
                  value={formData.collectorPhone}
                  onChange={(e) => setFormData({ ...formData, collectorPhone: e.target.value })}
                  className="input-clean"
                  placeholder="05X-XXXXXXX"
                />
              </FormGroup>

              <FormGroup label="כתובת דוא״ל" icon={<Mail className="w-4 h-4 ml-2 text-purple-500" />}>
                <input
                  type="email"
                  required
                  value={formData.collectorEmail}
                  onChange={(e) => setFormData({ ...formData, collectorEmail: e.target.value })}
                  className="input-clean"
                  placeholder="example@domain.com"
                />
              </FormGroup>
            </div>
          </div>
        )}

        {/* Step 2: Biological Specs */}
        {step === 2 && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormGroup label="סוג הגידול" icon={<Leaf className="w-4 h-4 ml-2 text-green-500" />}>
                <div className="space-y-3">
                  <select
                    value={useCustomCrop ? 'OTHER' : formData.crop}
                    onChange={(e) => {
                      if (e.target.value === 'OTHER') {
                        setUseCustomCrop(true);
                      } else {
                        setUseCustomCrop(false);
                        setFormData({ ...formData, crop: e.target.value });
                      }
                    }}
                    className="input-clean"
                  >
                    {Object.values(Crop).map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="OTHER">גידול אחר...</option>
                  </select>
                  {useCustomCrop && (
                    <input
                      type="text"
                      placeholder="הזן שם גידול חדש..."
                      value={customCrop}
                      onChange={(e) => setCustomCrop(e.target.value)}
                      className="input-clean border-blue-400 focus:ring-blue-100"
                      autoFocus
                      required
                    />
                  )}
                </div>
              </FormGroup>

              <FormGroup label="זן הגידול" icon={<FileText className="w-4 h-4 ml-2 text-blue-500" />}>
                <input
                  type="text"
                  placeholder="הזן שם זן (למשל: מרמנד, חן...)"
                  value={formData.variety}
                  onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                  className="input-clean"
                />
              </FormGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormGroup label="שיטת גידול" icon={<AlertTriangle className="w-4 h-4 ml-2 text-amber-500" />}>
                <select
                  value={formData.cultivationSystem}
                  onChange={(e) => setFormData({ ...formData, cultivationSystem: e.target.value as CultivationSystem })}
                  className="input-clean"
                >
                  {Object.values(CultivationSystem).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormGroup>

              <FormGroup label="פתוגן מטרה" icon={<Bug className="w-4 h-4 ml-2 text-red-500" />}>
                <select
                  value={formData.pathogen}
                  onChange={(e) => setFormData({ ...formData, pathogen: e.target.value as Pathogen })}
                  className="input-clean font-medium italic"
                >
                  {Object.values(Pathogen).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </FormGroup>
            </div>
          </div>
        )}

        {/* Step 3: Geography & Ops */}
        {step === 3 && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormGroup label="אזור" icon={<MapPin className="w-4 h-4 ml-2 text-blue-500" />}>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value as Region })}
                  className="input-clean"
                >
                  {Object.values(Region).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </FormGroup>

              <FormGroup label="יישוב / מועצה" icon={<Navigation className="w-4 h-4 ml-2 text-slate-500" />}>
                <input
                  type="text"
                  value={formData.municipality}
                  onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                  className="input-clean"
                  placeholder="שם היישוב"
                />
              </FormGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormGroup label="שם חלקה" icon={<ClipboardCheck className="w-4 h-4 ml-2 text-indigo-500" />}>
                <input
                  type="text"
                  value={formData.plotName}
                  onChange={(e) => setFormData({ ...formData, plotName: e.target.value })}
                  className="input-clean"
                  placeholder="מזהה חלקה פנימי"
                />
              </FormGroup>

              <FormGroup label="מיקום GPS" icon={<Navigation className="w-4 h-4 ml-2 text-red-500" />}>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <div className="flex-1 input-clean bg-slate-50 text-slate-500 flex items-center text-xs">
                      {formData.coordinates.lat.toFixed(4)}, {formData.coordinates.lng.toFixed(4)}
                    </div>
                    <button
                      type="button"
                      onClick={handleGetGPS}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-all"
                      title="דקור מיקום נוכחי"
                    >
                      <Navigation className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Manual Map Picker */}
                  <div className="mt-2">
                    <React.Suspense fallback={<div className="h-[300px] bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center text-slate-400">טוען מפה...</div>}>
                      <LocationPicker
                        initialLat={formData.coordinates.lat}
                        initialLng={formData.coordinates.lng}
                        onLocationSelect={(lat, lng) => setFormData(prev => ({
                          ...prev,
                          coordinates: { lat, lng }
                        }))}
                      />
                    </React.Suspense>
                  </div>
                </div>
              </FormGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormGroup label="מעבדה קולטת" icon={<Beaker className="w-4 h-4 ml-2 text-purple-500" />}>
                <select
                  value={formData.lab}
                  onChange={(e) => setFormData({ ...formData, lab: e.target.value })}
                  className="input-clean"
                >
                  <option>תחנת עדן - נדב ניצן</option>
                  <option>בר אילן - יריב בן נעים</option>
                </select>
              </FormGroup>

              <FormGroup label="דחיפות" icon={<AlertTriangle className="w-4 h-4 ml-2 text-orange-500" />}>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="input-clean"
                >
                  <option>רגיל</option>
                  <option>דחוף</option>
                  <option>קריטי</option>
                </select>
              </FormGroup>
            </div>
          </div>
        )}

        {/* Step 4: Pesticide Module */}
        {step === 4 && (
          <div className="space-y-10 animate-fade-in">
            <div className="bg-blue-50 rounded-3xl p-8 border border-blue-100">
              <h4 className="font-black text-blue-800 mb-6 flex items-center">
                <Pill className="w-5 h-5 ml-2" />
                הוספת טיפול בהדברה
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-blue-600 mr-2">שם חומר מוכר</label>
                  <input
                    type="text"
                    value={newPesticide.material}
                    onChange={(e) => setNewPesticide({ ...newPesticide, material: e.target.value })}
                    className="input-clean"
                    placeholder="למשל: סוויץ׳"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-blue-600 mr-2">תאריך יישום</label>
                  <input
                    type="date"
                    value={newPesticide.date}
                    onChange={(e) => setNewPesticide({ ...newPesticide, date: e.target.value })}
                    className="input-clean"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-blue-600 mr-2">מינון (לדונם/ל'...)</label>
                  <input
                    type="text"
                    value={newPesticide.dosage}
                    onChange={(e) => setNewPesticide({ ...newPesticide, dosage: e.target.value })}
                    className="input-clean"
                    placeholder="מינון"
                  />
                </div>
                <div className="self-end">
                  <button
                    type="button"
                    onClick={addPesticide}
                    className="w-full bg-blue-600 text-white font-black py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5 ml-2" />
                    הוסף לרשימה
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-700 px-2">היסטוריית טיפולים שתשמר בדגימה:</h4>
              {formData.pesticideHistory.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-medium">
                  טרם הוזנו טיפולים קודמים
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.pesticideHistory.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-xs text-slate-400 font-bold mb-1">חומר</p>
                          <p className="font-black text-slate-800">{p.material}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold mb-1">תאריך</p>
                          <p className="font-bold text-slate-600">{p.date}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold mb-1">מינון</p>
                          <p className="font-bold text-blue-600">{p.dosage}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePesticide(p.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100">
                <h3 className="font-black text-slate-800 mb-6 flex items-center">
                  <ClipboardCheck className="w-5 h-5 ml-3 text-blue-600" />
                  סיכום נתוני דגימה
                </h3>
                <div className="space-y-4 text-sm">
                  <DetailRow label="דוגם" value={formData.collectorName} />
                  <DetailRow label="טלפון" value={formData.collectorPhone} />
                  <DetailRow label="דוא״ל" value={formData.collectorEmail} />
                  <DetailRow label="גידול" value={`${useCustomCrop ? customCrop : formData.crop} (${formData.variety || 'ללא זן'})`} />
                  <DetailRow label="שיטה" value={formData.cultivationSystem} />
                  <DetailRow label="פתוגן" value={formData.pathogen} />
                  <DetailRow label="אזור" value={`${formData.region}, ${formData.municipality}`} />
                  <DetailRow label="חלקה" value={formData.plotName} />
                  <DetailRow label="מעבדה" value={formData.lab} />
                  <DetailRow label="דחיפות" value={formData.priority} />
                </div>
              </div>

              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-800 mb-6 flex items-center">
                  <Pill className="w-5 h-5 ml-3 text-blue-600" />
                  טיפולים שתועדו ({formData.pesticideHistory.length})
                </h3>
                <div className="space-y-3">
                  {formData.pesticideHistory.slice(0, 3).map(p => (
                    <div key={p.id} className="text-xs flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="font-bold">{p.material}</span>
                      <span className="text-slate-500">{p.date}</span>
                      <span className="text-blue-600 font-bold">{p.dosage}</span>
                    </div>
                  ))}
                  {formData.pesticideHistory.length > 3 && (
                    <p className="text-center text-[10px] text-slate-400 font-bold mt-2">ועוד {formData.pesticideHistory.length - 3} טיפולים...</p>
                  )}
                  {formData.pesticideHistory.length === 0 && (
                    <p className="text-slate-400 text-center py-4 italic">לא תועד שימוש בחומרים</p>
                  )}
                </div>
              </div>
            </div>

            <FormGroup label="הערות שטח נוספות" icon={<FileText className="w-4 h-4 ml-2 text-slate-500" />}>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="תסמינים בולטים, תנאי מזג אוויר וכו׳..."
                rows={3}
                className="input-clean resize-none"
              />
            </FormGroup>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                בלחיצה על 'אישור ושליחה' הנתונים יישמרו במאגר הלאומי ולא ניתן יהיה לשנות את פרטי היסוד של הדגימה ללא אישור מנהל.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-10 border-t border-slate-50">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="btn-secondary px-8 flex items-center"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              <span>חזרה</span>
            </button>
          ) : <div />}

          {step < 5 ? (
            <button
              type="submit"
              className="btn-primary px-8 flex items-center"
            >
              <span>המשך</span>
              <ArrowLeft className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary px-12 py-4 text-lg bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'מעבד נתונים...' : 'אישור ושליחת דגימה'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

const FormGroup = ({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-3">
    <label className="text-sm font-bold text-slate-700 flex items-center pr-1">
      {icon}
      {label}
    </label>
    {children}
  </div>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-slate-100/50 last:border-0">
    <span className="text-slate-500 font-medium">{label}:</span>
    <span className="text-slate-800 font-bold">{value}</span>
  </div>
);
