require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const Video = require('../models/Video');
const { FieldMapper } = require('../types/field-mapper');

// Instagram URL에서 사용자명 추출 함수
const extractInstagramUsername = (url) => {
  if (!url || !url.includes('instagram.com/')) return null;
  
  // 패턴: https://instagram.com/username/ 또는 https://instagram.com/username/reel/xyz/
  const match = url.match(/instagram\.com\/([^\/\?]+)/);
  if (match && match[1] && !['reels', 'reel', 'p', 'stories'].includes(match[1])) {
    return match[1];
  }
  return null;
};

async function fixInstagramData() {
  try {
    console.log('🚀 Instagram 데이터 수정 시작...\n');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@InsightReel.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=InsightReel';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
    
    // account 필드에 URL이 저장된 레코드들 찾기
    const problematicVideos = await Video.find({
      [FieldMapper.get('PLATFORM')]: 'instagram',
      [FieldMapper.get('CHANNEL_NAME')]: { $regex: /^https?:\/\// }  // URL 패턴으로 시작하는 channelName
    }).lean();
    
    console.log(`📊 수정 대상: ${problematicVideos.length}개 레코드\n`);
    
    if (problematicVideos.length === 0) {
      console.log('✅ 수정할 데이터가 없습니다.');
      await mongoose.disconnect();
      return;
    }
    
    let fixedCount = 0;
    
    for (const video of problematicVideos) {
      try {
        const urlInAccount = video[FieldMapper.get('CHANNEL_NAME')];
        const extractedUsername = extractInstagramUsername(urlInAccount);
        
        // 새로운 데이터 구조
        const updateData = {
          [FieldMapper.get('CHANNEL_NAME')]: extractedUsername || 'Instagram 사용자',  // 추출된 사용자명 또는 기본값
          [FieldMapper.get('URL')]: video[FieldMapper.get('URL')] || urlInAccount    // originalUrl이 비어있으면 복구
        };
        
        await Video.updateOne(
          { _id: video._id },
          { $set: updateData }
        );
        
        console.log(`✅ [${fixedCount + 1}/${problematicVideos.length}] ${video.title || '제목없음'}`);
        console.log(`   이전: account="${urlInAccount}"`);
        console.log(`   이후: channelName="${updateData.channelName}", originalUrl="${updateData.originalUrl}"`);
        console.log('');
        
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ 레코드 수정 실패: ${video._id}`, error.message);
      }
    }
    
    console.log(`\n🎉 수정 완료: ${fixedCount}개 레코드`);
    
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
    
  } catch (error) {
    console.error('❌ 스크립트 실행 실패:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixInstagramData();