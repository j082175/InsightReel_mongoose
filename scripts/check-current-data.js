/**
 * 현재 데이터베이스에 저장된 실제 데이터 확인
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { YouTubeVideo, InstagramVideo } = require('./server/models/VideoOptimized');
const { FieldMapper } = require('./server/types/field-mapper');

async function checkCurrentData() {
  console.log('📊 현재 데이터베이스 상태 확인\n');

  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공\n');

    // 1. YouTube 비디오 개수 확인
    console.log('1️⃣ YouTube 비디오 개수 확인...');
    const youtubeCount = await YouTubeVideo.countDocuments();
    console.log(`📺 YouTube 비디오: ${youtubeCount}개\n`);

    // 2. Instagram 비디오 개수 확인  
    console.log('2️⃣ Instagram 비디오 개수 확인...');
    const instagramCount = await InstagramVideo.countDocuments();
    console.log(`📱 Instagram 비디오: ${instagramCount}개\n`);

    // 3. 최근 YouTube 비디오 5개 조회
    if (youtubeCount > 0) {
      console.log('3️⃣ 최근 YouTube 비디오 목록...');
      const recentYoutube = await YouTubeVideo.find()
        .sort(FieldMapper.buildSortObject('CREATED_AT', 'desc'))
        .limit(5)
        .select(FieldMapper.buildSelectString(['CHANNEL_NAME', 'TITLE', 'MAIN_CATEGORY', 'VIEWS', 'LIKES', 'URL', 'CREATED_AT']));
      
      recentYoutube.forEach((video, index) => {
        console.log(`   ${index + 1}. ${video[FieldMapper.get('CHANNEL_NAME')]} - "${video[FieldMapper.get('TITLE')]}"`);
        console.log(`      카테고리: ${video[FieldMapper.get('MAIN_CATEGORY')]}, 조회수: ${video[FieldMapper.get('VIEWS')]}, 좋아요: ${video[FieldMapper.get('LIKES')]}`);
        console.log(`      URL: ${video[FieldMapper.get('URL')]}`);
        console.log(`      생성일: ${video[FieldMapper.get('CREATED_AT')]}`);
        console.log('');
      });
    }

    // 4. 최근 Instagram 비디오 5개 조회
    if (instagramCount > 0) {
      console.log('4️⃣ 최근 Instagram 비디오 목록...');
      const recentInstagram = await InstagramVideo.find()
        .sort(FieldMapper.buildSortObject('CREATED_AT', 'desc'))
        .limit(5)
        .select('account mainCategory likes url createdAt');
      
      recentInstagram.forEach((video, index) => {
        console.log(`   ${index + 1}. ${video.account}`);
        console.log(`      카테고리: ${video.mainCategory}, 좋아요: ${video.likes}`);
        console.log(`      URL: ${video[FieldMapper.get('URL')]}`);
        console.log(`      생성일: ${video[FieldMapper.get('CREATED_AT')]}`);
        console.log('');
      });
    }

    // 5. 전체 통계
    console.log('5️⃣ 전체 데이터베이스 통계...');
    console.log(`📊 총 비디오 개수: ${youtubeCount + instagramCount}개`);
    console.log(`   - YouTube: ${youtubeCount}개`);
    console.log(`   - Instagram: ${instagramCount}개`);

    // 6. 최근 1시간 내 저장된 데이터
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentYouTubeCount = await YouTubeVideo.countDocuments({ 
      createdAt: { $gte: oneHourAgo } 
    });
    const recentInstagramCount = await InstagramVideo.countDocuments({ 
      createdAt: { $gte: oneHourAgo } 
    });
    
    console.log(`\n⏰ 최근 1시간 내 저장된 데이터:`);
    console.log(`   - YouTube: ${recentYouTubeCount}개`);
    console.log(`   - Instagram: ${recentInstagramCount}개`);

    await mongoose.disconnect();
    console.log('\n✅ 데이터베이스 상태 확인 완료!');

    return {
      youtube: youtubeCount,
      instagram: instagramCount,
      recentYoutube: recentYouTubeCount,
      recentInstagram: recentInstagramCount,
      total: youtubeCount + instagramCount
    };

  } catch (error) {
    console.log('❌ 데이터베이스 확인 실패:', error.message);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    
    return null;
  }
}

// 직접 실행 시
if (require.main === module) {
  checkCurrentData().then(stats => {
    if (stats && stats.total > 0) {
      console.log(`\n🎉 네, 잘 들어갔습니다! 현재 총 ${stats.total}개의 비디오가 저장되어 있습니다.`);
    } else if (stats && stats.total === 0) {
      console.log('\n📝 아직 저장된 비디오가 없습니다.');
    } else {
      console.log('\n❌ 데이터베이스 확인에 실패했습니다.');
    }
  });
}

module.exports = checkCurrentData;