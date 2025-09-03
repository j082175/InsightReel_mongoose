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

    // 로딩 상태 숨김
    hideLoading() {
        console.log('✅ 로딩 완료');
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
    
    // videos 탭이 선택되었을 때 실제 데이터 로드
    if (tabName === 'videos') {
        loadRealVideos();
    }
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

// 실제 데이터 연동 함수들
async function loadRealStats() {
    try {
        // API에서 실제 통계 데이터 가져오기
        const [statsResponse, videosResponse] = await Promise.all([
            API.getStats(),
            API.getVideos()
        ]);

        console.log('📡 API 응답:', { statsResponse, videosResponse });
        
        if (statsResponse && videosResponse) {
            const videoCount = videosResponse.data ? videosResponse.data.length : 0;
            const channelCount = getUniqueChannelCount(videosResponse.data || []);
            const todayCount = statsResponse.data ? statsResponse.data.today : 0;
            const totalCategories = getUniqueCategoryCount(videosResponse.data || []);

            console.log('📊 계산된 통계:', { videoCount, channelCount, todayCount, totalCategories });

            // DOM 업데이트
            updateStatCard('총 영상', videoCount);
            updateStatCard('채널 수', channelCount);
            updateStatCard('오늘 수집', todayCount);
            updateStatCard('카테고리', totalCategories);

            console.log('✅ 실제 데이터 로드 완료!');
        } else {
            console.error('❌ API 응답 데이터가 없습니다');
        }
    } catch (error) {
        console.error('❌ 실제 데이터 로드 실패:', error);
        // 에러 시 기본값 유지 또는 에러 표시
    }
}

// 중복 제거됨 - API.getVideos() 사용

// 통계 카드 업데이트
function updateStatCard(label, value) {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        const statLabel = card.querySelector('.stat-label');
        if (statLabel && statLabel.textContent === label) {
            const statNumber = card.querySelector('.stat-number');
            if (statNumber) {
                statNumber.textContent = value.toLocaleString();
            }
        }
    });
}

// 유니크 채널 수 계산
function getUniqueChannelCount(videos) {
    const uniqueChannels = new Set();
    videos.forEach(video => {
        if (video.account) {
            uniqueChannels.add(video.account);
        }
    });
    return uniqueChannels.size;
}

// 유니크 카테고리 수 계산
function getUniqueCategoryCount(videos) {
    const uniqueCategories = new Set();
    videos.forEach(video => {
        if (video.mainCategory) {
            uniqueCategories.add(video.mainCategory);
        }
    });
    return uniqueCategories.size;
}

// 실제 영상 데이터 로드 및 표시
async function loadRealVideos() {
    UI.showLoading('실제 영상 데이터 로드 중...');
    
    try {
        const response = await API.getVideos();
        
        if (response && response.success && response.data) {
            displayRealVideos(response.data);
            console.log(`📺 실제 영상 ${response.data.length}개 로드 완료`);
        } else {
            showNoVideosMessage();
        }
    } catch (error) {
        console.error('❌ 실제 영상 로드 실패:', error);
        showErrorMessage('영상 데이터를 불러오는데 실패했습니다.');
    }
    
    UI.hideLoading();
}

