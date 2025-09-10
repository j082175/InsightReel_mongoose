const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { ServerLogger } = require('../utils/logger');
const { FieldMapper } = require('../types/field-mapper');
const youtubeBatchProcessor = require('./YouTubeBatchProcessor');
const HybridYouTubeExtractor = require('./HybridYouTubeExtractor');
const HybridDataConverter = require('./HybridDataConverter');

// YouTube 카테고리 매핑
const YOUTUBE_CATEGORIES = {
  "1": "영화/애니메이션",
  "2": "자동차/교통", 
  "10": "음악",
  "15": "애완동물/동물",
  "17": "스포츠",
  "19": "여행/이벤트", 
  "20": "게임",
  "22": "인물/블로그",
  "23": "코미디",
  "24": "엔터테인먼트",
  "25": "뉴스/정치",
  "26": "노하우/스타일",
  "27": "교육",
  "28": "과학기술",
  "29": "비영리/사회운동"
};

// YouTube 카테고리와 AI 카테고리 매핑 (유사도 기반)
const YOUTUBE_TO_AI_CATEGORY_MAPPING = {
  "영화/애니메이션": ["엔터테인먼트", "영화", "애니메이션", "영상"],
  "자동차/교통": ["차량", "자동차", "교통", "운송"],
  "음악": ["음악", "노래", "뮤직", "가요"],
  "애완동물/동물": ["자연", "동물", "펫", "애완동물"],
  "스포츠": ["스포츠", "운동", "체육"],
  "여행/이벤트": ["라이프스타일", "여행", "문화"],
  "게임": ["엔터테인먼트", "게임"],
  "인물/블로그": ["라이프스타일", "일상", "개인"],
  "코미디": ["엔터테인먼트", "코미디", "재미"],
  "엔터테인먼트": ["엔터테인먼트", "오락"],
  "뉴스/정치": ["사회", "뉴스", "정치"],
  "노하우/스타일": ["뷰티", "패션", "라이프스타일"],
  "교육": ["문화/교육/기술", "교육", "학습"],
  "과학기술": ["문화/교육/기술", "기술", "과학"],
  "비영리/사회운동": ["사회", "공익"]
};

// ffprobe 경로 설정
let ffprobePath;
try {
  ffprobePath = require('ffprobe-static').path;
} catch (error) {
  console.warn('ffprobe-static 패키지가 없습니다. ffmpeg으로 대체합니다.');
  ffprobePath = ffmpegPath;
}

class VideoProcessor {
  constructor() {
    this.downloadDir = path.join(__dirname, '../../downloads');
    this.thumbnailDir = path.join(this.downloadDir, 'thumbnails');
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
    
    // 🚀 하이브리드 YouTube 추출기 초기화
    this.hybridExtractor = new HybridYouTubeExtractor();
    
    // 디렉토리 생성
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
    if (!fs.existsSync(this.thumbnailDir)) {
      fs.mkdirSync(this.thumbnailDir, { recursive: true });
    }
  }

