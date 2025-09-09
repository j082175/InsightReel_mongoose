/**
 * FormData metadata 파싱 테스트
 * 실제 Instagram 확장프로그램이 보내는 방식으로 테스트
 */

const { FieldMapper } = require('./server/types/field-mapper');
const fetch = require('node-fetch');  // npm install node-fetch 필요하면
const FormData = require('form-data');

console.log('🧪 FormData metadata 파싱 테스트\n');

// 1. 확장프로그램에서 보낼 Instagram 메타데이터 시뮬레이션
const instagramMetadata = {
    [FieldMapper.get('CHANNEL_NAME')]: 'test_instagram_user',
    [FieldMapper.get('CHANNEL_URL')]: 'https://instagram.com/test_instagram_user/',
    [FieldMapper.get('DESCRIPTION')]: '인스타그램 테스트 캡션 #test #metadata',
    [FieldMapper.get('LIKES')]: '456',
    [FieldMapper.get('COMMENTS_COUNT')]: '78',
    [FieldMapper.get('HASHTAGS')]: ['#test', '#metadata', '#instagram'],
    [FieldMapper.get('MENTIONS')]: ['@test_user'],
    [FieldMapper.get('TIMESTAMP')]: new Date().toISOString()
};

console.log('📱 테스트용 Instagram 메타데이터:');
console.log(JSON.stringify(instagramMetadata, null, 2));
console.log();

// 2. FormData 생성 (확장프로그램과 동일한 방식)
const formData = new FormData();
formData.append('platform', 'instagram');
formData.append('postUrl', 'https://instagram.com/p/TEST_FORMDATA/');
formData.append('metadata', JSON.stringify(instagramMetadata));  // 🔑 JSON 문자열로 전송
formData.append('analysisType', 'quick');
formData.append('useAI', 'false');

// 더미 비디오 파일 생성 (실제 파일 대신 텍스트)
formData.append('video', 'dummy video content', 'test-video.mp4');

console.log('📦 FormData 생성 완료');
console.log('- platform: instagram');
console.log('- postUrl: https://instagram.com/p/TEST_FORMDATA/');
console.log('- metadata: JSON 문자열');
console.log('- 더미 비디오 파일 포함');
console.log();

// 3. 서버로 전송
async function testFormDataParsing() {
    try {
        console.log('🚀 FormData를 서버로 전송 중...');
        
        const response = await fetch('http://localhost:3000/api/process-video-blob', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        console.log('📡 서버 응답:');
        console.log('Status:', response.status);
        console.log('Success:', result.success);
        
        if (result.success) {
            console.log('✅ FormData 처리 성공!');
            console.log('Message:', result.message);
        } else {
            console.log('❌ FormData 처리 실패:');
            console.log('Error:', result.error);
        }
        
    } catch (error) {
        console.log('💥 네트워크 오류:', error.message);
    }
}

// 4. 처리 후 DB 확인
async function checkDatabaseAfterTest() {
    console.log('\n📊 처리 후 데이터베이스 확인...');
    
    // 잠시 대기 (처리 시간)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        const response = await fetch('http://localhost:3000/api/videos?platform=instagram&limit=1');
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            const latestVideo = result.data[0];
            console.log('📹 최신 Instagram 비디오:');
            console.log('URL:', latestVideo.url);
            console.log('채널명:', latestVideo.channelName || '❌ 없음');
            console.log('채널URL:', latestVideo.channelUrl || '❌ 없음');
            console.log('설명:', latestVideo.description || '❌ 없음');
            console.log('좋아요:', latestVideo.likes || '❌ 없음');
            console.log('댓글수:', latestVideo.commentsCount || '❌ 없음');
            console.log('생성일:', latestVideo.collectionTime);
            
            // 성공 여부 판단
            const hasChannelName = latestVideo.channelName && latestVideo.channelName !== '';
            const hasChannelUrl = latestVideo.channelUrl && latestVideo.channelUrl !== '';
            const hasDescription = latestVideo.description && latestVideo.description !== '';
            
            console.log('\n🎯 결과:');
            if (hasChannelName && hasChannelUrl && hasDescription) {
                console.log('🎉 JSON 파싱 수정이 성공했습니다!');
            } else {
                console.log('❌ 여전히 메타데이터가 누락됩니다. 다른 문제가 있을 수 있습니다.');
            }
            
        } else {
            console.log('📭 저장된 Instagram 비디오가 없습니다.');
        }
        
    } catch (error) {
        console.log('💥 DB 조회 오류:', error.message);
    }
}

// 실행
async function runFormDataTest() {
    await testFormDataParsing();
    await checkDatabaseAfterTest();
}

runFormDataTest();