// 실제 영상 데이터 표시
function displayRealVideos(videos) {
    const videoGrid = document.querySelector('.video-grid');
    
    if (!videos || videos.length === 0) {
        showNoVideosMessage();
        return;
    }

    const html = videos.map(video => {
        // 플랫폼별 처리
        const platform = video.platform?.toLowerCase() || 'instagram';
        const videoLink = video.comments || video.account || '#';
        
        // 플랫폼별 embed URL 및 썸네일 처리
        let thumbnailHtml = '';
        
        if (platform === 'youtube') {
            // YouTube 처리
            const youtubeId = extractYouTubeId(videoLink);
            const youtubeThumbnail = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : null;
            const youtubeEmbedUrl = youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : null;
            
            if (youtubeEmbedUrl) {
                thumbnailHtml = `
                    <div class="video-preview-container lazy-iframe" 
                         data-src="${youtubeEmbedUrl}"
                         style="position: relative; width: 100%; height: 300px; border-radius: 8px; overflow: hidden; background: #000; display: flex; align-items: center; justify-content: center;">
                        <div class="lazy-placeholder" style="color: white; font-size: 16px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 10px;">🎬</div>
                            <div>YouTube 영상 로딩 중...</div>
                        </div>
                        ${youtubeThumbnail ? `<img src="${youtubeThumbnail}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.3;" alt="YouTube 썸네일">` : ''}
                    </div>`;
            } else {
                thumbnailHtml = `
                    <div class="thumbnail-container" onclick="openVideoLink('${videoLink}', 'youtube')" style="
                        position: relative; width: 100%; height: 180px; 
                        background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%);
                        border-radius: 8px; display: flex; flex-direction: column; 
                        align-items: center; justify-content: center; cursor: pointer;">
                        <div style="color: white; font-size: 48px; margin-bottom: 10px;">🎬</div>
                        <div style="color: white; font-size: 14px; font-weight: bold;">YouTube 영상</div>
                        <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">외부링크</div>
                    </div>`;
            }
        } else if (platform === 'instagram') {
            // Instagram 처리 (기존 로직)
            const embedUrl = getInstagramEmbedUrl(videoLink);
            
            if (embedUrl) {
                thumbnailHtml = `
                    <div class="video-preview-container lazy-iframe" 
                         data-src="${embedUrl}"
                         style="position: relative; width: 100%; height: 300px; border-radius: 8px; overflow: hidden; background: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                        <div class="lazy-placeholder" style="color: #666; font-size: 16px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 10px;">📹</div>
                            <div>Instagram 영상 로딩 중...</div>
                        </div>
                    </div>`;
            } else {
                thumbnailHtml = `
                    <div class="thumbnail-container" onclick="openVideoLink('${videoLink}', 'instagram')" style="
                        position: relative; 
                        width: 100%; 
                        height: 180px; 
                        overflow: hidden; 
                        border-radius: 8px; 
                        cursor: pointer;
                        background: linear-gradient(45deg, #E91E63, #9C27B0);
                    ">
                        <img 
                            id="thumbnail-${video.id}"
                            alt="Instagram 썸네일"
                            style="
                                width: 100%; 
                                height: 100%; 
                                object-fit: cover;
                                opacity: 0;
                                transition: opacity 0.3s ease;
                            "
                            onload="this.style.opacity='1'"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
                        />
                        <div class="thumbnail-fallback" style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            display: none;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            background: linear-gradient(45deg, #E91E63, #9C27B0);
                            color: white;
                            font-weight: bold;
                        ">
                            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📱</div>
                            <div>Instagram 영상</div>
                            <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 0.25rem;">클릭하여 보기</div>
                        </div>
                        <div class="play-overlay" style="
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            width: 60px;
                            height: 60px;
                            background: rgba(255, 255, 255, 0.9);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 1.5rem;
                            color: #E91E63;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.background='white'; this.style.transform='translate(-50%, -50%) scale(1.1)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.9)'; this.style.transform='translate(-50%, -50%) scale(1)'">
                            ▶️
                        </div>
                    </div>
                        background: linear-gradient(45deg, #E91E63, #9C27B0);
                        color: white;
                        font-weight: bold;
                    ">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📱</div>
                        <div>Instagram 영상</div>
                        <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 0.25rem;">클릭하여 보기</div>
                    </div>
                    <div class="play-overlay" style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 60px;
                        height: 60px;
                        background: rgba(255, 255, 255, 0.9);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.5rem;
                        color: #E91E63;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='white'; this.style.transform='translate(-50%, -50%) scale(1.1)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.9)'; this.style.transform='translate(-50%, -50%) scale(1)'">
                        ▶️
                    </div>
                </div>`;
            }
        } else {
            // 기타 플랫폼 (TikTok 등)
            thumbnailHtml = `
                <div class="thumbnail-container" onclick="openVideoLink('${videoLink}', '${platform}')" style="
                    position: relative; width: 100%; height: 180px; 
                    background: linear-gradient(135deg, #000000 0%, #434343 100%);
                    border-radius: 8px; display: flex; flex-direction: column; 
                    align-items: center; justify-content: center; cursor: pointer;">
                    <div style="color: white; font-size: 48px; margin-bottom: 10px;">📱</div>
                    <div style="color: white; font-size: 14px; font-weight: bold;">${platform.toUpperCase()} 영상</div>
                    <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">외부링크</div>
                </div>`;
        }
        
        return `
        <div class="video-card">
            <div class="video-thumbnail" style="position: relative;">
                ${thumbnailHtml}
                <div class="video-duration" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${video.duration || video.views || 'N/A'}</div>
            </div>
            <div class="video-info">
                <h3 class="video-title">${video.mainCategory} - ${video.middleCategory || '일반'}</h3>
                <div class="channel-info">
                    <div class="channel-avatar">${platform.charAt(0).toUpperCase()}</div>
                    <span class="channel-name">${extractChannelName(video.account, platform)}</span>
                </div>
                <div class="video-stats">
                    <span>🏷️ ${video.keywords[0] || 'N/A'}</span>
                    <span>💬 ${video.content || '0'}</span>
                    <span>❤️ ${video.likes || video.views || '0'}</span>
                </div>
                <div class="video-meta">
                    <span class="upload-date">📅 ${video.timestamp}</span>
                    <span class="platform-tag platform-${platform}" style="background: ${getPlatformColor(platform)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">${platform.toUpperCase()}</span>
                </div>
                <div class="video-actions">
                    <button onclick="copyToClipboard('${videoLink}')" class="action-btn">🔗 링크 복사</button>
                    <button onclick="openVideoLink('${videoLink}', '${platform}')" class="action-btn">${getPlatformEmoji(platform)} ${platform === 'youtube' ? 'YouTube' : platform === 'instagram' ? 'Instagram' : platform.toUpperCase()}에서 열기</button>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    videoGrid.innerHTML = html;
    
    // 🚀 Lazy Loading 구현: Intersection Observer
    initializeLazyLoading();
    console.log('📺 멀티플랫폼 Lazy Loading 초기화 완료 (Instagram, YouTube 등)');
}

// YouTube ID 추출
function extractYouTubeId(url) {
    if (!url) return null;
    
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// 플랫폼별 색상
function getPlatformColor(platform) {
    const colors = {
        'youtube': '#FF0000',
        'instagram': '#E4405F',
        'tiktok': '#000000',
        'default': '#666666'
    };
    return colors[platform?.toLowerCase()] || colors.default;
}

// 플랫폼별 이모지
function getPlatformEmoji(platform) {
    const emojis = {
        'youtube': '🎬',
        'instagram': '📱',
        'tiktok': '🎵',
        'default': '📹'
    };
    return emojis[platform?.toLowerCase()] || emojis.default;
}

// 범용 비디오 링크 열기
function openVideoLink(videoUrl, platform) {
    if (videoUrl && videoUrl !== '#') {
        console.log(`📱 ${platform} 영상 열기:`, videoUrl);
        window.open(videoUrl, '_blank');
    } else {
        alert('영상 링크를 찾을 수 없습니다.');
    }
}

// 채널명 추출 (URL에서) - 플랫폼별 처리
function extractChannelName(accountUrl, platform = 'instagram') {
    if (!accountUrl) return 'Unknown';
    
    try {
        const url = new URL(accountUrl);
        const pathParts = url.pathname.split('/');
        
        if (platform === 'youtube') {
            // YouTube: /channel/UC... 또는 /c/channelname 또는 /@username
            if (pathParts[1] === 'channel' || pathParts[1] === 'c') {
                return pathParts[2] || 'Unknown Channel';
            } else if (pathParts[1].startsWith('@')) {
                return pathParts[1];
            }
            return pathParts[1] || 'Unknown Channel';
        } else {
            // Instagram, TikTok: /username
            return pathParts[1] || 'Unknown Channel';
        }
    } catch (error) {
        return 'Unknown Channel';
    }
}


// 영상이 없을 때 표시
function showNoVideosMessage() {
    const videoGrid = document.querySelector('.video-grid');
    videoGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h3 style="color: #666; margin-bottom: 1rem;">📹 수집된 영상이 없습니다</h3>
            <p style="color: #999; margin-bottom: 2rem;">영상을 업로드하거나 수집해보세요!</p>
        </div>
    `;
}

// 에러 메시지 표시
function showErrorMessage(message) {
    const videoGrid = document.querySelector('.video-grid');
    videoGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: #fff5f5; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #fed7d7;">
            <h3 style="color: #e53e3e; margin-bottom: 1rem;">❌ 오류 발생</h3>
            <p style="color: #c53030; margin-bottom: 2rem;">${message}</p>
            <button onclick="loadRealVideos()" style="background: #e53e3e; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">🔄 다시 시도</button>
        </div>
    `;
}

// 상세보기 함수
function viewDetails(videoId) {
    alert(`영상 ID: ${videoId}의 상세 정보 (구현 예정)`);
}

// Instagram embed URL 생성
function getInstagramEmbedUrl(videoUrl) {
    if (!videoUrl || !videoUrl.includes('instagram.com/reels/')) {
        return null;
    }
    
    try {
        // https://www.instagram.com/reels/DMxE0_5VZkk/ → https://www.instagram.com/p/DMxE0_5VZkk/embed/
        const reelId = videoUrl.match(/\/reels\/([^\/]+)/)?.[1];
        if (reelId) {
            return `https://www.instagram.com/p/${reelId}/embed/`;
        }
    } catch (error) {
        console.error('Instagram embed URL 생성 실패:', error);
    }
    
    return null;
}