  async downloadVideo(videoUrl, platform) {
    const startTime = Date.now();
    try {
      ServerLogger.info(`🔗 다운로드 시작 - Platform: ${platform}`);
      ServerLogger.info(`🔗 Video URL: ${videoUrl}`);
      
      // URL 유효성 검사 추가 🆕
      if (!videoUrl || typeof videoUrl !== 'string') {
        throw new Error(`잘못된 URL 형식: ${videoUrl}`);
      }
      
      ServerLogger.info(`🔗 URL 첫 100자: ${videoUrl.substring(0, 100)}...`);
      
      // blob URL 체크
      if (videoUrl.startsWith('blob:')) {
        throw new Error('Blob URL은 클라이언트에서 처리해야 합니다. 서버에서는 접근할 수 없습니다.');
      }
      
      // 파일명 생성
      const timestamp = Date.now();
      const filename = `${platform}_${timestamp}.mp4`;
      const filePath = path.join(this.downloadDir, filename);
      
      ServerLogger.info(`📁 저장 경로: ${filePath}`);
      
      // 비디오 다운로드
      const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream',
        timeout: 30000, // 30초 타임아웃
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      ServerLogger.info(`📦 Response status: ${response.status}`);
      ServerLogger.info(`📦 Content-Type: ${response.headers['content-type']}`);
      ServerLogger.info(`📦 Content-Length: ${response.headers['content-length']}`);
      

      // 파일 스트림 생성
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          try {
            const endTime = Date.now();
            const downloadTime = endTime - startTime;
            const stats = fs.statSync(filePath);
            ServerLogger.info(`✅ 비디오 다운로드 완료: ${filename}`);
            ServerLogger.info(`📊 파일 크기: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            ServerLogger.info(`⏱️ 다운로드 소요시간: ${downloadTime}ms (${(downloadTime / 1000).toFixed(2)}초)`);
            resolve(filePath);
          } catch (error) {
            ServerLogger.error('파일 정보 확인 실패:', error);
            resolve(filePath); // 파일은 다운로드됐으므로 resolve
          }
        });
        writer.on('error', (error) => {
          ServerLogger.error('비디오 다운로드 실패:', error);
          reject(error);
        });
      });

    } catch (error) {
      ServerLogger.error('비디오 다운로드 에러:', error);
      
      // blob URL 에러인 경우 더 명확한 메시지
      if (error.message.includes('Blob URL')) {
        throw new Error('Blob URL은 클라이언트에서 파일로 전송해주세요. process-video-blob 엔드포인트를 사용하세요.');
      }
      
      throw new Error(`비디오 다운로드 실패: ${error.message}`);
    }
  }

  async generateThumbnail(videoPath, analysisType = 'quick') {
    const startTime = Date.now();
    try {
      const videoName = path.basename(videoPath, path.extname(videoPath));
      
      // 파일 타입 확인 - 이미지 파일인지 검사
      const fileType = await this.detectFileType(videoPath);
      
      if (fileType === 'image') {
        ServerLogger.info(`📷 이미지 파일 감지 - 원본을 썸네일로 복사: ${videoPath}`);
        const timestamp = Date.now();
        const thumbnailPath = path.join(this.thumbnailDir, `${videoName}_thumb_${timestamp}.jpg`);
        fs.copyFileSync(videoPath, thumbnailPath);
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        ServerLogger.info(`✅ 이미지 썸네일 생성 완료: ${path.basename(thumbnailPath)}`);
        ServerLogger.info(`⏱️ 이미지 처리 소요시간: ${processingTime}ms`);
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
      ServerLogger.info(`⏱️ 썸네일 생성 총 소요시간: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}초)`);
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
    const thumbnailPath = path.join(this.thumbnailDir, `${videoName}_thumb_${timestamp}.jpg`);
    
    ServerLogger.info(`🎬 단일 썸네일 생성: ${videoPath} -> ${thumbnailPath}`);
    
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, [
        '-i', videoPath,
        '-ss', '00:00:01.000',    // 1초 지점에서 추출
        '-vframes', '1',          // 1프레임만
        '-q:v', '2',             // 고품질
        '-y',                    // 덮어쓰기 허용
        thumbnailPath
      ]);

      let stderrOutput = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderrOutput += data.toString();
      });

      ffmpeg.on('close', (code) => {
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        if (code === 0 && fs.existsSync(thumbnailPath)) {
          ServerLogger.info(`✅ 단일 썸네일 생성 완료: ${path.basename(thumbnailPath)}`);
          ServerLogger.info(`⏱️ FFmpeg 처리 소요시간: ${processingTime}ms`);
          resolve([thumbnailPath]); // 배열로 반환
        } else {
          ServerLogger.error(`❌ FFmpeg 썸네일 생성 실패 (코드: ${code})`);
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
      const intervals = this.calculateFrameIntervals(duration, frameCount);
      
      ServerLogger.info(`📸 ${frameCount}개 프레임을 추출합니다: [${intervals.map(t => `${t}초`).join(', ')}]`);
      
      const videoName = path.basename(videoPath, path.extname(videoPath));
      const timestamp = Date.now();
      const framePaths = [];
      
      // 각 시점별 프레임 추출
      for (let i = 0; i < intervals.length; i++) {
        const time = intervals[i];
        const framePath = path.join(this.thumbnailDir, `${videoName}_frame_${i+1}_${time}s_${timestamp}.jpg`);
        
        await this.extractFrameAtTime(videoPath, time, framePath);
        framePaths.push(framePath);
      }
      
      const frameEndTime = Date.now();
      const frameProcessingTime = frameEndTime - frameStartTime;
      ServerLogger.info(`✅ 다중 프레임 생성 완료: ${framePaths.length}개`);
      ServerLogger.info(`⏱️ 다중 프레임 생성 소요시간: ${frameProcessingTime}ms (${(frameProcessingTime / 1000).toFixed(2)}초)`);
      return framePaths;
      
    } catch (error) {
      ServerLogger.error('다중 프레임 생성 실패:', error);
      throw error;
    }
  }

  calculateOptimalFrameCount(duration) {
    if (duration <= 10) return 6;      // 10초 이하: 6프레임 (기존 3 → 6)
    if (duration <= 30) return 10;     // 30초 이하: 10프레임 (기존 5 → 10)
    if (duration <= 60) return 14;     // 60초 이하: 14프레임 (기존 7 → 14)
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
    
    ServerLogger.info(`🔍 프레임 추출 시도: ${timeInSeconds}초 -> ${timeString}`);
    
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, [
        '-i', videoPath,
        '-ss', timeString,
        '-vframes', '1',
        '-q:v', '2',
        '-y',
        outputPath
      ]);

      let stderrOutput = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderrOutput += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          ServerLogger.info(`✅ 프레임 추출 완료: ${timeString} -> ${path.basename(outputPath)}`);
          resolve(outputPath);
        } else {
          ServerLogger.error(`❌ FFmpeg 프레임 추출 실패 (코드: ${code})`);
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
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        videoPath
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
            ServerLogger.info(`✅ 비디오 길이 감지 성공: ${duration}초`);
            ServerLogger.info(`⏱️ ffprobe 처리 소요시간: ${processingTime}ms`);
            resolve(duration);
          } else {
            console.warn(`⚠️ ffprobe 실패 (코드: ${code}), ffmpeg로 재시도`);
            console.warn(`📄 ffprobe 오류:`, errorOutput);
            
            // ffprobe 실패시 ffmpeg로 재시도
            this.getVideoDurationWithFFmpeg(videoPath).then(resolve).catch(() => {
              ServerLogger.error(`❌ ffmpeg로도 실패, 기본값 30초 사용`);
              resolve(30);
            });
          }
        } catch (error) {
          ServerLogger.error(`❌ JSON 파싱 실패:`, error.message);
          ServerLogger.error(`📄 Output:`, output);
          
          // 파싱 실패시 ffmpeg로 재시도
          this.getVideoDurationWithFFmpeg(videoPath).then(resolve).catch(() => {
            ServerLogger.error(`❌ ffmpeg로도 실패, 기본값 30초 사용`);
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
        '-i', videoPath,
        '-f', 'null',
        '-'
      ]);

      let stderrOutput = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderrOutput += data.toString();
      });

      ffmpeg.on('close', (code) => {
        try {
          // Duration 패턴 찾기: Duration: 00:00:13.30
          const durationMatch = stderrOutput.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
          if (durationMatch) {
            const hours = parseInt(durationMatch[1]);
            const minutes = parseInt(durationMatch[2]);
            const seconds = parseFloat(durationMatch[3]);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            ServerLogger.info(`✅ ffmpeg로 비디오 길이 감지 성공: ${totalSeconds}초`);
            ServerLogger.info(`⏱️ ffmpeg 처리 소요시간: ${processingTime}ms`);
            resolve(totalSeconds);
          } else {
            ServerLogger.error(`❌ ffmpeg에서 Duration 찾을 수 없음`);
            ServerLogger.error(`📄 stderr:`, stderrOutput);
            reject(new Error('Duration not found in ffmpeg output'));
          }
        } catch (error) {
          ServerLogger.error(`❌ ffmpeg 출력 파싱 실패:`, error.message);
          reject(error);
        }
      });
    });
  }

  secondsToTimeString(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
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
    const uniqueMentions = [...new Set(mentions)].map(mention => mention.substring(1));
    
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
        'https://www.googleapis.com/youtube/v3/commentThreads', {
          params: {
            part: 'snippet',
            videoId: videoId,
            maxResults: Math.min(maxResults, 100), // 최대 100개
            order: 'relevance', // relevance(관련성) or time(시간순)
            key: this.youtubeApiKey
          }
        }
      );

      if (!response.data.items || response.data.items.length === 0) {
        ServerLogger.info('💬 댓글이 없거나 비활성화된 영상');
        return { [FieldMapper.get('COMMENTS')]: [], [FieldMapper.get('TOP_COMMENTS')]: '' };
      }

      // 댓글 데이터 추출
      const comments = response.data.items.map(item => {
        const comment = item.snippet.topLevelComment.snippet;
        return {
          [FieldMapper.get('DESCRIPTION')]: comment.textDisplay,
          [FieldMapper.get('CHANNEL_NAME')]: comment.authorDisplayName,
          [FieldMapper.get('LIKES')]: comment.likeCount,
          [FieldMapper.get('UPLOAD_DATE')]: comment.publishedAt
        };
      });

      // 모든 댓글을 텍스트로 저장 (스프레드시트용)
      const topComments = comments
        .map((c, i) => `${i+1}. ${c[FieldMapper.get('CHANNEL_NAME')]}: ${c[FieldMapper.get('DESCRIPTION')]}`)
        .join(' | ');

      ServerLogger.info(`✅ 댓글 수집 완료: ${comments.length}개`);
      
      return {
        [FieldMapper.get('COMMENTS')]: comments,
        [FieldMapper.get('TOP_COMMENTS')]: topComments,
        totalCount: comments.length
      };

    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.error?.errors?.[0]?.reason === 'commentsDisabled') {
        ServerLogger.info('💬 댓글이 비활성화된 영상');
        return { [FieldMapper.get('COMMENTS')]: [], [FieldMapper.get('TOP_COMMENTS')]: '댓글 비활성화', totalCount: 0 };
      }
      
      ServerLogger.warn(`⚠️ 댓글 수집 실패: ${error.message}`);
      return { [FieldMapper.get('COMMENTS')]: [], [FieldMapper.get('TOP_COMMENTS')]: '', totalCount: 0 };
    }
  }

  // YouTube 비디오 ID 추출
  extractYouTubeId(url) {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]+)/,
      /(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]+)/
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
      ServerLogger.info(`🎬 하이브리드 YouTube 정보 수집 시작: ${videoId}`);

      // USE_YTDL_FIRST가 false면 바로 기존 API 방식 사용
      if (process.env.USE_YTDL_FIRST === 'false') {
        ServerLogger.info('🚫 ytdl-core 비활성화, 기존 API 방식 사용');
        return this.getYouTubeVideoInfoLegacy(videoUrl);
      }

      // 하이브리드 추출기 사용
      const result = await this.hybridExtractor.extractVideoData(videoUrl);
      
      if (!result.success) {
        throw new Error(`하이브리드 추출 실패: ${result.error}`);
      }

      const data = result.data;
      ServerLogger.info(`✅ 하이브리드 추출 성공`, {
        sources: result.sources,
        time: `${result.extractionTime}ms`
      });

      // 기존 포맷에 맞게 변환
      return HybridDataConverter.convertToLegacyFormat(data, videoId);

    } catch (error) {
      ServerLogger.error('하이브리드 YouTube 정보 수집 실패:', error.message);
      
      // 폴백: 기존 API 방식으로 시도
      ServerLogger.info('🔄 기존 API 방식으로 폴백 시도...');
      return this.getYouTubeVideoInfoLegacy(videoUrl);
    }
  }

  // 🔄 기존 API 전용 메서드 (폴백용)
  async getYouTubeVideoInfoLegacy(videoUrl) {
    try {
      if (!this.youtubeApiKey) {
        throw new Error('YouTube API 키가 설정되지 않았습니다.');
      }

      const videoId = this.extractYouTubeId(videoUrl);
      ServerLogger.info(`🎬 기존 API 방식 정보 수집: ${videoId}`);

      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos`, {
          params: {
            part: 'snippet,statistics,contentDetails,status',
            id: videoId,
            key: this.youtubeApiKey
          }
        }
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
        descriptionPreview: snippet.description?.substring(0, 200) || '',
        descriptionType: typeof snippet.description
      });

