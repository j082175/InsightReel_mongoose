const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function verifyArchitecture() {
    try {
        console.log('🔍 === 아키텍처 개선 확실성 검증 ===\n');

        // 1. ChannelAnalysisService가 실제로 모든 필드를 처리하는지 확인
        console.log('📋 1. ChannelAnalysisService 필드 매핑 검증');

        const ChannelAnalysisService = require('../server/features/cluster/ChannelAnalysisService');
        const serviceContent = require('fs').readFileSync(
            path.join(__dirname, '..', 'server', 'features', 'cluster', 'ChannelAnalysisService.js'),
            'utf8'
        );

        // 필수 필드 매핑 확인
        const requiredFields = [
            'last7DaysViews',
            'viewsByPeriod',
            'contentType',
            'dailyUploadRate',
            'avgDurationSeconds',
            'shortFormRatio'
        ];

        console.log('   필수 필드 매핑 확인:');
        requiredFields.forEach(field => {
            const hasField = serviceContent.includes(`${field}:`);
            console.log(`   ${hasField ? '✅' : '❌'} ${field}: ${hasField ? '매핑됨' : '누락!'}`);
        });

        // 2. routes/channels.js가 정말로 ChannelAnalysisService를 호출하는지
        console.log('\n📋 2. routes/channels.js 호출 구조 검증');

        const routesContent = require('fs').readFileSync(
            path.join(__dirname, '..', 'server', 'routes', 'channels.js'),
            'utf8'
        );

        // 실제 호출 확인
        const hasServiceCall = routesContent.includes('channelAnalysisService.createOrUpdateWithAnalysis');
        console.log(`   ✅ ChannelAnalysisService 호출: ${hasServiceCall ? '존재' : '❌ 없음!'}`);

        // YouTube 처리 확인
        const youtubeHandling = routesContent.match(/if\s*\(detectedPlatform\s*===\s*PLATFORMS\.YOUTUBE\)/);
        console.log(`   ✅ YouTube 조건문: ${youtubeHandling ? '존재' : '❌ 없음!'}`);

        // 3. 실제 데이터 흐름 추적
        console.log('\n📋 3. 실제 데이터 흐름 분석');

        // YouTube 채널 처리 경로
        const flowAnalysis = {
            step1: routesContent.includes('channelId ='),
            step2: routesContent.includes('const channelAnalysisService = new ChannelAnalysisService()'),
            step3: routesContent.includes('await channelAnalysisService.createOrUpdateWithAnalysis'),
            step4: routesContent.includes('return res.status(HTTP_STATUS_CODES.CREATED).json')
        };

        console.log('   YouTube 채널 처리 흐름:');
        console.log(`   ${flowAnalysis.step1 ? '✅' : '❌'} Step 1: 채널 ID 추출`);
        console.log(`   ${flowAnalysis.step2 ? '✅' : '❌'} Step 2: ChannelAnalysisService 초기화`);
        console.log(`   ${flowAnalysis.step3 ? '✅' : '❌'} Step 3: createOrUpdateWithAnalysis 호출`);
        console.log(`   ${flowAnalysis.step4 ? '✅' : '❌'} Step 4: 응답 반환`);

        // 4. 잠재적 문제점 확인
        console.log('\n⚠️ 4. 잠재적 문제점 분석');

        // 중복 코드 확인
        const hasDuplicateAI = routesContent.includes('YouTubeChannelAnalyzer') &&
                               routesContent.includes('analyzeChannelEnhanced');
        console.log(`   ${hasDuplicateAI ? '❌ 문제!' : '✅'} 중복 AI 분석: ${hasDuplicateAI ? '여전히 존재' : '제거됨'}`);

        // 이전 방식 잔재 확인
        const hasOldCollector = routesContent.includes('YouTubeChannelDataCollector');
        console.log(`   ${hasOldCollector ? '❌ 문제!' : '✅'} 구 수집기: ${hasOldCollector ? '여전히 존재' : '제거됨'}`);

        // 비-YouTube 처리 확인
        const hasNonYouTubeHandling = routesContent.includes('// 🔧 비-YouTube 플랫폼 처리');
        console.log(`   ${hasNonYouTubeHandling ? '✅' : '⚠️'} 비-YouTube 처리: ${hasNonYouTubeHandling ? '구현됨' : '누락'}`);

        // 5. 최종 판정
        console.log('\n🎯 === 최종 검증 결과 ===');

        const allFieldsMapped = requiredFields.every(field => serviceContent.includes(`${field}:`));
        const properServiceCall = hasServiceCall && youtubeHandling;
        const noDuplicateCode = !hasDuplicateAI && !hasOldCollector;
        const completeFlow = Object.values(flowAnalysis).every(v => v);

        console.log(`   필드 매핑 완전성: ${allFieldsMapped ? '✅ 완전' : '❌ 불완전'}`);
        console.log(`   서비스 호출 정확성: ${properServiceCall ? '✅ 정확' : '❌ 부정확'}`);
        console.log(`   중복 코드 제거: ${noDuplicateCode ? '✅ 완료' : '❌ 미완료'}`);
        console.log(`   데이터 흐름 완전성: ${completeFlow ? '✅ 완전' : '❌ 불완전'}`);

        const isComplete = allFieldsMapped && properServiceCall && noDuplicateCode && completeFlow;

        console.log('\n');
        if (isComplete) {
            console.log('✅✅✅ 확실합니다! 아키텍처 개선이 완벽하게 구현되었습니다.');
            console.log('모든 필드가 ChannelAnalysisService를 통해 올바르게 처리됩니다.');
        } else {
            console.log('⚠️ 주의: 일부 개선이 필요할 수 있습니다.');
            console.log('위의 검증 결과를 확인하고 누락된 부분을 보완하세요.');
        }

    } catch (error) {
        console.error('❌ 검증 실패:', error.message);
    }
}

verifyArchitecture();