// Instagram 썸네일 URL 생성 (로컬 서버를 통한 실제 스크래핑)
async function getInstagramThumbnail(videoLink) {
    if (!videoLink || !videoLink.includes('instagram.com')) {
        return getPlaceholderThumbnail('Default');
    }
    
    try {
        console.log('📸 Instagram 썸네일 요청:', videoLink);
        
        // 1. 먼저 로컬 서버의 썸네일 API 시도
        try {
            const response = await fetch(`${API_BASE_URL}/api/get-instagram-thumbnail`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: videoLink })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.thumbnailUrl) {
                    console.log('✅ 로컬 서버에서 썸네일 성공:', data.thumbnailUrl);
                    return data.thumbnailUrl;
                }
            }
        } catch (serverError) {
            console.log('⚠️ 로컬 서버 썸네일 API 실패, 대안 방법 사용');
        }
        
        // 2. Instagram URL 패턴으로 추정 썸네일 생성
        const reelMatch = videoLink.match(/instagram\.com\/reels?\/([A-Za-z0-9_-]+)/);
        const postMatch = videoLink.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/);
        
        if (reelMatch || postMatch) {
            const mediaId = reelMatch ? reelMatch[1] : postMatch[1];
            
            // CORS 문제 회피를 위해 서버 프록시 사용
            const instagramMediaUrl = `https://www.instagram.com/p/${mediaId}/media/?size=l`;
            const proxyUrl = `${API_BASE_URL}/api/proxy-image?url=${encodeURIComponent(instagramMediaUrl)}`;
            
            console.log('🔄 프록시를 통한 Instagram 썸네일 요청:', mediaId);
            
            // 프록시 URL 반환
            return proxyUrl;
        }
        
        return getPlaceholderThumbnail('Instagram');
        
    } catch (error) {
        console.error('❌ 썸네일 생성 에러:', error);
        return getPlaceholderThumbnail('Error');
    }
}

