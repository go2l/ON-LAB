import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, LayerGroup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Sample, ResistanceCategory, SensitivityTest } from '../types';
import { RESISTANCE_COLORS } from '../constants';
import { X, MapPin, Search, Database, AlertCircle, ChevronLeft, ShieldCheck, Trash2 } from 'lucide-react';
import { useBioshield } from '../context/BioshieldContext';
import { useAuth } from '../context/AuthContext';

interface ManagerDashboardProps {
  samples: Sample[];
  results: Record<string, SensitivityTest[]>;
}

// Function to create custom colored icons
const createCustomIcon = (color: string, isSelected: boolean) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div style="
        background-color: ${color};
        width: ${isSelected ? '24px' : '16px'};
        height: ${isSelected ? '24px' : '16px'};
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
        ${isSelected ? 'transform: scale(1.1); box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);' : ''}
      "></div>
    `,
    iconSize: isSelected ? [24, 24] : [16, 16],
    iconAnchor: isSelected ? [12, 12] : [8, 8],
    popupAnchor: [0, -10]
  });
};

// Helper to determine the "worst" resistance categorization from a list of tests
const getWorstResistance = (tests: SensitivityTest[] | undefined): ResistanceCategory | undefined => {
  if (!tests || tests.length === 0) return undefined;

  const priority = [
    ResistanceCategory.R,
    ResistanceCategory.T,
    ResistanceCategory.RS,
    ResistanceCategory.S,
    ResistanceCategory.HS
  ];

  for (const cat of priority) {
    if (tests.some(t => t.category === cat)) return cat;
  }
  return tests[0].category; // Default fallback
};



// ... helper functions ...

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ samples, results }) => {
  const navigate = useNavigate();
  const { selectSample, deleteSample } = useBioshield();
  const { isAdmin } = useAuth(); // Get admin status
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPathogen, setFilterPathogen] = useState('ALL');

  const filteredSamples = samples.filter(s => {
    const matchesSearch = s.internalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.region.includes(searchTerm);
    const matchesPathogen = filterPathogen === 'ALL' || s.pathogen === filterPathogen;
    return matchesSearch && matchesPathogen;
  });

  const totalResistant = Object.values(results).filter(tests =>
    getWorstResistance(tests) === ResistanceCategory.R
  ).length;

  const resistanceRate = samples.length > 0 ? ((totalResistant / samples.length) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      {/* ... Header ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">מרכז בקרה ארצי</h2>
          <p className="text-slate-500 text-sm">ניטור עמידות לפונגצידים - ON-LAB-IL</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center shadow-sm">
              <ShieldCheck className="w-4 h-4 ml-2" />
              ממשק ניהול (Admin)
            </div>
          )}
          <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold flex items-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 animate-pulse"></div>
            מחובר למערכת הניטור
          </div>
        </div>
      </div>

      {/* ... Stats ... */}
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
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm h-[50vh] md:h-[700px] relative z-0 flex flex-col">
          <div className="p-4 md:absolute md:top-6 md:right-6 md:z-[1000] w-full md:w-72 bg-white md:bg-transparent border-b md:border-none border-slate-100 flex flex-col gap-2">

            <select
              value={filterPathogen}
              onChange={(e) => setFilterPathogen(e.target.value)}
              className="w-full bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl py-2 px-4 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans text-sm"
            >
              <option value="ALL">כל הפתוגנים</option>
              {Array.from(new Set(samples.map(s => s.pathogen))).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="חיפוש לפי מזהה או אזור..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 md:bg-white/90 md:backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-sans"
              />
            </div>
          </div>

          <MapContainer
            key={`${samples.length}-${searchTerm}`} // Force re-mount when data changes or on strict mode reload
            center={[31.4, 35.0]}
            zoom={8}
            scrollWheelZoom={true}
            className="w-full h-full z-0"
            style={{ borderRadius: '32px' }}
          >
            <LayersControl position="topleft">
              <LayersControl.BaseLayer checked name="מפה רגילה">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="תצלום אוויר">
                <LayerGroup>
                  <TileLayer
                    attribution='Tiles &copy; Esri &mdash; &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                  />
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  />
                </LayerGroup>
              </LayersControl.BaseLayer>
            </LayersControl>
            {filteredSamples.map((sample) => {
              const sampleTests = results[sample.id];
              const worstResistance = getWorstResistance(sampleTests);
              const color = worstResistance ? RESISTANCE_COLORS[worstResistance] : '#94a3b8';
              const isSelected = selectedSample?.id === sample.id;

              return (
                <Marker
                  key={sample.id}
                  position={[sample.coordinates.lat, sample.coordinates.lng]}
                  icon={createCustomIcon(color, isSelected)}
                  eventHandlers={{
                    click: () => setSelectedSample(sample),
                  }}
                >
                  <Popup className="font-sans">
                    <div className="font-bold text-slate-800">{sample.internalId}</div>
                    <div className="text-xs text-slate-500">{sample.region}</div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {selectedSample && (
            <div className="absolute bottom-6 right-6 left-6 md:left-auto md:w-96 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl animate-fade-in z-[1000] overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1.5" style={{ backgroundColor: results[selectedSample.id] ? RESISTANCE_COLORS[results[selectedSample.id]] : '#cbd5e1' }}></div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="font-black text-xl text-slate-800">{selectedSample.internalId}</h4>
                  <p className="text-sm font-bold text-blue-600">{selectedSample.region}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this sample?')) {
                          deleteSample(selectedSample.id);
                          setSelectedSample(null);
                        }
                      }}
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                      title="מחיקת דגימה"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={() => setSelectedSample(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <DetailRow label="סוג גידול" value={selectedSample.crop} />
                <DetailRow label="פתוגן מטרה" value={selectedSample.pathogen} />
                <DetailRow label="תאריך דגימה" value={new Date(selectedSample.date).toLocaleDateString('he-IL')} />

                <div className="pt-4 border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-500 block mb-2">תוצאות בדיקה:</span>
                  <div className="space-y-2">
                    {results[selectedSample.id] && results[selectedSample.id].length > 0 ? (
                      results[selectedSample.id].map((test, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-black text-slate-700 ml-2">{test.material}</span>
                              <span className="text-xs font-bold text-slate-400">({test.dosage} PPM)</span>
                            </div>
                            <span className="px-3 py-0.5 rounded-full text-xs font-black"
                              style={{
                                backgroundColor: `${RESISTANCE_COLORS[test.category]}20`,
                                color: RESISTANCE_COLORS[test.category],
                                border: `1px solid ${RESISTANCE_COLORS[test.category]}30`
                              }}>
                              {test.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50">
                            <span className="text-[10px] bg-white px-2 py-0.5 rounded border text-slate-500 font-medium">
                              {new Date(test.date || Date.now()).toLocaleDateString('he-IL')}
                            </span>
                            <span className="text-[10px] text-slate-400 flex-1 truncate">
                              ע״י {test.user || 'לא ידוע'}
                            </span>
                          </div>
                          {test.notes && (
                            <p className="text-[10px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-100">
                              "{test.notes}"
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400 text-sm">טרם הוזנו תוצאות</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (selectedSample) {
                    selectSample(selectedSample.id);
                    navigate('/sample-list');
                  }
                }}
                className="w-full bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center text-sm border border-slate-100">
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
            <h3 className="font-black text-xl mb-4 relative z-10">הנחיות</h3>
            <p className="text-sm text-blue-50 leading-relaxed mb-6 relative z-10 opacity-90">
              לצפייה בנהלי דגימה ומדריכי התחברות לממשקי המעבדה.
            </p>
            <button
              onClick={() => navigate('/guidelines')}
              className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-2xl w-full transition-all text-sm backdrop-blur-md border border-white/20 relative z-10">
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
