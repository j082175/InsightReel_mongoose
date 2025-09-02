// dashboard.html의 원래 JavaScript 코드 (외부 파일로 분리)

// API 서버 기본 URL
const API_BASE_URL = 'http://localhost:3000';

// API 헬퍼 함수들
const API = {
    // 서버 상태 확인
    async checkHealth() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
            
            const response = await fetch(`${API_BASE_URL}/health`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return await response.json();
        } catch (error) {
            console.error('서버 연결 실패:', error);
            return null;
        }
    },

    // 통계 정보 조회
    async getStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/stats`);
            return await response.json();
        } catch (error) {
            console.error('통계 조회 실패:', error);
            return null;
        }
    },

    // YouTube API Quota 현황
    async getQuotaStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/quota-status`);
            return await response.json();
        } catch (error) {
            console.error('Quota 상태 조회 실패:', error);
            return null;
        }
    },

    // 트렌딩 수집 통계
    async getTrendingStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/trending-stats`);
            return await response.json();
        } catch (error) {
            console.error('트렌딩 통계 조회 실패:', error);
            return null;
        }
    },

    // 채널별 트렌딩 영상 수집
    async collectTrending(channelIds, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/collect-trending`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    channelIds,
                    options: {
                        daysBack: options.daysBack || 7,
                        minViewCount: options.minViewCount || 10000,
                        maxResults: options.maxResults || 10
                    }
                })
            });
            return await response.json();
        } catch (error) {
            console.error('트렌딩 수집 실패:', error);
            return null;
        }
    },

    // 수집된 영상 목록 조회
    async getVideos() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/videos`);
            return await response.json();
        } catch (error) {
            console.error('영상 목록 조회 실패:', error);
            return null;
        }
    }
};

// UI 업데이트 헬퍼 함수들
const UI = {
    // 통계 카드 업데이트
    updateStatsBar(stats, quotaInfo = null) {
        const statCards = document.querySelectorAll('.stat-number');
        if (stats && statCards.length >= 5) {
            statCards[0].textContent = stats.total || '0';
            statCards[1].textContent = '187'; // 채널 수 (하드코딩)
            statCards[2].textContent = stats.today || '0';
            statCards[3].textContent = '15'; // 카테고리 (하드코딩)
        }
        
        // Quota 정보 업데이트
        const quotaElement = document.getElementById('quota-remaining');
        if (quotaInfo && quotaElement) {
            const remaining = quotaInfo.quota?.remaining || 0;
            quotaElement.textContent = remaining.toLocaleString();
            
            // 색상 변경 (남은 양에 따라)
            if (remaining < 1000) {
                quotaElement.style.color = '#f44336'; // 빨간색
            } else if (remaining < 3000) {
                quotaElement.style.color = '#ff9800'; // 주황색
            } else {
                quotaElement.style.color = '#1976d2'; // 파란색
            }
        }
    },

    // 로딩 상태 표시
    showLoading(message = '로딩 중...') {
        console.log('🔄', message);
    },

    // 에러 메시지 표시
    showError(message) {
        alert(`❌ 오류: ${message}`);
    },

    // 성공 메시지 표시
    showSuccess(message) {
        alert(`✅ 성공: ${message}`);
    }
};

// 핵심 함수들
function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('videos-content').classList.toggle('hidden', tabName !== 'videos');
    document.getElementById('trending-content').classList.toggle('hidden', tabName !== 'trending');
    document.getElementById('channels-content').classList.toggle('hidden', tabName !== 'channels');
    document.getElementById('analytics-content').classList.toggle('hidden', tabName !== 'analytics');
}

async function showVideoTab(type) {
    document.querySelectorAll('.content-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    if (type === 'trending') {
        await loadTrendingData();
    } else if (type === 'recent') {
        await loadRecentVideos();
    } else if (type === 'popular') {
        await loadPopularVideos();
    }
    
    console.log('영상 탭 변경:', type);
}

// 트렌딩 데이터 로드
async function loadTrendingData() {
    UI.showLoading('트렌딩 데이터 로드 중...');
    
    try {
        const trendingStats = await API.getTrendingStats();
        if (trendingStats && trendingStats.success) {
            console.log('📈 트렌딩 데이터:', trendingStats.data);
            
            if (trendingStats.data.stats && trendingStats.data.stats.length > 0) {
                updateVideoGridWithTrending(trendingStats.data.stats);
                UI.showSuccess(`트렌딩 데이터 로드 완료! ${trendingStats.data.stats.length}개 수집 기록`);
            } else {
                showNoTrendingDataMessage();
            }
        } else {
            showNoTrendingDataMessage();
        }
    } catch (error) {
        console.error('트렌딩 데이터 로드 실패:', error);
        UI.showError('트렌딩 데이터를 불러올 수 없습니다.');
    }
}

// 트렌딩 영상 수집 (메인 트렌딩 수집 버튼용)
async function collectTrendingVideos() {
    const btn = event.target;
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = '수집 중... (30-60초 소요)';
    
    try {
        const result = await API.collectTrending([
            'UCXuqSBlHAE6Xw-yeJA0Tunw', // Linus Tech Tips
            'UCsBjURrPoezykLs9EqgamOA', // Fireship  
            'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
            'UCJbPGzawDH1njbqV-D5HqKw'  // BroCode
        ], {
            daysBack: 7,
            minViewCount: 50000,
            maxResults: 8
        });

        if (result && result.success) {
            console.log('🎯 트렌딩 수집 완료:', result.data);
            UI.showSuccess(`${result.data.trendingVideos}개 트렌딩 영상 수집 완료!`);
            
            // 트렌딩 탭으로 이동하고 데이터 표시
            showTab('videos');
            setTimeout(() => showVideoTab('trending'), 100);
        } else {
            throw new Error(result?.message || '트렌딩 수집 실패');
        }
        
    } catch (error) {
        console.error('트렌딩 수집 오류:', error);
        UI.showError(`트렌딩 수집 실패: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// 트렌딩 영상 표시
