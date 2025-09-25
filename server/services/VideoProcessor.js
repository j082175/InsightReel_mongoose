const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const ffmpegPath = require('ffmpeg-static');
const ytdl = require('@distube/ytdl-core');
const TikTokAPI = require('@tobyg74/tiktok-api-dl');
const { ServerLogger } = require('../utils/logger');
const youtubeBatchProcessor = require('./YouTubeBatchProcessor');
const HybridYouTubeExtractor = require('./HybridYouTubeExtractor');
const HybridDataConverter = require('./HybridDataConverter');

const { PLATFORMS } = require('../config/api-messages');

// yt-dlp 자동 업데이트 쿨다운 (1시간)
let lastYtDlpUpdate = 0;
const UPDATE_COOLDOWN = 60 * 60 * 1000; // 1시간


// YouTube 카테고리 매핑
const YOUTUBE_CATEGORIES = {
    1: '영화/애니메이션',
    2: '자동차/교통',
    10: '음악',
    15: '애완동물/동물',
    17: '스포츠',
    19: '여행/이벤트',
    20: '게임',
    22: '인물/블로그',
    23: '코미디',
    24: '엔터테인먼트',
    25: '뉴스/정치',
    26: '노하우/스타일',
    27: '교육',
    28: '과학기술',
    29: '비영리/사회운동',
};

// YouTube 카테고리와 AI 카테고리 매핑 (유사도 기반)
const YOUTUBE_TO_AI_CATEGORY_MAPPING = {
    '영화/애니메이션': ['엔터테인먼트', '영화', '애니메이션', '영상'],
    '자동차/교통': ['차량', '자동차', '교통', '운송'],
    음악: ['음악', '노래', '뮤직', '가요'],
    '애완동물/동물': ['자연', '동물', '펫', '애완동물'],
    스포츠: ['스포츠', '운동', '체육'],
    '여행/이벤트': ['라이프스타일', '여행', '문화'],
    게임: ['엔터테인먼트', '게임'],
    '인물/블로그': ['라이프스타일', '일상', '개인'],
    코미디: ['엔터테인먼트', '코미디', '재미'],
    엔터테인먼트: ['엔터테인먼트', '오락'],
    '뉴스/정치': ['사회', '뉴스', '정치'],
    '노하우/스타일': ['뷰티', '패션', '라이프스타일'],
    교육: ['문화/교육/기술', '교육', '학습'],
    과학기술: ['문화/교육/기술', '기술', '과학'],
    '비영리/사회운동': ['사회', '공익'],
};

// ffprobe 경로 설정
let ffprobePath;
try {
    ffprobePath = require('ffprobe-static').path;
} catch (error) {
    ServerLogger.warn(
        'ffprobe-static 패키지가 없습니다. ffmpeg으로 대체합니다.',
    );
    ffprobePath = ffmpegPath;
}

class VideoProcessor {
    constructor() {
        this.downloadDir = path.join(__dirname, '../../downloads');
        this.thumbnailDir = path.join(this.downloadDir, 'thumbnails');
        this.youtubeApiKey = null; // ApiKeyManager에서 동적으로 로드
        this.hybridExtractor = null; // 비동기 초기화
        this._initialized = false;

        // 서비스 레지스트리에 등록
        const serviceRegistry = require('../utils/service-registry');
        serviceRegistry.register(this);

        // 디렉토리 생성
        this.ensureDirectories();
    }

    /**
     * VideoProcessor 비동기 초기화
     */
    async initialize() {
        if (this._initialized) return this;

        try {
            // 하이브리드 YouTube 추출기 초기화
            this.hybridExtractor = new HybridYouTubeExtractor();
            await this.hybridExtractor.initialize();

            this._initialized = true;
            return this;
        } catch (error) {
            ServerLogger.error('VideoProcessor 초기화 실패:', error);
            throw error;
        }
    }

    ensureDirectories() {
        if (!fs.existsSync(this.downloadDir)) {
            fs.mkdirSync(this.downloadDir, { recursive: true });
        }
        if (!fs.existsSync(this.thumbnailDir)) {
            fs.mkdirSync(this.thumbnailDir, { recursive: true });
        }
    }

    async getApiKey() {
        if (!this.youtubeApiKey) {
            const apiKeyManager = require('./ApiKeyManager');
            await apiKeyManager.initialize();
            const activeKeys = await apiKeyManager.getActiveApiKeys();
            if (activeKeys.length === 0) {
                throw new Error('활성화된 API 키가 없습니다. ApiKeyManager에 키를 추가해주세요.');
            }
            this.youtubeApiKey = activeKeys[0];
        }
        return this.youtubeApiKey;
    }

    async downloadVideo(videoUrl, platform, metadata = null) {
        const startTime = Date.now();
        try {
            ServerLogger.info(`🔗 다운로드 시작 - Platform: ${platform}`);
            ServerLogger.info(`🔗 Video URL: ${videoUrl}`);

            // URL 유효성 검사 추가 🆕
            if (!videoUrl || typeof videoUrl !== 'string') {
                throw new Error(`잘못된 URL 형식: ${videoUrl}`);
            }

            ServerLogger.info(
                `🔗 URL 첫 100자: ${videoUrl.substring(0, 100)}...`,
            );

            // blob URL 체크
            if (videoUrl.startsWith('blob:')) {
                throw new Error(
                    'Blob URL은 클라이언트에서 처리해야 합니다. 서버에서는 접근할 수 없습니다.',
                );
            }

            // 파일명 생성
            const timestamp = Date.now();
            const filename = `${platform}_${timestamp}.mp4`;
            const filePath = path.join(this.downloadDir, filename);

            ServerLogger.info(`📁 저장 경로: ${filePath}`);

            // 플랫폼별 다운로드 로직
            ServerLogger.info(`🔍 플랫폼 감지: platform=${platform}, PLATFORMS.INSTAGRAM=${PLATFORMS.INSTAGRAM}`);
            ServerLogger.info(`🔍 URL 체크: isInstagramUrl=${this.isInstagramUrl(videoUrl)}`);

            if (platform === PLATFORMS.YOUTUBE || this.isYouTubeUrl(videoUrl)) {
                ServerLogger.info(`📺 YouTube 플랫폼 감지됨 - yt-dlp로 다운로드`);
                return await this.downloadWithYtDlp(videoUrl, filePath, startTime);
            } else if (platform === PLATFORMS.INSTAGRAM || this.isInstagramUrl(videoUrl)) {
                ServerLogger.info(`📸 Instagram 플랫폼 감지됨 - 전용 다운로드 함수 호출`);
                return await this.downloadInstagramVideo(
                    videoUrl,
                    filePath,
                    startTime,
                );
            } else if (platform === PLATFORMS.TIKTOK || this.isTikTokUrl(videoUrl)) {
                ServerLogger.info(`🎵 TikTok 플랫폼 감지됨 - yt-dlp로 다운로드`);
                return await this.downloadWithYtDlp(videoUrl, filePath, startTime);
            } else {
                // 다른 플랫폼은 기존 방식 사용
                ServerLogger.info(`🌐 일반 플랫폼으로 처리: ${platform || 'unknown'}`);
                return await this.downloadGenericVideo(
                    videoUrl,
                    filePath,
                    startTime,
                );
            }
        } catch (error) {
            ServerLogger.error('비디오 다운로드 에러:', error);

            // blob URL 에러인 경우 더 명확한 메시지
            if (error.message.includes('Blob URL')) {
                throw new Error(
                    'Blob URL은 클라이언트에서 파일로 전송해주세요. process-video-blob 엔드포인트를 사용하세요.',
                );
            }

            throw new Error(`비디오 다운로드 실패: ${error.message}`);
        }
    }

    // YouTube URL 체크 함수
    isYouTubeUrl(url) {
        return url.includes('youtube.com') || url.includes('youtu.be');
    }

    // Instagram URL 체크 함수
    isInstagramUrl(url) {
        if (!url || typeof url !== 'string') return false;
        const isInstagram = url.includes('instagram.com');
        ServerLogger.info(`🔍 Instagram URL 체크: "${url}" -> ${isInstagram}`);
        return isInstagram;
    }

    // TikTok URL 체크 함수
    isTikTokUrl(url) {
        if (!url || typeof url !== 'string') return false;
        const isTikTok = url.includes('tiktok.com') || url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com');
        ServerLogger.info(`🔍 TikTok URL 체크: "${url}" -> ${isTikTok}`);
        return isTikTok;
    }

