/**
 * MongoDB에서 직접 Instagram 데이터 확인
 */

const mongoose = require('mongoose');

async function checkMongoDB() {
  try {
    console.log('🔗 MongoDB 연결 중...');
    
    // .env 파일에서 MongoDB URI 가져오기
    require('dotenv').config();
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI가 .env에 없습니다');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공\n');
    
    // 모든 컬렉션 목록 조회
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 MongoDB 컬렉션 목록:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    console.log();
    
    // Instagram 관련 컬렉션 찾기
    const instagramCollections = collections.filter(col => 
      col.name.toLowerCase().includes('instagram') || 
      col.name.toLowerCase().includes('video')
    );
    
    console.log('📱 Instagram 관련 컬렉션:');
    
    for (const col of instagramCollections) {
      console.log(`\n🔍 컬렉션: ${col.name}`);
      
      const collection = mongoose.connection.db.collection(col.name);
      const count = await collection.countDocuments();
      console.log(`  📊 전체 문서 수: ${count}개`);
      
      if (count > 0) {
        // 최근 문서 1개 조회
        const recent = await collection.findOne({}, { sort: { _id: -1 } });
        console.log('  📄 최근 문서:');
        console.log('    _id:', recent._id);
        console.log('    platform:', recent.platform || 'null');
        console.log('    channelName:', recent.channelName || 'null');
        console.log('    channelUrl:', recent.channelUrl || 'null'); 
        console.log('    description:', recent.description || 'null');
        console.log('    url:', recent.url || 'null');
        console.log('    collectionTime:', recent.collectionTime || recent.createdAt || 'null');
        
        // 전체 키 목록
        console.log('    📋 모든 필드:', Object.keys(recent).join(', '));
      }
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
    
  } catch (error) {
    console.error('❌ MongoDB 확인 실패:', error.message);
  }
}

checkMongoDB();