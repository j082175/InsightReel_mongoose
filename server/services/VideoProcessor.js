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
      throw new Error(`비디오 다운로드 실패: ${error.message}`);
    }
  }

  async generateThumbnail(videoPath) {
    try {
      const videoName = path.basename(videoPath, path.extname(videoPath));
      const thumbnailPath = path.join(this.thumbnailDir, `${videoName}_thumb.jpg`);
      
      console.log(`썸네일 생성: ${videoPath} -> ${thumbnailPath}`);
      
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
            console.log(`✅ 썸네일 생성 완료: ${path.basename(thumbnailPath)}`);
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