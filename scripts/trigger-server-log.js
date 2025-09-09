/**
 * 서버 로그를 트리거하기 위한 테스트 요청
 */

const { FieldMapper } = require('./server/types/field-mapper');

// 더미 Instagram 메타데이터
const testMetadata = {
    [FieldMapper.get('CHANNEL_NAME')]: 'test_log_user',
    [FieldMapper.get('CHANNEL_URL')]: 'https://instagram.com/test_log_user/',
    [FieldMapper.get('DESCRIPTION')]: 'Log test caption',
    [FieldMapper.get('LIKES')]: '999',
    [FieldMapper.get('COMMENTS_COUNT')]: '88'
};

console.log('🔥 서버 로그 트리거 테스트');
console.log('전송할 metadata:', JSON.stringify(testMetadata, null, 2));

// HTTP 요청 생성 (Node.js 내장 http 사용)
const http = require('http');
const FormData = require('form-data');

async function triggerServerLog() {
    try {
        // FormData 생성
        const form = new FormData();
        form.append('platform', 'instagram');
        form.append('postUrl', 'https://instagram.com/p/LOG_TEST/');
        form.append('metadata', JSON.stringify(testMetadata));
        form.append('analysisType', 'quick');
        form.append('useAI', 'false');
        
        // 더미 비디오 파일
        form.append('video', Buffer.from('fake video content'), 'test.mp4');
        
        console.log('📡 서버로 FormData 전송 중...');
        
        // HTTP 요청
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/process-video-blob',
            method: 'POST',
            headers: form.getHeaders()
        };
        
        const req = http.request(options, (res) => {
            console.log('📡 서버 응답:', res.statusCode);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('📄 응답 내용:', data.substring(0, 200) + '...');
                console.log('\n🔍 서버 터미널에서 다음 로그를 확인하세요:');
                console.log('   - 📡 /api/process-video-blob 엔드포인트에서 metadata 수신');
                console.log('   - 🔑 FieldMapper로 접근한 메타데이터 값들');
            });
        });
        
        req.on('error', (err) => {
            console.error('❌ 요청 실패:', err.message);
        });
        
        form.pipe(req);
        
    } catch (error) {
        console.error('💥 테스트 실패:', error.message);
    }
}

triggerServerLog();