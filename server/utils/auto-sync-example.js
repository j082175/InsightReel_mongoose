/**
 * 🚀 새 인터페이스 시스템 vs 기존 FieldMapper 방식 비교
 * 직접 필드 접근 vs FieldMapper 사용 비교 예시
 */

// ===== 기존 FieldMapper 방식 (복잡한 동적 필드 접근) =====
class VideoService_Old {
  async getVideos() {
    // ❌ FieldMapper를 통한 복잡한 동적 필드 접근
    const selectFields = [
      'PLATFORM',
      'CHANNEL_NAME', 
      'TITLE',
      'LIKES',
      'VIEWS'
    ].map(field => field.toLowerCase()).join(' ');
    
    const sortObj = {};
    sortObj['uploadDate'] = -1;
    sortObj['timestamp'] = -1;
    
    return await Video.find()
      .select(selectFields)
      .sort(sortObj)
      .lean();
  }
  
  createVideo(data) {
    // ❌ 동적 필드 접근 - 다루기 어려움
    const result = {};
    result['channelName'] = data['channelName'];
    result['commentsCount'] = data['commentsCount'];
    result['url'] = data['url'];
    result['uploadDate'] = data['uploadDate'];
    return result;
  }
}

// ===== 새로운 인터페이스 방식 (단순한 직접 접근) =====
class VideoService_New {
  async getVideos() {
    // ✅ 직접 필드 명시 - 명확하고 이해하기 쉬움
    return await Video.find()
      .select('platform channelName title likes views commentsCount url timestamp uploadDate')
      .sort({ uploadDate: -1, timestamp: -1 })
      .lean();
  }
  
  createVideo(data) {
    // ✅ 직접 필드 접근 - TypeScript 타입 체크 가능
    return {
      channelName: data.channelName,
      commentsCount: data.commentsCount,
      url: data.url,
      uploadDate: data.uploadDate,
      platform: data.platform,
      title: data.title,
      likes: data.likes,
      views: data.views
    };
  }
  
  // 레거시 데이터 변환 (필요 시)
  convertLegacyData(legacyData) {
    return {
      channelName: legacyData.channel_name || legacyData.channelName,
      commentsCount: legacyData.comments_count || legacyData.commentsCount,
      url: legacyData.video_url || legacyData.url,
      uploadDate: legacyData.upload_date || legacyData.uploadDate
    };
  }
}

// ===== MongoDB 스키마 정의 =====
class VideoSchema_New {
  static getSchema() {
    const { mongoose } = require('mongoose');
    
    // ✅ 직접 스키마 정의 - 명확하고 TypeScript와 일치
    const schema = new mongoose.Schema({
      channelName: { type: String, index: true },
      commentsCount: { type: Number, default: 0 },
      url: { type: String, unique: true },
      uploadDate: { type: Date, index: true },
      platform: { type: String, required: true },
      title: { type: String, required: true },
      likes: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      timestamp: { type: Date, default: Date.now }
    });
    
    // 직접 인덱스 정의
    schema.index({
      platform: 1,
      uploadDate: -1
    });
    
    return schema;
  }
}

// ===== API 응답 정의 =====
class VideoAPI_New {
  async getVideos(req, res) {
    const videos = await VideoService_New.getVideos();
    
    // ✅ 직접 필드 접근 - TypeScript 타입 체크 가능
    const responseData = videos.map(video => ({
      id: video._id,
      channelName: video.channelName,
      url: video.url,
      likes: video.likes,
      views: video.views,
      uploadDate: video.uploadDate,
      platform: video.platform,
      title: video.title,
      commentsCount: video.commentsCount
    }));
    
    res.json({ success: true, data: responseData });
  }
}

// ===== Google Sheets 연동 =====
class SheetsManager_New {
  buildRowData(platform, videoData) {
    // ✅ 플랫폼별 컬럼 순서 정의 - 명확하고 유지보수 용이
    const columnOrder = {
      youtube: ['channelName', 'title', 'url', 'views', 'likes', 'commentsCount', 'uploadDate'],
      instagram: ['channelName', 'title', 'url', 'likes', 'saves', 'uploadDate'],
      tiktok: ['channelName', 'title', 'url', 'views', 'likes', 'shares', 'uploadDate']
    };
    
    const fields = columnOrder[platform] || columnOrder.youtube;
    
    return fields.map(field => videoData[field] || '');
  }
}

// ===== 비교 결과 =====
console.log('\n🎯 새 인터페이스 vs FieldMapper 비교:');

console.log('\n✅ 새 인터페이스의 장점:');
console.log('- 단순성: 중간 변환 레이어 제거');
console.log('- 타입 안전성: TypeScript 네이티브 지원');
console.log('- 유지보수성: 인터페이스 기반 모듈화');
console.log('- 성능: 런타임 변환 오버헤드 제거');
console.log('- 가독성: 직관적인 필드 접근');

console.log('\n❌ 기존 FieldMapper의 문제:');
console.log('- 복잡성: 동적 필드 접근으로 인한 가독성 저하');
console.log('- 디버깅 어려움: 런타임에서야 필드명 확인 가능');
console.log('- TypeScript 타입 체크 제한');
console.log('- 성능 오버헤드: 매번 동적 필드 매핑');

console.log('\n🎉 결론: 인터페이스 기반 아키텍처로 전환 완료!');

module.exports = {
  VideoService_New,
  VideoSchema_New,
  VideoAPI_New,
  SheetsManager_New
};