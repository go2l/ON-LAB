import React, { useState } from 'react';
import { Sample, ResistanceCategory } from '../types';
import { RESISTANCE_COLORS } from '../constants';
import { X, MapPin, Search, Database, AlertCircle, Info, ChevronLeft } from 'lucide-react';

interface ManagerDashboardProps {
  samples: Sample[];
  results: Record<string, ResistanceCategory>;
}

const MAP_BOUNDS = {
  north: 33.5,
  south: 29.3,
  west: 33.7,
  east: 36.3
};

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ samples, results }) => {
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSamples = samples.filter(s =>
    s.internalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.region.includes(searchTerm)
  );

  const totalResistant = Object.values(results).filter(r => r === ResistanceCategory.R).length;
  const resistanceRate = samples.length > 0 ? ((totalResistant / samples.length) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">מרכז בקרה ארצי</h2>
          <p className="text-slate-500 text-sm">ניטור עמידות לפונגצידים - ON-LAB-IL</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold flex items-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 animate-pulse"></div>
            מחובר למערכת הניטור
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          label="סה״כ דגימות במערכת"
          value={samples.length}
          icon={<Database className="w-5 h-5 text-blue-600" />}
        />
        <StatsCard
          label="דגימות עם עמידות"
          value={totalResistant}
          icon={<AlertCircle className="w-5 h-5 text-red-500" />}
          subValue={`${resistanceRate}% מכלל הדגימות`}
        />
        <StatsCard
          label="אזורי פעילות"
          value={Array.from(new Set(samples.map(s => s.region))).length}
          icon={<MapPin className="w-5 h-5 text-green-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Map Container */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm h-[700px] relative">
          <div className="absolute top-6 right-6 z-10 w-72">
            <div className="relative">
              <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="חיפוש לפי מזהה או אזור..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          <div className="relative w-full h-full bg-[#f8fbfe] flex justify-center items-center">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Israel_location_map.svg/852px-Israel_location_map.svg.png"
              alt="Israel Map"
              className="h-[120%] w-auto opacity-40 brightness-[1.05] contrast-[0.95]"
            />

            {filteredSamples.map((sample) => {
              const latPct = (MAP_BOUNDS.north - sample.coordinates.lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south) * 100;
              const lngPct = (sample.coordinates.lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west) * 100;
              const resistance = results[sample.id];
              const color = resistance ? RESISTANCE_COLORS[resistance] : '#94a3b8';

              return (
                <div
                  key={sample.id}
                  onClick={() => setSelectedSample(sample)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
                  style={{ top: `${latPct}%`, left: `${lngPct}%` }}
                >
                  <div
                    className={`rounded-full border-2 border-white transition-all shadow-md ${selectedSample?.id === sample.id ? 'w-7 h-7 ring-4 ring-blue-600/20 scale-110 translate-y-[-2px]' : 'w-4 h-4 group-hover:scale-125'}`}
                    style={{ backgroundColor: color }}
                  />
                  {!selectedSample && (
                    <div className="absolute top-full right-1/2 transform translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-3 py-1.5 rounded-lg shadow-xl text-[10px] whitespace-nowrap font-bold z-30">
                      {sample.internalId}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedSample && (
            <div className="absolute bottom-6 right-6 left-6 md:left-auto md:w-96 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl animate-fade-in z-30 overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1.5" style={{ backgroundColor: results[selectedSample.id] ? RESISTANCE_COLORS[results[selectedSample.id]] : '#cbd5e1' }}></div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="font-black text-xl text-slate-800">{selectedSample.internalId}</h4>
                  <p className="text-sm font-bold text-blue-600">{selectedSample.region}</p>
                </div>
                <button onClick={() => setSelectedSample(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <DetailRow label="סוג גידול" value={selectedSample.crop} />
                <DetailRow label="פתוגן מטרה" value={selectedSample.pathogen} />
                <DetailRow label="תאריך דגימה" value={new Date(selectedSample.date).toLocaleDateString('he-IL')} />

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-500">סטטוס עמידות:</span>
                  <span className="px-4 py-1.5 rounded-full text-xs font-black shadow-sm" style={{ backgroundColor: `${results[selectedSample.id] ? RESISTANCE_COLORS[results[selectedSample.id]] : '#f1f5f9'}20`, color: results[selectedSample.id] ? RESISTANCE_COLORS[results[selectedSample.id]] : '#64748b', border: `1px solid ${results[selectedSample.id] ? RESISTANCE_COLORS[results[selectedSample.id]] : '#cbd5e1'}30` }}>
                    {results[selectedSample.id] || 'בבחינת מעבדה'}
                  </span>
                </div>
              </div>

              <button className="w-full bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center text-sm border border-slate-100">
                צפייה בדו״ח מפורט
                <ChevronLeft className="mr-2 w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Legend / Info Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
            <h3 className="font-extrabold text-lg text-slate-800 mb-6 flex items-center">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full ml-3"></div>
              מקרא רמות עמידות
            </h3>
            <div className="space-y-4">
              {Object.entries(RESISTANCE_COLORS).map(([cat, color]) => (
                <div key={cat} className="flex items-center group cursor-default">
                  <div className="w-4 h-4 rounded-full ml-4 shadow-sm transition-transform group-hover:scale-125" style={{ backgroundColor: color }} />
                  <div className="flex flex-col">
                    <span className="text-slate-700 font-bold text-sm leading-none mb-1">{cat}</span>
                    <span className="text-[10px] text-slate-400 font-medium">לפי תקן ניטור 2026</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center pt-4 border-t border-slate-50">
                <div className="w-4 h-4 rounded-full ml-4 bg-slate-400" />
                <span className="text-slate-600 font-bold text-sm">בתהליך בדיקה</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] p-8 text-white shadow-lg shadow-blue-100 relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
            <h3 className="font-black text-xl mb-4 relative z-10">הנחיות ומסמכים</h3>
            <p className="text-sm text-blue-50 leading-relaxed mb-6 relative z-10 opacity-90">
              לצפייה בנהלי דגימה, מדריכי התחברות לממשקי המעבדה ועדכוני אבטחה של פורטל איגוד המידע.
            </p>
            <button className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-2xl w-full transition-all text-sm backdrop-blur-md border border-white/20 relative z-10">
              מרכז הידע וההנחיות
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatsCard = ({ label, value, icon, subValue }: any) => (
  <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm flex justify-between items-center group hover:border-blue-200 transition-all">
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-4xl font-black text-slate-800">{value}</h3>
        {subValue && <p className="text-[11px] font-bold text-blue-500">{subValue}</p>}
      </div>
    </div>
    <div className="p-4 bg-slate-50 group-hover:bg-blue-50 rounded-2xl transition-colors">
      {icon}
    </div>
  </div>
);

const DetailRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-slate-500 font-medium">{label}:</span>
    <span className="text-slate-800 font-extrabold">{value}</span>
  </div>
);
