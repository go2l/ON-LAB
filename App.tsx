import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { FieldIntake } from './components/FieldIntake';
import { LabDashboard } from './components/LabDashboard';
import { SampleList } from './components/SampleList';

// Lazy load Map component to avoid Leaflet SSR/Init issues crashing the app
const ManagerDashboard = React.lazy(() =>
  import('./components/ManagerDashboard').then(module => ({ default: module.ManagerDashboard }))
);

import { BioshieldProvider, useBioshield } from './context/BioshieldContext';

import { LandingPage } from './components/LandingPage';
import { ReportsDashboard } from './components/ReportsDashboard';
import { GuidelinesPage } from './components/GuidelinesPage';

function AppContent() {
  const {
    activeView,
    setView,
    samples,
    results,
    addSample,
    updateStatus,
    addResult
  } = useBioshield();

  return (
    <Layout
      activeView={activeView}
      onViewChange={setView}
    >
      <div className="h-full">
        {activeView === 'landing' && (
          <LandingPage onEnter={() => setView('map')} />
        )}

        {activeView === 'guidelines' && (
          <GuidelinesPage onBack={() => setView('map')} />
        )}

        {activeView === 'map' && (
          <React.Suspense fallback={
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          }>
            <ManagerDashboard
              samples={samples}
              results={results}
            />
          </React.Suspense>
        )}

        {activeView === 'add' && (
          <FieldIntake onSave={addSample} />
        )}

        {activeView === 'lab' && (
          <LabDashboard
            samples={samples}
            onUpdateStatus={updateStatus}
            onSaveResult={addResult}
          />
        )}

        {activeView === 'list' && (
          <SampleList samples={samples} />
        )}

        {activeView === 'reports' && (
          <ReportsDashboard samples={samples} results={results} />
        )}

        {activeView === 'users' && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-slate-200">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-slate-800">בפיתוח...</h3>
            <p className="text-slate-500">מודול זה יהיה זמין בעדכון המערכת הבא של ON-LAB-IL.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function App() {
  return (
    <BioshieldProvider>
      <AppContent />
    </BioshieldProvider>
  );
}

export default App;
