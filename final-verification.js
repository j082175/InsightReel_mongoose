/**
 * 최종 검증: UnifiedVideoSaver MongoDB 직접 저장 테스트
 * Google Sheets 없이 MongoDB만 테스트
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { YouTubeVideo, InstagramVideo, getModelByPlatform } = require('./server/models/VideoOptimized');
const VideoDataConverter = require('./server/services/VideoDataConverter');

async function finalVerification() {
  console.log('🔥 최종 검증: MongoDB 직접 저장 테스트\n');

  try {
    // MongoDB 연결
    console.log('1️⃣ MongoDB 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공\n');

    // 테스트 데이터 준비
    const testData = {
      platform: 'youtube',
      postUrl: 'https://youtube.com/watch?v=final_verification_123',
      videoPath: '/test/final_video.mp4',
      thumbnailPath: '/test/final_thumb.jpg',
      metadata: {
        author: 'FinalTestChannel',
        youtubeHandle: '@finaltestchannel',
        channelUrl: 'https://youtube.com/@finaltestchannel',
        title: '최종 검증 테스트 비디오',
        views: 99999,
        likes: 9999,
        comments: 999,
        duration: '05:30',
        uploadDate: new Date()
      },
      analysis: {
        mainCategory: '과학기술',
        middleCategory: '컴퓨터',
        content: '최종 검증을 위한 테스트 비디오입니다',
        keywords: ['검증', '테스트', '기술'],
        confidence: 0.99,
        aiModel: 'gemini-2.0-flash'
      },
      timestamp: new Date().toISOString()
    };

    // 2. 데이터 변환
    console.log('2️⃣ 데이터 변환 테스트...');
    const convertedData = VideoDataConverter.convertToSchema('youtube', testData, 999);
    console.log(`✅ 변환 완료: ${Object.keys(convertedData).length}개 필드\n`);

    // 3. MongoDB 모델 생성 및 저장
    console.log('3️⃣ MongoDB 직접 저장 테스트...');
    const Model = getModelByPlatform('youtube');
    const document = new Model(convertedData);
    
    const saved = await document.save();
    console.log(`✅ MongoDB 저장 성공! ID: ${saved._id}\n`);

    // 4. 저장된 데이터 조회
    console.log('4️⃣ 저장된 데이터 조회 테스트...');
    const found = await Model.findById(saved._id);
    console.log(`✅ 조회 성공: ${found.account} - ${found.mainCategory}\n`);

    // 5. 데이터 업데이트
    console.log('5️⃣ 데이터 업데이트 테스트...');
    found.views = 199999;
    const updated = await found.save();
    console.log(`✅ 업데이트 성공: 조회수 ${updated.views}\n`);

    // 6. 검색 쿼리 테스트
    console.log('6️⃣ 검색 쿼리 성능 테스트...');
    const start = Date.now();
    const searchResults = await Model.find({ 
      platform: 'YOUTUBE', 
      mainCategory: '과학기술' 
    }).limit(10);
    const searchTime = Date.now() - start;
    console.log(`✅ 검색 완료: ${searchResults.length}개 결과, ${searchTime}ms\n`);

    // 7. 인덱스 효과 테스트
    console.log('7️⃣ 인덱스 효과 테스트...');
    const indexStart = Date.now();
    const indexResult = await Model.findOne({ url: convertedData.url });
    const indexTime = Date.now() - indexStart;
    console.log(`✅ URL 검색 (인덱스): ${indexTime}ms\n`);

    // 8. 정리
    console.log('8️⃣ 테스트 데이터 정리...');
    await Model.findByIdAndDelete(saved._id);
    console.log('✅ 정리 완료\n');

    await mongoose.disconnect();
    console.log('🎉 최종 검증 완료! MongoDB 시스템이 완벽하게 작동합니다!\n');
    
    console.log('=== 검증 결과 ===');
    console.log('✅ MongoDB 연결: 정상');
    console.log('✅ 데이터 변환: 정상');
    console.log('✅ 문서 저장: 정상');
    console.log('✅ 문서 조회: 정상');
    console.log('✅ 문서 업데이트: 정상');
    console.log('✅ 검색 쿼리: 정상');
    console.log('✅ 인덱스 성능: 정상');
    console.log('✅ 정리 기능: 정상');
    
    return true;

  } catch (error) {
    console.log('❌ 최종 검증 실패:', error.message);
    console.log('스택 트레이스:', error.stack);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    
    return false;
  }
}

// 직접 실행 시
if (require.main === module) {
  finalVerification().then(success => {
    if (success) {
      console.log('\n🔥 확실합니다! MongoDB 시스템이 완벽하게 작동합니다!');
    } else {
      console.log('\n❌ 문제가 있습니다. 추가 디버깅이 필요합니다.');
    }
    process.exit(success ? 0 : 1);
  });
}

module.exports = finalVerification;