/**
 * 🔗 TypeScript 브릿지 파일
 * 기존 JavaScript import와 호환성을 위한 연결 파일
 * 실제 구현은 ChannelAnalysisService.ts에 있음
 */

// ts-node를 사용하여 TypeScript 파일을 런타임에 컴파일 (타입 체크 건너뛰기)
require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
        module: 'commonjs'
    }
});
module.exports = require('./ChannelAnalysisService.ts');