import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Youtube,
  Instagram,
  Video,
  Clock,
  Filter,
  Download
} from 'lucide-react';
import { formatViews, formatDate, getDurationLabel } from '../shared/utils';
import toast from 'react-hot-toast';

interface TrendingStats {
  overview: {
    totalVideos: number;
    totalViews: number;
    totalLikes: number;
    avgViews: number;
    platforms: string[];
    durations: string[];
  };
  byPlatform: Array<{
    _id: string;
    count: number;
    totalViews: number;
  }>;
  byDuration: Array<{
    _id: string;
    count: number;
    avgViews: number;
  }>;
}

interface BatchStats {
  overview: {
    totalBatches: number;
    completedBatches: number;
    failedBatches: number;
    totalVideosCollected: number;
    totalQuotaUsed: number;
    avgSuccessRate: number;
  };
  recentActivity: Array<{
    _id: string;
    name: string;
    status: string;
    totalVideosSaved: number;
    createdAt: string;
  }>;
}

interface ChannelGroup {
  _id: string;
  name: string;
  color: string;
  channels: string[];
  isActive: boolean;
  lastCollectedAt?: string;
}

const TrendingDashboardPage: React.FC = () => {
  const [trendingStats, setTrendingStats] = useState<TrendingStats | null>(null);
  const [batchStats, setBatchStats] = useState<BatchStats | null>(null);
  const [channelGroups, setChannelGroups] = useState<ChannelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (dateRange.from || dateRange.to || selectedGroupId) {
      fetchTrendingStats();
    }
  }, [dateRange, selectedGroupId]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchTrendingStats(),
        fetchBatchStats(),
        fetchChannelGroups()
      ]);
    } catch (error) {
      const errorMessage = '대시보드 데이터 로딩에 실패했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingStats = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedGroupId) params.append('groupId', selectedGroupId);
      if (dateRange.from) params.append('dateFrom', dateRange.from);
      if (dateRange.to) params.append('dateTo', dateRange.to);

      const response = await fetch(`/api/trending/stats?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setTrendingStats(result.data);
      }
    } catch (error) {
      toast.error('트렌딩 통계 로딩에 실패했습니다.');
    }
  };

  const fetchBatchStats = async () => {
    try {
      const response = await fetch('/api/batches/stats/overview');
      const result = await response.json();
      
      if (result.success) {
        setBatchStats(result.data);
      }
    } catch (error) {
      toast.error('배치 통계 로딩에 실패했습니다.');
    }
  };

  const fetchChannelGroups = async () => {
    try {
      const response = await fetch('/api/channel-groups?active=true');
      const result = await response.json();
      
      if (result.success) {
        setChannelGroups(result.data);
      }
    } catch (error) {
      toast.error('채널 그룹 로딩에 실패했습니다.');
    }
  };


  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'YOUTUBE': return <Youtube className="w-5 h-5 text-red-500" />;
      case 'INSTAGRAM': return <Instagram className="w-5 h-5 text-pink-500" />;
      case 'TIKTOK': return <Video className="w-5 h-5 text-black" />;
      default: return <Video className="w-5 h-5 text-gray-500" />;
    }
  };


  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed': return '완료';
      case 'running': return '실행중';
      case 'failed': return '실패';
      case 'pending': return '대기중';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          {/* 헤더 */}
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          
          {/* 필터 섹션 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
          
          {/* 통계 카드들 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          
          {/* 차트 섹션 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-800">트렌딩 수집 대시보드</h1>
        </div>
        <p className="text-gray-600">
          트렌딩 영상 수집 현황과 통계를 확인하세요
        </p>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-medium text-gray-800">필터</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              시작일
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">종료일</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">채널 그룹</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">전체 그룹</option>
              {channelGroups.map(group => (
                <option key={group._id} value={group._id}>{group.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* 주요 통계 카드 */}
      {trendingStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">총 수집 영상</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatViews(trendingStats.overview.totalVideos)}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">총 조회수</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatViews(trendingStats.overview.totalViews)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">총 좋아요</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatViews(trendingStats.overview.totalLikes)}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">평균 조회수</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatViews(trendingStats.overview.avgViews)}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 플랫폼별 분포 */}
        {trendingStats?.byPlatform && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-500" />
              플랫폼별 분포
            </h3>
            
            <div className="space-y-4">
              {trendingStats.byPlatform.map((item) => {
                const total = trendingStats.byPlatform.reduce((sum, p) => sum + p.count, 0);
                const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';
                
                return (
                  <div key={item._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(item._id)}
                      <span className="font-medium">{item._id}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatViews(item.count)}개</div>
                      <div className="text-sm text-gray-500">{percentage}%</div>
                      <div className="text-xs text-gray-400">
                        {formatViews(item.totalViews)} 조회수
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 영상 길이별 분포 */}
        {trendingStats?.byDuration && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-500" />
              영상 길이별 분포
            </h3>
            
            <div className="space-y-4">
              {trendingStats.byDuration.map((item) => {
                const total = trendingStats.byDuration.reduce((sum, d) => sum + d.count, 0);
                const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';
                
                return (
                  <div key={item._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item._id === 'SHORT' ? 'bg-yellow-500' :
                        item._id === 'MID' ? 'bg-blue-500' :
                        'bg-green-500'
                      }`}></div>
                      <span className="font-medium">{getDurationLabel(item._id)}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatViews(item.count)}개</div>
                      <div className="text-sm text-gray-500">{percentage}%</div>
                      <div className="text-xs text-gray-400">
                        평균 {formatViews(item.avgViews)} 조회수
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 배치 통계 & 최근 활동 */}
      {batchStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 배치 통계 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              배치 통계
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">총 배치</div>
                <div className="text-xl font-bold text-gray-900">
                  {batchStats.overview.totalBatches}
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">완료된 배치</div>
                <div className="text-xl font-bold text-green-600">
                  {batchStats.overview.completedBatches}
                </div>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">실패한 배치</div>
                <div className="text-xl font-bold text-red-600">
                  {batchStats.overview.failedBatches}
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">평균 성공률</div>
                <div className="text-xl font-bold text-blue-600">
                  {Math.round(batchStats.overview.avgSuccessRate || 0)}%
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">총 수집된 영상</span>
                <span className="font-medium">
                  {formatViews(batchStats.overview.totalVideosCollected)}개
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-gray-500">사용된 할당량</span>
                <span className="font-medium">
                  {formatViews(batchStats.overview.totalQuotaUsed)}
                </span>
              </div>
            </div>
          </div>

          {/* 최근 배치 활동 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              최근 배치 활동
            </h3>
            
            <div className="space-y-3">
              {batchStats.recentActivity.map((batch) => (
                <div key={batch._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {batch.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(batch.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(batch.status)}`}>
                      {getStatusLabel(batch.status)}
                    </span>
                    <div className="text-sm font-medium text-gray-600">
                      {batch.totalVideosSaved}개
                    </div>
                  </div>
                </div>
              ))}
              
              {batchStats.recentActivity.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  최근 활동이 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 채널 그룹 현황 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-500" />
            채널 그룹 현황
          </h3>
          <span className="text-sm text-gray-500">
            {channelGroups.filter(g => g.isActive).length}개 활성 그룹
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channelGroups.slice(0, 6).map((group) => (
            <div key={group._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: group.color }}
                ></div>
                <span className="font-medium text-gray-900">{group.name}</span>
                {!group.isActive && (
                  <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                    비활성
                  </span>
                )}
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                {group.channels.length}개 채널
              </div>
              
              {group.lastCollectedAt && (
                <div className="text-xs text-gray-400">
                  마지막 수집: {formatDate(group.lastCollectedAt)}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {channelGroups.length > 6 && (
          <div className="text-center mt-4">
            <span className="text-sm text-gray-500">
              +{channelGroups.length - 6}개 그룹 더 보기
            </span>
          </div>
        )}
      </div>

      {/* 빈 데이터 상태 */}
      {!loading && (!trendingStats || trendingStats.overview.totalVideos === 0) && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-500 mb-2">수집된 트렌딩 데이터가 없습니다</p>
          <p className="text-gray-400">새로운 배치를 생성하여 트렌딩 영상 수집을 시작하세요.</p>
        </div>
      )}
    </div>
  );
};

export default TrendingDashboardPage;