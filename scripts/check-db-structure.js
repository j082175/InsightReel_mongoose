/**
 * MongoDB 데이터베이스 실제 구조 확인 스크립트
 * 저장된 비디오의 모든 필드와 데이터 타입 분석
 * 
 * 실행 방법:
 * node check-db-structure.js
 */

const mongoose = require('mongoose');
const Video = require('./server/models/Video');

// 환경 변수 로드
require('dotenv').config();

async function analyzeDBStructure() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 MongoDB Atlas 연결 성공');

    // 전체 비디오 개수 확인
    const totalCount = await Video.countDocuments();
    console.log(`📊 전체 비디오 개수: ${totalCount}개\n`);

    if (totalCount === 0) {
      console.log('❌ 분석할 데이터가 없습니다.');
      return;
    }

    // 모든 비디오 데이터 조회 (실제 구조 확인용)
    const allVideos = await Video.find({}).lean();
    
    console.log('=== 실제 저장된 데이터 구조 분석 ===\n');

    // 첫 번째 비디오의 전체 구조 출력
    if (allVideos.length > 0) {
      const firstVideo = allVideos[0];
      console.log('📋 첫 번째 비디오의 전체 필드:');
      console.log('────────────────────────────────────');
      
      Object.keys(firstVideo).forEach((key, index) => {
        const value = firstVideo[key];
        const type = Array.isArray(value) ? 'Array' : typeof value;
        const preview = getValuePreview(value);
        
        console.log(`${(index + 1).toString().padStart(2, ' ')}. ${key.padEnd(20, ' ')}: ${type.padEnd(10, ' ')} = ${preview}`);
      });
    }

    // 모든 필드 통계 분석
    console.log('\n=== 모든 비디오에서 발견된 필드 통계 ===\n');
    
    const fieldStats = {};
    
    allVideos.forEach(video => {
      Object.keys(video).forEach(field => {
        if (!fieldStats[field]) {
          fieldStats[field] = {
            count: 0,
            hasValue: 0,
            types: new Set(),
            examples: []
          };
        }
        
        fieldStats[field].count++;
        
        const value = video[field];
        if (value !== null && value !== undefined && value !== '') {
          fieldStats[field].hasValue++;
          
          const type = Array.isArray(value) ? 'Array' : typeof value;
          fieldStats[field].types.add(type);
          
          // 예시 값 저장 (최대 3개)
          if (fieldStats[field].examples.length < 3) {
            fieldStats[field].examples.push(getValuePreview(value));
          }
        }
      });
    });

    // 통계 출력 (데이터가 있는 필드 먼저)
    const sortedFields = Object.keys(fieldStats).sort((a, b) => {
      return fieldStats[b].hasValue - fieldStats[a].hasValue;
    });

    sortedFields.forEach((field, index) => {
      const stat = fieldStats[field];
      const percentage = ((stat.hasValue / totalCount) * 100).toFixed(1);
      const types = Array.from(stat.types).join(', ') || 'undefined';
      
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${field.padEnd(20, ' ')}: ${stat.hasValue}/${totalCount} (${percentage}%) - ${types}`);
      
      if (stat.examples.length > 0) {
        console.log(`    예시: ${stat.examples.join(', ')}`);
      }
      console.log();
    });

    // 플랫폼별 분석
    console.log('=== 플랫폼별 데이터 분석 ===\n');
    const platformStats = await Video.aggregate([
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 }
        }
      }
    ]);

    for (const platformStat of platformStats) {
      const platform = platformStat._id;
      const count = platformStat.count;
      
      console.log(`📱 ${platform} (${count}개):`);
      
      const platformVideos = allVideos.filter(v => v.platform === platform);
      if (platformVideos.length > 0) {
        const sampleVideo = platformVideos[0];
        
        // 플랫폼별 주요 필드 확인
        const keyFields = ['title', 'account', 'youtubeHandle', 'channelUrl', 'category', 'likes', 'views', 'thumbnailUrl'];
        
        keyFields.forEach(field => {
          const value = sampleVideo[field];
          const hasData = value !== null && value !== undefined && value !== '';
          const status = hasData ? '✅' : '❌';
          const preview = hasData ? getValuePreview(value) : 'null/undefined';
          
          console.log(`  ${field.padEnd(15, ' ')}: ${status} ${preview}`);
        });
      }
      console.log();
    }

  } catch (error) {
    console.error('❌ 데이터베이스 구조 분석 실패:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  }
}

// 값의 미리보기를 생성하는 함수
function getValuePreview(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (value === '') return '(빈 문자열)';
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[${value.length}개] ${JSON.stringify(value.slice(0, 2))}...`;
  }
  
  if (typeof value === 'object') {
    if (value instanceof Date) {
      return value.toISOString().substring(0, 19);
    }
    return `{Object} ${JSON.stringify(value).substring(0, 50)}...`;
  }
  
  const str = String(value);
  return str.length > 50 ? str.substring(0, 50) + '...' : str;
}

// 직접 실행 시
if (require.main === module) {
  analyzeDBStructure();
}

module.exports = analyzeDBStructure;