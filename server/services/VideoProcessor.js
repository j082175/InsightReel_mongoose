const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

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
    try {
      console.log(`다운로드 시작: ${videoUrl}`);
      
      // blob URL 체크
      if (videoUrl.startsWith('blob:')) {
        throw new Error('Blob URL은 클라이언트에서 처리해야 합니다. 서버에서는 접근할 수 없습니다.');
      }
      
      // 파일명 생성
      const timestamp = Date.now();
      const filename = `${platform}_${timestamp}.mp4`;
      const filePath = path.join(this.downloadDir, filename);
      
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

      // 파일 스트림 생성
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ 비디오 다운로드 완료: ${filename}`);
          resolve(filePath);
        });
        writer.on('error', (error) => {
          console.error('비디오 다운로드 실패:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('비디오 다운로드 에러:', error);
      
      // blob URL 에러인 경우 더 명확한 메시지
      if (error.message.includes('Blob URL')) {
        throw new Error('Blob URL은 클라이언트에서 파일로 전송해주세요. process-video-blob 엔드포인트를 사용하세요.');
      }
      
      throw new Error(`비디오 다운로드 실패: ${error.message}`);
    }
  }

  async generateThumbnail(videoPath) {
    try {
      const videoName = path.basename(videoPath, path.extname(videoPath));
      const thumbnailPath = path.join(this.thumbnailDir, `${videoName}_thumb.jpg`);
      
      // 파일 타입 확인 - 이미지 파일인지 검사
      const fileType = await this.detectFileType(videoPath);
      
      if (fileType === 'image') {
        console.log(`📷 이미지 파일 감지 - 원본을 썸네일로 복사: ${videoPath}`);
        
        // 이미지 파일을 썸네일 경로로 복사
        fs.copyFileSync(videoPath, thumbnailPath);
        console.log(`✅ 이미지 썸네일 생성 완료: ${path.basename(thumbnailPath)}`);
        return thumbnailPath;
      }
      
      console.log(`🎬 비디오 파일에서 썸네일 생성: ${videoPath} -> ${thumbnailPath}`);
      
      return new Promise((resolve, reject) => {
        const ffmpeg = spawn(ffmpegPath, [
          '-i', videoPath,
          '-ss', '00:00:01.000',    // 1초 지점에서 추출
          '-vframes', '1',          // 1프레임만
          '-q:v', '2',             // 고품질
          '-y',                    // 덮어쓰기 허용
          thumbnailPath
        ]);

        ffmpeg.on('close', (code) => {
          if (code === 0 && fs.existsSync(thumbnailPath)) {
            console.log(`✅ 비디오 썸네일 생성 완료: ${path.basename(thumbnailPath)}`);
            resolve(thumbnailPath);
          } else {
            reject(new Error(`FFmpeg 실행 실패 (코드: ${code})`));
          }
        });

        ffmpeg.on('error', (error) => {
          console.error('FFmpeg 에러:', error);
          reject(error);
        });

        ffmpeg.stderr.on('data', (data) => {
          console.log(`FFmpeg: ${data}`);
        });
      });

    } catch (error) {
      console.error('썸네일 생성 실패:', error);
      throw new Error(`썸네일 생성 실패: ${error.message}`);
    }
  }

  async getVideoInfo(videoPath) {
    try {
      return new Promise((resolve, reject) => {
        const ffprobe = spawn(ffmpegPath.replace('ffmpeg', 'ffprobe'), [
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
      console.error('비디오 정보 추출 실패:', error);
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
      console.error('파일 크기 확인 실패:', error);
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
      
      console.log('✅ 오래된 파일 정리 완료');
    } catch (error) {
      console.error('파일 정리 실패:', error);
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
        console.log(`🗑️ 삭제됨: ${file}`);
      }
    });
  }
}

module.exports = VideoProcessor;