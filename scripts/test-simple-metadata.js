/**
 * 간단한 메타데이터 파싱 테스트
 * JSON.parse 없이 vs 있을 때 차이 확인
 */

console.log('🧪 메타데이터 파싱 테스트\n');

// 1. 확장프로그램에서 FormData로 전송되는 방식 시뮬레이션
const originalMetadata = {
    channelName: 'test_user',
    channelUrl: 'https://instagram.com/test_user/',
    description: '테스트 캡션',
    likes: '123',
    commentsCount: '45'
};

// FormData로 전송 시 JSON.stringify됨
const jsonString = JSON.stringify(originalMetadata);

console.log('📱 원본 메타데이터 객체:');
console.log(originalMetadata);
console.log();

console.log('📦 FormData로 전송되는 JSON 문자열:');
console.log(jsonString);
console.log();

// 2. 서버에서 받은 후 처리 방식 비교

// 🔴 기존 방식 (JSON.parse 없이)
console.log('🔴 기존 방식 (JSON.parse 없이):');
const metadataOld = jsonString || {};
console.log('typeof:', typeof metadataOld);
console.log('값:', metadataOld);
console.log('Object.keys():', typeof metadataOld === 'object' ? Object.keys(metadataOld) : 'N/A');
console.log();

// 🟢 수정된 방식 (JSON.parse 적용)
console.log('🟢 수정된 방식 (JSON.parse 적용):');
let metadataNew = {};
try {
    metadataNew = jsonString ? JSON.parse(jsonString) : {};
} catch (error) {
    console.log('JSON 파싱 실패:', error.message);
    metadataNew = {};
}
console.log('typeof:', typeof metadataNew);
console.log('값:', metadataNew);
console.log('Object.keys():', Object.keys(metadataNew));
console.log();

// 3. FieldMapper 접근 테스트
const { FieldMapper } = require('./server/types/field-mapper');

console.log('🔑 FieldMapper 접근 테스트:');
console.log();

console.log('🔴 기존 방식으로 FieldMapper 접근:');
console.log(`metadata[FieldMapper.get('CHANNEL_NAME')]:`, metadataOld[FieldMapper.get('CHANNEL_NAME')] || '❌ 없음');
console.log(`metadata[FieldMapper.get('CHANNEL_URL')]:`, metadataOld[FieldMapper.get('CHANNEL_URL')] || '❌ 없음');
console.log();

console.log('🟢 수정된 방식으로 FieldMapper 접근:');
console.log(`metadata[FieldMapper.get('CHANNEL_NAME')]:`, metadataNew[FieldMapper.get('CHANNEL_NAME')] || '❌ 없음');
console.log(`metadata[FieldMapper.get('CHANNEL_URL')]:`, metadataNew[FieldMapper.get('CHANNEL_URL')] || '❌ 없음');
console.log();

// 4. 결론
console.log('🎯 결론:');
if (metadataNew[FieldMapper.get('CHANNEL_NAME')] && metadataOld[FieldMapper.get('CHANNEL_NAME')] === undefined) {
    console.log('✅ JSON.parse 수정이 문제를 해결합니다!');
    console.log('   기존: 문자열을 객체처럼 접근해서 undefined');
    console.log('   수정: JSON 파싱 후 정상적으로 데이터 접근 가능');
} else {
    console.log('❓ JSON.parse만으로는 해결되지 않을 수 있습니다.');
}