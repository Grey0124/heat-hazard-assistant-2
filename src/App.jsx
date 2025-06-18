// src/App.jsx - Updated with ChatbotComponent
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import HeatMapPage from './pages/HeatMapPage';
import TipsPage from './pages/TipsPage';
import ReportIssuePage from './pages/ReportIssuePage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuth } from './contexts/AuthContext';
import AdminPanel from './pages/AdminPanel';
import SafeRoutePlanner from './components/map/SafeRoutePlanner';
import ChatbotComponent from './components/chatbot/ChatbotComponent';
import MitigationPlannerPage from './pages/MitigationPlannerPage';
import ARModeEntry from './components/ARModeEntry';
import ARMode from './pages/ar-mode';
import EnhancedARMode from './pages/EnhancedARMode';
import ARErrorBoundary from './components/ARErrorBoundary';
import { ARProvider } from './contexts/ARContext';
import ARTest from './components/ARTest';
import CameraPermissionTest from './components/CameraPermissionTest';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <ARProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/heat-map" element={<HeatMapPage />} />
        <Route path="/tips" element={<TipsPage />} />
        <Route path="/report-issue" element={<ReportIssuePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/safe-route" element={<SafeRoutePlanner />} />
        <Route path="/mitigation-planner" element={<MitigationPlannerPage />} />
        <Route path="/ar-mode" element={<ARModeEntry />} />
        <Route 
          path="/ar-scene" 
          element={
            <ARErrorBoundary>
              <ARMode />
            </ARErrorBoundary>
          } 
        />
        <Route 
          path="/enhanced-ar" 
          element={
            <ARErrorBoundary>
              <EnhancedARMode />
            </ARErrorBoundary>
          } 
        />
        <Route path="/ar-test" element={<ARTest />} />
        <Route path="/camera-test" element={<CameraPermissionTest />} />
      </Routes>
      
      {/* ChatbotComponent will appear on all pages */}
      <ChatbotComponent />
    </ARProvider>
  );
}

export default App;