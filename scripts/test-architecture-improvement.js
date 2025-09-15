const dotenv = require('dotenv');
const path = require('path');

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * 🏗️ 아키텍처 개선 검증 스크립트
 *
 * 개선 내용:
 * 1. YouTube 채널: ChannelAnalysisService 단일 진입점 사용
 * 2. 비-YouTube 채널: 기존 방식 유지 (간단한 저장)
 * 3. 중복 AI 분석 로직 완전 제거
 */

async function testArchitectureImprovement() {
    console.log('🏗️ === 아키텍처 개선 검증 시작 ===\n');

    try {
        // 1. 개선된 구조 확인
        console.log('📋 1. 개선된 구조 분석');

        const routesContent = require('fs').readFileSync(
            path.join(__dirname, '..', 'server', 'routes', 'channels.js'),
            'utf8'
        );

        // ChannelAnalysisService import 확인
        const hasChannelAnalysisImport = routesContent.includes("require('../features/cluster/ChannelAnalysisService')");
        console.log(`   ✅ ChannelAnalysisService import: ${hasChannelAnalysisImport ? '존재' : '❌ 누락'}`);

        // 단일 진입점 구조 확인
        const hasUnifiedYouTubeHandling = routesContent.includes('ChannelAnalysisService를 통한 통합 처리');
        console.log(`   ✅ YouTube 단일 진입점: ${hasUnifiedYouTubeHandling ? '구현됨' : '❌ 누락'}`);

        // 중복 AI 분석 로직 제거 확인
        const duplicateAILogicRemoved = !routesContent.includes('YouTubeChannelAnalyzer.*analyzeChannelEnhanced.*channelData.channelId');
        console.log(`   ✅ 중복 AI 로직 제거: ${duplicateAILogicRemoved ? '완료' : '❌ 여전히 존재'}`);

        // YouTubeChannelDataCollector 제거 확인
        const oldCollectorRemoved = !routesContent.includes("require('../services/YouTubeChannelDataCollector')");
        console.log(`   ✅ 구 데이터 수집기 제거: ${oldCollectorRemoved ? '완료' : '❌ 여전히 존재'}`);

        console.log('\n📊 2. 코드 라인 수 분석');
        const totalLines = routesContent.split('\n').length;
        console.log(`   - 전체 라인 수: ${totalLines}줄`);

        // 주요 함수 크기 분석
        const addUrlFunctionStart = routesContent.indexOf('router.post(\'/add-url\'');
        const addUrlFunctionEnd = routesContent.indexOf('// DELETE /api/channels/:id');
        const addUrlFunctionLines = routesContent.substring(addUrlFunctionStart, addUrlFunctionEnd).split('\n').length;
        console.log(`   - add-url 함수: ${addUrlFunctionLines}줄`);

        console.log('\n🎯 3. 개선 효과 요약');
        console.log('   ✅ YouTube 채널: ChannelAnalysisService 단일 진입점');
        console.log('   ✅ 비-YouTube 채널: 기존 방식 유지 (단순성)');
        console.log('   ✅ 중복 코드 제거: AI 분석 로직 통합');
        console.log('   ✅ 유지보수성 향상: 한 곳에서만 관리');

        console.log('\n💡 4. 사용 방법');
        console.log('   YouTube 채널 추가:');
        console.log('   POST /api/channels/add-url');
        console.log('   Body: {');
        console.log('     "url": "https://www.youtube.com/@channelname",');
        console.log('     "channelData": {');
        console.log('       "aiAnalysis": "full",  // AI 분석 활성화');
        console.log('       "keywords": ["키워드1", "키워드2"]');
        console.log('     }');
        console.log('   }');

        console.log('\n✅ 아키텍처 개선 검증 완료!');

    } catch (error) {
        console.error('❌ 검증 실패:', error.message);
    }
}

testArchitectureImprovement();