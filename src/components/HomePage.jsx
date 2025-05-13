// src/components/HomePage.jsx - Updated with translations
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { AuthModal } from './auth/AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

// Import any assets needed for the home page
import HeatSafetyIllustration from '../assets/heat-safety-illustration.svg';

const HomePage = () => {
  const { user, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const { t } = useTranslation();

  const openAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await signOut();
      // No need to navigate since we're already on the home page
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-8 md:pt-16 pb-12 relative">
        {/* Background Sun SVG (top right) */}
        <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 text-amber-300 opacity-90 -z-10">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 7a5 5 0 100 10 5 5 0 000-10z"></path>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
          </svg>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="z-10">
            <h1 className="text-4xl ml-4 md:text-5xl font-bold text-black leading-tight mb-4">
              {t('home.hero.title')}
            </h1>
            <p className="text-xl ml-4  text-black mb-8">
              {t('home.hero.subtitle')}
            </p>
            <div className="flex ml-4 flex-col sm:flex-row gap-4">
              {user && (
                <Link to="heat-map" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-8 rounded-full inline-block transition duration-300">
                  {t('home.hero.checkHeatIndex')}
                </Link>
              )}


              {!user ? (
                <button
                  onClick={openAuthModal}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold py-3 px-8 rounded-full inline-block border border-gray-300 transition duration-300"
                >
                  {t('home.hero.signIn')}
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/profile"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-8 rounded-full inline-block transition duration-300"
                  >
                    {t('home.hero.myProfile')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={logoutLoading}
                    className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 px-8 rounded-full inline-block border border-red-200 transition duration-300"
                  >
                    {logoutLoading ? t('auth.signIn.signingIn') : t('home.hero.signOut')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* This div will contain the city illustration - we'll replace with actual illustration */}
          <div className="relative hidden md:block">
            <div className="bg-amber-100/50 rounded-lg p-4">
              {/* Placeholder for the illustration - in a real implementation, we'd use an actual SVG/image */}
              <div className="w-full h-96 flex items-center justify-center">
                <img
                  src={HeatSafetyIllustration || '/placeholder-illustration.svg'}
                  alt="Person experiencing heat in a city environment"
                  className="max-h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-black mb-10">{t('home.features.title')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-amber-50 rounded-lg p-6 shadow-md">
              <div className="bg-amber-500 text-white w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">{t('home.features.realTimeAlerts.title')}</h3>
              <p className="text-gray-700">
                {t('home.features.realTimeAlerts.description')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-amber-50 rounded-lg p-6 shadow-md">
              <div className="bg-amber-500 text-white w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">{t('home.features.safeRoutes.title')}</h3>
              <p className="text-gray-700">
                {t('home.features.safeRoutes.description')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-amber-50 rounded-lg p-6 shadow-md">
              <div className="bg-amber-500 text-white w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">{t('home.features.communityReporting.title')}</h3>
              <p className="text-gray-700">
                {t('home.features.communityReporting.description')}
              </p>
            </div>

            {/* Feature 4 - AI Recommendations */}
            <div className="bg-amber-50 rounded-lg p-6 shadow-md">
              <div className="bg-amber-500 text-white w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">{t('home.features.aiTips.title')}</h3>
              <p className="text-gray-700">
                {t('home.features.aiTips.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">{t('home.cta.title')}</h2>
          <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
            {t('home.cta.description')}
          </p>
          {user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/heat-map"
                className="bg-white text-amber-600 hover:bg-gray-200 font-semibold py-3 px-8 rounded-full inline-block transition duration-300"
              >
                {t('home.cta.checkHeatMap')}
              </Link>
              <Link
                to="/safe-route"
                className="bg-amber-500 text-white hover:bg-amber-600 font-semibold py-3 px-8 rounded-full inline-block border border-white transition duration-300"
              >
                {t('home.cta.findRoutes')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
    </div>
  );
};

export default HomePage;