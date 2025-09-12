import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Filter,
  Search,
  Eye,
  Settings
} from 'lucide-react';
import VideoCard from '../components/VideoCard';
import { formatDate } from '../utils/formatters';

interface CollectionBatch {
  _id: string;
  name: string;
  description?: string;
  collectionType: 'group' | 'channels';
  targetGroups?: Array<{_id: string, name: string, color: string}>;
  targetChannels?: string[];
  criteria: {
    daysBack: number;
    minViews: number;
    maxViews?: number;
    includeShorts: boolean;
    includeMidform: boolean;
    includeLongForm: boolean;
    keywords?: string[];
    excludeKeywords?: string[];
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  totalVideosFound: number;
  totalVideosSaved: number;
  failedChannels?: Array<{channelName: string, error: string}>;
  quotaUsed: number;
  stats?: {
    byPlatform: {
      YOUTUBE: number;
      INSTAGRAM: number;
      TIKTOK: number;
    };
    byDuration: {
      SHORT: number;
      MID: number;
      LONG: number;
    };
    avgViews: number;
    totalViews: number;
  };
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  durationMinutes?: number;
  successRate?: number;
}

interface TrendingVideo {
  _id: string;
  videoId: string;
  title: string;
  url: string;
  platform: string;
  channelName: string;
  channelId: string;
  views: number;
  likes: number;
  uploadDate: string;
  duration: string;
  thumbnailUrl?: string;
  collectionDate: string;
}

interface BatchFormData {
  name: string;
  description: string;
  collectionType: 'group' | 'channels';
  targetGroups: string[];
  targetChannels: string[];
  criteria: {
    daysBack: number;
    minViews: number;
    maxViews: string;
    includeShorts: boolean;
    includeMidform: boolean;
    includeLongForm: boolean;
    keywords: string[];
    excludeKeywords: string[];
  };
}

const BatchManagementPage: React.FC = () => {
  const [batches, setBatches] = useState<CollectionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<CollectionBatch | null>(null);
  const [channelGroups, setChannelGroups] = useState<Array<{_id: string, name: string, color: string}>>([]);
  
  // 영상 모달 관련 상태
  const [showVideosModal, setShowVideosModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<CollectionBatch | null>(null);
  const [batchVideos, setBatchVideos] = useState<TrendingVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);

  // 필터 상태
  const [filters, setFilters] = useState({
    status: '',
    collectionType: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });

  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
    hasMore: false
  });

  const [formData, setFormData] = useState<BatchFormData>({
    name: '',
    description: '',
    collectionType: 'group',
    targetGroups: [],
    targetChannels: [],
    criteria: {
      daysBack: 3,
      minViews: 30000,
      maxViews: '',
      includeShorts: true,
      includeMidform: true,
      includeLongForm: true,
      keywords: [],
      excludeKeywords: []
    }
  });

  useEffect(() => {
    fetchChannelGroups();
    fetchBatches();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [filters, pagination.offset]);

  const fetchChannelGroups = async () => {
    try {
      const response = await fetch('/api/channel-groups?active=true');
      const result = await response.json();
      if (result.success) {
        setChannelGroups(result.data);
      }
    } catch (error) {
      console.error('채널 그룹 조회 실패:', error);
    }
  };

  const fetchBatches = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim()) {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/batches?${params}`);
      const result = await response.json();

      if (result.success) {
        setBatches(result.data);
        setPagination(prev => ({
          ...prev,
          total: result.pagination.total,
          hasMore: result.pagination.hasMore
        }));
      } else {
        setError('배치 목록 조회에 실패했습니다.');
      }
    } catch (error) {
      setError('서버 연결에 실패했습니다.');
      console.error('배치 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    try {
      const batchData = {
        ...formData,
        criteria: {
          ...formData.criteria,
          maxViews: formData.criteria.maxViews ? parseInt(formData.criteria.maxViews) : undefined
        }
      };

      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData)
      });

      const result = await response.json();
      if (result.success) {
        setShowCreateModal(false);
        resetForm();
        fetchBatches();
      } else {
        setError(result.message || '배치 생성에 실패했습니다.');
      }
    } catch (error) {
      setError('서버 연결에 실패했습니다.');
      console.error('배치 생성 실패:', error);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('정말로 이 배치를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        fetchBatches();
      } else {
        setError(result.message || '배치 삭제에 실패했습니다.');
      }
    } catch (error) {
      setError('서버 연결에 실패했습니다.');
      console.error('배치 삭제 실패:', error);
    }
  };

  const handleViewBatchVideos = async (batch: CollectionBatch) => {
    setSelectedBatch(batch);
    setShowVideosModal(true);
    setVideosLoading(true);

    try {
      const response = await fetch(`/api/batches/${batch._id}/videos?limit=100`);
      const result = await response.json();
      
      if (result.success) {
        setBatchVideos(result.data);
      } else {
        setError(result.message || '영상 목록 조회에 실패했습니다.');
      }
    } catch (error) {
      setError('서버 연결에 실패했습니다.');
      console.error('영상 목록 조회 실패:', error);
    } finally {
      setVideosLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      collectionType: 'group',
      targetGroups: [],
      targetChannels: [],
      criteria: {
        daysBack: 3,
        minViews: 30000,
        maxViews: '',
        includeShorts: true,
        includeMidform: true,
        includeLongForm: true,
        keywords: [],
        excludeKeywords: []
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'running': return <Play className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'running': return '실행중';
      case 'completed': return '완료';
      case 'failed': return '실패';
      default: return status;
    }
  };


  const addKeyword = (type: 'keywords' | 'excludeKeywords') => {
    const input = prompt(`${type === 'keywords' ? '포함' : '제외'} 키워드를 입력하세요:`);
    if (input && input.trim()) {
      setFormData(prev => ({
        ...prev,
        criteria: {
          ...prev.criteria,
          [type]: [...prev.criteria[type], input.trim()]
        }
      }));
    }
  };

  const removeKeyword = (type: 'keywords' | 'excludeKeywords', index: number) => {
    setFormData(prev => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        [type]: prev.criteria[type].filter((_, i) => i !== index)
      }
    }));
  };

  if (loading && batches.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-800">수집 배치 관리</h1>
          </div>
          <p className="text-gray-600">
            트렌딩 영상 수집 작업을 배치로 관리합니다
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          새 배치 생성
        </button>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Search className="w-4 h-4 inline mr-1" />
              검색
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="배치명 검색..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="pending">대기중</option>
              <option value="running">실행중</option>
              <option value="completed">완료</option>
              <option value="failed">실패</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">수집 타입</label>
            <select
              value={filters.collectionType}
              onChange={(e) => setFilters(prev => ({ ...prev, collectionType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="group">그룹별</option>
              <option value="channels">채널별</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* 배치 목록 */}
      <div className="space-y-4">
        {batches.map((batch) => (
          <div 
            key={batch._id} 
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => batch.status === 'completed' && handleViewBatchVideos(batch)}
            title={batch.status === 'completed' ? '클릭하여 수집된 영상 보기' : ''}
          >
            <div className="p-6">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(batch.status)}
                  <div>
                    <h3 className="font-medium text-gray-900">{batch.name}</h3>
                    <p className="text-sm text-gray-500">{batch.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    batch.status === 'completed' ? 'bg-green-100 text-green-800' :
                    batch.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    batch.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getStatusLabel(batch.status)}
                  </span>
                  
                  {batch.status !== 'running' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBatch(batch);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        title="수정"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBatch(batch._id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 상세 정보 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-500">수집 타입</div>
                  <div className="font-medium">
                    {batch.collectionType === 'group' ? '그룹별' : '채널별'}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">대상</div>
                  <div className="font-medium">
                    {batch.targetGroups ? 
                      `${batch.targetGroups.length}개 그룹` : 
                      `${batch.targetChannels?.length || 0}개 채널`
                    }
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">수집 조건</div>
                  <div className="font-medium text-sm">
                    {batch.criteria.daysBack}일, {batch.criteria.minViews.toLocaleString()}+ 조회수
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">생성일</div>
                  <div className="font-medium text-sm">
                    {formatDate(batch.createdAt)}
                  </div>
                </div>
              </div>

              {/* 결과 통계 (완료된 경우) */}
              {batch.status === 'completed' && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">발견 영상</div>
                      <div className="font-medium text-lg">
                        {(batch.totalVideosFound || 0).toLocaleString()}개
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">저장 영상</div>
                      <div className="font-medium text-lg text-blue-600">
                        {(batch.totalVideosSaved || 0).toLocaleString()}개
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">성공률</div>
                      <div className="font-medium text-lg text-green-600">
                        {(() => {
                          if (batch.totalVideosFound && batch.totalVideosFound > 0) {
                            return Math.round((batch.totalVideosSaved / batch.totalVideosFound) * 100);
                          }
                          return batch.totalVideosSaved > 0 ? 100 : 0;
                        })()}%
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">소요 시간</div>
                      <div className="font-medium text-lg">
                        {(() => {
                          if (batch.startedAt && batch.completedAt) {
                            const duration = Math.round((new Date(batch.completedAt).getTime() - new Date(batch.startedAt).getTime()) / (1000 * 60));
                            return Math.max(duration, 1);
                          }
                          return 0;
                        })()}분
                      </div>
                    </div>
                  </div>

                  {/* 플랫폼별/길이별 통계 */}
                  {batch.stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">플랫폼별</div>
                        <div className="space-y-1">
                          {batch.stats.byPlatform && Object.entries(batch.stats.byPlatform)
                            .filter(([_, count]) => count > 0)
                            .map(([platform, count]) => (
                            <div key={platform} className="flex justify-between text-sm">
                              <span>{platform}</span>
                              <span className="font-medium">{count}개</span>
                            </div>
                          ))}
                          {(!batch.stats.byPlatform || Object.values(batch.stats.byPlatform).every(v => v === 0)) && (
                            <div className="text-sm text-gray-400">데이터 없음</div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">길이별</div>
                        <div className="space-y-1">
                          {batch.stats.byDuration && Object.entries(batch.stats.byDuration)
                            .filter(([_, count]) => count > 0)
                            .map(([duration, count]) => (
                            <div key={duration} className="flex justify-between text-sm">
                              <span>
                                {duration === 'SHORT' ? '숏폼 (≤60초)' : 
                                 duration === 'MID' ? '미드폼 (61-180초)' : 
                                 '롱폼 (>180초)'}
                              </span>
                              <span className="font-medium">{count}개</span>
                            </div>
                          ))}
                          {(!batch.stats.byDuration || Object.values(batch.stats.byDuration).every(v => v === 0)) && (
                            <div className="text-sm text-gray-400">데이터 없음</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 조회수 통계 추가 */}
                  {batch.stats && (batch.stats.avgViews > 0 || batch.stats.totalViews > 0) && (
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                      <div className="text-center">
                        <div className="text-sm text-gray-500">평균 조회수</div>
                        <div className="font-medium text-lg text-orange-600">
                          {(batch.stats.avgViews || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-500">총 조회수</div>
                        <div className="font-medium text-lg text-purple-600">
                          {(batch.stats.totalViews || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 에러 정보 (실패한 경우) */}
              {batch.status === 'failed' && batch.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="text-red-800 text-sm">
                    <strong>오류:</strong> {batch.errorMessage}
                  </div>
                </div>
              )}

              {/* 대상 그룹/채널 표시 */}
              <div className="flex flex-wrap gap-2">
                {batch.targetGroups?.map(group => (
                  <span 
                    key={group._id} 
                    className="px-2 py-1 text-xs rounded-full text-white"
                    style={{ backgroundColor: group.color }}
                  >
                    {group.name}
                  </span>
                ))}
                {batch.targetChannels?.slice(0, 5).map((channel, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                    {channel}
                  </span>
                ))}
                {batch.targetChannels && batch.targetChannels.length > 5 && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                    +{batch.targetChannels.length - 5}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 빈 결과 */}
      {!loading && batches.length === 0 && !error && (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-500 mb-2">생성된 배치가 없습니다</p>
          <p className="text-gray-400">새 배치를 생성하여 트렌딩 영상 수집을 시작하세요.</p>
        </div>
      )}

      {/* 페이지네이션 */}
      {batches.length > 0 && (
        <div className="flex items-center justify-between mt-8 p-4 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">
            {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} / {pagination.total}개 표시
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
              disabled={pagination.offset === 0}
              className="px-3 py-2 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              이전
            </button>
            
            <span className="px-3 py-2 text-sm">
              {Math.floor(pagination.offset / pagination.limit) + 1} / {Math.ceil(pagination.total / pagination.limit)}
            </span>
            
            <button
              onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
              disabled={!pagination.hasMore}
              className="px-3 py-2 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* 배치 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">새 수집 배치 생성</h2>
                <button
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* 기본 정보 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">배치명</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="배치명을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="배치 설명을 입력하세요"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 수집 타입 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">수집 타입</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="collectionType"
                        value="group"
                        checked={formData.collectionType === 'group'}
                        onChange={(e) => setFormData(prev => ({ ...prev, collectionType: 'group' }))}
                        className="mr-2"
                      />
                      그룹별 수집
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="collectionType"
                        value="channels"
                        checked={formData.collectionType === 'channels'}
                        onChange={(e) => setFormData(prev => ({ ...prev, collectionType: 'channels' }))}
                        className="mr-2"
                      />
                      개별 채널
                    </label>
                  </div>
                </div>

                {/* 대상 선택 */}
                {formData.collectionType === 'group' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">대상 그룹</label>
                    <div className="grid grid-cols-2 gap-2">
                      {channelGroups.map(group => (
                        <label key={group._id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.targetGroups.includes(group._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  targetGroups: [...prev.targetGroups, group._id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  targetGroups: prev.targetGroups.filter(id => id !== group._id)
                                }));
                              }
                            }}
                            className="mr-2"
                          />
                          <span 
                            className="inline-block w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: group.color }}
                          ></span>
                          {group.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">채널명</label>
                    <textarea
                      value={formData.targetChannels.join('\n')}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        targetChannels: e.target.value.split('\n').filter(line => line.trim())
                      }))}
                      placeholder="채널명을 한 줄씩 입력하세요"
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* 수집 조건 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">수집 조건</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        최근 며칠
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={formData.criteria.daysBack}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          criteria: { ...prev.criteria, daysBack: parseInt(e.target.value) || 3 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Eye className="w-4 h-4 inline mr-1" />
                        최소 조회수
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.criteria.minViews}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          criteria: { ...prev.criteria, minViews: parseInt(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">최대 조회수 (선택)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.criteria.maxViews}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          criteria: { ...prev.criteria, maxViews: e.target.value }
                        }))}
                        placeholder="제한 없음"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* 포함 영상 타입 */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">포함할 영상 타입</label>
                    <div className="flex gap-6">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.criteria.includeShorts}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            criteria: { ...prev.criteria, includeShorts: e.target.checked }
                          }))}
                          className="mr-2"
                        />
                        숏폼 (≤60초)
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.criteria.includeMidform !== undefined ? formData.criteria.includeMidform : true}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            criteria: { ...prev.criteria, includeMidform: e.target.checked }
                          }))}
                          className="mr-2"
                        />
                        미드폼 (61-180초)
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.criteria.includeLongForm}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            criteria: { ...prev.criteria, includeLongForm: e.target.checked }
                          }))}
                          className="mr-2"
                        />
                        롱폼 (&gt;180초)
                      </label>
                    </div>
                  </div>

                  {/* 키워드 필터 */}
                  <div className="mt-4">
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700">포함 키워드</label>
                      <button
                        type="button"
                        onClick={() => addKeyword('keywords')}
                        className="text-blue-500 text-sm hover:text-blue-700"
                      >
                        + 키워드 추가
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.criteria.keywords.map((keyword, index) => (
                        <span key={index} className="bg-green-100 text-green-800 px-2 py-1 text-sm rounded-full flex items-center gap-1">
                          #{keyword}
                          <button
                            type="button"
                            onClick={() => removeKeyword('keywords', index)}
                            className="text-green-600 hover:text-green-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700">제외 키워드</label>
                      <button
                        type="button"
                        onClick={() => addKeyword('excludeKeywords')}
                        className="text-blue-500 text-sm hover:text-blue-700"
                      >
                        + 키워드 추가
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.criteria.excludeKeywords.map((keyword, index) => (
                        <span key={index} className="bg-red-100 text-red-800 px-2 py-1 text-sm rounded-full flex items-center gap-1">
                          #{keyword}
                          <button
                            type="button"
                            onClick={() => removeKeyword('excludeKeywords', index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateBatch}
                  disabled={!formData.name.trim() || (formData.collectionType === 'group' && formData.targetGroups.length === 0) || (formData.collectionType === 'channels' && formData.targetChannels.length === 0)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  배치 생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 배치 영상 목록 모달 */}
      {showVideosModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedBatch.name} - 수집된 영상
                </h2>
                <p className="text-gray-600 mt-1">
                  {selectedBatch.totalVideosSaved}개 영상 | {formatDate(selectedBatch.createdAt)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVideosModal(false);
                  setSelectedBatch(null);
                  setBatchVideos([]);
                }}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                ✕
              </button>
            </div>

            {/* 영상 목록 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {videosLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-pulse text-gray-500">영상 목록을 불러오는 중...</div>
                </div>
              ) : batchVideos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-2">수집된 영상이 없습니다</div>
                  <div className="text-gray-400">이 배치에서 수집된 영상이 없거나 데이터를 찾을 수 없습니다.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {batchVideos.map((video) => (
                    <VideoCard 
                      key={video._id} 
                      video={{
                        _id: video._id,
                        title: video.title,
                        url: video.url,
                        thumbnailUrl: video.thumbnailUrl,
                        channelName: video.channelName,
                        platform: video.platform,
                        duration: video.duration,
                        views: video.views,
                        uploadDate: video.uploadDate
                      }} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchManagementPage;