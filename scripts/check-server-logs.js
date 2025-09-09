/**
 * 서버 디버그 로그 확인을 위한 간단한 테스트
 */

const http = require('http');

console.log('🔍 서버 응답 및 로그 확인 테스트\n');

// 1. 헬스 체크
function checkHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ 서버 헬스 체크:', res.statusCode);
        resolve(data);
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ 서버 연결 실패:', err.message);
      reject(err);
    });
  });
}

// 2. 최근 비디오 조회 (로그 생성을 위해)
function getRecentVideos() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000/api/videos?platform=instagram&limit=1', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('📊 최근 Instagram 비디오 조회:', res.statusCode);
        try {
          const result = JSON.parse(data);
          if (result.success && result.data.length > 0) {
            const video = result.data[0];
            console.log('📹 최신 비디오 정보:');
            console.log('  URL:', video.url);
            console.log('  채널명:', video.channelName || '❌ 비어있음');
            console.log('  채널URL:', video.channelUrl || '❌ 비어있음'); 
            console.log('  설명:', video.description || '❌ 비어있음');
            console.log('  처리 시간:', video.collectionTime);
          } else {
            console.log('📭 저장된 비디오 없음');
          }
          resolve(result);
        } catch (error) {
          console.log('❌ JSON 파싱 실패:', error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ API 요청 실패:', err.message);
      reject(err);
    });
  });
}

// 실행
async function runLogCheck() {
  try {
    console.log('🚀 서버 상태 확인 중...\n');
    
    await checkHealth();
    console.log();
    
    await getRecentVideos();
    console.log();
    
    console.log('✅ 로그 확인 완료');
    console.log('📋 서버 터미널 창에서 다음 로그를 확인하세요:');
    console.log('   - 📡 /api/process-video-blob 엔드포인트에서 metadata 수신');
    console.log('   - 🔑 FieldMapper로 접근한 메타데이터 값들');
    console.log('   - 📱 Instagram 메타데이터 수신 (video-controller.js)');
    
  } catch (error) {
    console.log('💥 테스트 실패:', error.message);
  }
}

runLogCheck();