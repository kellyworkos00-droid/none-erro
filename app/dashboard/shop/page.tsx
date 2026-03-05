'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, MessageCircle, ShoppingCart, Plus, Edit, Eye } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  description: string;
  category: string;
  quantity: number;
  imageUrl?: string;
  status: string;
}

export default function DashboardShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalValue: 0,
    lowStock: 0,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products?limit=50');
      if (res.ok) {
        const data = await res.json();
        const items = data.data?.items || [];
        setProducts(items);
        
        // Calculate stats
        const active = items.filter((p: Product) => p.status === 'ACTIVE').length;
        const value = items.reduce((sum: number, p: Product) => sum + (p.price * p.quantity), 0);
        const lowStock = items.filter((p: Product) => p.quantity < 10).length;
        
        setStats({
          totalProducts: items.length,
          activeProducts: active,
          totalValue: value,
          lowStock: lowStock,
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppOrder = (product: Product) => {
    const message = encodeURIComponent(
      `Hi! I would like to order:\n\nProduct: ${product.name}\nSKU: ${product.sku}\nPrice: KES ${product.price.toLocaleString()}\n\nPlease confirm availability.`
    );
    window.open(`https://wa.me/254700000000?text=${message}`, '_blank');
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Shop Management</h1>
          <p className="text-gray-600 mt-1">Manage products and WhatsApp orders</p>
        </div>
        <Link
          href="/dashboard/products"
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Products</p>
              <p className="text-3xl font-bold mt-2">{stats.totalProducts}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm font-medium">Active Products</p>
              <p className="text-3xl font-bold mt-2">{stats.activeProducts}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Value</p>
              <p className="text-3xl font-bold mt-2">KES {stats.totalValue.toLocaleString()}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-orange-100 text-sm font-medium">Low Stock Items</p>
              <p className="text-3xl font-bold mt-2">{stats.lowStock}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <input
          type="text"
          placeholder="Search products by name, SKU, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Products Grid */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Products Catalog</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 animate-pulse">
                <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                <div className="bg-gray-200 h-6 rounded mb-2"></div>
                <div className="bg-gray-200 h-4 rounded mb-4"></div>
                <div className="bg-gray-200 h-10 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No products found</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your search or add new products</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
              >
                <div className="relative h-48 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {product.status}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-lg mb-2 text-gray-800 truncate">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                  {product.description || 'No description'}
                </p>
                
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xl font-bold text-green-600">
                    KES {product.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    Stock: {product.quantity}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleWhatsAppOrder(product)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                    disabled={product.quantity === 0}
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/dashboard/products/${product.id}/edit`}
                    className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center justify-center"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
