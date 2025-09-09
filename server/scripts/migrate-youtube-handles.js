/**
 * 기존 YouTube 데이터에 핸들명 정보 추가 마이그레이션 스크립트
 * 
 * 실행 방법:
 * node server/scripts/migrate-youtube-handles.js
 */

// 환경 변수 로드
require('dotenv').config();

const axios = require('axios');
const { ServerLogger } = require('../utils/logger');
const SheetsManager = require('../services/SheetsManager');
const { FieldMapper } = require('../types/field-mapper');

class YouTubeHandleMigration {
  constructor() {
    this.youtubeApiKey = process.env.GOOGLE_API_KEY;
    this.sheetsManager = new SheetsManager();
    this.processedCount = 0;
    this.updatedCount = 0;
    this.errors = [];
    this.cache = new Map(); // channelId -> handle 캐시
  }

  /**
   * YouTube customUrl에서 핸들명 추출 (VideoProcessor와 동일)
   */
  extractYouTubeHandle(customUrl) {
    if (!customUrl) return '';
    
    try {
      if (customUrl.startsWith('@')) {
        return customUrl.substring(1);
      }
      
      if (customUrl.startsWith('/c/')) {
        return customUrl.substring(3);
      }
      
      if (customUrl.startsWith('/user/')) {
        return customUrl.substring(6);
      }
      
      return customUrl.replace(/^\/+/, '');
      
    } catch (error) {
      ServerLogger.warn('YouTube 핸들명 추출 실패:', error.message);
      return '';
    }
  }

  /**
   * YouTube 채널 URL 생성 (VideoProcessor와 동일)
   */
  buildChannelUrl(customUrl, channelId) {
    try {
      if (customUrl) {
        if (customUrl.startsWith('@')) {
          return `https://www.youtube.com/${customUrl}`;
        } else if (customUrl.startsWith('/')) {
          return `https://www.youtube.com${customUrl}`;
        } else {
          return `https://www.youtube.com/@${customUrl}`;
        }
      }
      
      if (channelId) {
        return `https://www.youtube.com/channel/${channelId}`;
      }
      
      return '';
      
    } catch (error) {
      ServerLogger.warn('YouTube 채널 URL 생성 실패:', error.message);
      return channelId ? `https://www.youtube.com/channel/${channelId}` : '';
    }
  }