function updateVideoGridWithTrending(stats) {
    const videoGrid = document.getElementById('trending-video-grid');
    const latestCollection = stats[stats.length - 1];
    
    if (!latestCollection || !latestCollection.videos || latestCollection.videos.length === 0) {
        showTrendingStatsOnly(stats);
        return;
    }

    const videos = latestCollection.videos;
    const date = new Date(latestCollection.timestamp).toLocaleDateString('ko-KR');
    
    let html = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 2rem;">
            <h3 style="color: #1976d2; margin-bottom: 1rem;">🔥 최신 트렌딩 영상 (${date})</h3>
            <p style="color: #666;">${videos.length}개의 트렌딩 영상 • 할당량: ${latestCollection.quotaUsed} units</p>
        </div>
    `;
    
    videos.forEach((video, index) => {
        const videoId = video.id;
        const title = video.snippet?.title || '제목 없음';
        const channelTitle = video.snippet?.channelTitle || '채널 없음';
        const publishedAt = new Date(video.snippet?.publishedAt).toLocaleDateString('ko-KR');
        const viewCount = parseInt(video.statistics?.viewCount || 0);
        const likeCount = parseInt(video.statistics?.likeCount || 0);
        
        const thumbnailUrl = video.snippet?.thumbnails?.maxresdefault?.url || 
                           video.snippet?.thumbnails?.high?.url || 
                           `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        html += `
            <div class="video-card">
                <div class="thumbnail-container">
                    <img src="${thumbnailUrl}" alt="썸네일" class="thumbnail" 
                         onerror="this.src='https://img.youtube.com/vi/${videoId}/hqdefault.jpg'" loading="lazy">
                    <span class="platform-badge youtube">YouTube</span>
                    <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.8); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem;">
                        ${viewCount.toLocaleString()}회
                    </div>
                </div>
                <div class="video-info">
                    <h3 class="video-title">${title}</h3>
                    <div class="channel-info">
                        <div style="width: 24px; height: 24px; background: #ff0000; border-radius: 50%; margin-right: 0.5rem; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.7rem;">▶</div>
                        <span class="channel-name">${channelTitle}</span>
                    </div>
                    <div class="video-meta">
                        <span class="category-tag">트렌딩 #${index + 1}</span>
                        <span class="date">${publishedAt}</span>
                    </div>
                    <div class="keywords">
                        <span class="keyword-tag">👀 ${viewCount.toLocaleString()}</span>
                        ${likeCount > 0 ? `<span class="keyword-tag">👍 ${likeCount.toLocaleString()}</span>` : ''}
                        <span class="keyword-tag">🔥 트렌딩</span>
                    </div>
                    <div class="video-actions">
                        <button class="action-btn primary" onclick="window.open('${videoUrl}', '_blank')">
                            ▶ 영상 보기
                        </button>
                        <button class="action-btn" onclick="copyToClipboard('${videoUrl}')">
                            🔗 링크 복사
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    videoGrid.innerHTML = html;
}

// 기타 함수들
async function loadRecentVideos() {
    UI.showLoading('최신 영상 로드 중...');
    console.log('최신 영상 로드 (구현 예정)');
}

async function loadPopularVideos() {
    UI.showLoading('인기 영상 로드 중...');
    console.log('인기순 정렬 (구현 예정)');
}

function showNoTrendingDataMessage() {
    const videoGrid = document.querySelector('.video-grid');
    videoGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h3 style="color: #666; margin-bottom: 1rem;">📊 트렌딩 데이터가 아직 없습니다</h3>
            <p style="color: #999; margin-bottom: 2rem;">위의 "최신 트렌드 수집" 버튼을 클릭해서 트렌딩 영상을 수집해보세요!</p>
        </div>
    `;
}

function showTrendingStatsOnly(stats) {
    const videoGrid = document.querySelector('.video-grid');
    videoGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h3 style="color: #1976d2; margin-bottom: 1rem;">📈 트렌딩 수집 통계</h3>
            <p style="color: #666;">총 ${stats.length}개의 트렌딩 수집 기록이 있습니다.</p>
            <p style="color: #999; font-size: 0.9rem;">실제 영상을 보려면 새로운 트렌딩 수집을 실행하세요.</p>
        </div>
    `;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ 링크가 클립보드에 복사되었습니다!');
    }).catch(err => {
        console.error('링크 복사 실패:', err);
        alert('❌ 링크 복사에 실패했습니다.');
    });
}

// 페이지 로드 완료
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 대시보드 로딩 완료!');
    console.log('💡 트렌딩 탭에서 "최신 트렌드 수집"을 시작하세요.');
});

console.log('📄 dashboard.js 로드 완료 - UI는 그대로, 성능만 최적화!');