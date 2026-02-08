import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { FieldIntake } from './components/FieldIntake';
import { LabDashboard } from './components/LabDashboard';
import { SampleList } from './components/SampleList';
import { BioshieldProvider, useBioshield } from './context/BioshieldContext';
import { LandingPage } from './components/LandingPage';
import { ReportsDashboard } from './components/ReportsDashboard';
import { GuidelinesPage } from './components/GuidelinesPage';
import { AuthProvider } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UsersManagement } from './components/UsersManagement';

// Lazy load Map component
const ManagerDashboard = React.lazy(() =>
  import('./components/ManagerDashboard').then(module => ({ default: module.ManagerDashboard }))
);

function AppRoutes() {
  const {
    samples,
    results,
    addSample,
    updateStatus,
    addResult
  } = useBioshield();

  return (
    <Router>
      <Layout>
        <div className="h-full">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <React.Suspense fallback={
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              }>
                <ManagerDashboard samples={samples} results={results} />
              </React.Suspense>
            } />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/guidelines" element={<GuidelinesPage onBack={() => window.history.back()} />} />

            {/* Sampler Routes */}
            <Route element={<ProtectedRoute requiredRole="sampler" />}>
              <Route path="/add-sample" element={<FieldIntake onSave={addSample} />} />
              <Route path="/sample-list" element={<SampleList samples={samples} />} />
              <Route path="/reports" element={<ReportsDashboard samples={samples} results={results} />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute requiredRole="lab_admin" />}>
              <Route path="/lab-monitor" element={
                <LabDashboard
                  samples={samples}
                  onUpdateStatus={updateStatus}
                  onSaveResult={addResult}
                />
              } />

              <Route path="/users" element={<UsersManagement />} />
            </Route>

            {/* Catch all - Redirect to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </div>
      </Layout>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <BioshieldProvider>
        <AppRoutes />
      </BioshieldProvider>
    </AuthProvider>
  );
}

export default App;
