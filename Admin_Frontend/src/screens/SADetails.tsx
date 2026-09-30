import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salesAggregatorAPI, SalesAggregator } from '../api/sales-aggregator.api';

const SADetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sa, setSA] = useState<SalesAggregator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'documents'>('overview');
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: 'active' | 'blocked') => {
    if (!sa) return;
    const confirmMessage = newStatus === 'blocked'
      ? 'Are you sure you want to ban this sales aggregator?'
      : 'Are you sure you want to unban this sales aggregator?';
      
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setUpdating(true);
    try {
      const updatedSA = await salesAggregatorAPI.updateSAStatus(sa.uid, newStatus);
      setSA(updatedSA);
      alert(`Sales aggregator successfully ${newStatus === 'blocked' ? 'banned' : 'unbanned'}.`);
    } catch (err: any) {
      alert(err.message || 'Failed to update sales aggregator status');
      console.error('Error updating SA status:', err);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    const fetchSADetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await salesAggregatorAPI.getSADetails(id!);
        setSA(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch SA details');
        console.error('Error fetching SA details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSADetails();
    }
  }, [id]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDocumentDownload = (url: string, _name?: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !sa) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'Sales Aggregator not found'}
          </div>
          <button
            onClick={() => navigate('/sales-aggregators/current')}
            className="mt-4 text-blue-600 hover:text-blue-900"
          >
            ← Back to list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => navigate('/sales-aggregators/current')}
              className="text-blue-600 hover:text-blue-900 mb-4 flex items-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Sales Aggregators
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{sa.businessName || sa.name}</h1>
            <p className="text-gray-600 mt-2">Detailed information about this sales aggregator</p>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 md:mt-0 flex space-x-3">
            {sa.status === 'blocked' ? (
              <button
                onClick={() => handleStatusChange('active')}
                disabled={updating}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-sm transition-colors text-sm"
              >
                {updating ? 'Unbanning...' : 'Unban Aggregator'}
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange('blocked')}
                disabled={updating}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-sm transition-colors text-sm"
              >
                {updating ? 'Banning...' : 'Ban Aggregator'}
              </button>
            )}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Total Customers</div>
            <div className="text-3xl font-bold text-gray-900">{sa.totalCustomers || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Total Bookings</div>
            <div className="text-3xl font-bold text-gray-900">{sa.totalBookings || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
            <div className="text-3xl font-bold text-gray-900">
              ₹{(sa.totalRevenue || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Commission Earned</div>
            <div className="text-3xl font-bold text-green-600">
              ₹{(sa.commissionEarned || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'customers'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Customers ({sa.customers?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'documents'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Documents ({sa.documents?.length || 0})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Contact Information
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                      <dd className="text-sm text-gray-900">{sa.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="text-sm text-gray-900">{sa.phone || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="text-sm text-gray-900">{sa.email || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd>
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(sa.status)}`}
                        >
                          {sa.status}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Verified</dt>
                      <dd className="text-sm text-gray-900">
                        {sa.isVerified ? (
                          <span className="text-green-600">✓ Verified</span>
                        ) : (
                          <span className="text-red-600">✗ Not Verified</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Business Information
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Business Name</dt>
                      <dd className="text-sm text-gray-900">{sa.businessName || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">State</dt>
                      <dd className="text-sm text-gray-900">{sa.state || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Operating Regions</dt>
                      <dd className="text-sm text-gray-900">
                        {sa.regions?.length > 0 ? sa.regions.join(', ') : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(sa.createdAt).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(sa.updatedAt).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Managed Customers</h3>
                {sa.customers && sa.customers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Contact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Bookings
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sa.customers.map((customer) => (
                          <tr key={customer.uid}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {customer.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {customer.occupation || 'Farmer'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{customer.phone || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{customer.email || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{customer.state || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{customer.region || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(customer.status)}`}
                              >
                                {customer.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {customer.totalBookings || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ₹{(customer.totalRevenue || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No customers found</p>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
                {sa.documents && sa.documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sa.documents.map((doc, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <svg
                              className="w-10 h-10 text-blue-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {doc.name || (doc.type || '').replace(/_/g, ' ').toUpperCase()}
                              </p>
                              <p className="text-xs text-gray-500">{doc.type}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDocumentDownload(doc.url, doc.name)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No documents available</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SADetails;
