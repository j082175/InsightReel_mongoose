const http = require('http');

const req = http.get('http://localhost:3000/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ 서버 정상 실행 중 (상태코드:', res.statusCode, ')');
    } else {
      console.log('⚠️ 서버 응답 이상 (상태코드:', res.statusCode, ')');
    }
  });
});

req.on('error', (err) => {
  console.log('❌ 서버 연결 실패:', err.message);
});

setTimeout(() => {
  console.log('⏰ 타임아웃 - 서버 응답 없음');
  process.exit(1);
}, 3000);