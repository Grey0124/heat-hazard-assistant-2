// src/pages/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, getDocs, doc, updateDoc, orderBy, Timestamp, arrayUnion } from 'firebase/firestore';

const AdminPanel = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [updateStatus, setUpdateStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // List of admin user IDs
  // In a real app, you'd store admin roles in Firebase or use Firebase Auth custom claims
  const adminUsers = ['Oj3QLfeLw2TRKVMhIfvSUDrOohc2']; // Replace with actual admin user IDs

  // Check if current user is an admin
  const isAdmin = user && adminUsers.includes(user.uid);

  useEffect(() => {
    const fetchReports = async () => {
      if (!isAdmin) return;

      setLoading(true);
      try {
        const reportsRef = collection(db, "heatHazardReports");
        const q = query(reportsRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        const fetchedReports = [];
        querySnapshot.forEach((doc) => {
          fetchedReports.push({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date()
          });
        });

        setReports(fetchedReports);
      } catch (err) {
        console.error("Error fetching reports:", err);
        setError("Failed to load reports. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user, isAdmin]);

  const handleUpdateStatus = async () => {
    if (!selectedReport || !updateStatus) return;

    setUpdatingStatus(true);
    try {
      const reportRef = doc(db, "heatHazardReports", selectedReport.id);

      // Create status update object
      const statusUpdate = {
        status: updateStatus,
        timestamp: Timestamp.now(),
        updatedBy: user.uid,
        updaterName: user.displayName || user.email
      };

      // Add note if provided
      if (statusNote.trim()) {
        statusUpdate.note = statusNote.trim();
      }

      // Update the document
      await updateDoc(reportRef, {
        status: updateStatus,
        statusUpdates: arrayUnion(statusUpdate),
        lastUpdated: Timestamp.now()
      });

      // Update local state
      setReports(prev => prev.map(report => {
        if (report.id === selectedReport.id) {
          return {
            ...report,
            status: updateStatus,
            statusUpdates: [...(report.statusUpdates || []), statusUpdate],
            lastUpdated: new Date()
          };
        }
        return report;
      }));

      // Update selected report
      setSelectedReport(prev => ({
        ...prev,
        status: updateStatus,
        statusUpdates: [...(prev.statusUpdates || []), {
          ...statusUpdate,
          timestamp: new Date()
        }],
        lastUpdated: new Date()
      }));

      // Reset form
      setStatusNote("");

    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update status. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter reports based on current filters
  const filteredReports = reports.filter(report => {
    return (statusFilter === 'all' || report.status === statusFilter) &&
      (typeFilter === 'all' || report.issueType === typeFilter);
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-amber-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Access Restricted</p>
            <p>You do not have permission to access the admin panel.</p>
          </div>
          <Link
            to="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg inline-block"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-navy-900">Admin Panel</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Heat Hazard Reports</h2>

          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Type
              </label>
              <select
                id="typeFilter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="broken_water">Broken Water Fountain</option>
                <option value="no_shade">No Shade Available</option>
                <option value="hot_pavement">Dangerously Hot Pavement</option>
                <option value="cooling_center">Cooling Center Issue</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-gray-100 p-4 rounded-lg text-center">
              <p className="text-gray-500">No reports found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reported By
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
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.id.substring(0, 8)}...
                      </td>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.userName || "Anonymous"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(report.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusBadgeClass(report.status)}`}>
                          {getStatusLabel(report.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Report Management Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-90vh overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-gray-900">Manage Report</h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Report Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Report Details</h4>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Report ID</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedReport.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Issue Type</p>
                      <p className="mt-1 text-sm text-gray-900">{getIssueTypeLabel(selectedReport.issueType)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Severity</p>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{selectedReport.severity}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Description</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedReport.description}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Location</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedReport.location}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Reported By</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedReport.userName || "Anonymous"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact Email</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedReport.contactEmail || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date Reported</p>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(selectedReport.timestamp)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Current Status</p>
                      <div className="mt-1">
                        <span className={`inline-flex px-2.5 py-1 text-xs rounded-full border ${getStatusBadgeClass(selectedReport.status)}`}>
                          {getStatusLabel(selectedReport.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Management */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Update Status</h4>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="updateStatus" className="block text-sm font-medium text-gray-700 mb-1">
                        New Status
                      </label>
                      <select
                        id="updateStatus"
                        value={updateStatus}
                        onChange={(e) => setUpdateStatus(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a status</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="statusNote" className="block text-sm font-medium text-gray-700 mb-1">
                        Status Note (optional)
                      </label>
                      <textarea
                        id="statusNote"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        rows="3"
                        placeholder="Add details about this status change"
                        className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      ></textarea>
                    </div>

                    <button
                      onClick={handleUpdateStatus}
                      disabled={!updateStatus || updatingStatus}
                      className={`w-full ${updateStatus ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'} text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center`}
                    >
                      {updatingStatus ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating Status...
                        </>
                      ) : (
                        'Update Status'
                      )}
                    </button>
                  </div>

                  {/* Status History */}
                  <div className="mt-8">
                    <h4 className="font-semibold text-gray-900 mb-4">Status History</h4>

                    {selectedReport.statusUpdates && selectedReport.statusUpdates.length > 0 ? (
                      <div className="space-y-3">
                        {selectedReport.statusUpdates.map((update, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-start">
                              <div className={`flex-shrink-0 w-3 h-3 mt-1.5 rounded-full ${getStatusBadgeClass(update.status).replace('bg-', '').replace('text-', 'bg-').split(' ')[0]}`}></div>
                              <div className="ml-3">
                                <p className="text-sm font-medium">
                                  Status changed to <span className="font-semibold">{getStatusLabel(update.status)}</span>
                                </p>
                                <p className="text-xs text-gray-500">
                                  {update.timestamp?.toDate
                                    ? formatDate(update.timestamp.toDate())
                                    : formatDate(update.timestamp)
                                  } by {update.updaterName || 'Administrator'}
                                </p>
                                {update.note && (
                                  <p className="mt-1 text-sm text-gray-700">{update.note}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No status updates yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;