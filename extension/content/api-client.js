import { CONSTANTS } from './constants.js';
import { Utils, TimeUtils, DOMUtils } from './utils.js';

/**
 * API 통신 클라이언트
 */
export class ApiClient {
  constructor(serverUrl = CONSTANTS.SERVER.BASE_URL) {
    this.serverUrl = serverUrl;
  }

  /**
   * 서버 연결 상태 확인
   * @returns {Promise<boolean>} 연결 성공 여부
   */
  async checkConnection() {
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      Utils.log('error', 'Server connection failed', error);
      return false;
    }
  }

  /**
   * 비디오 처리 요청 (URL 방식)
   * @param {Object} data 비디오 데이터
   * @returns {Promise<Object>} 처리 결과
   */
  async processVideo(data) {
    try {
      Utils.log('info', 'Processing video with URL', { platform: data.platform, url: data.videoUrl });
      
      // 🔍 URL 방식 전송 전 메타데이터 로깅
      console.log('🚨🚨🚨 API CLIENT URL 전송 시작 🚨🚨🚨');
      console.log('📤 서버로 전송하는 데이터:');
      console.log('  Platform:', data.platform);
      console.log('  VideoURL:', data.videoUrl);
      console.log('  PostURL:', data.postUrl);
      console.log('  Metadata 타입:', typeof data.metadata);
      console.log('  Metadata keys:', data.metadata ? Object.keys(data.metadata) : 'NO KEYS');
      console.log('  Metadata JSON:', JSON.stringify(data.metadata, null, 2));
      console.log('🚨🚨🚨 API CLIENT URL 전송 끝 🚨🚨🚨');
      
      const response = await fetch(`${this.serverUrl}/api/process-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      // 중복 URL 특별 처리 (409 에러)
      if (response.status === 409 && result.error === 'DUPLICATE_URL') {
        return {
          success: false,
          isDuplicate: true,
          error: result.error,
          message: result.message,
          duplicate_info: result.duplicate_info
        };
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // 새로운 표준 응답 형식 처리
      if (result.success === false) {
        const errorMessage = result.error?.message || result.message || '처리 실패';
        throw new Error(errorMessage);
      }
      
      Utils.log('success', 'Video processed successfully', result);
      
      // 기존 코드와의 호환성을 위해 data 필드를 최상위로 이동
      const compatibleResult = {
        success: result.success,
        message: result.message,
        timestamp: result.timestamp,
        ...(result.data || result)
      };
      
      return compatibleResult;

    } catch (error) {
      Utils.log('error', 'Video processing failed', error);
      throw new Error(`비디오 처리 실패: ${error.message}`);
    }
  }

  /**
   * 비디오 처리 요청 (Blob 방식)
   * @param {Object} data 비디오 데이터 (blob 포함)
   * @returns {Promise<Object>} 처리 결과
   */
  async processVideoBlob(data) {
    try {
      Utils.log('info', 'Processing video with blob', { 
        platform: data.platform, 
        size: data.videoBlob.size 
      });
      
      const formData = new FormData();
      formData.append('video', data.videoBlob, `${data.platform}_video_${Date.now()}.mp4`);
      formData.append('platform', data.platform);
      formData.append('postUrl', data.postUrl);
      formData.append('metadata', JSON.stringify(data.metadata));
      
      // 🔍 전송 전 메타데이터 로깅 (더 명확하게)
      console.log('🚨🚨🚨 API CLIENT BLOB 전송 시작 🚨🚨🚨');
      console.log('📤 서버로 전송하는 데이터:');
      console.log('  Platform:', data.platform);
      console.log('  PostURL:', data.postUrl);
      console.log('  VideoBlob size:', data.videoBlob?.size);
      console.log('  Metadata 타입:', typeof data.metadata);
      console.log('  Metadata null 여부:', data.metadata === null);
      console.log('  Metadata undefined 여부:', data.metadata === undefined);
      console.log('  Metadata keys:', data.metadata ? Object.keys(data.metadata) : 'NO KEYS');
      console.log('  Metadata JSON:', JSON.stringify(data.metadata, null, 2));
      console.log('🚨🚨🚨 API CLIENT BLOB 전송 끝 🚨🚨🚨');
      
      const response = await fetch(`${this.serverUrl}/api/process-video-blob`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      // 중복 URL 특별 처리 (409 에러)
      if (response.status === 409 && result.error === 'DUPLICATE_URL') {
        return {
          success: false,
          isDuplicate: true,
          error: result.error,
          message: result.message,
          duplicate_info: result.duplicate_info
        };
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // 새로운 표준 응답 형식 처리
      if (result.success === false) {
        const errorMessage = result.error?.message || result.message || '처리 실패';
        throw new Error(errorMessage);
      }
      
      Utils.log('success', 'Video blob processed successfully', result);
      
      // 기존 코드와의 호환성을 위해 data 필드를 최상위로 이동
      const compatibleResult = {
        success: result.success,
        message: result.message,
        timestamp: result.timestamp,
        ...(result.data || result)
      };
      
      return compatibleResult;

    } catch (error) {
      Utils.log('error', 'Video blob processing failed', error);
      throw new Error(`비디오 처리 실패: ${error.message}`);
    }
  }

  /**
   * Video element에서 직접 데이터 추출 (Canvas 방식)
   * @param {HTMLVideoElement} videoElement 비디오 요소
   * @returns {Promise<Blob>} 캡처된 프레임 블롭
   */
  async captureVideoFrame(videoElement) {
    try {
      Utils.log('info', 'Video element에서 직접 데이터 추출 시도');
      
      if (!videoElement || videoElement.tagName !== 'VIDEO') {
        throw new Error('유효한 video element가 아닙니다.');
      }

      // 비디오 재생 대기
      await this.ensureVideoReady(videoElement);

      // Canvas 생성 및 프레임 캡처
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = videoElement.videoWidth || videoElement.clientWidth || 640;
      canvas.height = videoElement.videoHeight || videoElement.clientHeight || 360;
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Canvas를 Blob으로 변환
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to Blob 변환 실패'));
          }
        }, 'image/jpeg', 0.8);
      });
      
      Utils.log('success', '비디오 프레임 캡처 성공 (썸네일 대안)', { size: blob.size });
      return blob;

    } catch (error) {
      Utils.log('error', 'Video frame capture failed', error);
      throw new Error(`비디오 프레임 캡처 실패: ${error.message}`);
    }
  }

  /**
   * 비디오 준비 상태 확인
   * @param {HTMLVideoElement} videoElement 비디오 요소
   */
  async ensureVideoReady(videoElement) {
    if (videoElement.readyState >= 2) {
      return; // 이미 준비됨
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('비디오 로딩 타임아웃'));
      }, 5000);

      const onReady = () => {
        clearTimeout(timeout);
        videoElement.removeEventListener('loadeddata', onReady);
        videoElement.removeEventListener('error', onError);
        resolve();
      };

      const onError = (e) => {
        clearTimeout(timeout);
        videoElement.removeEventListener('loadeddata', onReady);
        videoElement.removeEventListener('error', onError);
        reject(new Error(`비디오 로딩 실패: ${e.message}`));
      };

      videoElement.addEventListener('loadeddata', onReady);
      videoElement.addEventListener('error', onError);
    });
  }

  /**
   * Blob URL에서 비디오 다운로드 (폴백용)
   * @param {string} blobUrl Blob URL
   * @returns {Promise<Blob>} 다운로드된 블롭
   */
  async downloadBlobVideo(blobUrl) {
    try {
      Utils.log('info', 'Downloading blob video', blobUrl);
      
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      Utils.log('success', 'Blob video downloaded', { size: blob.size });
      return blob;

    } catch (error) {
      Utils.log('error', 'Blob video download failed', error);
      throw new Error(`blob 비디오 다운로드 실패: ${error.message}`);
    }
  }

  /**
   * 서버 통계 조회
   * @returns {Promise<Object>} 서버 통계
   */
  async getStats() {
    try {
      const response = await fetch(`${this.serverUrl}/api/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      Utils.log('error', 'Failed to get server stats', error);
      throw error;
    }
  }

  /**
   * 저장된 비디오 목록 조회
   * @returns {Promise<Array>} 비디오 목록
   */
  async getVideos() {
    try {
      const response = await fetch(`${this.serverUrl}/api/videos`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      Utils.log('error', 'Failed to get videos', error);
      throw error;
    }
  }
}