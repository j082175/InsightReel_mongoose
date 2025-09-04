/**
 * 새로 저장된 영상 데이터만 비교 (UnifiedVideoSaver 사용분)
 * 최근 1시간 내 저장된 데이터만 비교
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { YouTubeVideo, InstagramVideo } = require('./server/models/VideoOptimized');
const SheetsManager = require('./server/services/SheetsManager');

async function compareNewData() {
  console.log('🔍 새로 저장된 영상 데이터 비교 (최근 1시간 내)\n');

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

    // 3. 최근 1시간 내 MongoDB 데이터 조회
    console.log('\n3️⃣ 최근 저장된 MongoDB 데이터 조회 중...');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const newYoutubeVideos = await YouTubeVideo.find({
      createdAt: { $gte: oneHourAgo }
    })
    .sort({ createdAt: -1 })
    .select('url account title mainCategory views likes uploadDate createdAt rowNumber')
    .lean();

    console.log(`📱 최근 MongoDB 데이터:`);
    console.log(`   - YouTube: ${newYoutubeVideos.length}개`);

    if (newYoutubeVideos.length === 0) {
      console.log('⚠️ 최근 1시간 내 새로 저장된 MongoDB 데이터가 없습니다.');
      console.log('   시간 범위를 확장해서 확인해보겠습니다...');
      
      // 최근 24시간으로 확장
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentVideos = await YouTubeVideo.find({
        createdAt: { $gte: twentyFourHoursAgo }
      })
      .sort({ createdAt: -1 })
      .select('url account title mainCategory views likes uploadDate createdAt rowNumber')
      .lean();
      
      console.log(`   - 최근 24시간 내 YouTube: ${recentVideos.length}개`);
      
      if (recentVideos.length === 0) {
        console.log('❌ 최근 24시간 내에도 새 데이터가 없습니다.');
        await mongoose.disconnect();
        return false;
      }
      
      // 24시간 내 데이터 사용
      newYoutubeVideos.splice(0, 0, ...recentVideos);
    }

    // 4. 각 MongoDB 데이터에 대해 Google Sheets에서 매칭 데이터 찾기
    console.log('\n4️⃣ Google Sheets에서 매칭 데이터 검색 중...');
    
    for (let i = 0; i < newYoutubeVideos.length; i++) {
      const mongoVideo = newYoutubeVideos[i];
      console.log(`\n📺 비교 ${i + 1}: ${mongoVideo.account}`);
      console.log(`   MongoDB URL: ${mongoVideo.url}`);
      console.log(`   MongoDB 생성일: ${mongoVideo.createdAt}`);
      console.log(`   MongoDB 행번호: ${mongoVideo.rowNumber || 'N/A'}`);

      try {
        // MongoDB의 rowNumber를 사용하여 Google Sheets 특정 행 조회
        let sheetRow = null;
        
        if (mongoVideo.rowNumber) {
          console.log(`   🔍 Sheets 행 ${mongoVideo.rowNumber} 조회 중...`);
          
          const response = await sheetsManager.sheets.spreadsheets.values.get({
            spreadsheetId: sheetsManager.spreadsheetId,
            range: `YouTube!A${mongoVideo.rowNumber}:AH${mongoVideo.rowNumber}`,
          });
          
          if (response.data.values && response.data.values[0]) {
            const row = response.data.values[0];
            sheetRow = {
              uploadDate: row[0] || '',
              platform: row[1] || '',
              account: row[2] || '',
              youtubeHandle: row[3] || '',
              channelUrl: row[4] || '',
              mainCategory: row[5] || '',
              middleCategory: row[6] || '',
              keywords: row[9] || '',
              views: parseInt(row[17]) || 0,
              likes: parseInt(row[15]) || 0,
              url: row[26] || '',
              rowNumber: mongoVideo.rowNumber
            };
            
            console.log(`   ✅ Sheets 데이터 발견:`);
            console.log(`      계정: ${sheetRow.account}`);
            console.log(`      카테고리: ${sheetRow.mainCategory}`);
            console.log(`      조회수: ${sheetRow.views}, 좋아요: ${sheetRow.likes}`);
            console.log(`      URL: ${sheetRow.url}`);
          }
        }
        
        if (!sheetRow) {
          console.log(`   ❌ 해당 행에서 Sheets 데이터를 찾을 수 없음`);
          continue;
        }

        // 5. 데이터 비교
        console.log(`\n   📊 데이터 일치 검사:`);
        
        const comparisons = {
          url: mongoVideo.url === sheetRow.url,
          account: mongoVideo.account === sheetRow.account,
          mainCategory: mongoVideo.mainCategory === sheetRow.mainCategory,
          views: mongoVideo.views === sheetRow.views,
          likes: mongoVideo.likes === sheetRow.likes
        };
        
        console.log(`      URL: ${comparisons.url ? '✅' : '❌'}`);
        if (!comparisons.url) {
          console.log(`         MongoDB: ${mongoVideo.url}`);
          console.log(`         Sheets:  ${sheetRow.url}`);
        }
        
        console.log(`      계정: ${comparisons.account ? '✅' : '❌'}`);
        if (!comparisons.account) {
          console.log(`         MongoDB: "${mongoVideo.account}"`);
          console.log(`         Sheets:  "${sheetRow.account}"`);
        }
        
        console.log(`      카테고리: ${comparisons.mainCategory ? '✅' : '❌'}`);
        if (!comparisons.mainCategory) {
          console.log(`         MongoDB: "${mongoVideo.mainCategory}"`);
          console.log(`         Sheets:  "${sheetRow.mainCategory}"`);
        }
        
        console.log(`      조회수: ${comparisons.views ? '✅' : '❌'}`);
        if (!comparisons.views) {
          console.log(`         MongoDB: ${mongoVideo.views}`);
          console.log(`         Sheets:  ${sheetRow.views}`);
        }
        
        console.log(`      좋아요: ${comparisons.likes ? '✅' : '❌'}`);
        if (!comparisons.likes) {
          console.log(`         MongoDB: ${mongoVideo.likes}`);
          console.log(`         Sheets:  ${sheetRow.likes}`);
        }
        
        const matchCount = Object.values(comparisons).filter(match => match).length;
        const matchRate = (matchCount / Object.keys(comparisons).length * 100).toFixed(1);
        
        console.log(`\n   🎯 일치율: ${matchRate}% (${matchCount}/${Object.keys(comparisons).length})`);
        
        if (matchRate === '100.0') {
          console.log(`   🎉 완벽 일치!`);
        } else {
          console.log(`   ⚠️ 일부 데이터 불일치`);
        }

      } catch (error) {
        console.log(`   ❌ Sheets 조회 실패: ${error.message}`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ 새 데이터 비교 완료!');
    
    return true;

  } catch (error) {
    console.log('❌ 새 데이터 비교 실패:', error.message);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    
    return false;
  }
}

// 직접 실행 시
if (require.main === module) {
  compareNewData().then(success => {
    if (success) {
      console.log('\n📊 새로 저장된 영상 데이터 비교가 완료되었습니다!');
    } else {
      console.log('\n❌ 새 데이터 비교에 실패했습니다.');
    }
    process.exit(success ? 0 : 1);
  });
}

module.exports = compareNewData;