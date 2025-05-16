// src/pages/TipsPage.jsx - Improved UI
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

const TipsPage = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('hydration');

  const heatSafetyTips = [
    {
      category: 'hydration',
      icon: (
        <svg className="w-6 h-6 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C12 2 7 9 7 13a5 5 0 0010 0c0-4-5-11-5-11z" />
        </svg>
      ),
      tips: [
        'Drink plenty of water, even if you don\'t feel thirsty',
        'Avoid alcohol and caffeine, which can contribute to dehydration',
        'Carry a reusable water bottle when going outdoors',
        'Consider electrolyte-enhanced drinks during prolonged outdoor activities'
      ]
    },
    {
      category: 'clothing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l4-2 2 2h4l2-2 4 2v4l-2 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V10L4 8V4z" />
        </svg>
      ),
      tips: [
        'Wear lightweight, light-colored, loose-fitting clothing',
        'Choose breathable fabrics like cotton or specially designed cooling fabrics',
        'Wear a wide-brimmed hat to protect your face and neck',
        'Use sunglasses with UV protection'
      ]
    },
    {
      category: 'activityPlanning',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      tips: [
        'Schedule outdoor activities during cooler hours (early morning or evening)',
        'Take frequent breaks in shaded or air-conditioned areas',
        'Pace yourself and reduce exercise intensity in hot weather',
        'Use the buddy system when exercising in extreme heat'
      ]
    },
    {
      category: 'sunProtection',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      tips: [
        'Apply broad-spectrum sunscreen with at least SPF 30 regularly',
        'Seek shade whenever possible, especially during peak sun hours (10am-4pm)',
        'Use umbrellas or canopies when shade isn\'t available',
        'Remember that UV rays can penetrate clouds, so protection is needed even on overcast days'
      ]
    },
    {
      category: 'homeSafety',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      tips: [
        'Use fans and air conditioning to keep your home cool',
        'Close blinds or curtains during the hottest part of the day',
        'Take cool showers or baths to lower body temperature',
        'Never leave children or pets in parked vehicles, even with windows cracked'
      ]
    }
  ];

  const heatIllnessSigns = [
    {
      condition: 'Heat Cramps',
      symptoms: 'Muscle pain or spasms, usually in the abdomen, arms, or legs',
      treatment: 'Stop activity, move to a cool place, drink water or a sports drink, wait for cramps to subside before resuming activity',
      severity: 'low',
      icon: '🔶'
    },
    {
      condition: 'Heat Exhaustion',
      symptoms: 'Heavy sweating, cold/pale/clammy skin, fast/weak pulse, nausea, muscle cramps, tiredness, weakness, dizziness, headache, fainting',
      treatment: 'Move to a cool place, loosen clothing, apply cool wet cloths to body or take a cool bath, sip water. Seek medical attention if symptoms worsen or last longer than 1 hour',
      severity: 'medium',
      icon: '⚠️'
    },
    {
      condition: 'Heat Stroke',
      symptoms: 'High body temperature (above 103°F), hot/red/dry/damp skin, fast/strong pulse, headache, dizziness, nausea, confusion, losing consciousness',
      treatment: 'Call 108 immediately. Move person to a cooler place, help lower temperature with cool cloths or a cool bath. Do NOT give the person anything to drink',
      severity: 'high',
      icon: '🚨'
    }
  ];

  // Local emergency contacts for Bangalore
  const emergencyContacts = [
    { name: 'Ambulance', number: '108', icon: '🚑' },
    { name: 'Fire', number: '101', icon: '🚒' },
    { name: 'Police', number: '100', icon: '👮' },
    { name: 'Disaster Management', number: '112', icon: '🆘' },
    { name: 'BBMP Control Room', number: '080-22660000', icon: '🏢' }
  ];

  // Additional resources with local Bangalore options
  const resources = [
    {
      name: 'National Disaster Management Authority',
      url: 'https://ndma.gov.in/Natural-Hazards/Heat-Wave/Dos-Donts'
    },
    {
      name: 'Karnataka State Natural Disaster Monitoring Centre',
      url: 'https://www.ksndmc.org/'
    },
    {
      name: 'Red Cross Heat Wave Safety',
      url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/heat-wave-safety.html'
    }
  ];

  return (
    <div className="min-h-screen bg-amber-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify mb-6">
          <Link
            to="/"
            className=" text-black font-semibold py-2 px-4 flex items-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-navy-900">{t('tips.title')}</h1>
        </div>

        {/* Introduction */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg shadow-md p-6 mb-8 text-white">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="bg-white rounded-lg p-4 hidden md:block">
              <div className="w-10 h-10 flex items-center justify-center text-orange-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-3">{t('tips.title')}</h2>
              <p className="text-lg">
                {t('tips.intro')}
              </p>
              {/* <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/heat-map"
                  className="bg-white text-orange-600 hover:bg-gray-100 font-semibold py-2 px-4 rounded-full inline-block transition duration-300 text-sm"
                >
                  {t('home.cta.checkHeatMap')}
                </Link>
                <Link
                  to="/safe-route"
                  className="bg-orange-600 text-white hover:bg-orange-700 font-semibold py-2 px-4 rounded-full inline-block border border-white transition duration-300 text-sm"
                >
                  {t('home.cta.findRoutes')}
                </Link>
              </div> */}
            </div>
          </div>
        </div>

        {/* Prevention Tips Categories */}
        <h2 className="text-2xl font-semibold text-navy-900 mb-4">{t('tips.preventionTitle')}</h2>

        {/* Category Selector */}
        <div className="flex overflow-x-auto pb-2 mb-6 gap-2">
          {heatSafetyTips.map((section) => (
            <button
              key={section.category}
              onClick={() => setActiveCategory(section.category)}
              className={`flex items-center rounded-full py-2 px-4 transition-colors whitespace-nowrap ${activeCategory === section.category
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-orange-100'
                }`}
            >
              <span className="mr-2">{section.icon}</span>
              <span>{t(`tips.categories.${section.category}`)}</span>
            </button>
          ))}
        </div>

        {/* Tips Content */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
          {/* Tips List */}
          <div className="md:col-span-3 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-orange-500 py-3 px-4">
              <h3 className="text-white font-semibold text-lg flex items-center">
                {heatSafetyTips.find(s => s.category === activeCategory)?.icon}
                <span className="ml-2">{t(`tips.categories.${activeCategory}`)}</span>
              </h3>
            </div>
            <div className="p-4">
              <ul className="space-y-3">
                {heatSafetyTips
                  .find(section => section.category === activeCategory)
                  ?.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className="flex items-start p-3 bg-amber-50 rounded-lg">
                      <span className="text-orange-500 mr-2 text-2xl font-bold">•</span>
                      <span className="mt-1.5">{tip}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          {/* Bangalore-specific Tips */}
          <div className="md:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-500 py-3 px-4">
              <h3 className="text-white font-semibold text-lg">Bangalore-Specific</h3>
            </div>
            <div className="p-4">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Local Weather Patterns</h4>
                <p className="text-gray-700 text-sm">Bangalore typically experiences dry heat during March-May followed by monsoon season. Morning and evening temperatures can vary significantly.</p>
              </div>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Hydration Tips</h4>
                <p className="text-gray-700 text-sm">Keep coconut water, buttermilk (majjige), and fresh lime water (nimbu pani) as good options for traditional heat-beating drinks.</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Local Cooling Spots</h4>
                <p className="text-gray-700 text-sm">Cubbon Park, Lalbagh Gardens, and Ulsoor Lake are excellent cooling spots in the city. Shopping malls also offer air-conditioned environments for relief.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Heat Illness Recognition */}
        <h2 className="text-2xl font-semibold text-navy-900 mb-4">{t('tips.recognizingTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {heatIllnessSigns.map((illness, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg shadow-md overflow-hidden border-t-4 ${illness.severity === 'high'
                ? 'border-red-500'
                : illness.severity === 'medium'
                  ? 'border-orange-500'
                  : 'border-yellow-500'
                }`}
            >
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-2">{illness.icon}</span>
                  <h3 className={`font-semibold text-lg ${illness.severity === 'high'
                    ? 'text-red-700'
                    : illness.severity === 'medium'
                      ? 'text-orange-700'
                      : 'text-yellow-700'
                    }`}>
                    {illness.condition}
                  </h3>
                </div>

                <div className="mb-3">
                  <h4 className="font-medium text-gray-700 mb-1">{t('tips.heatIllness.symptoms')}</h4>
                  <p className="text-gray-600 text-sm">{illness.symptoms}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-1">{t('tips.heatIllness.whatToDo')}</h4>
                  <p className="text-gray-600 text-sm">{illness.treatment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Emergency Contacts Section */}
        <div className="bg-red-50 rounded-lg shadow-md p-6 mb-10 border border-red-200">
          <h2 className="text-2xl font-semibold text-red-800 mb-4">Emergency Contacts</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {emergencyContacts.map((contact, index) => (
              <div key={index} className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="text-3xl mb-2">{contact.icon}</div>
                <p className="font-medium">{contact.name}</p>
                <p className="text-red-600 font-bold">{contact.number}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Resources */}
        <h2 className="text-2xl font-semibold text-navy-900 mb-4">{t('tips.resourcesTitle')}</h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="mb-4">{t('tips.resourcesIntro')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resources.map((resource, index) => (
              <a
                key={index}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg flex items-center transition-colors"
              >
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-blue-700">{resource.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TipsPage;