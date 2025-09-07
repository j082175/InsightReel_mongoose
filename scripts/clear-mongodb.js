const mongoose = require('mongoose');
const Video = require('./server/models/Video');

mongoose.connect('mongodb+srv://junsoocho:wnstn88@cluster0.hzfvh.mongodb.net/video-analysis?retryWrites=true&w=majority')
  .then(async () => {
    console.log('MongoDB 연결 성공');
    
    // 현재 개수 확인
    const beforeCount = await Video.countDocuments();
    console.log('삭제 전 비디오 개수:', beforeCount);
    
    // 모든 비디오 삭제
    const result = await Video.deleteMany({});
    console.log('삭제된 비디오 개수:', result.deletedCount);
    
    // 삭제 후 개수 확인
    const afterCount = await Video.countDocuments();
    console.log('삭제 후 비디오 개수:', afterCount);
    
    console.log('✅ MongoDB 데이터 삭제 완료!');
    process.exit(0);
  })
  .catch(err => {
    console.error('DB 연결 실패:', err.message);
    process.exit(1);
  });