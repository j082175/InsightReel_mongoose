require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const VideoUrl = require('../models/VideoUrl');
const { google } = require('googleapis');
const { ServerLogger } = require('../utils/logger');

/**
 * 기존 데이터의 원본 게시일을 시트에서 읽어와서 MongoDB에 업데이트하는 마이그레이션 스크립트
 */
class OriginalPublishDateMigration {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  }

  /**
   * Google Sheets API 초기화
   */
  async initializeSheets() {
    try {
      const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('✅ Google Sheets API 초기화 완료');
      return true;
    } catch (error) {
      console.error('❌ Google Sheets API 초기화 실패:', error.message);
      return false;
    }
  }

  /**
   * 한국어 날짜 파싱 함수
   */
  parseKoreanDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // "2025. 8. 29. 오후 8:17:30" → "2025/8/29 20:17:30"
      let normalized = dateStr
        .replace(/\. /g, '/') // "2025. 8. 29." → "2025/8/29"
        .replace(/\.$/, '') // 마지막 점 제거
        .replace(/오전 (\d+):/, ' $1:') // "오전 9:15" → " 9:15"
        .replace(/오후 (\d+):/, (match, hour) => ` ${parseInt(hour) + 12}:`) // "오후 3:30" → " 15:30"
        .replace(/오전 12:/, ' 0:') // 오전 12시는 0시
        .replace(/오후 12:/, ' 12:'); // 오후 12시는 12시 그대로
      
      return new Date(normalized);
    } catch (error) {
      console.error(`❌ 날짜 파싱 실패: "${dateStr}"`, error.message);
      return null;
    }
  }

  /**
   * 플랫폼별 시트 이름 가져오기
   */
  getSheetNameByPlatform(platform) {
    const platformNames = {
      'instagram': 'Instagram',
      'youtube': 'YouTube',
      'tiktok': 'TikTok'
    };
    return platformNames[platform.toLowerCase()] || platform;
  }

  /**
   * 시트에서 특정 행의 데이터 조회
   */
  async getRowDataFromSheet(platform, row) {
    try {
      const sheetName = this.getSheetNameByPlatform(platform);
      const range = `${sheetName}!A${row}:Z${row}`;
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range,
      });
      
      return response.data.values ? response.data.values[0] : null;
    } catch (error) {
      console.error(`❌ 시트 데이터 조회 실패 (${platform} 행${row}):`, error.message);
      return null;
    }
  }

  /**
   * 전체 시트에서 URL과 날짜 매핑 조회
   */
  async getAllUrlDateMappings() {
    const platforms = ['instagram', 'youtube', 'tiktok'];
    const urlDateMappings = new Map();
    
    for (const platform of platforms) {
      try {
        console.log(`🔍 ${platform.toUpperCase()} 시트에서 URL-날짜 매핑 조회 중...`);
        
        const sheetName = this.getSheetNameByPlatform(platform);
        const range = `${sheetName}!A:Z`; // 전체 데이터 조회
        
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: range,
        });
        
        const rows = response.data.values || [];
        let mappingCount = 0;
        
        // 헤더 제외하고 데이터 행들 처리
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          
          const dateStr = row[1]; // B컬럼: 날짜
          // 플랫폼별 URL 컬럼 위치
          let url = null;
          if (platform === 'youtube') {
            url = row[22]; // W컬럼: YouTube URL (W = 22번째 인덱스)
          } else if (platform === 'instagram') {
            url = row[13]; // N컬럼: Instagram 실제 reel URL (N = 13번째 인덱스)
          } else if (platform === 'tiktok') {
            url = row[3]; // D컬럼: TikTok URL
          }
          
          if (!url || !dateStr) continue;
          
          if (dateStr && url) {
            const parsedDate = this.parseKoreanDate(dateStr);
            if (parsedDate && !isNaN(parsedDate.getTime())) {
              // URL 정규화
              const normalizedUrl = this.normalizeVideoUrl(url);
              urlDateMappings.set(normalizedUrl, {
                originalPublishDate: parsedDate,
                platform: platform,
                rowNumber: i + 1,
                originalDateStr: dateStr
              });
              mappingCount++;
            }
          }
        }
        
        console.log(`✅ ${platform.toUpperCase()}: ${mappingCount}개 URL-날짜 매핑 수집`);
        
        // API 호출 제한을 위한 딜레이
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ ${platform.toUpperCase()} 시트 조회 실패:`, error.message);
      }
    }
    
    console.log(`📊 총 ${urlDateMappings.size}개 URL-날짜 매핑 수집 완료`);
    return urlDateMappings;
  }

  /**
   * URL 매칭 함수 (시트 URL과 MongoDB originalUrl 비교)
   */
  urlsMatch(sheetUrl, mongoOriginalUrl, platform) {
    if (!sheetUrl || !mongoOriginalUrl) return false;
    
    try {
      // 기본 정규화
      const normalizedSheetUrl = sheetUrl.toLowerCase().replace(/www\./, '');
      const normalizedMongoUrl = mongoOriginalUrl.toLowerCase().replace(/www\./, '');
      
      // 정확한 매칭 시도
      if (normalizedSheetUrl === normalizedMongoUrl) {
        return true;
      }
      
      // Instagram 매칭 (정확한 URL로 매칭 가능)
      if (platform === 'instagram') {
        // 이제 시트에도 실제 reel URL이 있으므로 직접 매칭 가능
        // 시트: https://instagram.com/reels/REELID/
        // MongoDB: https://instagram.com/reels/REELID/
        
        // reel ID 추출해서 비교
        const extractReelId = (url) => {
          const match = url.match(/instagram\.com\/reels\/([A-Za-z0-9_-]+)/);
          return match ? match[1] : null;
        };
        
        const sheetReelId = extractReelId(normalizedSheetUrl);
        const mongoReelId = extractReelId(normalizedMongoUrl);
        
        return sheetReelId && mongoReelId && sheetReelId === mongoReelId;
      }
      
      // YouTube 매칭
      if (platform === 'youtube') {
        // 비디오 ID 추출해서 비교
        const extractVideoId = (url) => {
          if (url.includes('watch?v=')) {
            return url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1];
          } else if (url.includes('youtu.be/')) {
            return url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)?.[1];
          }
          return null;
        };
        
        const sheetVideoId = extractVideoId(normalizedSheetUrl);
        const mongoVideoId = extractVideoId(normalizedMongoUrl);
        
        return sheetVideoId && mongoVideoId && sheetVideoId === mongoVideoId;
      }
      
      return false;
      
    } catch (error) {
      console.error(`URL 매칭 실패: ${sheetUrl} vs ${mongoOriginalUrl}`, error.message);
      return false;
    }
  }

  /**
   * URL 정규화 (SheetsManager와 동일한 로직 사용)
   */
  normalizeVideoUrl(url) {
    if (!url) return '';
    
    try {
      // 기본 정리
      let normalized = url.toString().trim().toLowerCase();
      
      // 프로토콜 통일
      normalized = normalized.replace(/^http:\/\//, 'https://');
      
      // 쿼리 파라미터 제거 (YouTube의 경우 v= 파라미터는 유지)
      if (normalized.includes('youtube.com') || normalized.includes('youtu.be')) {
        // YouTube URL 정규화
        if (normalized.includes('youtube.com/watch')) {
          const videoIdMatch = normalized.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
          if (videoIdMatch) {
            normalized = `https://youtube.com/watch?v=${videoIdMatch[1]}`;
          }
        } else if (normalized.includes('youtu.be/')) {
          const videoIdMatch = normalized.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
          if (videoIdMatch) {
            normalized = `https://youtube.com/watch?v=${videoIdMatch[1]}`;
          }
        } else if (normalized.includes('/shorts/')) {
          const videoIdMatch = normalized.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
          if (videoIdMatch) {
            normalized = `https://youtube.com/watch?v=${videoIdMatch[1]}`;
          }
        }
        
        // www. 제거
        normalized = normalized.replace(/www\./, '');
      } else if (normalized.includes('instagram.com')) {
        // Instagram URL 정규화
        normalized = normalized.replace(/www\./, '').split('?')[0];
        if (!normalized.endsWith('/')) normalized += '/';
      } else if (normalized.includes('tiktok.com')) {
        // TikTok URL 정규화
        normalized = normalized.replace(/www\./, '').split('?')[0];
      }
      
      // 마지막 슬래시 통일
      if (normalized.includes('instagram.com') && !normalized.endsWith('/')) {
        normalized += '/';
      }
      
      return normalized;
    } catch (error) {
      console.error(`URL 정규화 실패: ${url}`, error.message);
      return url;
    }
  }

  /**
   * MongoDB 업데이트 실행 (originalUrl 기준 부분 매칭 사용)
   */
  async updateMongoDBDates(urlDateMappings) {
    let totalProcessed = 0;
    let successCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    
    console.log('\n🔄 MongoDB 원본 게시일 업데이트 시작...');
    console.log('💡 시트 URL과 MongoDB originalUrl을 부분 매칭으로 처리합니다...\n');
    
    // 모든 MongoDB 레코드 가져오기
    const allMongoDocs = await VideoUrl.find().lean();
    console.log(`📊 MongoDB 총 ${allMongoDocs.length}개 레코드 로드됨`);
    
    for (const [sheetUrl, dateInfo] of urlDateMappings) {
      try {
        totalProcessed++;
        let matchedDoc = null;
        
        // originalUrl 기준으로 부분 매칭 시도
        for (const mongoDoc of allMongoDocs) {
          if (this.urlsMatch(sheetUrl, mongoDoc.originalUrl, mongoDoc.platform)) {
            matchedDoc = mongoDoc;
            break;
          }
        }
        
        if (!matchedDoc) {
          notFoundCount++;
          if (totalProcessed <= 5) { // 처음 5개만 로그
            console.log(`⚠️ MongoDB에서 매칭되는 URL을 찾을 수 없음: ${sheetUrl}`);
          }
          continue;
        }
        
        // 이미 originalPublishDate가 있는 경우 건너뛰기
        if (matchedDoc.originalPublishDate) {
          if (totalProcessed <= 5) {
            console.log(`⏭️ 이미 날짜 있음: ${matchedDoc.originalUrl} (${matchedDoc.originalPublishDate.toLocaleString()})`);
          }
          continue;
        }
        
        // originalPublishDate 업데이트
        await VideoUrl.updateOne(
          { _id: matchedDoc._id },
          { 
            $set: { 
              originalPublishDate: dateInfo.originalPublishDate,
              processedAt: matchedDoc.status === 'completed' ? new Date() : undefined
            }
          }
        );
        
        successCount++;
        
        if (totalProcessed <= 10 || totalProcessed % 10 === 0) {
          console.log(`✅ [${totalProcessed}/${urlDateMappings.size}] ${dateInfo.platform.toUpperCase()} 업데이트`);
          console.log(`   시트 URL: ${sheetUrl}`);
          console.log(`   MongoDB URL: ${matchedDoc.originalUrl}`);
          console.log(`   원본 게시일: ${dateInfo.originalDateStr} -> ${dateInfo.originalPublishDate.toLocaleString()}`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ 업데이트 실패: ${sheetUrl}`, error.message);
      }
      
      // 10개마다 진행상황 출력
      if (totalProcessed % 50 === 0) {
        console.log(`📊 진행상황: ${totalProcessed}/${urlDateMappings.size} (성공: ${successCount}, 미발견: ${notFoundCount}, 오류: ${errorCount})`);
      }
    }
    
    return {
      totalProcessed,
      successCount,
      notFoundCount,
      errorCount
    };
  }

  /**
   * 마이그레이션 실행
   */
  async migrate() {
    try {
      console.log('🚀 원본 게시일 마이그레이션 시작...\n');
      
      // MongoDB 연결
      const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@InsightReel.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=InsightReel';
      await mongoose.connect(mongoUri);
      console.log('✅ MongoDB 연결 성공');
      
      // Google Sheets 초기화
      const sheetsInitialized = await this.initializeSheets();
      if (!sheetsInitialized) {
        throw new Error('Google Sheets API 초기화 실패');
      }
      
      // 현재 MongoDB 상태 확인
      const totalDocs = await VideoUrl.countDocuments();
      const docsWithDate = await VideoUrl.countDocuments({ originalPublishDate: { $exists: true, $ne: null } });
      const docsWithoutDate = totalDocs - docsWithDate;
      
      console.log(`\n📊 MongoDB 현재 상태:`);
      console.log(`   전체 레코드: ${totalDocs}개`);
      console.log(`   날짜 있음: ${docsWithDate}개`);
      console.log(`   날짜 없음: ${docsWithoutDate}개`);
      
      if (docsWithoutDate === 0) {
        console.log('✅ 모든 레코드에 이미 원본 게시일이 있습니다.');
        return;
      }
      
      // 시트에서 URL-날짜 매핑 수집
      const urlDateMappings = await this.getAllUrlDateMappings();
      
      if (urlDateMappings.size === 0) {
        console.log('❌ 시트에서 URL-날짜 매핑을 찾을 수 없습니다.');
        return;
      }
      
      // MongoDB 업데이트 실행
      const results = await this.updateMongoDBDates(urlDateMappings);
      
      // 최종 결과 출력
      console.log('\n📊 마이그레이션 완료 결과:');
      console.log(`   처리된 매핑: ${results.totalProcessed}개`);
      console.log(`   성공한 업데이트: ${results.successCount}개`);
      console.log(`   MongoDB에서 미발견: ${results.notFoundCount}개`);
      console.log(`   오류 발생: ${results.errorCount}개`);
      
      // 마이그레이션 후 상태 확인
      const finalDocsWithDate = await VideoUrl.countDocuments({ originalPublishDate: { $exists: true, $ne: null } });
      console.log(`\n✅ 마이그레이션 후 날짜가 있는 레코드: ${finalDocsWithDate}개 (${docsWithDate} -> ${finalDocsWithDate}, +${finalDocsWithDate - docsWithDate})`);
      
    } catch (error) {
      console.error('❌ 마이그레이션 실패:', error.message);
      console.error(error.stack);
    } finally {
      await mongoose.disconnect();
      console.log('\n🔌 MongoDB 연결 종료');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const migration = new OriginalPublishDateMigration();
  migration.migrate();
}