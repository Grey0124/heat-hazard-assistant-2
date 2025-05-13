// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [userReports, setUserReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [preferences, setPreferences] = useState({
    notifyHeatWarnings: true,
    notifyAirQuality: false,
    saveSearchHistory: true,
    shareLocation: true,
    temperatureUnit: 'celsius'
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);

  // Fetch user preferences from Firestore when component mounts
  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!user) return;

      try {
        // Reference to the user's document in the "userPreferences" collection
        const userPrefsRef = doc(db, "userPreferences", user.uid);
        const docSnap = await getDoc(userPrefsRef);

        if (docSnap.exists()) {
          // User preferences found, update state
          const userPrefs = docSnap.data();
          setPreferences(userPrefs);
        } else {
          // No preferences found, create default preferences
          await setDoc(userPrefsRef, preferences);
        }
      } catch (error) {
        console.error("Error fetching user preferences:", error);
      }
    };

    fetchUserPreferences();
  }, [user]);

  useEffect(() => {
    const fetchUserReports = async () => {
      if (!user) return;

      setLoadingReports(true);
      console.log('Fetching reports for user:', user.uid);

      try {
        // Create a query to get reports where userId matches the current user's ID
        const reportsRef = collection(db, "heatHazardReports");

        // VERY IMPORTANT: Log all reports to see what's in the database
        const allReportsQuery = query(reportsRef);
        const allReportsSnapshot = await getDocs(allReportsQuery);
        console.log('All reports in database:', allReportsSnapshot.size);
        allReportsSnapshot.forEach(doc => {
          console.log('Report data:', doc.id, doc.data());
        });

        // Now query for the user's reports
        const q = query(
          reportsRef,
          where("userId", "==", user.uid)
        );

        console.log('Query parameters:', {
          collection: "heatHazardReports",
          field: "userId",
          value: user.uid
        });

        const querySnapshot = await getDocs(q);
        console.log('Query returned results:', querySnapshot.size);

        const reports = [];

        querySnapshot.forEach((doc) => {
          reports.push({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore Timestamp to JavaScript Date for easier handling
            timestamp: doc.data().timestamp?.toDate() || new Date()
          });
        });

        console.log('Processed reports:', reports.length);
        setUserReports(reports);
      } catch (error) {
        console.error("Error fetching user reports:", error);
      } finally {
        setLoadingReports(false);
      }
    };

    fetchUserReports();
  }, [user]);

  // Redirect to home if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) {
    return null; // Don't render anything while redirecting
  }

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Reset success message when changes are made
    setSaveSuccess(false);
  };

  const savePreferences = async () => {
    if (!user) return;

    setSavingPreferences(true);
    try {
      // Save to Firestore
      const userPrefsRef = doc(db, "userPreferences", user.uid);
      await setDoc(userPrefsRef, preferences);

      // Show success message
      setSaveSuccess(true);

      // Hide the success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error saving preferences:", error);
      // You could add error handling UI here
    } finally {
      setSavingPreferences(false);
    }
  };

  // Get label for issue type
  const getIssueTypeLabel = (issueType) => {
    switch (issueType) {
      case 'broken_water':
        return 'Broken Water Fountain';
      case 'no_shade':
        return 'No Shade Available';
      case 'hot_pavement':
        return 'Dangerously Hot Pavement';
      case 'cooling_center':
        return 'Cooling Center Issue';
      default:
        return 'Other Issue';
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Add these new helper functions
  const handleViewDetails = (report) => {
    setSelectedReport(report);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      case 'closed':
        return 'Closed';
      default:
        return 'Pending';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default: // pending
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusDotColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-purple-500';
      case 'resolved':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default: // pending
        return 'bg-yellow-500';
    }
  };

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
          <h1 className="text-3xl font-bold text-black">My Profile</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-amber-600 p-6">
            <div className="flex items-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-amber-500 text-2xl font-bold">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>
              <div className="ml-6">
                <h2 className="text-2xl font-bold text-white">{user.displayName || 'User'}</h2>
                <p className="text-white opacity-90">{user.email}</p>
              </div>
            </div>
          </div>

          {/* <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">Notification Preferences</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="notifyHeatWarnings" className="text-gray-700">
                  Heat warnings & alerts
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="notifyHeatWarnings"
                    name="notifyHeatWarnings"
                    className="sr-only peer"
                    checked={preferences.notifyHeatWarnings}
                    onChange={handlePreferenceChange}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="notifyAirQuality" className="text-gray-700">
                  Air quality alerts
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="notifyAirQuality"
                    name="notifyAirQuality"
                    className="sr-only peer"
                    checked={preferences.notifyAirQuality}
                    onChange={handlePreferenceChange}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <h3 className="text-xl font-semibold mt-8 mb-4">Privacy Settings</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="saveSearchHistory" className="text-gray-700">
                  Save search history
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="saveSearchHistory"
                    name="saveSearchHistory"
                    className="sr-only peer"
                    checked={preferences.saveSearchHistory}
                    onChange={handlePreferenceChange}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="shareLocation" className="text-gray-700">
                  Share location data for better recommendations
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="shareLocation"
                    name="shareLocation"
                    className="sr-only peer"
                    checked={preferences.shareLocation}
                    onChange={handlePreferenceChange}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <h3 className="text-xl font-semibold mt-8 mb-4">Display Preferences</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="temperatureUnit" className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature Unit
                </label>
                <select
                  id="temperatureUnit"
                  name="temperatureUnit"
                  value={preferences.temperatureUnit}
                  onChange={handlePreferenceChange}
                  className="w-full md:w-1/3 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="celsius">Celsius (°C)</option>
                  <option value="fahrenheit">Fahrenheit (°F)</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              {saveSuccess && (
                <div className="w-full bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Preferences saved successfully!</span>
                </div>
              )}

              <button
                onClick={savePreferences}
                disabled={savingPreferences}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
              >
                {savingPreferences ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : 'Save Preferences'}
              </button>

              <button
                onClick={handleSignOut}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-6 rounded-lg flex items-center"
                disabled={loading}
              >
                {loading ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div> */}
        </div>

        {/* My Reports Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">My Reports</h3>

            {/* Status filter */}
            {userReports.length > 0 && (
              <div className="mt-2 sm:mt-0 flex items-center">
                <span className="mr-2 text-sm text-gray-700">Filter by status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Reports</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            )}
          </div>

          {loadingReports ? (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : userReports.length === 0 ? (
            <div className="bg-gray-100 p-4 rounded-lg text-center">
              <p className="text-gray-500">You haven't submitted any heat hazard reports yet.</p>
              <Link
                to="/report-issue"
                className="inline-block mt-3 text-blue-600 hover:text-blue-800 font-medium"
              >
                Submit a Report
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Reported
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {userReports
                    .filter(report => statusFilter === 'all' || report.status === statusFilter)
                    .map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {getIssueTypeLabel(report.issueType)}
                          </div>
                          {report.severity && (
                            <div className="text-sm text-gray-500">
                              Severity: {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-wrap text-sm text-gray-500">
                          {report.location || "Location not specified"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(report.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full border ${getStatusBadgeClass(report.status)}`}>
                            {getStatusLabel(report.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewDetails(report)}
                            className="text-amber-600 hover:text-blue-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Report Details Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-90vh overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-gray-900">Report Details</h3>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Issue Type</p>
                    <p className="mt-1 text-base text-gray-900">{getIssueTypeLabel(selectedReport.issueType)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <div className="mt-1">
                      <span className={`inline-flex px-2.5 py-1 text-sm rounded-full border ${getStatusBadgeClass(selectedReport.status)}`}>
                        {getStatusLabel(selectedReport.status)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Location</p>
                    <p className="mt-1 text-base text-gray-900">{selectedReport.location}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date Reported</p>
                    <p className="mt-1 text-base text-gray-900">{formatDate(selectedReport.timestamp)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Severity</p>
                    <p className="mt-1 text-base text-gray-900 capitalize">{selectedReport.severity}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Contact Email</p>
                    <p className="mt-1 text-base text-gray-900">{selectedReport.contactEmail || "Not provided"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="mt-1 text-base text-gray-900">{selectedReport.description}</p>
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <h4 className="font-medium text-gray-900">Status Updates</h4>
                  {selectedReport.statusUpdates && selectedReport.statusUpdates.length > 0 ? (
                    <div className="mt-2 space-y-3">
                      {selectedReport.statusUpdates.map((update, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-start">
                            <div className={`flex-shrink-0 w-3 h-3 mt-1.5 rounded-full ${getStatusDotColor(update.status)}`}></div>
                            <div className="ml-3">
                              <p className="text-sm font-medium">
                                Status changed to <span className="font-semibold">{getStatusLabel(update.status)}</span>
                              </p>
                              <p className="text-xs text-gray-500">{formatDate(update.timestamp?.toDate())}</p>
                              {update.note && (
                                <p className="mt-1 text-sm text-gray-700">{update.note}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      No status updates yet. We'll notify you when there are changes to your report.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;