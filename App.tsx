import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { FieldIntake } from './components/FieldIntake';
import { ManagerDashboard } from './components/ManagerDashboard';
import { LabDashboard } from './components/LabDashboard';
import { SampleList } from './components/SampleList';

import { BioshieldProvider, useBioshield } from './context/BioshieldContext';

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
        {activeView === 'map' && (
          <ManagerDashboard
            samples={samples}
            results={results}
          />
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

        {(activeView === 'users' || activeView === 'reports') && (
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