      // 채널 정보 추가 수집 (구독자 수)
      let channelInfo = null;
      try {
        const channelResponse = await axios.get(
          `https://www.googleapis.com/youtube/v3/channels`, {
            params: {
              part: 'statistics,snippet',
              id: snippet.channelId,
              key: this.youtubeApiKey
            }
          }
        );
        
        if (channelResponse.data.items && channelResponse.data.items.length > 0) {
          channelInfo = channelResponse.data.items[0];
        }
      } catch (channelError) {
        ServerLogger.warn('⚠️ 채널 정보 수집 실패 (무시하고 계속):', channelError.message);
      }

      // 카테고리 변환
      const categoryId = snippet.categoryId;
      const categoryName = YOUTUBE_CATEGORIES[categoryId] || '미분류';

      // 비디오 길이를 초 단위로 변환
      const duration = this.parseYouTubeDuration(contentDetails.duration);
      
      // 숏폼/롱폼 구분 (60초 기준)
      const isShortForm = duration <= 60;
      const contentType = isShortForm ? 'Shorts' : 'Video';

      // 해시태그와 멘션 추출
      const hashtags = this.extractHashtags(snippet.description);
      const mentions = this.extractMentions(snippet.description);
      
      // 댓글 수집 (최대 100개)
      let commentData = { [FieldMapper.get('TOP_COMMENTS')]: '', totalCount: 0 };
      if (statistics.commentCount && statistics.commentCount !== '0') {
        commentData = await this.fetchYouTubeComments(videoId, 100);
      }