// 플레이스홀더 썸네일 생성
function getPlaceholderThumbnail(type = 'Instagram') {
    const gradients = {
        'Instagram': 'linear-gradient(45deg, #E91E63, #9C27B0)',
        '기본': 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
        '에러': 'linear-gradient(45deg, #666, #999)'
    };
    
    const gradient = gradients[type] || gradients['Instagram'];
    
    // 한글을 영어로 변환하거나 제거
    const typeText = type === '기본' ? 'Default' : 
                    type === '에러' ? 'Error' : 
                    type;
    
    // UTF-8 문자열을 Base64로 안전하게 인코딩
    const svgString = `
        <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#E91E63"/>
                    <stop offset="25%" style="stop-color:#F06292"/>
                    <stop offset="50%" style="stop-color:#BA68C8"/>
                    <stop offset="75%" style="stop-color:#9C27B0"/>
                    <stop offset="100%" style="stop-color:#673AB7"/>
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grad)"/>
            <circle cx="160" cy="90" r="30" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="3"/>
            <polygon points="150,75 150,105 175,90" fill="white"/>
            <text x="50%" y="140" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${typeText}</text>
        </svg>
    `;
    
    // btoa는 Latin1 문자만 지원하므로, unescape(encodeURIComponent())를 사용하여 UTF-8을 Base64로 인코딩
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
}

