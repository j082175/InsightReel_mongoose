/**
 * 🔍 데이터 파이프라인 자동 검증 스크립트
 * 
 * 사용법: node scripts/validate-data-pipeline.js
 * 
 * 기능:
 * 1. API → Frontend 데이터 변환 검증
 * 2. 누락된 필드 자동 탐지
 * 3. 데이터 타입 불일치 검증
 * 4. 직접 필드 접근 일관성 확인
 */

// FieldMapper는 deprecated되었으므로 직접 필드 접근 사용
const axios = require('axios');

// 중요 필드 정의 (직접 필드명 사용)
const CRITICAL_FIELDS = [
  'platform', 'title', 'channelName', 'likes', 'views',
  'commentsCount', 'url', 'thumbnailUrl', 'uploadDate'
];

async function validateDataPipeline() {
  console.log('🔍 데이터 파이프라인 검증 시작...\n');
  
  try {
    // 1. 백엔드 API 데이터 가져오기
    const response = await axios.get('http://localhost:3000/api/videos?limit=5');
    const apiData = response.data;
    
    // 2. 프론트엔드 포트에서 실제 변환된 데이터 가져오기 (시뮬레이션)
    let frontendData = null;
    try {
      const frontendResponse = await axios.get('http://localhost:8000'); // Frontend health check
      console.log('🎯 프론트엔드 서버 연결 확인됨');
      
      // 실제 프론트엔드 데이터 변환 로직을 시뮬레이션
      frontendData = simulateFrontendDataTransformation(apiData.data?.videos || []);
    } catch (error) {
      console.log('⚠️ 프론트엔드 서버 미실행 - API 데이터만 검증');
    }
    
    console.log('📋 API 응답 구조:', Object.keys(apiData));
    
    const videoData = apiData.data?.videos || [];
    if (!Array.isArray(videoData)) {
      console.error('❌ API 응답 구조가 올바르지 않습니다');
      console.error('응답 데이터:', apiData);
      return;
    }

    console.log(`📊 검증할 비디오 수: ${videoData.length}\n`);

    // 3. API 데이터 검증
    console.log('\n📋 1단계: 백엔드 API 데이터 검증');
    const apiIssues = [];
    videoData.forEach((video, index) => {
      console.log(`🔍 API 비디오 ${index + 1} 검증 중...`);
      const videoIssues = validateVideoFields(video, index + 1, 'API');
      if (videoIssues.length > 0) {
        apiIssues.push(...videoIssues);
      }
    });

    // 4. 프론트엔드 변환 데이터 검증
    const frontendIssues = [];
    if (frontendData) {
      console.log('\n📋 2단계: 프론트엔드 변환 데이터 검증');
      frontendData.forEach((video, index) => {
        console.log(`🔍 프론트엔드 비디오 ${index + 1} 검증 중...`);
        const videoIssues = validateVideoFields(video, index + 1, 'Frontend');
        if (videoIssues.length > 0) {
          frontendIssues.push(...videoIssues);
        }
      });
    }

    const allIssues = [...apiIssues, ...frontendIssues];

    // 5. 결과 출력
    if (allIssues.length === 0) {
      console.log('\n✅ 모든 데이터 검증 통과!');
    } else {
      console.log(`\n❌ ${allIssues.length}개의 문제 발견:`);
      if (apiIssues.length > 0) {
        console.log(`\n🔴 API 레벨 문제 (${apiIssues.length}개):`);
        apiIssues.forEach(issue => console.log(`  - ${issue}`));
      }
      if (frontendIssues.length > 0) {
        console.log(`\n🟡 Frontend 변환 문제 (${frontendIssues.length}개):`);
        frontendIssues.forEach(issue => console.log(`  - ${issue}`));
      }
      
      // 자동 수정 제안
      console.log('\n🔧 자동 수정 제안:');
      generateFixSuggestions(allIssues);
    }

  } catch (error) {
    console.error('❌ 검증 중 오류 발생:', error.message);
  }
}

// 프론트엔드 데이터 변환 로직 시뮬레이션 (직접 필드 접근 사용)
function simulateFrontendDataTransformation(apiVideos) {
  return apiVideos.map((video) => {
    const channelName = video.channelName || '알 수 없는 채널';
    const keywordsArray = Array.isArray(video.keywords)
      ? video.keywords
      : [];
    const url = video.url || '#';

    return {
      _id: video._id || Date.now(),
      platform: video.platform || 'YouTube',
      title: video.title || '',
      channelName: channelName,
      views: video.views || 0,
      likes: video.likes || 0,
      commentsCount: video.commentsCount || 0,
      thumbnailUrl: video.thumbnailUrl || '',
      url: url,
      uploadDate: video.uploadDate || '',
      keywords: keywordsArray,
    };
  });
}

function validateVideoFields(video, videoIndex, stage = 'API') {
  const issues = [];
  
  // 중요 필드 누락 검사
  CRITICAL_FIELDS.forEach(fieldName => {
    try {
      const value = video[fieldName];

      if (value === undefined || value === null) {
        issues.push(`${stage} 비디오 ${videoIndex}: ${fieldName} 필드 누락`);
      }
      
      // 타입 검증
      if (fieldName === 'likes' || fieldName === 'views' || fieldName === 'commentsCount') {
        if (value !== undefined && typeof value !== 'number') {
          issues.push(`${stage} 비디오 ${videoIndex}: ${fieldName} 타입 오류 (${typeof value} !== number)`);
        }
      }
      
    } catch (error) {
      issues.push(`${stage} 비디오 ${videoIndex}: 필드 ${fieldName}에 접근할 수 없음`);
    }
  });

  return issues;
}

function generateFixSuggestions(issues) {
  const fieldMissingPattern = /필드 누락/;
  const missingFields = issues.filter(issue => fieldMissingPattern.test(issue));
  
  if (missingFields.length > 0) {
    console.log('  1. VideoArchivePage.tsx의 convertedVideos 매핑에 누락된 필드 추가');
    console.log('  2. 백엔드 API의 select 쿼리에 필드 추가 확인');
    console.log('  3. ensureCompleteVideo 함수에 명시적 필드 보존 추가');
  }
}

// 스크립트 실행
if (require.main === module) {
  validateDataPipeline();
}

module.exports = { validateDataPipeline, validateVideoFields };