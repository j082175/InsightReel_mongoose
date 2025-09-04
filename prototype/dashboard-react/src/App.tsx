import { useState } from 'react'
import { dashboardConfig } from './config/dashboard.config'
import type { TabConfig } from './types/index'
import { useVideos, useTrendingStats, useQuotaStatus, useServerStatus } from './hooks/useVideos'
import { apiClient } from './services/api'

function App() {
  const [activeTab, setActiveTab] = useState<string>(
    dashboardConfig.tabs.find(tab => tab.defaultActive)?.id || 'videos'
  )

  // API 훅들
  const { data: videos = [], isLoading: videosLoading, error: videosError } = useVideos()
  
  // videos가 배열인지 확인
  const safeVideos = Array.isArray(videos) ? videos : []
  const { data: trendingStats, isLoading: trendingLoading } = useTrendingStats()
  const { data: quotaStatus, isLoading: quotaLoading } = useQuotaStatus()
  const { data: serverStatus, isLoading: serverLoading } = useServerStatus()

  // 트렌딩 수집 뮤테이션
  const collectTrendingMutation = {
    mutate: async () => {
      try {
        console.log('🔥 트렌딩 영상 수집 시작...')
        const result = await apiClient.collectTrending()
        console.log('✅ 트렌딩 영상 수집 완료:', result)
        // 성공 후 데이터 새로고침을 위해 페이지 새로고침 (임시)
        window.location.reload()
      } catch (error) {
        console.error('❌ 트렌딩 영상 수집 실패:', error)
      }
    },
    isLoading: false
  }

  // 서버 연결 테스트
  const testConnection = async () => {
    try {
      const isConnected = await apiClient.testConnection()
      if (isConnected) {
        console.log('✅ 서버 연결 성공')
      } else {
        console.error('❌ 서버 연결 실패')
      }
    } catch (error) {
      console.error('🚨 서버 연결 에러:', error)
    }
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    console.log('🔄 탭 변경:', tabId)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-primary">
              🎬 영상 수집 대시보드
            </h1>
          </div>
          
          {/* Navigation Tabs */}
          <nav className="flex space-x-4 pb-4">
            {dashboardConfig.tabs.map((tab: TabConfig) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  inline-flex items-center px-4 py-2 text-sm font-medium rounded-full
                  transition-colors duration-200
                  ${activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-primary-50 text-primary hover:bg-primary hover:text-white'
                  }
                `}
                title={tab.description}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {activeTab === 'videos' && (
            <>
              {/* 총 영상 수 */}
              <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                <div className="text-2xl mb-2">🎬</div>
                <div className="text-3xl font-bold text-primary mb-2">
                  {videosLoading ? '...' : safeVideos.length}
                </div>
                <div className="text-sm text-gray-600">총 영상 수</div>
              </div>

              {/* 오늘 수집 */}
              <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                <div className="text-2xl mb-2">📅</div>
                <div className="text-3xl font-bold text-success mb-2">
                  {videosLoading ? '...' : 
                    safeVideos.filter(v => {
                      const today = new Date().toDateString();
                      const videoDate = new Date(v.createdAt).toDateString();
                      return today === videoDate;
                    }).length
                  }
                </div>
                <div className="text-sm text-gray-600">오늘 수집</div>
              </div>

              {/* 처리 중 */}
              <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                <div className="text-2xl mb-2">⏳</div>
                <div className="text-3xl font-bold text-warning mb-2">
                  {videosLoading ? '...' : 
                    safeVideos.filter(v => !v.analysisResult).length
                  }
                </div>
                <div className="text-sm text-gray-600">처리 중</div>
              </div>

              {/* 서버 상태 */}
              <div 
                className="bg-white rounded-lg p-6 shadow-sm text-center cursor-pointer hover:shadow-md transition-shadow duration-200"
                onClick={testConnection}
              >
                <div className="text-2xl mb-2">🔌</div>
                <div className="text-3xl font-bold text-info mb-2">
                  {serverLoading ? '확인중...' : (serverStatus ? '연결됨' : '연결 안됨')}
                </div>
                <div className="text-sm text-gray-600">서버 상태</div>
              </div>
            </>
          )}

          {activeTab === 'trending' && (
            <>
              {/* 트렌딩 영상 */}
              <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                <div className="text-2xl mb-2">🔥</div>
                <div className="text-3xl font-bold text-error mb-2">
                  {trendingLoading ? '...' : (trendingStats?.count || 0)}
                </div>
                <div className="text-sm text-gray-600">트렌딩 영상</div>
              </div>

              {/* 마지막 업데이트 */}
              <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                <div className="text-2xl mb-2">🕐</div>
                <div className="text-xl font-bold text-secondary mb-2">
                  {trendingLoading ? '...' : 
                    trendingStats?.lastUpdate ? 
                      new Date(trendingStats.lastUpdate).toLocaleString() : '없음'
                  }
                </div>
                <div className="text-sm text-gray-600">마지막 업데이트</div>
              </div>

              {/* API 할당량 */}
              <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-2xl font-bold text-warning mb-2">
                  {quotaLoading ? '확인 중...' : 
                    quotaStatus ? `${quotaStatus.used}/${quotaStatus.daily}` : '알 수 없음'
                  }
                </div>
                <div className="text-sm text-gray-600">API 할당량</div>
              </div>
            </>
          )}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'videos' && (
            <div className="p-6">
              {videosLoading ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⏳</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">로딩 중...</h2>
                  <p className="text-gray-600">영상 목록을 불러오고 있습니다.</p>
                </div>
              ) : videosError ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">❌</div>
                  <h2 className="text-2xl font-bold text-red-600 mb-2">연결 실패</h2>
                  <p className="text-gray-600 mb-4">
                    서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.
                  </p>
                  <div className="text-sm text-gray-500 bg-gray-100 p-4 rounded-lg">
                    <strong>서버 실행:</strong> npm run dev<br/>
                    <strong>서버 주소:</strong> http://localhost:3000
                  </div>
                </div>
              ) : safeVideos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📹</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">영상이 없습니다</h2>
                  <p className="text-gray-600">아직 수집된 영상이 없습니다.</p>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold mb-6">수집된 영상 ({safeVideos.length}개)</h2>
                  
                  {/* 비디오 그리드 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {safeVideos.map((video) => (
                      <div key={video._id} className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        {/* 썸네일 */}
                        <div className="relative aspect-video bg-gray-100">
                          {video.thumbnail ? (
                            <img 
                              src={video.thumbnail} 
                              alt={video.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="text-4xl">
                                {video.platform === 'youtube' ? '🎥' : 
                                 video.platform === 'instagram' ? '📷' : '🎵'}
                              </span>
                            </div>
                          )}
                          
                          {/* 플랫폼 배지 */}
                          <div className="absolute top-2 left-2">
                            <span className={`
                              px-2 py-1 text-xs font-medium rounded-full text-white
                              ${video.platform === 'youtube' ? 'bg-red-600' :
                                video.platform === 'instagram' ? 'bg-pink-600' : 
                                'bg-gray-600'}
                            `}>
                              {video.platform.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        {/* 비디오 정보 */}
                        <div className="p-4">
                          <h3 className="font-medium text-sm line-clamp-2 mb-2">
                            {video.title}
                          </h3>
                          
                          {video.channelName && (
                            <p className="text-xs text-gray-600 mb-2">
                              {video.channelName}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                              {new Date(video.createdAt).toLocaleDateString()}
                            </span>
                            {video.viewCount && (
                              <span>조회수 {video.viewCount.toLocaleString()}</span>
                            )}
                          </div>
                          
                          {video.category && (
                            <div className="mt-2">
                              <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                {video.category}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trending' && (
            <div className="p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔥</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  YouTube 트렌딩
                </h2>
                <p className="text-gray-600 mb-8">
                  YouTube에서 인기 있는 트렌딩 영상들을 확인하고 수집할 수 있습니다.
                </p>
                <button 
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  onClick={collectTrendingMutation.mutate}
                  disabled={collectTrendingMutation.isLoading}
                >
                  📊 {collectTrendingMutation.isLoading ? '수집 중...' : '최신 트렌드 수집'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  채널 관리
                </h2>
                <p className="text-gray-600 mb-8">
                  구독 중인 채널들을 관리하고 새로운 채널을 추가할 수 있습니다.
                </p>
                <button 
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => {
                    console.log('채널 추가');
                    // TODO: 채널 추가 기능 구현
                  }}
                >
                  ➕ 채널 추가
                </button>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  분석 리포트
                </h2>
                <p className="text-gray-600 mb-8">
                  수집된 영상들의 통계와 분석 결과를 확인할 수 있습니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl mb-2">📈</div>
                    <div className="font-semibold">트렌드 분석</div>
                    <div className="text-sm text-gray-600">인기 키워드 및 카테고리</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="font-semibold">플랫폼 비교</div>
                    <div className="text-sm text-gray-600">플랫폼별 수집 현황</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl mb-2">🎯</div>
                    <div className="font-semibold">AI 성능</div>
                    <div className="text-sm text-gray-600">분석 정확도 및 속도</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