// Instagram 썸네일 비동기 로드
async function loadInstagramThumbnails(videos) {
    console.log('📸 썸네일 로드 시작:', videos.length + '개 영상');
    
    // data-needs-thumbnail="true" 속성을 가진 모든 이미지 찾기
    const thumbnailImages = document.querySelectorAll('img[data-needs-thumbnail="true"]');
    console.log('🔍 썸네일 로드 대상:', thumbnailImages.length + '개');
    
    // 병렬로 썸네일 로드 (최대 3개씩)
    const batchSize = 3;
    const imageArray = Array.from(thumbnailImages);
    
    for (let i = 0; i < imageArray.length; i += batchSize) {
        const batch = imageArray.slice(i, i + batchSize);
        
        // 병렬 로드
        await Promise.allSettled(batch.map(async (imgElement) => {
            try {
                const videoLink = imgElement.getAttribute('data-video-link');
                const videoId = imgElement.getAttribute('data-video-id');
                
                if (!videoLink || !videoLink.includes('instagram.com')) return;
                
                const thumbnailUrl = await getInstagramThumbnail(videoLink);
                console.log('🔍 썸네일 URL 확인:', thumbnailUrl);
                
                if (thumbnailUrl) {
                    // 프록시 URL이나 실제 이미지 URL인 경우 모두 처리
                    imgElement.src = thumbnailUrl;
                    imgElement.removeAttribute('data-needs-thumbnail');
                    console.log('✅ 썸네일 로드 성공:', videoId, thumbnailUrl);
                }
            } catch (error) {
                console.error('❌ 썸네일 로드 실패:', error);
            }
        }));
        
        // 다음 배치 전 잠시 대기 (과부하 방지)
        if (i + batchSize < imageArray.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    // 기존 방식도 함께 지원 (id 기반)
    for (let i = 0; i < videos.length; i += batchSize) {
        const batch = videos.slice(i, i + batchSize);
        
        await Promise.allSettled(batch.map(async (video) => {
            try {
                const videoLink = video.comments;
                if (!videoLink || !videoLink.includes('instagram.com')) return;
                
                // id 기반 이미지 요소가 있는 경우
                const imgElement = document.getElementById(`thumbnail-${video.id}`);
                if (imgElement && !imgElement.hasAttribute('data-needs-thumbnail')) {
                    const thumbnailUrl = await getInstagramThumbnail(videoLink);
                    if (thumbnailUrl && !thumbnailUrl.includes('data:image')) {
                        imgElement.src = thumbnailUrl;
                        console.log('✅ 썸네일 로드 성공 (id):', video.id);
                    }
                }
            } catch (error) {
                console.error('❌ 썸네일 로드 실패 (id):', video.id, error);
            }
        }));
        
        if (i + batchSize < videos.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    console.log('✅ 모든 썸네일 로드 시도 완료');
}

// 인라인 영상 재생 (박스 내에서 직접 재생)
function playInlineVideo(element, videoUrl) {
    console.log('🎬 인라인 영상 재생:', videoUrl);
    
    // 재생 버튼이 있는 컨테이너 찾기
    const container = element.parentElement;
    
    // Instagram 영상 ID 추출
    const reelMatch = videoUrl.match(/instagram\.com\/reels?\/([A-Za-z0-9_-]+)/);
    const postMatch = videoUrl.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/);
    const mediaId = reelMatch ? reelMatch[1] : (postMatch ? postMatch[1] : null);
    
    if (!mediaId) {
        console.error('Instagram 미디어 ID를 찾을 수 없습니다');
        openInstagramLink(videoUrl);
        return;
    }
    
    // 기존 이미지와 오버레이 숨기기
    const img = container.querySelector('img');
    const overlays = container.querySelectorAll('[class*="overlay"]');
    
    if (img) img.style.display = 'none';
    overlays.forEach(overlay => overlay.style.display = 'none');
    
    // Instagram embed iframe 생성
    const embedUrl = `https://www.instagram.com/p/${mediaId}/embed/`;
    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameborder = '0';
    iframe.scrolling = 'no';
    iframe.allowtransparency = 'true';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.borderRadius = '8px';
    
    // 닫기 버튼 추가
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        font-size: 18px;
        cursor: pointer;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeBtn.onclick = function() {
        iframe.remove();
        closeBtn.remove();
        if (img) img.style.display = 'block';
        overlays.forEach(overlay => overlay.style.display = 'flex');
    };
    
    // iframe과 닫기 버튼 추가
    container.appendChild(iframe);
    container.appendChild(closeBtn);
}

// 전체화면 영상 재생 (기존 함수 유지)
function playFullVideo(videoUrl) {
    console.log('🎬 전체화면 영상 재생:', videoUrl);
    
    // 바로 Instagram에서 열기 (iframe 에러 방지)
    openInstagramLink(videoUrl);
}

// 영상 직접 재생 (모달) - 기존 함수 유지
function playVideoDirectly(videoUrl, videoId) {
    console.log('🎬 영상 직접 재생:', videoUrl);
    
    const embedUrl = getInstagramEmbedUrl(videoUrl);
    
    if (embedUrl) {
        // 모달 생성
        const modal = document.createElement('div');
        modal.id = 'video-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 12px;
                padding: 20px;
                max-width: 400px;
                width: 90%;
                max-height: 600px;
                position: relative;
            ">
                <button onclick="closeVideoModal()" style="
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                ">×</button>
                <h3 style="margin-bottom: 15px; color: #333;">Instagram 릴스</h3>
                <iframe 
                    src="${embedUrl}" 
                    width="100%" 
                    height="500" 
                    frameborder="0" 
                    scrolling="no" 
                    allowtransparency="true">
                </iframe>
                <div style="margin-top: 15px; text-align: center;">
                    <button onclick="openInstagramLink('${videoUrl}')" style="
                        background: #E4405F;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        margin-right: 10px;
                    ">📱 Instagram에서 보기</button>
                    <button onclick="closeVideoModal()" style="
                        background: #666;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                    ">닫기</button>
                </div>
            </div>
        `;
        
        // 모달 외부 클릭시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeVideoModal();
            }
        });
        
        document.body.appendChild(modal);
    } else {
        // embed가 안되면 새 탭에서 열기
        openInstagramLink(videoUrl);
    }
}

// 비디오 모달 닫기
function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    if (modal) {
        modal.remove();
    }
}

// Instagram 링크 열기 (기존 함수명 변경)
function openInstagramLink(videoUrl) {
    if (videoUrl && videoUrl !== '#') {
        console.log('📱 Instagram에서 열기:', videoUrl);
        window.open(videoUrl, '_blank');
    } else {
        alert('영상 링크를 찾을 수 없습니다.');
    }
}

// 검색 기능
async function searchVideos() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const platformFilter = document.getElementById('platformFilter');
    
    const searchTerm = searchInput?.value || '';
    const category = categoryFilter?.value || '';
    const platform = platformFilter?.value || '';
    
    console.log('🔍 검색 실행:', { searchTerm, category, platform });
    
    UI.showLoading('영상 검색 중...');
    
    try {
        const response = await API.getVideos();
        
        if (response && response.success && response.data) {
            let filteredVideos = response.data;
            
            // 검색어 필터링
            if (searchTerm) {
                filteredVideos = filteredVideos.filter(video => 
                    video.mainCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    video.middleCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    video.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
                );
            }
            
            // 카테고리 필터링
            if (category) {
                filteredVideos = filteredVideos.filter(video => 
                    video.mainCategory === category
                );
            }
            
            // 플랫폼 필터링
            if (platform) {
                filteredVideos = filteredVideos.filter(video => 
                    video.platform.toLowerCase() === platform.toLowerCase()
                );
            }
            
            displayRealVideos(filteredVideos);
            console.log(`🎯 검색 완료: ${filteredVideos.length}개 결과`);
            
            if (filteredVideos.length === 0) {
                showNoSearchResultsMessage(searchTerm, category, platform);
            }
        } else {
            showErrorMessage('검색을 위한 데이터를 불러올 수 없습니다.');
        }
    } catch (error) {
        console.error('❌ 검색 실패:', error);
        showErrorMessage('검색 중 오류가 발생했습니다.');
    }
    
    UI.hideLoading();
}

// 검색 결과 없음 메시지
function showNoSearchResultsMessage(searchTerm, category, platform) {
    const videoGrid = document.querySelector('.video-grid');
    const filters = [];
    if (searchTerm) filters.push(`키워드: "${searchTerm}"`);
    if (category) filters.push(`카테고리: ${category}`);
    if (platform) filters.push(`플랫폼: ${platform}`);
    
    videoGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h3 style="color: #666; margin-bottom: 1rem;">🔍 검색 결과가 없습니다</h3>
            <p style="color: #999; margin-bottom: 1rem;">검색 조건: ${filters.join(', ')}</p>
            <p style="color: #999; margin-bottom: 2rem;">다른 키워드나 필터로 다시 검색해보세요.</p>
            <button onclick="loadRealVideos()" style="background: #1976d2; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">🔄 전체 영상 보기</button>
        </div>
    `;
}

// 서버 연결 테스트
async function testServerConnection() {
    console.log('🔌 서버 연결 테스트 시작...');
    
    try {
        const health = await API.checkHealth();
        if (health) {
            console.log('✅ 서버 연결 성공:', health);
            alert(`✅ 서버 연결 성공!\n상태: ${health.status}\n가동시간: ${health.uptime?.toFixed(1)}초`);
            
            // 서버 연결이 성공하면 즉시 데이터 새로고침
            console.log('🔄 데이터 새로고침 시작...');
            await loadRealStats();
        } else {
            console.error('❌ 서버 연결 실패');
            alert('❌ 서버 연결 실패');
        }
    } catch (error) {
        console.error('❌ 서버 연결 에러:', error);
        alert('❌ 서버 연결 에러: ' + error.message);
    }
}

// 페이지 로드 완료 - 실제 데이터 로드
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 대시보드 로딩 완료!');
    console.log('📊 실제 데이터 로드 시작...');
    
    // 실제 통계 데이터 로드
    await loadRealStats();
    
    // 기본 탭(videos)의 실제 영상 데이터 로드
    await loadRealVideos();
    
    // 할당량 정보 로드
    try {
        const quotaStatus = await API.getQuotaStatus();
        if (quotaStatus) {
            updateStatCard('남은 Quota', quotaStatus.remaining || 'N/A');
        }
    } catch (error) {
        console.error('할당량 정보 로드 실패:', error);
    }
    
    console.log('💡 트렌딩 탭에서 "최신 트렌드 수집"을 시작하세요.');
});

// 🚀 Lazy Loading 구현
function initializeLazyLoading() {
    // Intersection Observer 지원 확인
    if (!('IntersectionObserver' in window)) {
        console.warn('⚠️ Intersection Observer 미지원 - 모든 iframe 즉시 로드');
        loadAllIframes();
        return;
    }
    
    // Intersection Observer 설정
    const observerOptions = {
        root: null, // viewport 기준
        rootMargin: '50px', // 화면에 나타나기 50px 전에 로드 시작
        threshold: 0.1 // 10% 보이면 로드 시작
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 즉시 로드 (원래대로)
                loadIframe(entry.target);
                observer.unobserve(entry.target); // 한 번 로드하면 관찰 중단
            }
        });
    }, observerOptions);
    
    // 모든 lazy iframe 요소 관찰 시작
    const lazyIframes = document.querySelectorAll('.lazy-iframe');
    console.log(`🔍 ${lazyIframes.length}개 Instagram iframe을 Lazy Loading으로 관찰 시작`);
    
    lazyIframes.forEach(iframe => {
        observer.observe(iframe);
    });
}

