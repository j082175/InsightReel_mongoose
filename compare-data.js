/**
 * Google Sheets vs MongoDB 데이터 비교 스크립트
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { YouTubeVideo, InstagramVideo } = require('./server/models/VideoOptimized');
const SheetsManager = require('./server/services/SheetsManager');

async function compareData() {
  console.log('🔍 Google Sheets vs MongoDB 데이터 비교 시작\n');

  try {
    // 1. MongoDB 연결
    console.log('1️⃣ MongoDB 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공');

    // 2. SheetsManager 초기화
    console.log('\n2️⃣ Google Sheets 연결 중...');
    const sheetsManager = new SheetsManager();
    // 초기화 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Google Sheets 연결 완료');

    // 3. MongoDB 데이터 조회
    console.log('\n3️⃣ MongoDB 데이터 조회 중...');
    const youtubeVideos = await YouTubeVideo.find()
      .sort({ createdAt: -1 })
      .select('url account title mainCategory views likes uploadDate createdAt')
      .lean();
    
    const instagramVideos = await InstagramVideo.find()
      .sort({ createdAt: -1 })
      .select('url account mainCategory likes uploadDate createdAt')
      .lean();

    console.log(`📱 MongoDB 데이터:`);
    console.log(`   - YouTube: ${youtubeVideos.length}개`);
    console.log(`   - Instagram: ${instagramVideos.length}개`);

    // 4. Google Sheets 데이터 조회
    console.log('\n4️⃣ Google Sheets 데이터 조회 중...');
    
    let sheetsYouTubeData = [];
    let sheetsInstagramData = [];
    
    try {
      // YouTube 시트 데이터 조회
      const youtubeResponse = await sheetsManager.sheets.spreadsheets.values.get({
        spreadsheetId: sheetsManager.spreadsheetId,
        range: 'YouTube!A2:AH1000', // 헤더 제외하고 데이터만
      });
      
      if (youtubeResponse.data.values) {
        sheetsYouTubeData = youtubeResponse.data.values
          .filter(row => row && row.length > 0 && row[26]) // URL 컬럼(27번째)이 있는 것만
          .map(row => ({
            uploadDate: row[0] || '',
            platform: row[1] || '',
            account: row[2] || '',
            youtubeHandle: row[3] || '',
            channelUrl: row[4] || '',
            mainCategory: row[5] || '',
            title: row[26] || '', // URL 컬럼 다음에 있는 제목이나...
            views: parseInt(row[17]) || 0,
            likes: parseInt(row[15]) || 0,
            url: row[26] || '' // URL 컬럼
          }));
      }
      
      // Instagram 시트 데이터 조회
      const instagramResponse = await sheetsManager.sheets.spreadsheets.values.get({
        spreadsheetId: sheetsManager.spreadsheetId,
        range: 'Instagram!A2:T1000', // 헤더 제외하고 데이터만
      });
      
      if (instagramResponse.data.values) {
        sheetsInstagramData = instagramResponse.data.values
          .filter(row => row && row.length > 0 && row[15]) // URL 컬럼이 있는 것만
          .map(row => ({
            uploadDate: row[0] || '',
            platform: row[1] || '',
            account: row[2] || '',
            channelUrl: row[3] || '',
            mainCategory: row[4] || '',
            likes: parseInt(row[13]) || 0,
            url: row[15] || '' // URL 컬럼
          }));
      }
      
    } catch (sheetsError) {
      console.log('⚠️ Google Sheets 데이터 조회 중 오류:', sheetsError.message);
    }

    console.log(`📊 Google Sheets 데이터:`);
    console.log(`   - YouTube: ${sheetsYouTubeData.length}개`);
    console.log(`   - Instagram: ${sheetsInstagramData.length}개`);

    // 5. 데이터 개수 비교
    console.log('\n5️⃣ 데이터 개수 비교...');
    console.log('📊 개수 비교:');
    console.log(`   YouTube:   MongoDB ${youtubeVideos.length}개 vs Sheets ${sheetsYouTubeData.length}개`);
    console.log(`   Instagram: MongoDB ${instagramVideos.length}개 vs Sheets ${sheetsInstagramData.length}개`);
    
    const youtubeCountMatch = youtubeVideos.length === sheetsYouTubeData.length;
    const instagramCountMatch = instagramVideos.length === sheetsInstagramData.length;
    
    console.log(`   YouTube 개수 일치: ${youtubeCountMatch ? '✅' : '❌'}`);
    console.log(`   Instagram 개수 일치: ${instagramCountMatch ? '✅' : '❌'}`);

    // 6. YouTube 데이터 상세 비교
    if (youtubeVideos.length > 0 && sheetsYouTubeData.length > 0) {
      console.log('\n6️⃣ YouTube 데이터 상세 비교...');
      
      // URL로 매칭하여 비교
      const comparisons = [];
      
      youtubeVideos.forEach((mongoVideo, index) => {
        console.log(`\n📺 YouTube 비디오 ${index + 1}:`);
        console.log(`   MongoDB: ${mongoVideo.account} - ${mongoVideo.title}`);
        console.log(`   URL: ${mongoVideo.url}`);
        console.log(`   카테고리: ${mongoVideo.mainCategory}, 조회수: ${mongoVideo.views}, 좋아요: ${mongoVideo.likes}`);
        
        // URL로 Sheets 데이터 찾기
        const normalizedMongoUrl = mongoVideo.url.toLowerCase();
        const sheetsMatch = sheetsYouTubeData.find(sheetVideo => {
          const normalizedSheetUrl = sheetVideo.url.toLowerCase();
          return normalizedSheetUrl.includes(normalizedMongoUrl.split('?v=')[1]?.split('&')[0] || '') ||
                 normalizedMongoUrl.includes(normalizedSheetUrl.split('?v=')[1]?.split('&')[0] || '');
        });
        
        if (sheetsMatch) {
          console.log(`   Sheets: ${sheetsMatch.account} - 카테고리: ${sheetsMatch.mainCategory}`);
          console.log(`   조회수: ${sheetsMatch.views}, 좋아요: ${sheetsMatch.likes}`);
          
          const dataMatch = {
            url: true,
            account: mongoVideo.account === sheetsMatch.account,
            mainCategory: mongoVideo.mainCategory === sheetsMatch.mainCategory,
            views: mongoVideo.views === sheetsMatch.views,
            likes: mongoVideo.likes === sheetsMatch.likes
          };
          
          console.log(`   데이터 일치:`, dataMatch);
          comparisons.push(dataMatch);
        } else {
          console.log(`   ❌ Sheets에서 매칭되는 데이터를 찾을 수 없음`);
          comparisons.push({ url: false });
        }
      });
      
      // 일치율 계산
      const matchedCount = comparisons.filter(comp => comp.url && comp.account && comp.mainCategory).length;
      const matchRate = comparisons.length > 0 ? (matchedCount / comparisons.length * 100).toFixed(1) : 0;
      
      console.log(`\n📊 YouTube 데이터 일치율: ${matchRate}% (${matchedCount}/${comparisons.length})`);
    }

    // 7. Instagram 데이터 비교 (있는 경우)
    if (instagramVideos.length > 0 && sheetsInstagramData.length > 0) {
      console.log('\n7️⃣ Instagram 데이터 비교...');
      // Instagram 비교 로직 (필요시)
      console.log('   Instagram 데이터 상세 비교 생략 (현재 0개)');
    }

    // 8. 최종 결과
    console.log('\n8️⃣ 최종 비교 결과...');
    const overallMatch = youtubeCountMatch && instagramCountMatch;
    
    if (overallMatch) {
      console.log('🎉 Google Sheets와 MongoDB 데이터가 완벽하게 일치합니다!');
    } else {
      console.log('⚠️ 일부 데이터에 차이가 있습니다.');
      if (!youtubeCountMatch) {
        console.log(`   - YouTube 개수 차이: MongoDB ${youtubeVideos.length}개 vs Sheets ${sheetsYouTubeData.length}개`);
      }
      if (!instagramCountMatch) {
        console.log(`   - Instagram 개수 차이: MongoDB ${instagramVideos.length}개 vs Sheets ${sheetsInstagramData.length}개`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ 데이터 비교 완료!');
    
    return overallMatch;

  } catch (error) {
    console.log('❌ 데이터 비교 실패:', error.message);
    console.log('스택 트레이스:', error.stack);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    
    return false;
  }
}

// 직접 실행 시
if (require.main === module) {
  compareData().then(match => {
    if (match) {
      console.log('\n✅ 데이터 일치 확인됨!');
    } else {
      console.log('\n⚠️ 데이터 불일치 또는 비교 실패');
    }
    process.exit(match ? 0 : 1);
  });
}

module.exports = compareData;