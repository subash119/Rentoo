import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ReviewSection from '../reviews/ReviewSection';
import ChatButton from '../chat/ChatButton';

// Base64 placeholder image (light gray square)
const PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAAN0lEQVR4nO3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgx1lAABqFDyOQAAAABJRU5ErkJggg==';

interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  dailyRate: number;
  images: string[];
  location: string;
  condition: string;
  availability: boolean;
  vendor: {
    _id: string;
    name: string;
    email: string;
  };
  contactDetails: {
    phone: string;
    email: string;
    preferredMethod: 'phone' | 'email' | 'both';
  };
}

const API_URL = 'http://localhost:5000';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/products/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Product not found');
          }
          throw new Error('Failed to load product');
        }
        const data = await response.json();
        setProduct(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const calculateTotalPrice = (start: Date, end: Date, dailyRate: number) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays * dailyRate;
  };

  const handleRentalRequest = async () => {
    if (!user || !localStorage.getItem('token')) {
      navigate('/login');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (endDate < startDate) {
      setError('End date must be after start date');
      return;
    }

    if (!product?.availability) {
      setError('This product is not available for rent');
      return;
    }

    if (userRole !== 'customer') {
      setError('Only customers can make rental requests');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/v1/rental-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalPrice: calculateTotalPrice(startDate, endDate, product?.dailyRate || 0),
          message: 'Rental request from customer'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          navigate('/login');
          throw new Error('Please login to submit a rental request');
        }
        throw new Error(errorData.message || 'Failed to submit rental request');
      }

      const data = await response.json();
      setSuccessMessage('Rental request submitted successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Rental request error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user is the vendor of this product
  const isVendor = product?.vendor._id === user?._id;
  // Check if user can rent (must be customer and not the vendor)
  const canRent = userRole === 'customer' && !isVendor && product?.availability;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        {error}
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center text-gray-600 p-4">
        Product not found
      </div>
    );
  }

  const totalDays = startDate && endDate
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const totalPrice = totalDays * product.dailyRate;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Product Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-w-16 aspect-h-9">
            <img
              src={getImageUrl(product.images?.[0])}
              alt={product.name}
              className="rounded-lg object-cover w-full h-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== PLACEHOLDER_IMAGE) {
                  console.log('Failed to load image:', target.src);
                  target.src = PLACEHOLDER_IMAGE;
                  target.onerror = null;
                }
              }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {product.images.slice(1).map((image, index) => (
              <img
                key={index}
                src={getImageUrl(image)}
                alt={`${product.name} - ${index + 2}`}
                className="rounded-lg object-cover w-full h-24"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== PLACEHOLDER_IMAGE) {
                    console.log('Failed to load image:', target.src);
                    target.src = PLACEHOLDER_IMAGE;
                    target.onerror = null;
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <div className="flex items-center justify-between mt-2">
              <p className="text-2xl font-bold text-gray-900">
                NPR {product.dailyRate}/day
              </p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                product.availability 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {product.availability ? 'Available' : 'Not Available'}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            <p className="text-gray-700">{product.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Category</h3>
              <p className="text-gray-600">{product.category}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Condition</h3>
              <p className="text-gray-600">{product.condition}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Location</h3>
              <p className="text-gray-600">{product.location}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Vendor</h3>
              <p className="text-gray-600">{product.vendor.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left Column - Vendor Info */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Vendor Information</h2>
            <div className="space-y-3">
              <p><span className="font-medium">Name:</span> {product.vendor.name}</p>
              <p><span className="font-medium">Contact:</span> {product.contactDetails.preferredMethod === 'both' 
                ? `${product.contactDetails.phone} / ${product.contactDetails.email}`
                : product.contactDetails.preferredMethod === 'phone'
                  ? product.contactDetails.phone
                  : product.contactDetails.email
              }</p>
              <p><span className="font-medium">Preferred Contact Method:</span> {
                product.contactDetails.preferredMethod === 'both' ? 'Email or Phone' :
                product.contactDetails.preferredMethod === 'phone' ? 'Phone Only' : 'Email Only'
              }</p>
              {user && user.id !== product.vendor._id && (
                <div className="mt-4 pt-3 border-t">
                  <ChatButton otherUserId={product.vendor._id} otherUserName={product.vendor.name} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Rental Form */}
        <div className="lg:col-span-2">
          {canRent ? (
            <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">Make a Rental Request</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <DatePicker
                    selected={startDate}
                    onChange={(date: Date) => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    minDate={new Date()}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date: Date) => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate || new Date()}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {startDate && endDate && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Total Days:</span>
                    <span className="font-medium">{totalDays}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-700">Total Price:</span>
                    <span className="font-medium">NPR {totalPrice}</span>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <button
                  onClick={handleRentalRequest}
                  disabled={isSubmitting || !startDate || !endDate}
                  className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Rental Request'}
                </button>
              </div>

              {successMessage && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                  {successMessage}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg">
              {!user ? (
                <p className="text-gray-700">Please <button onClick={() => navigate('/login')} className="text-primary-600 hover:text-primary-700">login</button> to make a rental request.</p>
              ) : !product.availability ? (
                <p className="text-gray-700">This product is currently not available for rent.</p>
              ) : (
                <p className="text-gray-700">You cannot rent your own product.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section - At the bottom */}
      <div className="mt-12">
        <ReviewSection productId={product._id} />
      </div>
    </div>
  );
};

export default ProductDetail;