// 개별 iframe 로드
function loadIframe(container) {
    const embedUrl = container.getAttribute('data-src');
    if (!embedUrl) return;
    
    console.log('📺 Instagram iframe 로드 시작:', embedUrl);
    
    // 로딩 표시 업데이트
    const placeholder = container.querySelector('.lazy-placeholder');
    if (placeholder) {
        placeholder.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 10px;">⏳</div>
            <div>Instagram 영상 로드 중...</div>
        `;
    }
    
    // 실제 iframe 생성
    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.scrolling = 'no';
    iframe.allowTransparency = 'true';
    iframe.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;';
    
    // iframe 로드 완료 이벤트
    iframe.onload = () => {
        console.log('✅ Instagram iframe 로드 완료');
        if (placeholder) {
            placeholder.remove();
        }
    };
    
    iframe.onerror = () => {
        console.error('❌ Instagram iframe 로드 실패');
        if (placeholder) {
            placeholder.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
                <div>영상 로드 실패</div>
            `;
        }
    };
    
    // container에 iframe 추가
    container.appendChild(iframe);
    container.style.background = '#000'; // 로딩 중 배경
}

// Intersection Observer 미지원 시 모든 iframe 즉시 로드
function loadAllIframes() {
    const lazyIframes = document.querySelectorAll('.lazy-iframe');
    lazyIframes.forEach(container => {
        loadIframe(container);
    });
}

console.log('📄 dashboard.js 로드 완료 - UI는 그대로, 성능만 최적화!');