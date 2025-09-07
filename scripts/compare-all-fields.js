/**
 * 새로 저장된 영상의 모든 필드 상세 비교
 * MongoDB vs Google Sheets 전체 항목 검증
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { YouTubeVideo, InstagramVideo } = require('./server/models/VideoOptimized');
const SheetsManager = require('./server/services/SheetsManager');

async function compareAllFields() {
  console.log('🔍 새로 저장된 영상의 모든 필드 상세 비교\n');

  try {
    // 1. MongoDB 연결
    console.log('1️⃣ MongoDB 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공');

    // 2. SheetsManager 초기화
    console.log('\n2️⃣ Google Sheets 연결 중...');
    const sheetsManager = new SheetsManager();
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Google Sheets 연결 완료');

    // 3. 최근 24시간 내 MongoDB 데이터 조회 (모든 필드)
    console.log('\n3️⃣ 최근 저장된 MongoDB 데이터 조회 중 (모든 필드)...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const newYoutubeVideos = await YouTubeVideo.find({
      createdAt: { $gte: twentyFourHoursAgo }
    })
    .sort({ createdAt: -1 })
    .lean(); // 모든 필드 가져오기

    console.log(`📱 최근 MongoDB 데이터: ${newYoutubeVideos.length}개`);

    if (newYoutubeVideos.length === 0) {
      console.log('❌ 최근 24시간 내 새로 저장된 데이터가 없습니다.');
      await mongoose.disconnect();
      return false;
    }

    // 4. YouTube 스키마의 필드 매핑 정의 (Google Sheets 컬럼 순서)
    const youtubeFieldMapping = {
      0: { field: 'uploadDate', name: '업로드날짜' },
      1: { field: 'platform', name: '플랫폼' },
      2: { field: 'account', name: '계정' },
      3: { field: 'youtubeHandle', name: 'YouTube핸들명' },
      4: { field: 'channelUrl', name: '채널URL' },
      5: { field: 'mainCategory', name: '대카테고리' },
      6: { field: 'middleCategory', name: '중카테고리' },
      7: { field: 'fullCategoryPath', name: '전체카테고리경로' },
      8: { field: 'categoryDepth', name: '카테고리깊이' },
      9: { field: 'keywords', name: '키워드' },
      10: { field: 'hashtags', name: '해시태그' },
      11: { field: 'mentions', name: '멘션' },
      12: { field: 'description', name: '설명' },
      13: { field: 'analysisContent', name: '분석내용' },
      14: { field: 'comments', name: '댓글' },
      15: { field: 'likes', name: '좋아요' },
      16: { field: 'commentsCount', name: '댓글수' },
      17: { field: 'views', name: '조회수' },
      18: { field: 'duration', name: '영상길이' },
      19: { field: 'subscribers', name: '구독자수' },
      20: { field: 'channelVideos', name: '채널동영상수' },
      21: { field: 'monetized', name: '수익화여부' },
      22: { field: 'youtubeCategory', name: 'YouTube카테고리' },
      23: { field: 'license', name: '라이센스' },
      24: { field: 'quality', name: '화질' },
      25: { field: 'language', name: '언어' },
      26: { field: 'url', name: 'URL' },
      27: { field: 'thumbnailUrl', name: '썸네일URL' },
      28: { field: 'confidence', name: '신뢰도' },
      29: { field: 'analysisStatus', name: '분석상태' },
      30: { field: 'categoryMatchRate', name: '카테고리일치율' },
      31: { field: 'matchType', name: '일치유형' },
      32: { field: 'matchReason', name: '일치사유' },
      33: { field: 'collectionTime', name: '수집시간' }
    };

    // 5. 각 MongoDB 데이터에 대해 전체 필드 비교
    for (let i = 0; i < newYoutubeVideos.length; i++) {
      const mongoVideo = newYoutubeVideos[i];
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📺 영상 ${i + 1}: ${mongoVideo.account} - 행 ${mongoVideo.rowNumber}`);
      console.log(`   URL: ${mongoVideo.url}`);
      console.log(`   생성일: ${mongoVideo.createdAt}`);
      console.log(`${'='.repeat(80)}`);

      try {
        // Google Sheets 해당 행 데이터 조회
        let sheetRow = null;
        
        if (mongoVideo.rowNumber) {
          console.log(`\n🔍 Google Sheets 행 ${mongoVideo.rowNumber} 조회 중...`);
          
          const response = await sheetsManager.sheets.spreadsheets.values.get({
            spreadsheetId: sheetsManager.spreadsheetId,
            range: `YouTube!A${mongoVideo.rowNumber}:AH${mongoVideo.rowNumber}`,
          });
          
          if (response.data.values && response.data.values[0]) {
            sheetRow = response.data.values[0];
            console.log(`✅ Sheets 데이터 발견 (${sheetRow.length}개 컬럼)`);
          }
        }
        
        if (!sheetRow) {
          console.log(`❌ Google Sheets에서 해당 행 데이터를 찾을 수 없음`);
          continue;
        }

        // 6. 모든 필드 상세 비교
        console.log(`\n📊 모든 필드 상세 비교:`);
        console.log(`${'─'.repeat(100)}`);
        console.log(`${'순번'.padEnd(4)} | ${'필드명'.padEnd(20)} | ${'MongoDB 값'.padEnd(25)} | ${'Sheets 값'.padEnd(25)} | ${'일치'.padEnd(6)}`);
        console.log(`${'─'.repeat(100)}`);

        let totalFields = 0;
        let matchedFields = 0;
        const mismatches = [];

        Object.keys(youtubeFieldMapping).forEach(colIndex => {
          const col = parseInt(colIndex);
          const mapping = youtubeFieldMapping[col];
          
          // MongoDB 값 가져오기
          let mongoValue = mongoVideo[mapping.field];
          let sheetsValue = sheetRow[col] || '';
          
          // 데이터 타입별 정규화
          if (typeof mongoValue === 'number') {
            mongoValue = mongoValue.toString();
          } else if (mongoValue instanceof Date) {
            mongoValue = mongoValue.toISOString().split('T')[0]; // YYYY-MM-DD 형식
          } else if (mongoValue === null || mongoValue === undefined) {
            mongoValue = '';
          } else {
            mongoValue = String(mongoValue);
          }
          
          sheetsValue = String(sheetsValue);
          
          // 비교
          const isMatch = mongoValue === sheetsValue;
          totalFields++;
          
          if (isMatch) {
            matchedFields++;
          } else {
            mismatches.push({
              field: mapping.name,
              mongo: mongoValue,
              sheets: sheetsValue
            });
          }
          
          // 값이 너무 길면 잘라서 표시
          const mongoDisplay = mongoValue.length > 23 ? mongoValue.substring(0, 20) + '...' : mongoValue;
          const sheetsDisplay = sheetsValue.length > 23 ? sheetsValue.substring(0, 20) + '...' : sheetsValue;
          
          const statusIcon = isMatch ? '✅' : '❌';
          const colNum = (col + 1).toString().padEnd(4);
          const fieldName = mapping.name.padEnd(20);
          const mongoCol = mongoDisplay.padEnd(25);
          const sheetsCol = sheetsDisplay.padEnd(25);
          const statusCol = statusIcon.padEnd(6);
          
          console.log(`${colNum} | ${fieldName} | ${mongoCol} | ${sheetsCol} | ${statusCol}`);
        });

        console.log(`${'─'.repeat(100)}`);
        
        const matchRate = (matchedFields / totalFields * 100).toFixed(1);
        console.log(`\n📈 전체 일치율: ${matchRate}% (${matchedFields}/${totalFields})`);
        
        if (matchRate === '100.0') {
          console.log(`🎉 모든 필드가 완벽하게 일치합니다!`);
        } else {
          console.log(`\n⚠️ 불일치 필드 상세:`);
          mismatches.forEach((mismatch, idx) => {
            console.log(`   ${idx + 1}. ${mismatch.field}:`);
            console.log(`      MongoDB: "${mismatch.mongo}"`);
            console.log(`      Sheets:  "${mismatch.sheets}"`);
          });
        }

      } catch (error) {
        console.log(`❌ 필드 비교 실패: ${error.message}`);
      }
    }

    await mongoose.disconnect();
    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ 모든 필드 비교 완료!');
    console.log(`${'='.repeat(80)}`);
    
    return true;

  } catch (error) {
    console.log('❌ 전체 필드 비교 실패:', error.message);
    console.log('스택 트레이스:', error.stack);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    
    return false;
  }
}

// 직접 실행 시
if (require.main === module) {
  compareAllFields().then(success => {
    if (success) {
      console.log('\n📊 모든 필드 비교가 완료되었습니다!');
    } else {
      console.log('\n❌ 전체 필드 비교에 실패했습니다.');
    }
    process.exit(success ? 0 : 1);
  });
}

module.exports = compareAllFields;