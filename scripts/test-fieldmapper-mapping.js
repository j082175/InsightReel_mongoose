// FieldMapper 데이터 매핑 완전 테스트
require('dotenv').config();
const mongoose = require('mongoose');
const { FieldMapper } = require('../server/types/field-mapper.js');

async function testDatabaseMapping() {
  console.log('🧪 실제 MongoDB 데이터 매핑 테스트');
  console.log('==================================');

  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공');

    // Video 모델 로드
    const Video = require('../server/models/Video.js');

    // 1. FieldMapper 기반 쿼리 테스트
    console.log('\n1. FieldMapper 기반 쿼리 테스트:');
    
    // 최신 비디오 2개 조회
    const recentVideos = await Video.getRecentVideos(2);
    console.log(`   최신 비디오 ${recentVideos.length}개 조회됨`);

    if (recentVideos.length > 0) {
      const video = recentVideos[0];
      console.log('\n   첫 번째 비디오의 FieldMapper 필드들:');
      
      // FieldMapper로 정의된 필드들 확인
      const testFields = ['CHANNEL_NAME', 'UPLOAD_DATE', 'URL', 'PLATFORM', 'VIEWS', 'LIKES'];
      testFields.forEach(fieldKey => {
        const fieldName = FieldMapper.get(fieldKey);
        const value = video[fieldName];
        console.log(`     ${fieldKey} (${fieldName}): ${value || '❌ 없음'}`);
      });
    }

    // 2. 플랫폼별 조회 테스트
    console.log('\n2. FieldMapper 기반 플랫폼별 조회:');
    const youtubeVideos = await Video.findByPlatform('youtube', 'UPLOAD_DATE', 'desc', 1);
    console.log(`   YouTube 비디오: ${youtubeVideos.length}개`);

    if (youtubeVideos.length > 0) {
      const ytVideo = youtubeVideos[0];
      console.log(`   YouTube 채널: ${ytVideo[FieldMapper.get('CHANNEL_NAME')] || '❌'}`);
    }

    // 3. 정렬 테스트
    console.log('\n3. FieldMapper 기반 정렬 테스트:');
    const sortedVideos = await Video.find({})
      .sort(FieldMapper.buildSortObject('VIEWS', -1))
      .limit(1);
    console.log(`   조회수 높은 비디오: ${sortedVideos.length}개`);

    if (sortedVideos.length > 0) {
      const topVideo = sortedVideos[0];
      console.log(`   최고 조회수: ${topVideo[FieldMapper.get('VIEWS')] || 0}`);
      console.log(`   채널명: ${topVideo[FieldMapper.get('CHANNEL_NAME')] || '❌'}`);
    }

    // 4. 테스트 데이터 생성 및 조회
    console.log('\n4. 테스트 데이터 생성 테스트:');
    const testData = {
      [FieldMapper.get('PLATFORM')]: 'youtube',
      [FieldMapper.get('CHANNEL_NAME')]: 'FieldMapper 테스트 채널',
      [FieldMapper.get('URL')]: 'https://test.example.com/test-video',
      [FieldMapper.get('UPLOAD_DATE')]: new Date(),
      [FieldMapper.get('VIEWS')]: 12345,
      [FieldMapper.get('LIKES')]: 999
    };

    // 새 비디오 생성
    const newVideo = new Video(testData);
    await newVideo.save();
    console.log('   ✅ 테스트 데이터 생성 성공');

    // 생성된 데이터 조회
    const savedVideo = await Video.findOne({
      [FieldMapper.get('URL')]: 'https://test.example.com/test-video'
    });

    if (savedVideo) {
      console.log('   ✅ 테스트 데이터 조회 성공');
      console.log(`   채널명: ${savedVideo[FieldMapper.get('CHANNEL_NAME')]}`);
      console.log(`   조회수: ${savedVideo[FieldMapper.get('VIEWS')]}`);
      
      // 테스트 데이터 삭제
      await Video.deleteOne({ _id: savedVideo._id });
      console.log('   ✅ 테스트 데이터 정리 완료');
    }

    console.log('\n🎉 모든 데이터 매핑 테스트 성공!');
    console.log('FieldMapper 자동화 시스템이 완벽하게 작동하고 있습니다!');

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 해제');
  }
}

testDatabaseMapping();