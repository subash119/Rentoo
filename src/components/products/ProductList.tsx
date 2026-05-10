import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  dailyRate: number;
  images: string[];
  location: string;
  condition: string;
  vendor: {
    name: string;
    email: string;
  };
}

interface ProductListProps {
  vendorView?: boolean;
  searchQuery?: string;
}

const ProductList: React.FC<ProductListProps> = ({ vendorView = false, searchQuery = '' }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const url = vendorView
          ? 'http://localhost:5000/api/vendor/products'
          : 'http://localhost:5000/api/products';
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };

        if (vendorView) {
          headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
        }

        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [vendorView]);

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredProducts.length === 0 ? (
        <div className="col-span-full text-center text-gray-600 p-4">
          {searchQuery ? 'No matching products found.' : 'No products available.'}
        </div>
      ) : (
        filteredProducts.map((product) => (
          <div
            key={product._id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <div className="relative pb-[56.25%]">
              <img
                src={product.images[0] || '/placeholder-image.jpg'}
                alt={product.name}
                className="absolute h-full w-full object-cover"
              />
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{product.category}</p>
                  <span className="text-indigo-600 font-bold">NPR {product.dailyRate}/day</span>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {product.category}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {product.condition}
                </span>
              </div>
              
              <div className="text-sm text-gray-500 mb-4">
                <div>Location: {product.location}</div>
                {!vendorView && (
                  <div>Vendor: {product.vendor.name}</div>
                )}
              </div>

              <Link
                to={`/products/${product._id}`}
                className="block w-full text-center py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-300"
              >
                {vendorView ? 'Edit Listing' : 'View Details'}
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ProductList; 