      // FieldMapper 기반 videoInfo 객체 생성
      const videoInfo = {
        // 기본 비디오 정보 (FieldMapper 표준)
        videoId: videoId,
        [FieldMapper.get('TITLE')]: snippet.title,
        [FieldMapper.get('DESCRIPTION')]: snippet.description,
        [FieldMapper.get('CHANNEL_NAME')]: snippet.channelTitle,
        [FieldMapper.get('CHANNEL_ID')]: snippet.channelId,
        [FieldMapper.get('UPLOAD_DATE')]: snippet.publishedAt,
        [FieldMapper.get('THUMBNAIL_URL')]: snippet.thumbnails.medium?.url || snippet.thumbnails.default.url,
        [FieldMapper.get('CATEGORY')]: categoryName,
        [FieldMapper.get('YOUTUBE_CATEGORY')]: categoryName,
        [FieldMapper.get('CATEGORY_ID')]: categoryId,
        [FieldMapper.get('DURATION')]: duration,
        [FieldMapper.get('DURATION_FORMATTED')]: this.formatDuration(duration),
        [FieldMapper.get('CONTENT_TYPE')]: contentType,
        [FieldMapper.get('IS_SHORT_FORM')]: isShortForm,
        [FieldMapper.get('TAGS')]: snippet.tags || [],
        
        // 통계 정보 (FieldMapper 표준)
        [FieldMapper.get('VIEWS')]: statistics.viewCount || '0',
        [FieldMapper.get('LIKES')]: statistics.likeCount || '0',
        [FieldMapper.get('COMMENTS_COUNT')]: statistics.commentCount || '0',
        
        // 채널 정보 (FieldMapper 표준)
        [FieldMapper.get('SUBSCRIBERS')]: channelInfo?.statistics?.subscriberCount || '0',
        [FieldMapper.get('CHANNEL_VIDEOS')]: channelInfo?.statistics?.videoCount || '0',
        [FieldMapper.get('CHANNEL_VIEWS')]: channelInfo?.statistics?.viewCount || '0',
        [FieldMapper.get('CHANNEL_COUNTRY')]: channelInfo?.snippet?.country || '',
        [FieldMapper.get('CHANNEL_DESCRIPTION')]: channelInfo?.snippet?.description || '',
        [FieldMapper.get('YOUTUBE_HANDLE')]: this.extractYouTubeHandle(channelInfo?.snippet?.customUrl),
        [FieldMapper.get('CHANNEL_URL')]: this.buildChannelUrl(channelInfo?.snippet?.customUrl, snippet.channelId),
        
        // 메타데이터 (FieldMapper 표준)
        [FieldMapper.get('MONETIZED')]: status?.madeForKids === false ? 'Y' : 'N',
        [FieldMapper.get('AGE_RESTRICTED')]: status?.contentRating ? 'Y' : 'N',
        [FieldMapper.get('DEFINITION')]: contentDetails?.definition || 'sd',
        [FieldMapper.get('LANGUAGE')]: snippet.defaultLanguage || snippet.defaultAudioLanguage || '',
        [FieldMapper.get('HASHTAGS')]: hashtags,
        [FieldMapper.get('MENTIONS')]: mentions,
        [FieldMapper.get('TOP_COMMENTS')]: commentData[FieldMapper.get('TOP_COMMENTS')],
        [FieldMapper.get('LIVE_BROADCAST')]: snippet.liveBroadcastContent || 'none',
        
        // 레거시 호환용 필드들 (FieldMapper 표준으로 재매핑)
        [FieldMapper.get('PROCESSED_AT')]: snippet.publishedAt,
        [FieldMapper.get('UPLOAD_DATE')]: snippet.publishedAt,
        [FieldMapper.get('CHANNEL_NAME')]: snippet.channelTitle,
        [FieldMapper.get('LIKES')]: statistics.likeCount || '0',
        [FieldMapper.get('COMMENTS_COUNT')]: statistics.commentCount || '0', 
        [FieldMapper.get('VIEWS')]: statistics.viewCount || '0',
        [FieldMapper.get('DURATION')]: duration,
        [FieldMapper.get('DURATION_FORMATTED')]: this.formatDuration(duration),
        [FieldMapper.get('CONTENT_TYPE')]: contentType
      };

