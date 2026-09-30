import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salesAggregatorAPI, SARequest } from '../api/sales-aggregator.api';

const SARequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<SARequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (id) {
      fetchRequestDetails();
    }
  }, [id]);

  const fetchRequestDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await salesAggregatorAPI.getSARequestDetails(id!);
      setRequest(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch SA request details');
      console.error('Error fetching SA request details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!request || !window.confirm('Are you sure you want to accept this SA request?')) {
      return;
    }

    setActionLoading(true);
    try {
      await salesAggregatorAPI.acceptSARequest(request.id);
      alert('SA request accepted successfully! The aggregator has been moved to current SA list.');
      navigate('/sales-aggregators/requests');
    } catch (err: any) {
      alert(err.message || 'Failed to accept SA request');
      console.error('Error accepting SA request:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClick = () => {
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!request) return;

    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      await salesAggregatorAPI.rejectSARequest(request.id, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
      });
      alert('SA request rejected successfully!');
      setShowRejectModal(false);
      navigate('/sales-aggregators/requests');
    } catch (err: any) {
      alert(err.message || 'Failed to reject SA request');
      console.error('Error rejecting SA request:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDocumentDownload = (url: string, name?: string) => {
    window.open(url, '_blank');
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'SA Request not found'}
          </div>
          <button
            onClick={() => navigate('/sales-aggregators/requests')}
            className="mt-4 text-blue-600 hover:text-blue-900"
          >
            ← Back to requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/sales-aggregators/requests')}
            className="text-blue-600 hover:text-blue-900 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to SA Requests
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{request.businessName}</h1>
              <p className="text-gray-600 mt-2">Sales Aggregator Request Details</p>
            </div>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(request.status)}`}
            >
              {request.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Action Buttons - Only show for pending requests */}
        {request.status === 'pending' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex space-x-4">
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {actionLoading ? 'Processing...' : '✓ Accept Request'}
              </button>
              <button
                onClick={handleRejectClick}
                disabled={actionLoading}
                className="flex-1 bg-red-600 text-white py-3 px-6 rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                ✗ Reject Request
              </button>
            </div>
          </div>
        )}

        {/* Rejection Info */}
        {request.status === 'rejected' && request.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Rejection Reason</h3>
            <p className="text-red-700">{request.rejectionReason}</p>
            {request.approvedBy && (
              <p className="text-sm text-red-600 mt-2">Rejected by: {request.approvedBy}</p>
            )}
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Business Name</dt>
                  <dd className="text-sm text-gray-900 mt-1">{request.businessName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                  <dd className="text-sm text-gray-900 mt-1">{request.contactPerson}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="text-sm text-gray-900 mt-1">{request.phone}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900 mt-1">{request.email || 'N/A'}</dd>
                </div>
              </dl>
            </div>
            <div>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">State</dt>
                  <dd className="text-sm text-gray-900 mt-1">{request.state || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Region</dt>
                  <dd className="text-sm text-gray-900 mt-1">{request.region || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Request Date</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {new Date(request.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {new Date(request.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Notes */}
        {request.notes && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{request.notes}</p>
          </div>
        )}

        {/* Documents */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Documents ({request.documents?.length || 0})
          </h2>
          {request.documents && request.documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {request.documents.map((doc, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <svg
                        className="w-10 h-10 text-blue-600 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 break-words">
                          {doc.name || (doc.type || '').replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{doc.type}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDocumentDownload(doc.url, doc.name)}
                    className="mt-3 w-full text-center text-blue-600 hover:text-blue-900 text-sm font-medium py-2 border border-blue-600 rounded hover:bg-blue-50"
                  >
                    View Document
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No documents available</p>
          )}
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Reject SA Request
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Please provide a reason for rejecting this request. This will be recorded and
                    may be visible to the applicant.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason *
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Incomplete documentation, verification failed, etc."
                    />
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleRejectConfirm}
                    disabled={actionLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectionReason('');
                    }}
                    disabled={actionLoading}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SARequestDetails;
