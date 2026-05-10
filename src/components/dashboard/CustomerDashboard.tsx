import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000';

// Base64 placeholder image (light gray square)
const PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAAN0lEQVR4nO3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgx1lAABqFDyOQAAAABJRU5ErkJggg==';

interface RentalRequest {
  _id: string;
  product?: {
    _id: string;
    name: string;
    description: string;
    images: string[];
    vendor?: {
      name: string;
      email: string;
    };
  };
  productDeleted?: boolean;
  productSnapshot?: {
    name: string;
    description: string;
    category: string;
    dailyRate: number;
  };
  vendor?: {
    name: string;
    email: string;
  };
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  message?: string;
  createdAt: string;
}

const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchRentalRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found, redirecting to login');
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_URL}/api/v1/rental-requests/customer`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 401) {
          console.log('Token expired or invalid, redirecting to login');
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          navigate('/login');
          return;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch rental requests: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
        }

        const data = await response.json();
        // Log the first request's product data for debugging
        if (data.length > 0) {
          console.log('First rental request:', {
            id: data[0]._id,
            product: data[0].product ? {
              id: data[0].product._id,
              name: data[0].product.name,
              images: data[0].product.images
            } : 'No product',
            status: data[0].status
          });
        }
        setRentalRequests(data);
      } catch (err) {
        console.error('Error fetching rental requests:', err);
        setError(err instanceof Error ? err.message : 'Failed to load rental requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRentalRequests();
  }, [navigate]);

  const handleCancelRequest = async (requestId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/rental-requests/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to cancel rental request');
      }

      // Refresh the rental requests list
      fetchRentalRequests();
    } catch (error) {
      console.error('Error cancelling rental request:', error);
      setError('Failed to cancel rental request');
    }
  };

  const handleDeleteRental = async (rentalId: string) => {
    if (!window.confirm('Are you sure you want to delete this rental history?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/rental-requests/${rentalId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete rental history');
      }

      // Remove the deleted rental from state
      setRentalRequests(prev => prev.filter(rental => rental._id !== rentalId));
      
      // Show success message
      setSuccessMessage('Rental history deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting rental:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete rental history');
    }
  };

  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return PLACEHOLDER_IMAGE;
    // If it's already a full URL or data URL, return as is
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    
    // If the path already starts with /uploads, prepend only the API_URL
    if (imagePath.startsWith('/uploads')) {
      return `${API_URL}${imagePath}`;
    }
    
    // Otherwise, construct the full path
    return `${API_URL}/uploads/products/${imagePath}`;
  };

  const getStatusBadgeColor = (status: RentalRequest['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status];
  };

  // Filter rental requests based on search query
  const filteredRequests = rentalRequests.filter(request => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (request.product?.name || '').toLowerCase().includes(searchLower) ||
      (request.vendor?.name || '').toLowerCase().includes(searchLower) ||
      request.status.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">My Rental Requests</h1>
        
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg 
              className="h-5 w-5 text-gray-400" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredRequests.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <li key={request._id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  {/* Product and Vendor Info */}
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-16 h-16">
                      {request.product ? (
                        <img
                          src={getImageUrl(request.product.images?.[0])}
                          alt={request.product.name || 'Product Image'}
                          className="w-16 h-16 object-cover rounded-md bg-gray-100"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== PLACEHOLDER_IMAGE) {
                              target.src = PLACEHOLDER_IMAGE;
                              target.onerror = null;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                          <span className="text-gray-400 text-sm">No Image</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {request.product?.name || request.productSnapshot?.name || 'Product Unavailable'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {request.vendor?.name || request.product?.vendor?.name || 'Vendor no longer available'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(request.status)}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                    <div className="ml-4">
                      {(request.status === 'completed' || request.status === 'rejected' || request.status === 'cancelled') && (
                        <button
                          onClick={() => handleDeleteRental(request._id)}
                          className="px-3 py-1 bg-red-50 text-red-700 rounded-md text-sm font-medium hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Delete History
                        </button>
                      )}
                      {request.status === 'pending' && (
                        <button
                          onClick={() => handleCancelRequest(request._id)}
                          className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rental Details */}
                <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium text-gray-900">Rental Period</span>
                    <p>{new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Total Price</span>
                    <p>${request.totalPrice}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Status</span>
                    <p className="capitalize">{request.status}</p>
                  </div>
                </div>

                {request.message && (
                  <div className="mt-4">
                    <span className="font-medium text-gray-900">Message</span>
                    <p className="mt-1 text-sm text-gray-500">{request.message}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-5 text-center text-gray-500 sm:px-6">
            {searchQuery ? 'No matching rental requests found.' : "You haven't made any rental requests yet."}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;