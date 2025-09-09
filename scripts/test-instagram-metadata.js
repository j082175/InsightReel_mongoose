/**
 * Instagram 메타데이터 처리 테스트
 * 실제 Instagram 데이터가 제대로 저장되는지 검증
 */

const { FieldMapper } = require('./server/types/field-mapper');

console.log('🔍 Instagram 메타데이터 테스트 시작\n');

// 1. FieldMapper 키 확인
console.log('📋 FieldMapper 키들:');
console.log('CHANNEL_NAME:', FieldMapper.get('CHANNEL_NAME'));
console.log('CHANNEL_URL:', FieldMapper.get('CHANNEL_URL'));  
console.log('DESCRIPTION:', FieldMapper.get('DESCRIPTION'));
console.log('LIKES:', FieldMapper.get('LIKES'));
console.log('COMMENTS_COUNT:', FieldMapper.get('COMMENTS_COUNT'));
console.log('HASHTAGS:', FieldMapper.get('HASHTAGS'));
console.log('MENTIONS:', FieldMapper.get('MENTIONS'));
console.log('THUMBNAIL_URL:', FieldMapper.get('THUMBNAIL_URL'));
console.log();

// 2. Instagram 확장프로그램이 전송할 것으로 예상되는 데이터 시뮬레이션
const mockInstagramData = {
    [FieldMapper.get('CHANNEL_NAME')]: 'test_account',
    [FieldMapper.get('CHANNEL_URL')]: 'https://instagram.com/test_account/',
    [FieldMapper.get('DESCRIPTION')]: '테스트 캡션 #test #instagram',
    [FieldMapper.get('LIKES')]: '123',
    [FieldMapper.get('COMMENTS_COUNT')]: '45',
    [FieldMapper.get('HASHTAGS')]: ['#test', '#instagram'],
    [FieldMapper.get('MENTIONS')]: ['@mention_test'],
    [FieldMapper.get('THUMBNAIL_URL')]: '',
    [FieldMapper.get('TIMESTAMP')]: new Date().toISOString()
};

console.log('📱 Mock Instagram 메타데이터:');
console.log(JSON.stringify(mockInstagramData, null, 2));
console.log();

// 3. 서버로 전송되는 요청 시뮬레이션 (더미 비디오 URL 추가)
const testServerRequest = {
    platform: 'instagram',
    videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4', // 더미 비디오
    postUrl: 'https://instagram.com/p/TEST123/',
    metadata: mockInstagramData,
    analysisType: 'quick',
    useAI: false // AI 분석 없이 메타데이터만 테스트
};

console.log('🔄 서버 요청 시뮬레이션:');
console.log('Platform:', testServerRequest.platform);
console.log('Post URL:', testServerRequest.postUrl);
console.log('Has metadata:', Object.keys(testServerRequest.metadata).length, '개 필드');
console.log();

// 4. 실제 HTTP 요청 전송
async function sendTestRequest() {
    try {
        console.log('🚀 실제 서버로 테스트 요청 전송...');
        
        const response = await fetch('http://localhost:3000/api/process-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testServerRequest)
        });
        
        const result = await response.json();
        
        console.log('📡 서버 응답:');
        console.log('Status:', response.status);
        console.log('Success:', result.success);
        
        if (result.success) {
            console.log('✅ 요청 성공!');
            console.log('Message:', result.message);
        } else {
            console.log('❌ 요청 실패:');
            console.log('Error:', result.error);
        }
        
    } catch (error) {
        console.log('💥 네트워크 오류:', error.message);
    }
}

// 5. 데이터베이스 확인
async function checkDatabase() {
    console.log('\n📊 데이터베이스 상태 확인...');
    
    try {
        const response = await fetch('http://localhost:3000/api/videos?platform=instagram&limit=1');
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            const latestVideo = result.data[0];
            console.log('📹 최신 Instagram 비디오:');
            console.log('채널명:', latestVideo.channelName || '❌ 없음');
            console.log('채널URL:', latestVideo.channelUrl || '❌ 없음');
            console.log('설명:', latestVideo.description || '❌ 없음');
            console.log('좋아요:', latestVideo.likes || '❌ 없음');
            console.log('댓글수:', latestVideo.commentsCount || '❌ 없음');
            console.log('생성일:', latestVideo.collectionTime);
        } else {
            console.log('📭 저장된 Instagram 비디오가 없습니다.');
        }
        
    } catch (error) {
        console.log('💥 DB 조회 오류:', error.message);
    }
}

// 실행
async function runTest() {
    await sendTestRequest();
    
    // 잠시 대기 후 DB 확인
    setTimeout(checkDatabase, 3000);
}

runTest();