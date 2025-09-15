import React, { useState } from 'react';

const UseSelectionTestPage: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];

  const toggleSelection = (item: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(item)) {
      newSelection.delete(item);
    } else {
      newSelection.add(item);
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => setSelectedItems(new Set(items));
  const clearAll = () => setSelectedItems(new Set());

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">☑️ useSelection Hook Test</h1>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded border">
            <h2 className="text-lg font-semibold mb-4">선택 컨트롤</h2>
            <div className="flex gap-4 mb-4">
              <button onClick={selectAll} className="px-4 py-2 bg-blue-500 text-white rounded">
                전체 선택
              </button>
              <button onClick={clearAll} className="px-4 py-2 bg-gray-500 text-white rounded">
                선택 해제
              </button>
            </div>
            <p>선택된 항목: {selectedItems.size}/{items.length}</p>
          </div>

          <div className="bg-white p-6 rounded border">
            <h2 className="text-lg font-semibold mb-4">항목 목록</h2>
            <div className="space-y-2">
              {items.map((item) => (
                <label key={item} className="flex items-center p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item)}
                    onChange={() => toggleSelection(item)}
                    className="mr-3"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseSelectionTestPage;