import { CONSTANTS } from './constants.js';
import { Utils } from './utils.js';

/**
 * API 통신 클라이언트
 */
export class ApiClient {
  constructor(serverUrl = CONSTANTS.SERVER_URL) {
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
      
      const response = await fetch(`${this.serverUrl}/api/process-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      Utils.log('success', 'Video processed successfully', result);
      return result;

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
      
      const response = await fetch(`${this.serverUrl}/api/process-video-blob`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      Utils.log('success', 'Video blob processed successfully', result);
      return result;

    } catch (error) {
      Utils.log('error', 'Video blob processing failed', error);
      throw new Error(`비디오 처리 실패: ${error.message}`);
    }
  }

  /**
   * Blob URL에서 비디오 다운로드
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