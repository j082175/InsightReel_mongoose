import React, { useCallback } from 'react';
import { Plus, BarChart3, Filter } from 'lucide-react';
import { SearchBar, ActionBar } from '../shared/components';
import {
  BatchCard,
  BatchForm,
  BatchVideoList,
} from '../features/batch-management';
import { DeleteConfirmationModal } from '../shared/ui';
import { formatDate, formatViews, getDocumentId, isItemSelected } from '../shared/utils';
import {
  useBatchStore,
  CollectionBatch,
} from '../features/batch-management/model/batchStore';
import toast from 'react-hot-toast';

const BatchManagementPage: React.FC = () => {
  // BatchStore 사용
  const batchStore = useBatchStore();

  // 디버깅: batchStore 내용 확인
  React.useEffect(() => {
    console.log('🔍 BatchStore debug:', {
      updateSearchTerm: typeof batchStore.updateSearchTerm,
      updateStatusFilter: typeof batchStore.updateStatusFilter,
      searchTerm: batchStore.searchTerm
    });
  }, [batchStore.updateSearchTerm, batchStore.updateStatusFilter, batchStore.searchTerm]);

  const {
    batches,
    loading,
    error,
    selectedBatches,
    isSelectMode,
    searchTerm,
    statusFilter,
    isFormOpen,
    isVideoListOpen,
    batchVideos,
    videoLoading,
    formData,
    createBatch,
    deleteBatch,
    deleteBatches,
    toggleSelectMode,
    selectBatch,
    deselectBatch,
    selectAllBatches,
    clearSelection,
    updateSearchTerm,
    updateStatusFilter,
    openForm,
    closeForm,
    openVideoList,
    closeVideoList,
    updateFormData,
    resetFormData,
  } = batchStore;

  // Local State
  const [itemToDelete, setItemToDelete] = React.useState<{
    type: 'single' | 'bulk';
    data?: CollectionBatch;
    count?: number;
  } | null>(null);

  // React Query가 자동으로 데이터를 로드하므로 useEffect 불필요

  // Event Handlers
  const handleBatchClick = useCallback(
    (batch: CollectionBatch) => {
      if (isSelectMode) {
        const batchId = getDocumentId(batch);
        if (!batchId) return;

        if (selectedBatches.has(batchId)) {
          deselectBatch(batchId);
        } else {
          selectBatch(batchId);
        }
      } else {
        // 배치 상세 보기 또는 영상 목록 열기
        const batchId = getDocumentId(batch);
      if (!batchId) {
        console.error('❌ 배치 ID가 없습니다:', batch);
        return;
      }
      openVideoList(batchId);
      }
    },
    [isSelectMode, selectedBatches, deselectBatch, selectBatch, openVideoList]
  );

  // 방어적 프로그래밍: batches가 배열인지 확인
  const safeBatches = Array.isArray(batches) ? batches : [];

  const handleSelectToggle = useCallback(
    (batchId: string) => {
      if (selectedBatches.has(batchId)) {
        deselectBatch(batchId);
      } else {
        selectBatch(batchId);
      }
    },
    [selectedBatches, deselectBatch, selectBatch]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedBatches.size === safeBatches.length) {
      clearSelection();
    } else {
      selectAllBatches();
    }
  }, [selectedBatches.size, safeBatches.length, clearSelection, selectAllBatches]);

  const handleBatchDelete = useCallback(
    async (batch: CollectionBatch) => {
      try {
        const batchId = getDocumentId(batch);
      if (!batchId) {
        console.error('❌ 배치 ID가 없습니다:', batch);
        return;
      }
      await deleteBatch(batchId);
        toast.success(`배치 "${batch.name}" 삭제 완료`);
      } catch (error) {
        toast.error(`배치 삭제 실패: ${error}`);
        throw error;
      }
    },
    [deleteBatch]
  );

  const handleDeleteClick = useCallback(
    (item: {
      type: 'single' | 'bulk';
      data?: CollectionBatch;
      count?: number;
    }) => {
      setItemToDelete(item);
    },
    []
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'single' && itemToDelete.data) {
        await handleBatchDelete(itemToDelete.data);
      } else if (itemToDelete.type === 'bulk') {
        const selectedBatchIds = Array.from(selectedBatches);
        await deleteBatches(selectedBatchIds);
        clearSelection();
      }

      toast.success('선택된 배치들이 삭제되었습니다');
      setItemToDelete(null);
    } catch (error) {
      toast.error(`삭제 실패: ${error}`);
    }
  }, [
    itemToDelete,
    handleBatchDelete,
    selectedBatches,
    deleteBatches,
    clearSelection,
  ]);

  const handleCreateBatch = useCallback(
    async (batchData: any) => {
      try {
        await createBatch(batchData);
        toast.success('새 배치가 생성되었습니다');
      } catch (error) {
        toast.error(`배치 생성 실패: ${error}`);
        throw error;
      }
    },
    [createBatch]
  );

  // 배치 편집 핸들러
  const handleEditBatch = useCallback((batch: CollectionBatch) => {
    toast('배치 편집 기능은 개발 중입니다');
    // TODO: 편집 모달 열기 로직 구현
  }, []);

  // 배치 상태 토글 핸들러
  const handleToggleStatus = useCallback(
    (batchId: string, action: 'start' | 'pause') => {
      const actionText = action === 'start' ? '시작' : '일시정지';
      toast(`배치 ${actionText} 기능은 개발 중입니다`);
      // TODO: 배치 시작/일시정지 로직 구현
    },
    []
  );

  // 통계 계산 (방어적 프로그래밍)
  const stats = {
    total: safeBatches.length,
    completed: safeBatches.filter((b) => b?.status === 'completed').length,
    running: safeBatches.filter((b) => b?.status === 'running').length,
    failed: safeBatches.filter((b) => b?.status === 'failed').length,
    totalVideos: safeBatches.reduce((sum, b) => sum + (b?.totalVideosSaved || 0), 0),
  };

  if (loading && safeBatches.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">배치 관리</h1>
              <p className="mt-1 text-sm text-gray-600">
                영상 수집 배치를 관리하고 모니터링하세요
              </p>
            </div>

            {/* 통계 요약 */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total}
                </div>
                <div className="text-xs text-gray-500">총 배치</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </div>
                <div className="text-xs text-gray-500">완료</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.running}
                </div>
                <div className="text-xs text-gray-500">실행중</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatViews(stats.totalVideos)}
                </div>
                <div className="text-xs text-gray-500">수집 영상</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* 검색 및 필터 바 */}
        <div className="flex justify-between items-center mb-6">
          <SearchBar
            searchTerm={searchTerm || ''}
            onSearchTermChange={updateSearchTerm || ((term: string) => console.warn('updateSearchTerm is not defined'))}
            placeholder="배치명, 설명 검색..."
            showFilters={true}
          >
            <select
              value={statusFilter}
              onChange={(e) => updateStatusFilter(e.target.value)}
              className="border-gray-300 rounded-md"
            >
              <option value="all">모든 상태</option>
              <option value="pending">대기중</option>
              <option value="running">실행중</option>
              <option value="completed">완료</option>
              <option value="failed">실패</option>
            </select>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectMode}
                className={`px-3 py-1 text-sm rounded ${
                  isSelectMode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {isSelectMode ? '선택 취소' : '선택 모드'}
              </button>
            </div>
          </SearchBar>

          <button
            onClick={openForm}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />새 배치 생성
          </button>
        </div>

        {/* 결과 정보 */}
        <div className="bg-white rounded-lg shadow mb-4 p-4">
          <div className="text-sm text-gray-500">
            총 {safeBatches.length}개 배치 (키워드: "{searchTerm || '없음'}", 상태:{' '}
            {statusFilter === 'all' ? '전체' : statusFilter})
          </div>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* 배치 목록 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {safeBatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {safeBatches.map((batch) => (
                  <BatchCard
                    key={getDocumentId(batch)}
                    batch={batch}
                    onEdit={handleEditBatch}
                    onDelete={(batchId) =>
                      handleDeleteClick({ type: 'single', data: batch })
                    }
                    onViewVideos={() => openVideoList(batch._id)}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  배치가 없습니다
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  새로운 수집 배치를 생성해보세요.
                </p>
                <div className="mt-6">
                  <button
                    onClick={openForm}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />첫 배치 생성하기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 선택 모드 액션 바 */}
        <ActionBar
          isVisible={isSelectMode}
          selectedCount={selectedBatches.size}
          totalCount={safeBatches.length}
          itemType="개"
          onSelectAll={handleSelectAll}
          onClearSelection={() => {
            toggleSelectMode();
            clearSelection();
          }}
          onDelete={() =>
            handleDeleteClick({ type: 'bulk', count: selectedBatches.size })
          }
        />
      </div>

      {/* 모달들 */}
      <BatchForm
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={handleCreateBatch}
        formData={formData}
        channelGroups={[]}
        channels={[]}
        isSubmitting={loading}
      />

      <BatchVideoList
        isOpen={isVideoListOpen}
        onClose={closeVideoList}
        videos={batchVideos}
        loading={videoLoading}
        batchName={
          batches.find((b) => b._id === batchStore.selectedBatchId)?.name || ''
        }
        batchId={batchStore.selectedBatchId || ''}
        onVideoDelete={(video) => {
          toast(`비디오 삭제: ${video.title}`);
          // 실제 삭제 로직은 여기에 구현
        }}
      />

      <DeleteConfirmationModal
        itemToDelete={itemToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};

export default BatchManagementPage;
