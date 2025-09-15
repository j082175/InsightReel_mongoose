import React, { useState } from 'react';

const UseFilterTestPage: React.FC = () => {
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    inStock: false
  });

  const sampleProducts = [
    { id: 1, name: 'Laptop', category: 'Electronics', price: 1000, inStock: true },
    { id: 2, name: 'Book', category: 'Education', price: 20, inStock: false },
    { id: 3, name: 'Phone', category: 'Electronics', price: 800, inStock: true },
    { id: 4, name: 'Desk', category: 'Furniture', price: 300, inStock: true }
  ];

  const filteredProducts = sampleProducts.filter(product => {
    if (filters.category && product.category !== filters.category) return false;
    if (filters.minPrice && product.price < parseInt(filters.minPrice)) return false;
    if (filters.maxPrice && product.price > parseInt(filters.maxPrice)) return false;
    if (filters.inStock && !product.inStock) return false;
    return true;
  });

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ category: '', minPrice: '', maxPrice: '', inStock: false });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">🔽 useFilter Hook Test</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded border">
            <h2 className="text-lg font-semibold mb-4">필터 설정</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">카테고리</label>
                <select
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">전체</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Education">Education</option>
                  <option value="Furniture">Furniture</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">최소 가격</label>
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => updateFilter('minPrice', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">최대 가격</label>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => updateFilter('maxPrice', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={(e) => updateFilter('inStock', e.target.checked)}
                  className="mr-2"
                />
                재고 있는 상품만
              </label>

              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded"
              >
                필터 초기화
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded border">
            <h2 className="text-lg font-semibold mb-4">
              필터된 결과 ({filteredProducts.length}개)
            </h2>
            <div className="space-y-3">
              {filteredProducts.map(product => (
                <div key={product.id} className="p-3 bg-gray-50 rounded">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-600">
                    {product.category} • ${product.price} •
                    {product.inStock ? ' 재고 있음' : ' 재고 없음'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseFilterTestPage;