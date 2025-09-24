/**
 * 🔗 TypeScript 브릿지 파일
 * 기존 JavaScript import와 호환성을 위한 연결 파일
 * 실제 구현은 리팩토링된 ChannelAnalysisService.ts에 있음
 */

// ts-node를 사용하여 TypeScript 파일을 런타임에 컴파일 (엄격한 타입 체크 포함)
require('ts-node').register({
    transpileOnly: false,  // 타입 체크 활성화!
    compilerOptions: {
        module: 'commonjs',
        strict: true,
        noImplicitAny: true,
        strictNullChecks: true
    },
});

// 리팩토링된 새로운 위치의 서비스를 가리킴
module.exports = require('../channel-analysis/ChannelAnalysisService.ts');
