/**
 * 🚀 필드명 변경 시 전체 시스템 자동 동기화 예시
 * FieldMapper 적용 전후 비교
 */

const { FieldMapper } = require('../types/field-mapper');

// ===== 기존 방식 (수동 변경 필요) =====
class VideoService_Old {
  async getVideos() {
    // ❌ 하드코딩된 필드명들 - 변경 시 일일이 찾아서 수정해야 함
    return await Video.find()
      .select('platform channelName title likes views commentsCount url timestamp uploadDate')
      .sort({ uploadDate: -1, timestamp: -1 })
      .lean();
  }
  
  createVideo(data) {
    // ❌ 하드코딩 - 필드명 변경 시 놓치기 쉬움
    return {
      channelName: data.channelName,
      commentsCount: data.commentsCount,
      url: data.url,
      uploadDate: data.uploadDate
    };
  }
}

// ===== 새로운 방식 (완전 자동화) =====
class VideoService_New {
  async getVideos() {
    // ✅ FieldMapper 사용 - MASTER_FIELD_NAMES만 변경하면 자동 동기화!
    const selectFields = FieldMapper.buildSelectString([
      'PLATFORM', 'CHANNEL_NAME', 'TITLE', 'LIKES', 'VIEWS', 'COMMENTS_COUNT', 'URL', 'TIMESTAMP', 'UPLOAD_DATE'
    ]);
    
    const sortObj = {
      ...FieldMapper.buildSortObject('UPLOAD_DATE', 'desc'),
      ...FieldMapper.buildSortObject('TIMESTAMP', 'desc')
    };
    
    return await Video.find()
      .select(selectFields)
      .sort(sortObj)
      .lean();
  }
  
  createVideo(data) {
    // ✅ FieldMapper 사용 - 필드명 변경 시 자동 동기화!
    return {
      [FieldMapper.get('CHANNEL_NAME')]: data[FieldMapper.get('CHANNEL_NAME')],
      [FieldMapper.get('COMMENTS_COUNT')]: data[FieldMapper.get('COMMENTS_COUNT')],
      [FieldMapper.get('URL')]: data[FieldMapper.get('URL')],
      [FieldMapper.get('UPLOAD_DATE')]: data[FieldMapper.get('UPLOAD_DATE')]
    };
  }
  
  // 레거시 데이터 자동 변환
  standardizeLegacyData(legacyData) {
    return FieldMapper.standardizeDataObject(legacyData);
  }
}

// ===== MongoDB 스키마도 자동화 =====
class VideoSchema_New {
  static getSchema() {
    const { mongoose } = require('mongoose');
    
    // ✅ 스키마 필드도 FieldMapper로 정의
    const schemaDefinition = {};
    schemaDefinition[FieldMapper.get('CHANNEL_NAME')] = { type: String, index: true };
    schemaDefinition[FieldMapper.get('COMMENTS_COUNT')] = { type: Number, default: 0 };
    schemaDefinition[FieldMapper.get('URL')] = { type: String, unique: true };
    schemaDefinition[FieldMapper.get('UPLOAD_DATE')] = { type: Date, index: true };
    
    const schema = new mongoose.Schema(schemaDefinition);
    
    // 인덱스도 자동화
    schema.index({
      [FieldMapper.get('PLATFORM')]: 1,
      [FieldMapper.get('UPLOAD_DATE')]: -1
    });
    
    return schema;
  }
}

// ===== API 응답도 자동화 =====
class VideoAPI_New {
  async getVideos(req, res) {
    const videos = await VideoService_New.getVideos();
    
    // ✅ API 응답 필드도 자동 동기화
    const responseData = videos.map(video => ({
      id: video._id,
      [FieldMapper.get('CHANNEL_NAME')]: video[FieldMapper.get('CHANNEL_NAME')],
      [FieldMapper.get('URL')]: video[FieldMapper.get('URL')],
      [FieldMapper.get('LIKES')]: video[FieldMapper.get('LIKES')],
      [FieldMapper.get('VIEWS')]: video[FieldMapper.get('VIEWS')],
      [FieldMapper.get('UPLOAD_DATE')]: video[FieldMapper.get('UPLOAD_DATE')]
    }));
    
    res.json({ success: true, data: responseData });
  }
}

// ===== Google Sheets 연동도 자동화 =====
class SheetsManager_New {
  buildRowData(platform, videoData) {
    const mapping = FieldMapper.getGoogleSheetsMapping(platform);
    const rowData = [];
    
    // ✅ Google Sheets 매핑도 자동 동기화
    for (let i = 1; i <= Object.keys(mapping).length; i++) {
      const fieldName = mapping[i];
      rowData.push(videoData[fieldName] || '');
    }
    
    return rowData;
  }
}

// ===== 사용 예시: 필드명 변경 시나리오 =====
console.log('\n🎯 필드명 변경 시나리오:');
console.log('MASTER_FIELD_NAMES.CHANNEL_NAME을 "channelName"에서 "creatorName"으로 변경하면...\n');

console.log('✅ 자동으로 변경되는 부분들:');
console.log('- MongoDB 스키마 필드명');
console.log('- API 쿼리의 select, sort 필드');
console.log('- API 응답 JSON의 필드명');
console.log('- Google Sheets 매핑');
console.log('- Frontend TypeScript 타입');
console.log('- 모든 데이터 변환 로직');

console.log('\n🎉 결과: 한 곳만 변경으로 전체 시스템 동기화 완료!');

module.exports = {
  VideoService_New,
  VideoSchema_New,
  VideoAPI_New,
  SheetsManager_New
};