      ServerLogger.info(`✅ YouTube 정보 수집 완료:`);
      ServerLogger.info(`📺 제목: ${videoInfo[FieldMapper.get('TITLE')]}`);
      ServerLogger.info(`📝 설명: "${videoInfo[FieldMapper.get('DESCRIPTION')]?.substring(0, 100)}${videoInfo[FieldMapper.get('DESCRIPTION')]?.length > 100 ? '...' : ''}" (${videoInfo[FieldMapper.get('DESCRIPTION')]?.length || 0}자)`);
      ServerLogger.info(`👤 채널: ${videoInfo[FieldMapper.get('CHANNEL_NAME')]}${videoInfo[FieldMapper.get('YOUTUBE_HANDLE')] ? ` (@${videoInfo[FieldMapper.get('YOUTUBE_HANDLE')]})` : ''} (구독자: ${videoInfo[FieldMapper.get('SUBSCRIBERS')]})`);
      ServerLogger.info(`🏷️ 카테고리: ${videoInfo[FieldMapper.get('CATEGORY')]}`);
      ServerLogger.info(`⏱️ 길이: ${videoInfo[FieldMapper.get('DURATION_FORMATTED')]} (${videoInfo[FieldMapper.get('CONTENT_TYPE')]})`);
      ServerLogger.info(`👀 조회수: ${videoInfo[FieldMapper.get('VIEWS')].toLocaleString()}`);
      ServerLogger.info(`💰 수익화: ${videoInfo[FieldMapper.get('MONETIZED')]}, 🎞️ 화질: ${videoInfo[FieldMapper.get('DEFINITION')]}`);
      if (videoInfo[FieldMapper.get('CHANNEL_URL')]) {
        ServerLogger.info(`🔗 채널 URL: ${videoInfo[FieldMapper.get('CHANNEL_URL')]}`);
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

    const hours = (match[1] ? parseInt(match[1]) : 0);
    const minutes = (match[2] ? parseInt(match[2]) : 0);
    const seconds = (match[3] ? parseInt(match[3]) : 0);

    return hours * 3600 + minutes * 60 + seconds;
  }

