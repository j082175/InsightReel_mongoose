const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { ServerLogger } = require('../utils/logger');

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
}

module.exports = VideoProcessor;