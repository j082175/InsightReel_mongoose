const mongoose = require('mongoose');
const Video = require('./server/models/Video');

mongoose.connect('mongodb+srv://junsoocho:wnstn88@cluster0.hzfvh.mongodb.net/video-analysis?retryWrites=true&w=majority')
  .then(async () => {
    console.log('MongoDB 연결 성공');
    
    const count = await Video.countDocuments();
    console.log('현재 MongoDB 비디오 개수:', count);
    
    // 최근 추가된 비디오들 확인
    const recent = await Video.find({}).sort({ createdAt: -1 }).limit(5).select('url title platform createdAt');
    console.log('\n최근 추가된 비디오들:');
    recent.forEach((v, i) => {
      console.log(`${i+1}. [${v.platform}] ${v.title || 'No title'} - ${v.createdAt}`);
      console.log(`   URL: ${v.url.substring(0, 50)}...`);
    });
    
    // 플랫폼별 통계
    const platformStats = await Video.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } } }
    ]);
    console.log('\n플랫폼별 비디오 개수:');
    platformStats.forEach(stat => {
      console.log(`- ${stat._id}: ${stat.count}개`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('DB 연결 실패:', err.message);
    process.exit(1);
  });