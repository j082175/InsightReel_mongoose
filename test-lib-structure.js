// 라이브러리 구조 분석
console.log('🔍 @tobyg74/tiktok-api-dl 라이브러리 구조 분석...');

try {
    const lib = require('@tobyg74/tiktok-api-dl');
    console.log('📦 라이브러리 내용:', lib);
    console.log('📦 키들:', Object.keys(lib));
    console.log('📦 타입:', typeof lib);

    if (lib.TiktokApi) {
        console.log('✅ TiktokApi 함수 발견!');
        console.log('📦 TiktokApi 타입:', typeof lib.TiktokApi);
    }

    if (lib.default) {
        console.log('✅ default export 발견!');
        console.log('📦 default 타입:', typeof lib.default);
    }

    if (typeof lib === 'function') {
        console.log('✅ 라이브러리 자체가 함수입니다!');
    }

} catch (error) {
    console.log('❌ 라이브러리 로드 실패:', error.message);
}