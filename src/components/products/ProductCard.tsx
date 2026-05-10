import React from 'react';
import { Product } from '../../types';
import { Button } from '../ui/Button';
import { Edit, Trash2 } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  isVendor?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onRent?: (product: Product) => void;
}

export function ProductCard({ 
  product, 
  isVendor = false,
  onEdit,
  onDelete,
  onRent
}: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img 
        src={Array.isArray(product.images) && product.images.length > 0 
          ? `http://localhost:5000/uploads/products/${product.images[0]}`
          : '/placeholder-image.jpg'} 
        alt={product.title}
        className="w-full h-48 object-cover"
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          img.src = '/placeholder-image.jpg';
        }}
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">{product.title}</h3>
        <p className="mt-1 text-gray-500">{product.description}</p>
        <div className="flex justify-between items-center mt-2">
          <p className="text-lg font-semibold text-indigo-600">
            NPR {product.price}/day
          </p>
          <span className={`px-2 py-1 rounded-full text-sm ${
            product.available 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {product.available ? 'Available' : 'Rented'}
          </span>
        </div>
        
        <div className="mt-4 flex justify-end space-x-2">
          {isVendor ? (
            <>
              <Button
                variant="secondary"
                onClick={() => onEdit?.(product)}
                className="flex items-center"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="secondary"
                onClick={() => onDelete?.(product.id)}
                className="flex items-center text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onRent?.(product)}
              disabled={!product.available}
            >
              Rent Now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}