    // YouTube 전용 다운로드 함수
    async downloadYouTubeVideo(videoUrl, filePath, startTime) {
        ServerLogger.info(`🎬 YouTube 전용 다운로드 시작`);

        try {
            // @distube/ytdl-core로 스트림 생성 (더 안정적)
            const videoStream = ytdl(videoUrl, {
                quality: 'highest',
                filter: 'videoandaudio',
                requestOptions: {
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    },
                },
            });

            // 파일 스트림 생성
            const writer = fs.createWriteStream(filePath);
            videoStream.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    try {
                        const endTime = Date.now();
                        const downloadTime = endTime - startTime;
                        const stats = fs.statSync(filePath);
                        ServerLogger.info(`✅ YouTube 비디오 다운로드 완료`);
                        ServerLogger.info(
                            `📊 파일 크기: ${(stats.size / 1024 / 1024).toFixed(
                                2,
                            )} MB`,
                        );
                        ServerLogger.info(
                            `⏱️ 다운로드 소요시간: ${downloadTime}ms (${(
                                downloadTime / 1000
                            ).toFixed(2)}초)`,
                        );
                        resolve(filePath);
                    } catch (error) {
                        ServerLogger.error('파일 정보 확인 실패:', error);
                        resolve(filePath); // 파일은 다운로드됐으므로 resolve
                    }
                });

                writer.on('error', (error) => {
                    ServerLogger.error('YouTube 비디오 다운로드 실패:', error);
                    reject(error);
                });

                videoStream.on('error', (error) => {
                    ServerLogger.error('YouTube 스트림 에러:', error);
                    reject(error);
                });
            });
        } catch (error) {
            ServerLogger.error('YouTube 다운로드 에러:', error);
            throw new Error(`YouTube 비디오 다운로드 실패: ${error.message}`);
        }
    }

    // Instagram 전용 다운로드 함수
    async downloadInstagramVideo(videoUrl, filePath, startTime) {
        ServerLogger.info(`📸 Instagram 전용 다운로드 시작`);
        ServerLogger.info(`🔗 Instagram URL: ${videoUrl}`);

        try {
            // Instagram Reels URL에서 실제 비디오 URL 추출
            const directVideoUrl = await this.extractInstagramVideoUrl(videoUrl);

            if (!directVideoUrl) {
                throw new Error('Instagram 비디오 URL 추출 실패');
            }

            ServerLogger.info(`✅ 추출된 비디오 URL: ${directVideoUrl.substring(0, 100)}...`);

            // 추출된 URL로 비디오 다운로드
            const response = await axios({
                method: 'GET',
                url: directVideoUrl,
                responseType: 'stream',
                timeout: 60000, // Instagram은 더 긴 타임아웃 (60초)
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                    'Accept': 'video/webm,video/ogg,video/*,*/*;q=0.9',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'identity',
                    'Range': 'bytes=0-',
                    'Referer': 'https://www.instagram.com/'
                }
            });

            ServerLogger.info(`📦 Instagram Response status: ${response.status}`);
            ServerLogger.info(`📦 Content-Type: ${response.headers['content-type']}`);

            // Content-Type 검증 (비디오가 아니면 에러)
            const contentType = response.headers['content-type'] || '';
            if (!contentType.startsWith('video/')) {
                throw new Error(`잘못된 Content-Type: ${contentType}. 비디오가 아닌 것 같습니다.`);
            }

            // 파일 스트림 생성
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    try {
                        const endTime = Date.now();
                        const downloadTime = endTime - startTime;
                        const stats = fs.statSync(filePath);

                        // 파일 크기 검증 (너무 작으면 에러일 가능성)
                        if (stats.size < 1024) {
                            throw new Error(`다운로드된 파일이 너무 작습니다 (${stats.size} bytes)`);
                        }

                        ServerLogger.info(`✅ Instagram 비디오 다운로드 완료`);
                        ServerLogger.info(`📊 파일 크기: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                        ServerLogger.info(`⏱️ 다운로드 소요시간: ${downloadTime}ms (${(downloadTime / 1000).toFixed(2)}초)`);
                        resolve(filePath);
                    } catch (error) {
                        ServerLogger.error('Instagram 파일 정보 확인 실패:', error);
                        reject(error);
                    }
                });

                writer.on('error', (error) => {
                    ServerLogger.error('Instagram 비디오 다운로드 실패:', error);
                    reject(error);
                });
            });
        } catch (error) {
            ServerLogger.error('Instagram 다운로드 에러:', error);
            throw new Error(`Instagram 비디오 다운로드 실패: ${error.message}`);
        }
    }

    // Instagram URL에서 실제 비디오 URL 추출
    async extractInstagramVideoUrl(instagramUrl) {
        try {
            ServerLogger.info('📸 Instagram 페이지 분석 시작...');

            // Instagram 페이지 HTML 가져오기
            const response = await axios({
                method: 'GET',
                url: instagramUrl,
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            });

            const html = response.data;
            ServerLogger.info(`📄 HTML 페이지 크기: ${html.length} 문자`);

            // JSON 데이터에서 비디오 URL 찾기 (여러 패턴 시도)
            const patterns = [
                /"video_url":"([^"]+)"/g,
                /"src":"([^"]+\.mp4[^"]*)"/g,
                /video_url":{"url":"([^"]+)"/g,
                /"video_versions":\[{"url":"([^"]+)"/g
            ];

            for (const pattern of patterns) {
                const matches = html.match(pattern);
                if (matches && matches.length > 0) {
                    const match = matches[0];
                    const urlMatch = match.match(/"([^"]+\.mp4[^"]*)"/);
                    if (urlMatch && urlMatch[1]) {
                        let videoUrl = urlMatch[1];
                        // URL 디코딩
                        videoUrl = videoUrl.replace(/\\u0026/g, '&');
                        videoUrl = videoUrl.replace(/\\\//g, '/');

                        ServerLogger.info(`✅ 비디오 URL 패턴 매칭 성공: ${pattern}`);
                        return videoUrl;
                    }
                }
            }

            // 대체 방법: meta property og:video 태그 찾기
            const metaPattern = /<meta property="og:video" content="([^"]+)"/;
            const metaMatch = html.match(metaPattern);
            if (metaMatch && metaMatch[1]) {
                ServerLogger.info('✅ og:video 메타 태그에서 URL 추출 성공');
                return metaMatch[1];
            }

            ServerLogger.error('❌ Instagram 비디오 URL을 찾을 수 없습니다');
            ServerLogger.error(`📄 HTML 샘플: ${html.substring(0, 500)}...`);
            throw new Error('Instagram 비디오 URL 추출 실패');

        } catch (error) {
            ServerLogger.error('Instagram URL 추출 에러:', error);
            throw error;
        }
    }


    // 일반 플랫폼용 다운로드 함수 (기존 로직)
    async downloadGenericVideo(videoUrl, filePath, startTime) {
        ServerLogger.info(`🌐 일반 비디오 다운로드 시작`);

        // 비디오 다운로드
        const response = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            timeout: 30000, // 30초 타임아웃
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        ServerLogger.info(`📦 Response status: ${response.status}`);
        ServerLogger.info(
            `📦 Content-Type: ${response.headers['content-type']}`,
        );
        ServerLogger.info(
            `📦 Content-Length: ${response.headers['content-length']}`,
        );

        // 파일 스트림 생성
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                try {
                    const endTime = Date.now();
                    const downloadTime = endTime - startTime;
                    const stats = fs.statSync(filePath);
                    ServerLogger.info(`✅ 일반 비디오 다운로드 완료`);
                    ServerLogger.info(
                        `📊 파일 크기: ${(stats.size / 1024 / 1024).toFixed(
                            2,
                        )} MB`,
                    );
                    ServerLogger.info(
                        `⏱️ 다운로드 소요시간: ${downloadTime}ms (${(
                            downloadTime / 1000
                        ).toFixed(2)}초)`,
                    );
                    resolve(filePath);
                } catch (error) {
                    ServerLogger.error('파일 정보 확인 실패:', error);
                    resolve(filePath); // 파일은 다운로드됐으므로 resolve
                }
            });
            writer.on('error', (error) => {
                ServerLogger.error('일반 비디오 다운로드 실패:', error);
                reject(error);
            });
        });
    }


    // yt-dlp를 사용한 범용 다운로드 함수
    async downloadWithYtDlp(videoUrl, filePath, startTime) {
        ServerLogger.info(`🚀 yt-dlp로 비디오 다운로드 시작: ${videoUrl}`);

        try {
            // yt-dlp.exe 경로 (프로젝트 루트)
            const ytdlpExe = path.join(__dirname, '../../yt-dlp.exe');

            // yt-dlp 명령어 구성 (exe 버전)
            const command = `"${ytdlpExe}" -f "best[ext=mp4]/best" -o "${filePath}" --no-playlist --quiet --no-warnings "${videoUrl}"`;

            ServerLogger.info(`📝 실행 명령어: ${command}`);

            // yt-dlp 실행
            const { stdout, stderr } = await execAsync(command, {
                timeout: 120000, // 2분 타임아웃
                maxBuffer: 1024 * 1024 * 10 // 10MB 버퍼
            });

            if (stderr && !stderr.includes('WARNING')) {
                ServerLogger.warn(`⚠️ yt-dlp 경고: ${stderr}`);
            }

            // 파일 다운로드 확인
            if (fs.existsSync(filePath)) {
                const endTime = Date.now();
                const downloadTime = endTime - startTime;
                const stats = fs.statSync(filePath);

                ServerLogger.info(`✅ yt-dlp 다운로드 완료`);
                ServerLogger.info(`📊 파일 크기: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                ServerLogger.info(`⏱️ 소요시간: ${(downloadTime / 1000).toFixed(2)}초`);

                return filePath;
            } else {
                throw new Error('다운로드된 파일을 찾을 수 없습니다');
            }
        } catch (error) {
            ServerLogger.error('yt-dlp 다운로드 실패:', error);

            // TikTok 추출 실패 시 대안 시도
            if (videoUrl.includes('tiktok.com') && error.message.includes('Unable to extract webpage video data')) {
                ServerLogger.warn('🔄 TikTok 추출 실패 - 대안 호스트명으로 재시도');

                try {
                    // 다른 포맷으로 재시도 (exe 버전)
                    const ytdlpExe = path.join(__dirname, '../../yt-dlp.exe');
                    const alternativeCommand = `"${ytdlpExe}" -f "best/best[ext=mp4]" -o "${filePath}" --no-playlist --quiet --no-warnings "${videoUrl}"`;
                    ServerLogger.info(`🔄 대안 명령어: ${alternativeCommand}`);

                    const { stdout, stderr } = await execAsync(alternativeCommand, {
                        timeout: 120000,
                        maxBuffer: 1024 * 1024 * 10
                    });

                    if (fs.existsSync(filePath)) {
                        const endTime = Date.now();
                        const downloadTime = endTime - startTime;
                        ServerLogger.info(`✅ 대안 방법으로 TikTok 다운로드 성공! 소요시간: ${(downloadTime / 1000).toFixed(2)}초`);
                        return filePath;
                    }
                } catch (retryError) {
                    ServerLogger.warn('🚫 대안 방법도 실패 - yt-dlp 자동 업데이트 시도');

                    try {
                        // 쿨다운 체크 (1시간 이내 업데이트 시 스킵)
                        const now = Date.now();
                        if (now - lastYtDlpUpdate < UPDATE_COOLDOWN) {
                            ServerLogger.warn(`⏱️ yt-dlp 업데이트 쿨다운 중 (${Math.round((UPDATE_COOLDOWN - (now - lastYtDlpUpdate)) / 60000)}분 남음)`);
                            throw new Error('업데이트 쿨다운');
                        }

                        const ytdlpExe = path.join(__dirname, '../../yt-dlp.exe');
                        ServerLogger.info('🔧 yt-dlp.exe nightly 버전으로 자동 업데이트 중...');
                        await execAsync(`"${ytdlpExe}" --update-to nightly`, { timeout: 30000 });
                        lastYtDlpUpdate = now; // 업데이트 시간 기록
                        ServerLogger.info('✅ yt-dlp.exe 업데이트 완료 - 재시도 중');

                        // 업데이트 후 재시도 (exe 버전)
                        const updatedCommand = `"${ytdlpExe}" -f "best[ext=mp4]/best" -o "${filePath}" --no-playlist --quiet --no-warnings "${videoUrl}"`;
                        const { stdout, stderr } = await execAsync(updatedCommand, {
                            timeout: 120000,
                            maxBuffer: 1024 * 1024 * 10
                        });

                        if (fs.existsSync(filePath)) {
                            const endTime = Date.now();
                            const downloadTime = endTime - startTime;
                            ServerLogger.info(`🎉 업데이트 후 TikTok 다운로드 성공! 소요시간: ${(downloadTime / 1000).toFixed(2)}초`);
                            return filePath;
                        }

                    } catch (updateError) {
                        ServerLogger.error('❌ yt-dlp 자동 업데이트 실패:', updateError.message);
                        ServerLogger.warn('🚫 썸네일 추출로 폴백 권장');
                    }
                }
            }

            // yt-dlp가 설치되지 않은 경우 (명령을 찾을 수 없는 경우만)
            if (error.message.includes('not found') || error.message.includes('command not found') || error.code === 'ENOENT') {
                throw new Error('yt-dlp가 설치되지 않았습니다. pip install yt-dlp 또는 시스템에 맞는 방법으로 설치해주세요.');
            }

            throw new Error(`비디오 다운로드 실패: ${error.message}`);
        }
    }

    // TikTok 비디오 메타데이터 추출 함수 (v1 → v2 → v3 폭포수 방식)
    async getTikTokVideoInfo(videoUrl) {
        return await this.getTikTokVideoInfoFallback(videoUrl);
    }

    // 기존 TikTok API 폴백 함수 (v1 → v2 → v3)
    async getTikTokVideoInfoFallback(videoUrl) {
        ServerLogger.info(`🔄 기존 라이브러리 폴백 시작 (폭포수 방식): ${videoUrl}`);

        let apiResult = null;
        let usedVersion = null;
        let dataQuality = null;

        // 1차 시도: v1 API (최대 데이터)
        try {
            ServerLogger.info('🏆 v1 API 시도 중 (최고 품질 데이터)...');
            apiResult = await TikTokAPI.Downloader(videoUrl, {
                version: "v1"
            });
            if (apiResult && apiResult.status === "success") {
                usedVersion = "v1";
                dataQuality = "완전";
                ServerLogger.info('✅ v1 API 성공! 완전한 데이터 확보');
            } else {
                throw new Error(`v1 API 실패: ${apiResult?.message || 'Unknown error'}`);
            }
        } catch (v1Error) {
            ServerLogger.warn(`⚠️ v1 API 실패: ${v1Error.message}, v2로 시도`);

            // 2차 시도: v2 API (핵심 통계)
            try {
                ServerLogger.info('🥈 v2 API 시도 중 (핵심 통계 데이터)...');
                apiResult = await TikTokAPI.Downloader(videoUrl, {
                    version: "v2"
                });
                if (apiResult && apiResult.status === "success") {
                    usedVersion = "v2";
                    dataQuality = "부분";
                    ServerLogger.info('✅ v2 API 성공! 핵심 통계 확보');
                } else {
                    throw new Error(`v2 API 실패: ${apiResult?.message || 'Unknown error'}`);
                }
            } catch (v2Error) {
                ServerLogger.warn(`⚠️ v2 API 실패: ${v2Error.message}, v3로 최종 시도`);

                // 3차 시도: v3 API (기본 정보)
                try {
                    ServerLogger.info('🥉 v3 API 최종 시도 중 (기본 정보)...');
                    apiResult = await TikTokAPI.Downloader(videoUrl, {
                        version: "v3"
                    });
                    if (apiResult && apiResult.status === "success") {
                        usedVersion = "v3";
                        dataQuality = "기본";
                        ServerLogger.info('✅ v3 API 성공! 기본 정보 확보');
                    } else {
                        throw new Error(`v3 API도 실패: ${apiResult?.message || 'Unknown error'}`);
                    }
                } catch (v3Error) {
                    ServerLogger.error('❌ 모든 API 버전 실패');
                    throw new Error(`모든 TikTok API 버전 실패 - v1: ${v1Error.message}, v2: ${v2Error.message}, v3: ${v3Error.message}`);
                }
            }
        }

        const videoData = apiResult.result;
        if (!videoData) {
            throw new Error('TikTok 비디오 데이터를 찾을 수 없습니다');
        }

        ServerLogger.info(`🎯 사용된 API 버전: ${usedVersion} (데이터 품질: ${dataQuality})`);

        // 버전별 데이터 파싱 로직
        const parsedData = this.parseTikTokDataByVersion(videoData, usedVersion, videoUrl);

        // API 버전과 원본 응답 데이터 추가
        parsedData.apiVersion = usedVersion;
        parsedData.rawApiResult = apiResult;

        ServerLogger.info(`✅ TikTok 메타데이터 추출 완료 (${usedVersion})`);
        ServerLogger.info(`📊 추출된 정보: 제목="${parsedData.title.substring(0, 50)}...", 조회수=${parsedData.views.toLocaleString()}, 좋아요=${parsedData.likes.toLocaleString()}`);
        if (parsedData.downloadUrl) {
            const urlString = typeof parsedData.downloadUrl === 'string' ? parsedData.downloadUrl : JSON.stringify(parsedData.downloadUrl);
            ServerLogger.info(`🔗 다운로드 URL 확보: ${urlString.substring(0, 50)}...`);
        }

        return parsedData;
    }

    // TikTok API 버전별 데이터 파싱 함수
    parseTikTokDataByVersion(videoData, version, videoUrl) {
        // 공통 기본 정보
        const desc = videoData.desc || '';
        const hashtags = this.extractHashtags(desc);
        const mentions = this.extractMentions(desc);

        // 버전별 특화 파싱
        switch (version) {
            case "v1":
                return this.parseV1TikTokData(videoData, hashtags, mentions, videoUrl);
            case "v2":
                return this.parseV2TikTokData(videoData, hashtags, mentions, videoUrl);
            case "v3":
                return this.parseV3TikTokData(videoData, hashtags, mentions, videoUrl);
            default:
                throw new Error(`지원하지 않는 API 버전: ${version}`);
        }
    }

    // v1 API 데이터 파싱 (완전한 데이터)
    parseV1TikTokData(videoData, hashtags, mentions, videoUrl) {
        const author = videoData.author || {};
        const stats = videoData.statistics || {};
        const music = videoData.music || {};

        // v1에서는 createTime이 Unix timestamp로 제공
        let uploadDate = new Date().toISOString();
        if (videoData.createTime) {
            uploadDate = new Date(videoData.createTime * 1000).toISOString();
        }

        // v1에서는 정확한 duration 제공 가능성
        const duration = music.duration || 30;
        const isShortForm = duration <= 60;

        return {
            // 기본 비디오 정보
            videoId: videoData.id || this.extractTikTokId(videoUrl),
            title: videoData.desc || '제목 없음',
            description: videoData.desc || '',
            channelName: author.nickname || author.uniqueId || '알 수 없음',
            channelId: author.uniqueId || author.uid || '',
            uploadDate: uploadDate,
            thumbnailUrl: author.avatarMedium || author.avatarThumb || '',
            category: '엔터테인먼트',
            youtubeCategory: '엔터테인먼트',

            // v1 완전 통계 정보
            views: parseInt(stats.playCount || 0),
            likes: parseInt(stats.likeCount || 0),
            dislikes: 0,
            comments: parseInt(stats.commentCount || 0),
            shares: parseInt(stats.shareCount || 0),

            // v1 상세 채널 정보
            subscriberCount: 0, // v1에서도 팔로워 수는 제한적
            channelDescription: author.signature || '',
            channelThumbnail: author.avatarMedium || author.avatarThumb || '',
            channelVerified: false,

            // v1 비디오 메타데이터
            duration: duration,
            durationFormatted: this.formatDuration(duration),
            definition: '표준화질',
            contentType: isShortForm ? 'shortform' : 'longform',
            isShortForm: isShortForm,
            platform: 'TIKTOK',

            // v1 완전 음악 정보
            musicTitle: music.title || '',
            musicAuthor: music.author || '',
            musicDuration: music.duration || 0,
            originalSound: music.isOriginalSound || false,

            // 태그 및 해시태그 (v1에서는 hashtag 배열 제공)
            hashtags: videoData.hashtag || hashtags,
            mentions: mentions,
            tags: [...(videoData.hashtag || hashtags), ...mentions],

            // v1 추가 메타데이터
            effectsUsed: [],

            // 다운로드 URL (v1 구조: downloadAddr 또는 playAddr)
            downloadUrl: videoData.video?.downloadAddr ||
                        videoData.video?.playAddr ||
                        videoData.downloadAddr ||
                        videoData.playAddr ||
                        null,
            isCommercial: videoData.isADS || false,
            region: author.region || '',

            // 기본값들
            topComments: '',
            commentSentiment: { positive: 0, negative: 0, neutral: 0 },
            privacy: 'public',
            downloadable: true,
            embeddable: false,
            ageRestricted: false,
            language: 'ko',
            defaultAudioLanguage: '',

            // 처리 메타데이터
            extractedAt: new Date().toISOString(),
            apiSource: 'tiktok-api-v1',
            dataVersion: '1.0.0',
        };
    }

    // v2 API 데이터 파싱 (핵심 통계)
    parseV2TikTokData(videoData, hashtags, mentions, videoUrl) {
        const author = videoData.author || {};
        const stats = videoData.statistics || {};
        const music = videoData.music || {};

        // v2에서 통계는 문자열 형태 ("31.8K" 등)
        const parseStatString = (str) => {
            if (!str) return 0;
            const numStr = str.toString().replace(/[^\d.]/g, '');
            const num = parseFloat(numStr) || 0;
            if (str.includes('K')) return Math.round(num * 1000);
            if (str.includes('M')) return Math.round(num * 1000000);
            return Math.round(num);
        };

        return {
            // 기본 비디오 정보
            videoId: this.extractTikTokId(videoUrl),
            title: videoData.desc || '제목 없음',
            description: videoData.desc || '',
            channelName: author.nickname || '알 수 없음',
            channelId: author.nickname || '',
            uploadDate: new Date().toISOString(),
            thumbnailUrl: author.avatar || '',
            category: '엔터테인먼트',
            youtubeCategory: '엔터테인먼트',

            // v2 부분 통계 정보 (조회수 없음)
            views: 0, // v2에는 조회수 없음
            likes: parseStatString(stats.likeCount),
            dislikes: 0,
            comments: parseStatString(stats.commentCount),
            shares: parseStatString(stats.shareCount),

            // 기본 채널 정보
            subscriberCount: 0,
            channelDescription: '',
            channelThumbnail: author.avatar || '',
            channelVerified: false,

            // 기본 비디오 메타데이터
            duration: 30,
            durationFormatted: '0:30',
            definition: '표준화질',
            contentType: 'shortform',
            isShortForm: true,
            platform: 'TIKTOK',

            // v2 제한적 음악 정보
            musicTitle: '',
            musicAuthor: '',
            musicDuration: 0,
            originalSound: false,

            // 태그 정보
            hashtags: hashtags,
            mentions: mentions,
            tags: [...hashtags, ...mentions],

            // 기본값들
            effectsUsed: [],

            // 다운로드 URL (v2 구조)
            downloadUrl: videoData.video?.watermark ||
                        videoData.video?.noWatermark ||
                        videoData.download?.url ||
                        null,
            isCommercial: false,
            region: '',
            topComments: '',
            commentSentiment: { positive: 0, negative: 0, neutral: 0 },
            privacy: 'public',
            downloadable: true,
            embeddable: false,
            ageRestricted: false,
            language: 'ko',
            defaultAudioLanguage: '',

            // 처리 메타데이터
            extractedAt: new Date().toISOString(),
            apiSource: 'tiktok-api-v2',
            dataVersion: '1.0.0',
        };
    }

    // v3 API 데이터 파싱 (기본 정보)
    parseV3TikTokData(videoData, hashtags, mentions, videoUrl) {
        const author = videoData.author || {};

        return {
            // 기본 비디오 정보만
            videoId: this.extractTikTokId(videoUrl),
            title: videoData.desc || '제목 없음',
            description: videoData.desc || '',
            channelName: author.nickname || '알 수 없음',
            channelId: author.nickname || '',
            uploadDate: new Date().toISOString(),
            thumbnailUrl: author.avatar || '',
            category: '엔터테인먼트',
            youtubeCategory: '엔터테인먼트',

            // v3에는 통계 정보 없음
            views: 0,
            likes: 0,
            dislikes: 0,
            comments: 0,
            shares: 0,

            // 기본값들
            subscriberCount: 0,
            channelDescription: '',
            channelThumbnail: author.avatar || '',
            channelVerified: false,
            duration: 30,
            durationFormatted: '0:30',
            definition: '표준화질',
            contentType: 'shortform',
            isShortForm: true,
            platform: 'TIKTOK',
            musicTitle: '',
            musicAuthor: '',
            musicDuration: 0,
            originalSound: false,
            hashtags: hashtags,
            mentions: mentions,
            tags: [...hashtags, ...mentions],
            effectsUsed: [],

            // 다운로드 URL (v3 구조)
            downloadUrl: videoData.video?.noWatermark ||
                        videoData.video?.watermark ||
                        videoData.download?.url ||
                        null,

            isCommercial: false,
            region: '',
            topComments: '',
            commentSentiment: { positive: 0, negative: 0, neutral: 0 },
            privacy: 'public',
            downloadable: true,
            embeddable: false,
            ageRestricted: false,
            language: 'ko',
            defaultAudioLanguage: '',

            // 처리 메타데이터
            extractedAt: new Date().toISOString(),
            apiSource: 'tiktok-api-v3',
            dataVersion: '1.0.0',
        };
    }

    // 새로운 라이브러리 (@mrnima/tiktok-downloader) 데이터 파싱
    parseNimaTikTokData(videoData, videoUrl) {
        // 기본 해시태그와 멘션 추출
        const desc = videoData.title || videoData.description || '';
        const hashtags = this.extractHashtags(desc);
        const mentions = this.extractMentions(desc);

        // 업로드 날짜 처리
        let uploadDate = new Date().toISOString();
        if (videoData.created_at) {
            uploadDate = new Date(videoData.created_at).toISOString();
        }

        return {
            // 기본 비디오 정보
            videoId: videoData.id || this.extractTikTokId(videoUrl),
            title: videoData.title || videoData.description || '제목 없음',
            description: videoData.description || videoData.title || '',
            channelName: videoData.author?.nickname || videoData.author?.username || '알 수 없음',
            channelId: videoData.author?.username || videoData.author?.unique_id || '',
            uploadDate: uploadDate,
            thumbnailUrl: videoData.author?.avatar || videoData.cover || '',
            category: '엔터테인먼트',
            youtubeCategory: '엔터테인먼트',

            // 새 라이브러리 통계 정보
            views: parseInt(videoData.stats?.views || videoData.view_count || 0),
            likes: parseInt(videoData.stats?.likes || videoData.like_count || 0),
            dislikes: 0,
            comments: parseInt(videoData.stats?.comments || videoData.comment_count || 0),
            shares: parseInt(videoData.stats?.shares || videoData.share_count || 0),

            // 채널 정보
            subscriberCount: parseInt(videoData.author?.followers || 0),
            channelDescription: videoData.author?.signature || '',
            channelThumbnail: videoData.author?.avatar || '',
            channelVerified: videoData.author?.verified || false,

            // 플랫폼별 정보
            platform: PLATFORMS.TIKTOK,
            platformVideoId: videoData.id || this.extractTikTokId(videoUrl),

            // 미디어 정보
            duration: parseInt(videoData.duration || 30),
            width: parseInt(videoData.width || 0),
            height: parseInt(videoData.height || 0),
            fps: 30,
            quality: 'HD',
            format: 'mp4',

            // 유형 분류
            isShortForm: true,
            contentType: 'shortform',

            // 음악/오디오 정보
            musicTitle: videoData.music?.title || '',
            musicAuthor: videoData.music?.author || '',
            musicDuration: parseInt(videoData.music?.duration || 0),
            originalSound: videoData.music?.original || false,
            hashtags: hashtags,
            mentions: mentions,
            tags: [...hashtags, ...mentions],
            effectsUsed: [],

            // 다운로드 URL (새 라이브러리 구조)
            downloadUrl: videoData.download?.url ||
                        videoData.video_url ||
                        videoData.play_url ||
                        null,

            isCommercial: false,
            region: '',
            topComments: '',
            commentSentiment: { positive: 0, negative: 0, neutral: 0 },
            privacy: 'public',
            downloadable: true,
            embeddable: false,
            ageRestricted: false,
            language: 'ko',
            defaultAudioLanguage: '',

            // 처리 메타데이터
            extractedAt: new Date().toISOString(),
            apiSource: 'mrnima-tiktok-downloader',
            dataVersion: '1.0.0',
        };
    }

    // TikTok URL에서 비디오 ID 추출
    extractTikTokId(url) {
        try {
            // TikTok URL 패턴들
            const patterns = [
                /tiktok\.com\/.+\/video\/(\d+)/,
                /vm\.tiktok\.com\/([A-Za-z0-9]+)/,
                /vt\.tiktok\.com\/([A-Za-z0-9]+)/,
                /tiktok\.com\/t\/([A-Za-z0-9]+)/
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                    return match[1];
                }
            }

            // 패턴 매칭 실패 시 URL에서 숫자만 추출
            const numbers = url.match(/(\d{10,})/);
            if (numbers) {
                return numbers[1];
            }

            // 최후의 수단: URL 해시 생성
            return 'tiktok_' + Buffer.from(url).toString('base64').substring(0, 10);
        } catch (error) {
            ServerLogger.warn(`TikTok ID 추출 실패, 기본값 사용: ${error.message}`);
            return 'tiktok_unknown_' + Date.now();
        }
    }

    async generateThumbnail(videoPath, analysisType = 'multi-frame') {
        const startTime = Date.now();
        try {
            const videoName = path.basename(videoPath, path.extname(videoPath));

            // 파일 타입 확인 - 이미지 파일인지 검사
            const fileType = await this.detectFileType(videoPath);

            if (fileType === 'image') {
                ServerLogger.info(
                    `📷 이미지 파일 감지 - 원본을 썸네일로 복사: ${videoPath}`,
                );
                const timestamp = Date.now();
                const thumbnailPath = path.join(
                    this.thumbnailDir,
                    `${videoName}_thumb_${timestamp}.jpg`,
                );
                fs.copyFileSync(videoPath, thumbnailPath);
                const endTime = Date.now();
                const processingTime = endTime - startTime;
                ServerLogger.info(
                    `✅ 이미지 썸네일 생성 완료: ${path.basename(
                        thumbnailPath,
                    )}`,
                );
                ServerLogger.info(
                    `⏱️ 이미지 처리 소요시간: ${processingTime}ms`,
                );
                return [thumbnailPath]; // 배열로 반환하여 일관성 유지
            }

            // 분석 타입에 따라 다른 처리
            let result;
            if (analysisType === 'multi-frame' || analysisType === 'full') {
                result = await this.generateMultipleFrames(videoPath);
            } else {
                // 기존 단일 썸네일 방식
                result = await this.generateSingleThumbnail(videoPath);
            }

            const endTime = Date.now();
            const processingTime = endTime - startTime;
            ServerLogger.info(
                `⏱️ 썸네일 생성 총 소요시간: ${processingTime}ms (${(
                    processingTime / 1000
                ).toFixed(2)}초)`,
            );
            return result;
        } catch (error) {
            ServerLogger.error('썸네일 생성 실패:', error);
            throw error;
        }
    }

    async generateSingleThumbnail(videoPath) {
        const startTime = Date.now();
        const videoName = path.basename(videoPath, path.extname(videoPath));
        const timestamp = Date.now();
        const thumbnailPath = path.join(
            this.thumbnailDir,
            `${videoName}_thumb_${timestamp}.jpg`,
        );

        ServerLogger.info(
            `🎬 단일 썸네일 생성: ${videoPath} -> ${thumbnailPath}`,
        );

        return new Promise((resolve, reject) => {
            const ffmpeg = spawn(ffmpegPath, [
                '-i',
                videoPath,
                '-ss',
                '00:00:01.000', // 1초 지점에서 추출
                '-vframes',
                '1', // 1프레임만
                '-q:v',
                '2', // 고품질
                '-y', // 덮어쓰기 허용
                thumbnailPath,
            ]);

            let stderrOutput = '';

            ffmpeg.stderr.on('data', (data) => {
                stderrOutput += data.toString();
            });

            ffmpeg.on('close', (code) => {
                const endTime = Date.now();
                const processingTime = endTime - startTime;
                if (code === 0 && fs.existsSync(thumbnailPath)) {
                    ServerLogger.info(
                        `✅ 단일 썸네일 생성 완료: ${path.basename(
                            thumbnailPath,
                        )}`,
                    );
                    ServerLogger.info(
                        `⏱️ FFmpeg 처리 소요시간: ${processingTime}ms`,
                    );
                    resolve([thumbnailPath]); // 배열로 반환
                } else {
                    ServerLogger.error(
                        `❌ FFmpeg 썸네일 생성 실패 (코드: ${code})`,
                    );
                    ServerLogger.error(`📄 FFmpeg stderr:`, stderrOutput);
                    ServerLogger.error(`📁 입력 파일: ${videoPath}`);
                    ServerLogger.error(`📁 출력 파일: ${thumbnailPath}`);
                    reject(new Error(`FFmpeg 실행 실패 (코드: ${code})`));
                }
            });

            ffmpeg.on('error', (error) => {
                ServerLogger.error('❌ FFmpeg 프로세스 에러:', error);
                reject(error);
            });

            ffmpeg.stderr.on('data', (data) => {
                ServerLogger.info(`FFmpeg: ${data}`);
            });
        });
    }

    async generateMultipleFrames(videoPath) {
        const frameStartTime = Date.now();
        try {
            ServerLogger.info(`🎬 다중 프레임 생성 시작: ${videoPath}`);

            // 먼저 비디오 길이 확인
            const duration = await this.getVideoDuration(videoPath);
            ServerLogger.info(`📏 비디오 길이: ${duration}초`);

            // 적절한 프레임 수 결정
            const frameCount = this.calculateOptimalFrameCount(duration);
            const intervals = this.calculateFrameIntervals(
                duration,
                frameCount,
            );

            ServerLogger.info(
                `📸 ${frameCount}개 프레임을 추출합니다: [${intervals
                    .map((t) => `${t}초`)
                    .join(', ')}]`,
            );

            const videoName = path.basename(videoPath, path.extname(videoPath));
            const timestamp = Date.now();
            const framePaths = [];

            // 각 시점별 프레임 추출
            for (let i = 0; i < intervals.length; i++) {
                const time = intervals[i];
                const framePath = path.join(
                    this.thumbnailDir,
                    `${videoName}_frame_${i + 1}_${time}s_${timestamp}.jpg`,
                );

                await this.extractFrameAtTime(videoPath, time, framePath);
                framePaths.push(framePath);
            }

            const frameEndTime = Date.now();
            const frameProcessingTime = frameEndTime - frameStartTime;
            ServerLogger.info(
                `✅ 다중 프레임 생성 완료: ${framePaths.length}개`,
            );
            ServerLogger.info(
                `⏱️ 다중 프레임 생성 소요시간: ${frameProcessingTime}ms (${(
                    frameProcessingTime / 1000
                ).toFixed(2)}초)`,
            );
            return framePaths;
        } catch (error) {
            ServerLogger.error('다중 프레임 생성 실패:', error);
            throw error;
        }
    }

    calculateOptimalFrameCount(duration) {
        if (duration <= 10) return 6; // 10초 이하: 6프레임 (기존 3 → 6)
        if (duration <= 30) return 10; // 30초 이하: 10프레임 (기존 5 → 10)
        if (duration <= 60) return 14; // 60초 이하: 14프레임 (기존 7 → 14)
        return Math.min(20, Math.ceil(duration / 5)); // 5초당 1프레임, 최대 20개 (기존: 10초당 1개, 최대 10개)

        // 1초마다 1프레임씩 추출 (최대 60프레임)
        //return Math.min(60, Math.ceil(duration));
    }

    calculateFrameIntervals(duration, frameCount) {
        if (frameCount === 1) return [Math.min(1, duration / 2)];

        const intervals = [];
        const step = duration / (frameCount + 1); // 양끝 여백 고려

        for (let i = 1; i <= frameCount; i++) {
            const time = Math.round(step * i * 10) / 10; // 소수점 1자리
            // 비디오 길이보다 0.5초 짧게 제한하여 안전 여백 확보
            const safeTime = Math.min(time, duration - 0.5);
            intervals.push(Math.max(0.5, safeTime)); // 최소 0.5초
        }

        return intervals;
    }

    async extractFrameAtTime(videoPath, timeInSeconds, outputPath) {
        const timeString = this.secondsToTimeString(timeInSeconds);

        ServerLogger.info(
            `🔍 프레임 추출 시도: ${timeInSeconds}초 -> ${timeString}`,
        );

        return new Promise((resolve, reject) => {
            const ffmpeg = spawn(ffmpegPath, [
                '-i',
                videoPath,
                '-ss',
                timeString,
                '-vframes',
                '1',
                '-q:v',
                '2',
                '-y',
                outputPath,
            ]);

            let stderrOutput = '';

            ffmpeg.stderr.on('data', (data) => {
                stderrOutput += data.toString();
            });

            ffmpeg.on('close', (code) => {
                if (code === 0 && fs.existsSync(outputPath)) {
                    ServerLogger.info(
                        `✅ 프레임 추출 완료: ${timeString} -> ${path.basename(
                            outputPath,
                        )}`,
                    );
                    resolve(outputPath);
                } else {
                    ServerLogger.error(
                        `❌ FFmpeg 프레임 추출 실패 (코드: ${code})`,
                    );
                    ServerLogger.error(`📄 FFmpeg stderr:`, stderrOutput);
                    ServerLogger.error(`📁 입력 파일: ${videoPath}`);
                    ServerLogger.error(`📁 출력 파일: ${outputPath}`);
                    ServerLogger.error(`⏰ 시간: ${timeString}`);
                    reject(new Error(`프레임 추출 실패 (코드: ${code})`));
                }
            });

            ffmpeg.on('error', (error) => {
                ServerLogger.error(`❌ FFmpeg 프로세스 에러:`, error);
                reject(error);
            });

            ffmpeg.stderr.on('data', (data) => {
                // 다중 프레임에서는 로그 최소화
            });
        });
    }

    async getVideoDuration(videoPath) {
        const startTime = Date.now();
        return new Promise((resolve, reject) => {
            ServerLogger.info(`🔍 비디오 길이 확인 시작: ${videoPath}`);

            const ffprobe = spawn(ffprobePath, [
                '-v',
                'quiet',
                '-print_format',
                'json',
                '-show_format',
                videoPath,
            ]);

            let output = '';
            let errorOutput = '';

            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });

            ffprobe.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ffprobe.on('close', (code) => {
                try {
                    ServerLogger.info(`📊 ffprobe 종료 코드: ${code}`);
                    if (code === 0 && output.trim()) {
                        const info = JSON.parse(output);
                        const duration = parseFloat(info.format.duration);
                        const endTime = Date.now();
                        const processingTime = endTime - startTime;
                        ServerLogger.info(
                            `✅ 비디오 길이 감지 성공: ${duration}초`,
                        );
                        ServerLogger.info(
                            `⏱️ ffprobe 처리 소요시간: ${processingTime}ms`,
                        );
                        resolve(duration);
                    } else {
                        ServerLogger.warn(
                            `⚠️ ffprobe 실패 (코드: ${code}), ffmpeg로 재시도`,
                        );
                        ServerLogger.warn(`📄 ffprobe 오류:`, errorOutput);

                        // ffprobe 실패시 ffmpeg로 재시도
                        this.getVideoDurationWithFFmpeg(videoPath)
                            .then(resolve)
                            .catch(() => {
                                ServerLogger.error(
                                    `❌ ffmpeg로도 실패, 기본값 30초 사용`,
                                );
                                resolve(30);
                            });
                    }
                } catch (error) {
                    ServerLogger.error(`❌ JSON 파싱 실패:`, error.message);
                    ServerLogger.error(`📄 Output:`, output);

                    // 파싱 실패시 ffmpeg로 재시도
                    this.getVideoDurationWithFFmpeg(videoPath)
                        .then(resolve)
                        .catch(() => {
                            ServerLogger.error(
                                `❌ ffmpeg로도 실패, 기본값 30초 사용`,
                            );
                            resolve(30);
                        });
                }
            });
        });
    }

    async getVideoDurationWithFFmpeg(videoPath) {
        const startTime = Date.now();
        return new Promise((resolve, reject) => {
            ServerLogger.info(`🔄 ffmpeg로 비디오 길이 재시도: ${videoPath}`);

            const ffmpeg = spawn(ffmpegPath, [
                '-i',
                videoPath,
                '-f',
                'null',
                '-',
            ]);

            let stderrOutput = '';

            ffmpeg.stderr.on('data', (data) => {
                stderrOutput += data.toString();
            });

            ffmpeg.on('close', (code) => {
                try {
                    // Duration 패턴 찾기: Duration: 00:00:13.30
                    const durationMatch = stderrOutput.match(
                        /Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/,
                    );
                    if (durationMatch) {
                        const hours = parseInt(durationMatch[1]);
                        const minutes = parseInt(durationMatch[2]);
                        const seconds = parseFloat(durationMatch[3]);
                        const totalSeconds =
                            hours * 3600 + minutes * 60 + seconds;
                        const endTime = Date.now();
                        const processingTime = endTime - startTime;
                        ServerLogger.info(
                            `✅ ffmpeg로 비디오 길이 감지 성공: ${totalSeconds}초`,
                        );
                        ServerLogger.info(
                            `⏱️ ffmpeg 처리 소요시간: ${processingTime}ms`,
                        );
                        resolve(totalSeconds);
                    } else {
                        ServerLogger.error(
                            `❌ ffmpeg에서 Duration 찾을 수 없음`,
                        );
                        ServerLogger.error(`📄 stderr:`, stderrOutput);
                        reject(
                            new Error('Duration not found in ffmpeg output'),
                        );
                    }
                } catch (error) {
                    ServerLogger.error(
                        `❌ ffmpeg 출력 파싱 실패:`,
                        error.message,
                    );
                    reject(error);
                }
            });
        });
    }

    secondsToTimeString(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
    }

    /**
     * 설명에서 해시태그 추출
     * @param {string} description - YouTube 설명
     * @returns {Array<string>} 해시태그 배열
     */
    extractHashtags(description) {
        if (!description) return [];

        // #으로 시작하는 단어 추출 (한글, 영어, 숫자, 언더스코어 포함)
        const hashtags = description.match(/#[\w가-힣]+/g) || [];

        // 중복 제거 (# 기호 유지)
        const uniqueHashtags = [...new Set(hashtags)];

        ServerLogger.info(`🏷️ 해시태그 추출: ${uniqueHashtags.length}개 발견`);
        return uniqueHashtags;
    }

    /**
     * 설명에서 멘션(@) 추출
     * @param {string} description - YouTube 설명
     * @returns {Array<string>} 멘션 배열
     */
    extractMentions(description) {
        if (!description) return [];

        // @으로 시작하는 채널명 추출
        const mentions = description.match(/@[\w가-힣._]+/g) || [];

        // 중복 제거 및 @ 제거
        const uniqueMentions = [...new Set(mentions)].map((mention) =>
            mention.substring(1),
        );

        ServerLogger.info(`👤 멘션 추출: ${uniqueMentions.length}개 발견`);
        return uniqueMentions;
    }

    /**
     * YouTube 댓글 수집
     * @param {string} videoId - YouTube 비디오 ID
     * @param {number} maxResults - 가져올 댓글 수 (최대 100)
     * @returns {Object} 댓글 데이터
     */
    async fetchYouTubeComments(videoId, maxResults = 100) {
        try {
            ServerLogger.info(`💬 YouTube 댓글 수집 시작: ${videoId}`);

            const response = await axios.get(
                'https://www.googleapis.com/youtube/v3/commentThreads',
                {
                    params: {
                        part: 'snippet',
                        videoId: videoId,
                        maxResults: Math.min(maxResults, 100), // 최대 100개
                        order: 'relevance', // relevance(관련성) or time(시간순)
                        key: await this.getApiKey(),
                    },
                },
            );

            if (!response.data.items || response.data.items.length === 0) {
                ServerLogger.info('💬 댓글이 없거나 비활성화된 영상');
                return { comments: [], topComments: '' };
            }

            // 댓글 데이터 추출
            const comments = response.data.items.map((item) => {
                const comment = item.snippet.topLevelComment.snippet;
                return {
                    description: comment.textDisplay,
                    channelName: comment.authorDisplayName,
                    likes: comment.likeCount,
                    uploadDate: comment.publishedAt,
                };
            });

            // 모든 댓글을 텍스트로 저장 (스프레드시트용)
            const topComments = comments
                .map((c, i) => `${i + 1}. ${c.channelName}: ${c.description}`)
                .join(' | ');

            ServerLogger.info(`✅ 댓글 수집 완료: ${comments.length}개`);

            return {
                comments: comments,
                topComments: topComments,
                totalCount: comments.length,
            };
        } catch (error) {
            if (
                error.response?.status === 403 &&
                error.response?.data?.error?.errors?.[0]?.reason ===
                    'commentsDisabled'
            ) {
                ServerLogger.info('💬 댓글이 비활성화된 영상');
                return {
                    comments: [],
                    topComments: '댓글 비활성화',
                    totalCount: 0,
                };
            }

            ServerLogger.warn(`⚠️ 댓글 수집 실패: ${error.message}`);
            return { comments: [], topComments: '', totalCount: 0 };
        }
    }

    // YouTube 비디오 ID 추출
    extractYouTubeId(url) {
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]+)/,
            /(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]+)/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        throw new Error('유효하지 않은 YouTube URL입니다.');
    }

    // YouTube 비디오 정보 수집 (배치 처리)
    async getYouTubeVideoInfoBatch(videoUrl, options = {}) {
        try {
            ServerLogger.info(`📦 배치 처리로 YouTube 정보 요청: ${videoUrl}`);
            return await youtubeBatchProcessor.addToBatch(videoUrl, options);
        } catch (error) {
            ServerLogger.error('배치 처리 YouTube 정보 수집 실패:', error);
            throw error;
        }
    }

    // 🚀 하이브리드 YouTube 비디오 정보 수집 (ytdl-core + API)
    async getYouTubeVideoInfo(videoUrl) {
        try {
            const videoId = this.extractYouTubeId(videoUrl);
            ServerLogger.info(
                `🎬 하이브리드 YouTube 정보 수집 시작: ${videoId}`,
            );

            // USE_YTDL_FIRST가 false면 바로 기존 API 방식 사용
            if (process.env.USE_YTDL_FIRST === 'false') {
                ServerLogger.info('🚫 ytdl-core 비활성화, 기존 API 방식 사용');
                return this.getYouTubeVideoInfoLegacy(videoUrl);
            }

            // 하이브리드 추출기 사용
            const result = await this.hybridExtractor.extractVideoData(
                videoUrl,
            );

            if (!result.success) {
                throw new Error(`하이브리드 추출 실패: ${result.error}`);
            }

            const data = result.data;
            ServerLogger.info(`✅ 하이브리드 추출 성공`, {
                sources: result.sources,
                time: `${result.extractionTime}ms`,
            });

            // 기존 포맷에 맞게 변환
            return HybridDataConverter.convertToLegacyFormat(data, videoId);
        } catch (error) {
            ServerLogger.error(
                '하이브리드 YouTube 정보 수집 실패:',
                error.message,
            );

            // 폴백: 기존 API 방식으로 시도
            ServerLogger.info('🔄 기존 API 방식으로 폴백 시도...');
            return this.getYouTubeVideoInfoLegacy(videoUrl);
        }
    }

    // 🔄 기존 API 전용 메서드 (폴백용)
    async getYouTubeVideoInfoLegacy(videoUrl) {
        try {
            // API 키 초기화
            await this.getApiKey();

            const videoId = this.extractYouTubeId(videoUrl);
            ServerLogger.info(`🎬 기존 API 방식 정보 수집: ${videoId}`);

            const response = await axios.get(
                `https://www.googleapis.com/youtube/v3/videos`,
                {
                    params: {
                        part: 'snippet,statistics,contentDetails,status',
                        id: videoId,
                        key: await this.getApiKey(),
                    },
                },
            );

            if (!response.data.items || response.data.items.length === 0) {
                throw new Error('YouTube 비디오를 찾을 수 없습니다.');
            }

            const video = response.data.items[0];
            const snippet = video.snippet;
            const statistics = video.statistics;
            const contentDetails = video.contentDetails;
            const status = video.status;

            // 🔍 DEBUG: 실제 API 응답에서 description 확인
            ServerLogger.info(`🔍 YouTube API snippet.description 원본 확인:`, {
                hasDescription: !!snippet.description,
                descriptionLength: snippet.description?.length || 0,
                descriptionPreview:
                    snippet.description?.substring(0, 200) || '',
                descriptionType: typeof snippet.description,
            });

            // 채널 정보 추가 수집 (구독자 수)
            let channelInfo = null;
            try {
                const channelResponse = await axios.get(
                    `https://www.googleapis.com/youtube/v3/channels`,
                    {
                        params: {
                            part: 'statistics,snippet',
                            id: snippet.channelId,
                            key: await this.getApiKey(),
                        },
                    },
                );

                if (
                    channelResponse.data.items &&
                    channelResponse.data.items.length > 0
                ) {
                    channelInfo = channelResponse.data.items[0];
                }
            } catch (channelError) {
                ServerLogger.warn(
                    '⚠️ 채널 정보 수집 실패 (무시하고 계속):',
                    channelError.message,
                );
            }

            // 카테고리 변환
            const categoryId = snippet.categoryId;
            const categoryName = YOUTUBE_CATEGORIES[categoryId] || '미분류';

            // 비디오 길이를 초 단위로 변환
            const duration = this.parseYouTubeDuration(contentDetails.duration);

            // 숏폼/롱폼 구분 (60초 기준)
            const isShortForm = duration <= 60;
            const contentType = isShortForm ? 'shortform' : 'longform';

            // 해시태그와 멘션 추출
            const hashtags = this.extractHashtags(snippet.description);
            const mentions = this.extractMentions(snippet.description);

            // 댓글 수집 (최대 100개)
            let commentData = { topComments: '', totalCount: 0 };
            if (statistics.commentCount && statistics.commentCount !== '0') {
                commentData = await this.fetchYouTubeComments(videoId, 100);
            }

            // video-types.js 인터페이스 기반 videoInfo 객체 생성
            const videoInfo = {
                // 기본 비디오 정보
                videoId: videoId,
                title: snippet.title,
                description: snippet.description,
                channelName: snippet.channelTitle,
                channelId: snippet.channelId,
                uploadDate: snippet.publishedAt,
                thumbnailUrl:
                    snippet.thumbnails.medium?.url ||
                    snippet.thumbnails.default.url,
                category: categoryName,
                youtubeCategory: categoryName,
                categoryId: categoryId,
                duration: duration,
                durationFormatted: this.formatDuration(duration),
                contentType: contentType,
                isShortForm: isShortForm,
                tags: snippet.tags || [],

                // 통계 정보
                views: statistics.viewCount || '0',
                likes: statistics.likeCount || '0',
                commentsCount: statistics.commentCount || '0',

                // 채널 정보
                subscribers: channelInfo?.statistics?.subscriberCount || '0',
                channelVideos: channelInfo?.statistics?.videoCount || '0',
                channelViews: channelInfo?.statistics?.viewCount || '0',
                channelCountry: channelInfo?.snippet?.country || '',
                channelDescription: channelInfo?.snippet?.description || '',
                youtubeHandle: this.extractYouTubeHandle(
                    channelInfo?.snippet?.customUrl,
                ),
                channelUrl: this.buildChannelUrl(
                    channelInfo?.snippet?.customUrl,
                    snippet.channelId,
                ),

                // 메타데이터
                monetized: status?.madeForKids === false ? 'Y' : 'N',
                ageRestricted: status?.contentRating ? 'Y' : 'N',
                definition: contentDetails?.definition || 'sd',
                language:
                    snippet.defaultLanguage ||
                    snippet.defaultAudioLanguage ||
                    '',
                hashtags: hashtags,
                mentions: mentions,
                topComments: commentData.topComments,
                liveBroadcast: snippet.liveBroadcastContent || 'none',

                // 추가 시스템 정보
                processedAt: snippet.publishedAt,
            };

            ServerLogger.info(`✅ YouTube 정보 수집 완료:`);
            ServerLogger.info(`📺 제목: ${videoInfo.title}`);
            ServerLogger.info(
                `📝 설명: "${videoInfo.description?.substring(0, 100)}${
                    videoInfo.description?.length > 100 ? '...' : ''
                }" (${videoInfo.description?.length || 0}자)`,
            );
            ServerLogger.info(
                `👤 채널: ${videoInfo.channelName}${
                    videoInfo.youtubeHandle
                        ? ` (@${videoInfo.youtubeHandle})`
                        : ''
                } (구독자: ${videoInfo.subscribers})`,
            );
            ServerLogger.info(`🏷️ 카테고리: ${videoInfo.category}`);
            ServerLogger.info(
                `⏱️ 길이: ${videoInfo.durationFormatted} (${videoInfo.contentType})`,
            );
            ServerLogger.info(`👀 조회수: ${videoInfo.views.toLocaleString()}`);
            ServerLogger.info(
                `💰 수익화: ${videoInfo.monetized}, 🎞️ 화질: ${videoInfo.definition}`,
            );
            if (videoInfo.channelUrl) {
                ServerLogger.info(`🔗 채널 URL: ${videoInfo.channelUrl}`);
            }

            return videoInfo;
        } catch (error) {
            ServerLogger.error('YouTube 정보 수집 실패:', error);
            throw new Error(`YouTube 정보 수집 실패: ${error.message}`);
        }
    }

    // YouTube duration (PT4M13S 형식) → 초 단위 변환
    parseYouTubeDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return 0;

        const hours = match[1] ? parseInt(match[1]) : 0;
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const seconds = match[3] ? parseInt(match[3]) : 0;

        return hours * 3600 + minutes * 60 + seconds;
    }

    // 초 단위 → MM:SS 또는 HH:MM:SS 형식 변환
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
                .toString()
                .padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    async getVideoInfo(videoPath) {
        try {
            return new Promise((resolve, reject) => {
                const ffprobe = spawn(ffprobePath, [
                    '-v',
                    'quiet',
                    '-print_format',
                    'json',
                    '-show_format',
                    '-show_streams',
                    videoPath,
                ]);

                let output = '';
                ffprobe.stdout.on('data', (data) => {
                    output += data;
                });

                ffprobe.on('close', (code) => {
                    if (code === 0) {
                        try {
                            const info = JSON.parse(output);
                            resolve(info);
                        } catch (parseError) {
                            reject(parseError);
                        }
                    } else {
                        reject(new Error(`ffprobe 실행 실패 (코드: ${code})`));
                    }
                });
            });
        } catch (error) {
            ServerLogger.error('비디오 정보 추출 실패:', error);
            throw error;
        }
    }

    // 파일 크기 확인
    getFileSize(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return {
                bytes: stats.size,
                mb: (stats.size / (1024 * 1024)).toFixed(2),
            };
        } catch (error) {
            ServerLogger.error('파일 크기 확인 실패:', error);
            return null;
        }
    }

    // 오래된 파일 정리 (7일 이상)
    cleanOldFiles() {
        try {
            const now = Date.now();
            const weekAgo = 7 * 24 * 60 * 60 * 1000; // 7일

            // 다운로드 폴더 정리
            this.cleanDirectory(this.downloadDir, weekAgo, now);

            // 썸네일 폴더 정리
            this.cleanDirectory(this.thumbnailDir, weekAgo, now);

            ServerLogger.info('✅ 오래된 파일 정리 완료');
        } catch (error) {
            ServerLogger.error('파일 정리 실패:', error);
        }
    }

    // 파일 타입 감지 메서드
    async detectFileType(filePath) {
        try {
            // 파일의 첫 몇 바이트를 읽어서 파일 타입 감지
            const buffer = Buffer.alloc(12);
            const fd = fs.openSync(filePath, 'r');
            fs.readSync(fd, buffer, 0, 12, 0);
            fs.closeSync(fd);

            // 매직 넘버로 파일 타입 판별
            const hex = buffer.toString('hex').toLowerCase();

            // JPEG 파일 (FF D8 FF)
            if (hex.startsWith('ffd8ff')) {
                return 'image';
            }

            // PNG 파일 (89 50 4E 47)
            if (hex.startsWith('89504e47')) {
                return 'image';
            }

            // MP4 파일 확인 (더 정확한 감지)
            if (
                hex.includes('667479706d703432') || // ftyp mp42
                hex.includes('667479706d703431') || // ftyp mp41
                hex.includes('6674797069736f6d')
            ) {
                // ftyp isom
                return 'video';
            }

            // WebM 파일 (1A 45 DF A3)
            if (hex.startsWith('1a45dfa3')) {
                return 'video';
            }

            // 기본값은 비디오로 처리
            return 'video';
        } catch (error) {
            ServerLogger.warn(
                '파일 타입 감지 실패, 비디오로 처리:',
                error.message,
            );
            return 'video';
        }
    }

    cleanDirectory(dir, maxAge, now) {
        const files = fs.readdirSync(dir);

        files.forEach((file) => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);

            if (now - stats.mtime.getTime() > maxAge) {
                fs.unlinkSync(filePath);
                ServerLogger.info(`🗑️ 삭제됨: ${file}`);
            }
        });
    }

    /**
     * YouTube 카테고리와 AI 분석 카테고리 일치율 계산
     * @param {string} youtubeCategory - YouTube 공식 카테고리
     * @param {string} aiMainCategory - AI 분석 대카테고리
     * @param {string} aiMiddleCategory - AI 분석 중카테고리
     * @param {string} aiFullPath - AI 분석 전체 경로
     * @returns {Object} 일치율 분석 결과
     */
    compareCategories(
        youtubeCategory,
        aiMainCategory,
        aiMiddleCategory,
        aiFullPath,
    ) {
        try {
            if (!youtubeCategory || !aiMainCategory) {
                return {
                    matchScore: 0,
                    matchType: 'no_data',
                    matchReason: '카테고리 정보 부족',
                };
            }

            const mappedCategories =
                YOUTUBE_TO_AI_CATEGORY_MAPPING[youtubeCategory] || [];

            // 1. 완전 일치 검사 (대카테고리)
            const exactMatch = mappedCategories.find(
                (mapped) =>
                    mapped.toLowerCase() === aiMainCategory.toLowerCase(),
            );

            if (exactMatch) {
                ServerLogger.info(
                    `🎯 완전 일치: YouTube "${youtubeCategory}" ↔ AI "${aiMainCategory}"`,
                );
                return {
                    matchScore: 100,
                    matchType: 'exact',
                    matchReason: `완전 일치: ${youtubeCategory} → ${aiMainCategory}`,
                };
            }

            // 2. 부분 일치 검사 (중카테고리 포함)
            const partialMatch = mappedCategories.find(
                (mapped) =>
                    mapped
                        .toLowerCase()
                        .includes(aiMainCategory.toLowerCase()) ||
                    aiMainCategory
                        .toLowerCase()
                        .includes(mapped.toLowerCase()) ||
                    (aiMiddleCategory &&
                        (mapped
                            .toLowerCase()
                            .includes(aiMiddleCategory.toLowerCase()) ||
                            aiMiddleCategory
                                .toLowerCase()
                                .includes(mapped.toLowerCase()))),
            );

            if (partialMatch) {
                ServerLogger.info(
                    `🔍 부분 일치: YouTube "${youtubeCategory}" ↔ AI "${aiMainCategory}/${aiMiddleCategory}"`,
                );
                return {
                    matchScore: 70,
                    matchType: 'partial',
                    matchReason: `부분 일치: ${youtubeCategory} → ${partialMatch} (AI: ${aiMainCategory})`,
                };
            }

            // 3. 키워드 기반 유사도 검사
            const fullPath =
                aiFullPath || `${aiMainCategory} > ${aiMiddleCategory}`;
            const keywordMatch = this.calculateKeywordSimilarity(
                youtubeCategory,
                fullPath,
            );

            if (keywordMatch.score > 30) {
                ServerLogger.info(
                    `📝 키워드 일치: YouTube "${youtubeCategory}" ↔ AI "${fullPath}" (${keywordMatch.score}%)`,
                );
                return {
                    matchScore: keywordMatch.score,
                    matchType: 'keyword',
                    matchReason: `키워드 유사도: ${keywordMatch.matchedWords.join(
                        ', ',
                    )}`,
                };
            }

            // 4. 불일치
            ServerLogger.warn(
                `❌ 카테고리 불일치: YouTube "${youtubeCategory}" ↔ AI "${aiMainCategory}"`,
            );
            return {
                matchScore: 0,
                matchType: 'mismatch',
                matchReason: `불일치: YouTube(${youtubeCategory}) vs AI(${aiMainCategory})`,
            };
        } catch (error) {
            ServerLogger.error('카테고리 비교 실패:', error);
            return {
                matchScore: 0,
                matchType: 'error',
                matchReason: '비교 중 오류 발생',
            };
        }
    }

    /**
     * 키워드 기반 유사도 계산
     * @param {string} youtubeCategory - YouTube 카테고리
     * @param {string} aiPath - AI 분석 경로
     * @returns {Object} 유사도 결과
     */
    calculateKeywordSimilarity(youtubeCategory, aiPath) {
        const youtubeWords = youtubeCategory.toLowerCase().split(/[\/\s]+/);
        const aiWords = aiPath.toLowerCase().split(/[>\s\/]+/);

        const matchedWords = [];
        let matchCount = 0;

        youtubeWords.forEach((ytWord) => {
            if (ytWord.length > 1) {
                // 1글자 제외
                aiWords.forEach((aiWord) => {
                    if (aiWord.includes(ytWord) || ytWord.includes(aiWord)) {
                        matchedWords.push(ytWord);
                        matchCount++;
                    }
                });
            }
        });

        const totalWords = Math.max(youtubeWords.length, aiWords.length);
        const score =
            totalWords > 0 ? Math.round((matchCount / totalWords) * 100) : 0;

        return {
            score,
            matchedWords: [...new Set(matchedWords)],
            totalWords,
        };
    }

    /**
     * YouTube customUrl에서 핸들명 추출
     * @param {string} customUrl - YouTube customUrl (예: "@channelhandle" 또는 "/c/ChannelName")
     * @returns {string} 추출된 핸들명 (@ 제거된 상태)
     */
    extractYouTubeHandle(customUrl) {
        if (!customUrl) return '';

        try {
            // @로 시작하는 핸들명인 경우
            if (customUrl.startsWith('@')) {
                return customUrl.substring(1); // @ 제거
            }

            // /c/ChannelName 형태인 경우
            if (customUrl.startsWith('/c/')) {
                return customUrl.substring(3); // /c/ 제거
            }

            // /user/UserName 형태인 경우
            if (customUrl.startsWith('/user/')) {
                return customUrl.substring(6); // /user/ 제거
            }

            // 기타 형태는 그대로 반환 (슬래시 제거)
            return customUrl.replace(/^\/+/, '');
        } catch (error) {
            ServerLogger.warn('YouTube 핸들명 추출 실패:', error.message);
            return '';
        }
    }

    /**
     * YouTube 채널 URL 생성
     * @param {string} customUrl - YouTube customUrl
     * @param {string} channelId - 채널 ID (백업용)
     * @returns {string} 채널 URL
     */
    buildChannelUrl(customUrl, channelId) {
        try {
            // customUrl이 있는 경우 우선 사용
            if (customUrl) {
                if (customUrl.startsWith('@')) {
                    // @handle 형태
                    return `https://www.youtube.com/${customUrl}`;
                } else if (customUrl.startsWith('/')) {
                    // /c/ChannelName 형태
                    return `https://www.youtube.com${customUrl}`;
                } else {
                    // 기타 형태는 @ 붙여서 처리
                    return `https://www.youtube.com/@${customUrl}`;
                }
            }

            // customUrl이 없는 경우 channelId로 백업
            if (channelId) {
                return `https://www.youtube.com/channel/${channelId}`;
            }

            return '';
        } catch (error) {
            ServerLogger.warn('YouTube 채널 URL 생성 실패:', error.message);
            // 백업으로 channelId 사용
            return channelId
                ? `https://www.youtube.com/channel/${channelId}`
                : '';
        }
    }

    // API 키 캐시 클리어 (파일 변경 시 호출)
    clearApiKeyCache() {
        this.youtubeApiKey = null;
        ServerLogger.info('🔄 VideoProcessor API 키 캐시 클리어', null, 'VIDEO-PROCESSOR');
    }


}

module.exports = VideoProcessor;
