/**
 * 파일 처리 관련 유틸리티 함수들
 */
export class FileUtils {
  /**
   * 파일 크기를 사람이 읽기 좋은 형태로 변환
   * @param {number} bytes 바이트 수
   * @param {number} decimals 소수점 자릿수
   * @returns {string} 변환된 문자열
   */
  static formatFileSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * 파일 확장자 추출
   * @param {string} filename 파일명
   * @returns {string} 확장자 (점 포함)
   */
  static getFileExtension(filename) {
    if (!filename) return '';
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  /**
   * 파일명에서 확장자 제거
   * @param {string} filename 파일명
   * @returns {string} 확장자가 제거된 파일명
   */
  static removeFileExtension(filename) {
    if (!filename) return '';
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(0, lastDot) : filename;
  }

  /**
   * MIME 타입으로 파일 유형 확인
   * @param {string} mimeType MIME 타입
   * @returns {string} 파일 유형 ('image', 'video', 'audio', 'document', 'unknown')
   */
  static getFileTypeFromMime(mimeType) {
    if (!mimeType) return 'unknown';
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('text/') || mimeType.includes('document')) return 'document';
    
    return 'unknown';
  }

  /**
   * 파일 확장자로 MIME 타입 추정
   * @param {string} filename 파일명
   * @returns {string} 추정된 MIME 타입
   */
  static guessMimeType(filename) {
    if (!filename) return 'application/octet-stream';
    
    const ext = this.getFileExtension(filename).toLowerCase();
    
    const mimeTypes = {
      // Images
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      
      // Videos
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime',
      '.mkv': 'video/x-matroska',
      
      // Audio
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/m4a',
      
      // Documents
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Blob에서 파일 생성
   * @param {Blob} blob Blob 객체
   * @param {string} filename 파일명
   * @returns {File} File 객체
   */
  static blobToFile(blob, filename) {
    if (!blob) throw new Error('Blob is required');
    if (!filename) throw new Error('Filename is required');
    
    return new File([blob], filename, { type: blob.type });
  }

  /**
   * Base64 문자열을 Blob으로 변환
   * @param {string} base64 Base64 문자열
   * @param {string} mimeType MIME 타입
   * @returns {Blob} Blob 객체
   */
  static base64ToBlob(base64, mimeType = 'application/octet-stream') {
    if (!base64) throw new Error('Base64 string is required');
    
    // data URL 형태인 경우 처리
    if (base64.startsWith('data:')) {
      const [header, data] = base64.split(',');
      const type = header.match(/data:([^;]+)/)?.[1] || mimeType;
      return this.base64ToBlob(data, type);
    }
    
    try {
      const byteCharacters = atob(base64);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      return new Blob(byteArrays, { type: mimeType });
    } catch (error) {
      throw new Error(`Failed to convert base64 to blob: ${error.message}`);
    }
  }

  /**
   * Blob을 Base64 문자열로 변환
   * @param {Blob} blob Blob 객체
   * @returns {Promise<string>} Base64 문자열
   */
  static blobToBase64(blob) {
    if (!blob) throw new Error('Blob is required');
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Canvas를 Blob으로 변환
   * @param {HTMLCanvasElement} canvas Canvas 요소
   * @param {string} type MIME 타입
   * @param {number} quality 품질 (0-1)
   * @returns {Promise<Blob>} Blob 객체
   */
  static canvasToBlob(canvas, type = 'image/png', quality = 0.8) {
    if (!canvas) throw new Error('Canvas is required');
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        type,
        quality
      );
    });
  }

  /**
   * 파일 다운로드
   * @param {Blob|string} data 다운로드할 데이터 (Blob 또는 URL)
   * @param {string} filename 파일명
   * @param {string} mimeType MIME 타입
   */
  static downloadFile(data, filename, mimeType = 'application/octet-stream') {
    if (!data || !filename) throw new Error('Data and filename are required');
    
    let blob;
    let url;
    
    if (data instanceof Blob) {
      blob = data;
      url = URL.createObjectURL(blob);
    } else if (typeof data === 'string') {
      if (data.startsWith('data:') || data.startsWith('blob:') || data.startsWith('http')) {
        url = data;
      } else {
        // 일반 문자열인 경우 Blob으로 변환
        blob = new Blob([data], { type: mimeType });
        url = URL.createObjectURL(blob);
      }
    } else {
      throw new Error('Data must be a Blob or string');
    }
    
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      // Blob URL 정리 (data URL이나 외부 URL은 정리하지 않음)
      if (blob && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
  }

  /**
   * 파일 읽기 (File API)
   * @param {File} file 파일 객체
   * @param {string} readAs 읽기 방식 ('text', 'arrayBuffer', 'dataURL')
   * @returns {Promise} 파일 내용
   */
  static readFile(file, readAs = 'text') {
    if (!file) throw new Error('File is required');
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      switch (readAs) {
        case 'text':
          reader.readAsText(file);
          break;
        case 'arrayBuffer':
          reader.readAsArrayBuffer(file);
          break;
        case 'dataURL':
          reader.readAsDataURL(file);
          break;
        default:
          reject(new Error(`Unsupported read method: ${readAs}`));
      }
    });
  }

  /**
   * 이미지 크기 조정
   * @param {File|Blob} imageFile 이미지 파일
   * @param {number} maxWidth 최대 너비
   * @param {number} maxHeight 최대 높이
   * @param {number} quality 품질 (0-1)
   * @returns {Promise<Blob>} 조정된 이미지 Blob
   */
  static resizeImage(imageFile, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
    if (!imageFile) throw new Error('Image file is required');
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 비율을 유지하면서 크기 계산
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);
        
        // Blob으로 변환
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          imageFile.type || 'image/png',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      // 이미지 로드
      if (imageFile instanceof File || imageFile instanceof Blob) {
        const url = URL.createObjectURL(imageFile);
        img.onload = () => {
          img.onload(); // 위의 onload 실행
          URL.revokeObjectURL(url);
        };
        img.src = url;
      } else {
        reject(new Error('Invalid image file type'));
      }
    });
  }

  /**
   * 파일 유효성 검사
   * @param {File} file 파일 객체
   * @param {Object} constraints 제약조건
   * @returns {Object} 검사 결과
   */
  static validateFile(file, constraints = {}) {
    if (!file) {
      return { valid: false, errors: ['파일이 필요합니다.'] };
    }
    
    const {
      maxSize = 100 * 1024 * 1024, // 100MB
      allowedTypes = [],
      allowedExtensions = []
    } = constraints;
    
    const errors = [];
    
    // 파일 크기 검사
    if (file.size > maxSize) {
      errors.push(`파일 크기가 ${this.formatFileSize(maxSize)}를 초과합니다.`);
    }
    
    // MIME 타입 검사
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`지원하지 않는 파일 타입입니다: ${file.type}`);
    }
    
    // 확장자 검사
    if (allowedExtensions.length > 0) {
      const ext = this.getFileExtension(file.name).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        errors.push(`지원하지 않는 파일 확장자입니다: ${ext}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }
    };
  }
}