  // 초 단위 → MM:SS 또는 HH:MM:SS 형식 변환
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  async getVideoInfo(videoPath) {
    try {
      return new Promise((resolve, reject) => {
        const ffprobe = spawn(ffprobePath, [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          videoPath
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
        mb: (stats.size / (1024 * 1024)).toFixed(2)
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
      if (hex.includes('667479706d703432') || // ftyp mp42
          hex.includes('667479706d703431') || // ftyp mp41
          hex.includes('6674797069736f6d')) { // ftyp isom
        return 'video';
      }
      
      // WebM 파일 (1A 45 DF A3)
      if (hex.startsWith('1a45dfa3')) {
        return 'video';
      }
      
      // 기본값은 비디오로 처리
      return 'video';
      
    } catch (error) {
      console.warn('파일 타입 감지 실패, 비디오로 처리:', error.message);
      return 'video';
    }
  }

  cleanDirectory(dir, maxAge, now) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
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
  compareCategories(youtubeCategory, aiMainCategory, aiMiddleCategory, aiFullPath) {
    try {
      if (!youtubeCategory || !aiMainCategory) {
        return {
          matchScore: 0,
          matchType: 'no_data',
          matchReason: '카테고리 정보 부족'
        };
      }

      const mappedCategories = YOUTUBE_TO_AI_CATEGORY_MAPPING[youtubeCategory] || [];
      
      // 1. 완전 일치 검사 (대카테고리)
      const exactMatch = mappedCategories.find(mapped => 
        mapped.toLowerCase() === aiMainCategory.toLowerCase()
      );
      
      if (exactMatch) {
        ServerLogger.info(`🎯 완전 일치: YouTube "${youtubeCategory}" ↔ AI "${aiMainCategory}"`);
        return {
          matchScore: 100,
          matchType: 'exact',
          matchReason: `완전 일치: ${youtubeCategory} → ${aiMainCategory}`
        };
      }

      // 2. 부분 일치 검사 (중카테고리 포함)
      const partialMatch = mappedCategories.find(mapped => 
        mapped.toLowerCase().includes(aiMainCategory.toLowerCase()) ||
        aiMainCategory.toLowerCase().includes(mapped.toLowerCase()) ||
        (aiMiddleCategory && (
          mapped.toLowerCase().includes(aiMiddleCategory.toLowerCase()) ||
          aiMiddleCategory.toLowerCase().includes(mapped.toLowerCase())
        ))
      );

      if (partialMatch) {
        ServerLogger.info(`🔍 부분 일치: YouTube "${youtubeCategory}" ↔ AI "${aiMainCategory}/${aiMiddleCategory}"`);
        return {
          matchScore: 70,
          matchType: 'partial',
          matchReason: `부분 일치: ${youtubeCategory} → ${partialMatch} (AI: ${aiMainCategory})`
        };
      }

      // 3. 키워드 기반 유사도 검사
      const fullPath = aiFullPath || `${aiMainCategory} > ${aiMiddleCategory}`;
      const keywordMatch = this.calculateKeywordSimilarity(youtubeCategory, fullPath);
      
      if (keywordMatch.score > 30) {
        ServerLogger.info(`📝 키워드 일치: YouTube "${youtubeCategory}" ↔ AI "${fullPath}" (${keywordMatch.score}%)`);
        return {
          matchScore: keywordMatch.score,
          matchType: 'keyword',
          matchReason: `키워드 유사도: ${keywordMatch.matchedWords.join(', ')}`
        };
      }

      // 4. 불일치
      ServerLogger.warn(`❌ 카테고리 불일치: YouTube "${youtubeCategory}" ↔ AI "${aiMainCategory}"`);
      return {
        matchScore: 0,
        matchType: 'mismatch',
        matchReason: `불일치: YouTube(${youtubeCategory}) vs AI(${aiMainCategory})`
      };

    } catch (error) {
      ServerLogger.error('카테고리 비교 실패:', error);
      return {
        matchScore: 0,
        matchType: 'error',
        matchReason: '비교 중 오류 발생'
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
    
    youtubeWords.forEach(ytWord => {
      if (ytWord.length > 1) { // 1글자 제외
        aiWords.forEach(aiWord => {
          if (aiWord.includes(ytWord) || ytWord.includes(aiWord)) {
            matchedWords.push(ytWord);
            matchCount++;
          }
        });
      }
    });

    const totalWords = Math.max(youtubeWords.length, aiWords.length);
    const score = totalWords > 0 ? Math.round((matchCount / totalWords) * 100) : 0;
    
    return {
      score,
      matchedWords: [...new Set(matchedWords)],
      totalWords
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
      return channelId ? `https://www.youtube.com/channel/${channelId}` : '';
    }
  }
}

module.exports = VideoProcessor;