  /**
   * YouTube API를 통해 채널 정보 조회
   */
  async getChannelInfo(channelId) {
    if (this.cache.has(channelId)) {
      return this.cache.get(channelId);
    }

    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/channels`, {
          params: {
            part: 'snippet',
            id: channelId,
            key: this.youtubeApiKey
          }
        }
      );

      if (response.data.items && response.data.items.length > 0) {
        const channelInfo = response.data.items[0];
        const customUrl = channelInfo.snippet?.customUrl;
        const handle = this.extractYouTubeHandle(customUrl);
        const channelUrl = this.buildChannelUrl(customUrl, channelId);

        const result = { handle, channelUrl, customUrl };
        this.cache.set(channelId, result);
        
        ServerLogger.info(`📋 채널 정보 수집: ${channelInfo.snippet.title} (@${handle})`);
        return result;
      }
      
      return { handle: '', channelUrl: '', customUrl: '' };

    } catch (error) {
      ServerLogger.warn(`⚠️ 채널 정보 수집 실패 (${channelId}):`, error.message);
      return { handle: '', channelUrl: '', customUrl: '' };
    }
  }

  /**
   * Google Sheets에서 YouTube 데이터 조회
   */
  async getYouTubeDataFromSheets() {
    try {
      const sheetName = await this.sheetsManager.getSheetNameByPlatform('youtube');
      ServerLogger.info(`📋 YouTube 시트에서 데이터 조회: ${sheetName}`);

      const range = `${sheetName}!A:Z`; // 전체 데이터 조회
      const response = await this.sheetsManager.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetsManager.spreadsheetId,
        range: range
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        throw new Error('YouTube 시트에 데이터가 없습니다.');
      }

      const headers = rows[0];
      ServerLogger.info(`📊 헤더 구조: ${headers.length}개 컬럼`);
      ServerLogger.info(`📊 총 데이터: ${rows.length - 1}개 행`);

      // 필요한 컬럼 인덱스 찾기
      const accountIndex = headers.indexOf('채널이름');
      const handleIndex = headers.indexOf('YouTube핸들명');
      const channelUrlIndex = headers.indexOf('채널URL');

      if (accountIndex === -1) {
        throw new Error('채널이름 컬럼을 찾을 수 없습니다.');
      }

      ServerLogger.info(`🔍 컬럼 위치: 채널이름=${accountIndex}, 핸들명=${handleIndex}, URL=${channelUrlIndex}`);

      return {
        rows: rows.slice(1), // 헤더 제외
        headers,
        indices: { accountIndex, handleIndex, channelUrlIndex }
      };

    } catch (error) {
      ServerLogger.error('Sheets 데이터 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 채널ID에서 핸들명 추출
   */
  extractChannelIdFromAccount(account) {
    // 채널이름 필드에서 채널ID 추출 시도
    // 예: "채널명 (UC1234567890)" 형태에서 채널ID 추출
    const match = account.match(/\(([A-Za-z0-9_-]{24})\)/);
    if (match) {
      return match[1];
    }

    // YouTube URL에서 채널ID 추출
    if (account.includes('youtube.com/channel/')) {
      const urlMatch = account.match(/youtube\.com\/channel\/([A-Za-z0-9_-]{24})/);
      if (urlMatch) {
        return urlMatch[1];
      }
    }

    return null;
  }

  /**
   * 마이그레이션 실행
   */
  async migrate() {
    try {
      ServerLogger.info('🚀 YouTube 핸들명 마이그레이션 시작');

      if (!this.youtubeApiKey) {
        throw new Error('GOOGLE_API_KEY가 설정되지 않았습니다.');
      }

      // 1. Google Sheets에서 데이터 조회
      const { rows, headers, indices } = await this.getYouTubeDataFromSheets();
      const { accountIndex, handleIndex, channelUrlIndex } = indices;

      // 2. 핸들명이 없는 행들 찾기
      const toUpdate = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const account = row[accountIndex] || '';
        const currentHandle = handleIndex !== -1 ? (row[handleIndex] || '') : '';
        
        // 핸들명이 없는 경우만 처리
        if (!currentHandle && account) {
          const channelId = this.extractChannelIdFromAccount(account);
          if (channelId) {
            toUpdate.push({
              rowIndex: i + 2, // Sheets는 1-based이고 헤더가 있으므로 +2
              account,
              channelId,
              currentHandle
            });
          }
        }
      }

      ServerLogger.info(`🔍 업데이트 대상: ${toUpdate.length}개 행`);

      if (toUpdate.length === 0) {
        ServerLogger.info('✅ 모든 YouTube 데이터에 이미 핸들명이 있습니다.');
        return;
      }

      // 3. 배치로 채널 정보 수집 및 업데이트
      const updates = [];
      for (let i = 0; i < toUpdate.length; i++) {
        const item = toUpdate[i];
        
        try {
          const channelInfo = await this.getChannelInfo(item.channelId);
          
          if (channelInfo.handle || channelInfo.channelUrl) {
            // 업데이트할 데이터 추가
            if (handleIndex !== -1) {
              updates.push({
                range: this.getColumnLetter(handleIndex) + item.rowIndex,
                values: [[channelInfo.handle]]
              });
            }
            
            if (channelUrlIndex !== -1) {
              updates.push({
                range: this.getColumnLetter(channelUrlIndex) + item.rowIndex,
                values: [[channelInfo.channelUrl]]
              });
            }

            this.updatedCount++;
            ServerLogger.info(`✅ [${i + 1}/${toUpdate.length}] ${item.account} → @${channelInfo.handle}`);
          } else {
            ServerLogger.warn(`⚠️ [${i + 1}/${toUpdate.length}] ${item.account} → 핸들명 없음`);
          }

          this.processedCount++;

          // API 할당량 보호를 위한 딜레이
          if (i % 10 === 9) {
            ServerLogger.info('⏳ API 할당량 보호를 위해 2초 대기...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          this.errors.push(`행 ${item.rowIndex}: ${error.message}`);
          ServerLogger.error(`❌ [${i + 1}/${toUpdate.length}] ${item.account} → 실패: ${error.message}`);
        }
      }

      // 4. Sheets 업데이트
      if (updates.length > 0) {
        ServerLogger.info(`📝 Google Sheets 업데이트: ${updates.length}개 셀`);
        
        const sheetName = await this.sheetsManager.getSheetNameByPlatform('youtube');
        await this.sheetsManager.sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: this.sheetsManager.spreadsheetId,
          resource: {
            valueInputOption: 'RAW',
            data: updates.map(update => ({
              range: `${sheetName}!${update.range}`,
              values: update.values
            }))
          }
        });

        ServerLogger.info('✅ Google Sheets 업데이트 완료');
      }

      // 5. 결과 요약
      ServerLogger.info('🎉 YouTube 핸들명 마이그레이션 완료');
      ServerLogger.info(`📊 처리된 항목: ${this.processedCount}개`);
      ServerLogger.info(`✅ 업데이트된 항목: ${this.updatedCount}개`);
      ServerLogger.info(`❌ 실패한 항목: ${this.errors.length}개`);

      if (this.errors.length > 0) {
        ServerLogger.warn('실패한 항목들:');
        this.errors.forEach(error => ServerLogger.warn(`  - ${error}`));
      }

    } catch (error) {
      ServerLogger.error('마이그레이션 실패:', error);
      throw error;
    }
  }

  /**
   * 컬럼 번호를 Excel 스타일 문자로 변환 (A, B, C, ... AA, AB, ...)
   */
  getColumnLetter(index) {
    let letter = '';
    let temp = index;
    
    while (temp >= 0) {
      letter = String.fromCharCode(65 + (temp % 26)) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    
    return letter;
  }
}

// 스크립트 실행
async function main() {
  const migration = new YouTubeHandleMigration();
  
  try {
    await migration.migrate();
    process.exit(0);
  } catch (error) {
    ServerLogger.error('마이그레이션 실패:', error);
    process.exit(1);
  }
}

// 직접 실행 시
if (require.main === module) {
  main();
}

module.exports = YouTubeHandleMigration;