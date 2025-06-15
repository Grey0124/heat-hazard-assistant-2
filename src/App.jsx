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
    <>
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
      </Routes>
      
      {/* ChatbotComponent will appear on all pages */}
      <ChatbotComponent />
    </>
  );
}

export default App;