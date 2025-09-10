// 간단한 테스트 실행 스크립트
const fs = require('fs');
const path = require('path');
const FieldMapperConverter = require('./FieldMapperConverter');

class ConverterTester {
    constructor() {
        this.testDir = path.join(__dirname, 'test-files');
        this.ensureTestDirectory();
    }

    ensureTestDirectory() {
        if (!fs.existsSync(this.testDir)) {
            fs.mkdirSync(this.testDir, { recursive: true });
        }
    }

    // 테스트 파일 생성
    createTestFile() {
        const testCode = `
// 테스트용 FieldMapper 위반 코드
const FieldMapper = require('../types/field-mapper');

class TestClass {
    constructor(data) {
        // 직접 프로퍼티 접근 (변환 대상)
        this.name = data.channelName;
        this.subs = data.subscribers;
        this.viewCount = data.views;
        
        // 객체 리터럴 필드 정의 (변환 대상)
        this.metadata = {
            channelName: data.channelName,
            videoTitle: data.title,
            likes: data.likes || 0
        };
        
        // 레거시 fallback 패턴 (제거 대상)
        this.fallbackData = data[FieldMapper.get('CHANNEL_NAME')] || data.channelName;
    }
    
    processVideo(videoData) {
        // 구조분해 할당 (검토 필요)
        const { platform, videoUrl, analysisType } = videoData;
        
        return {
            platform: platform,
            videoUrl: videoUrl,
            processing: true,
            analysis: {
                contentType: 'video'
            }
        };
    }
}

module.exports = TestClass;
`;

        const testFilePath = path.join(this.testDir, 'test-violations.js');
        fs.writeFileSync(testFilePath, testCode);
        return testFilePath;
    }

    // 기본 기능 테스트
    async runBasicTest() {
        console.log('🧪 기본 기능 테스트 시작...\n');

        const testFilePath = this.createTestFile();
        
        const converter = new FieldMapperConverter({
            dryRun: true, // 실제 파일 변경 안함
            verbose: true,
            autoApprove: true
        });

        try {
            const result = await converter.convertFile(testFilePath);
            
            if (result.success) {
                console.log('✅ 기본 기능 테스트 통과');
                this.showTestResults(result);
            } else {
                console.log('❌ 기본 기능 테스트 실패');
                console.log('오류:', result.error);
            }

        } catch (error) {
            console.log('❌ 테스트 실행 중 오류:', error.message);
        }
    }

    // 컴포넌트별 테스트
    async runComponentTests() {
        console.log('\n🔬 컴포넌트별 테스트...\n');

        const testFilePath = this.createTestFile();
        const testCode = fs.readFileSync(testFilePath, 'utf8');

        // 1. PatternDetector 테스트
        const PatternDetector = require('./PatternDetector');
        const detector = new PatternDetector();
        
        console.log('1️⃣ PatternDetector 테스트');
        const violations = detector.detectAllViolations(testCode);
        console.log(`   위반사항: ${violations.total}개 (자동변환: ${violations.autoConvertibleCount}, 검토필요: ${violations.ambiguousCount})`);

        // 2. ContextAnalyzer 테스트
        const ContextAnalyzer = require('./ContextAnalyzer');
        const analyzer = new ContextAnalyzer();
        
        console.log('2️⃣ ContextAnalyzer 테스트');
        const contextAnalysis = analyzer.analyzeFileContext(testCode, testFilePath);
        console.log(`   안전성 점수: ${contextAnalysis.safetyScore}/100`);
        console.log(`   위험 요소: ${contextAnalysis.riskFactors.length}개`);

        // 3. ClaudeReviewer 테스트
        const ClaudeReviewer = require('./ClaudeReviewer');
        const reviewer = new ClaudeReviewer();
        
        console.log('3️⃣ ClaudeReviewer 테스트');
        const allViolations = [...violations.autoConvertible, ...violations.ambiguous];
        const reviewResults = await reviewer.reviewViolations(allViolations, contextAnalysis);
        console.log(`   검토 결과: 승인 ${reviewResults.summary.approvedCount}개, 검토필요 ${reviewResults.summary.needsReviewCount}개, 거부 ${reviewResults.summary.rejectedCount}개`);

        // 4. SafetySystem 테스트
        const SafetySystem = require('./SafetySystem');
        const safety = new SafetySystem({ verbose: false });
        
        console.log('4️⃣ SafetySystem 테스트');
        const safetyCheck = safety.runSafetyChecklist(testFilePath);
        console.log(`   파일 안전성: ${safetyCheck.fileExists && safetyCheck.isReadable ? '✅' : '❌'}`);

        // 5. ReportGenerator 테스트
        const ReportGenerator = require('./ReportGenerator');
        const reporter = new ReportGenerator();
        
        console.log('5️⃣ ReportGenerator 테스트');
        const analysisResults = {
            violations,
            reviewResults,
            contextAnalysis,
            safetyResults: { safetyCheck },
            performanceStats: { totalTime: 150 }
        };
        
        const report = reporter.generateReport(analysisResults, { format: 'console' });
        console.log('   리포트 생성: ✅');
    }

    // 테스트 결과 표시
    showTestResults(result) {
        if (result.analysisResults && result.analysisResults.violations) {
            const v = result.analysisResults.violations;
            console.log(`📊 발견된 패턴:`);
            console.log(`   • 총 위반사항: ${v.total}개`);
            console.log(`   • 자동 변환 가능: ${v.autoConvertibleCount}개`);
            console.log(`   • 검토 필요: ${v.ambiguousCount}개`);
        }

        if (result.analysisResults && result.analysisResults.reviewResults) {
            const r = result.analysisResults.reviewResults.summary;
            console.log(`🤖 Claude 검토 결과:`);
            console.log(`   • 승인됨: ${r.approvedCount}개`);
            console.log(`   • 검토 필요: ${r.needsReviewCount}개`);
            console.log(`   • 거부됨: ${r.rejectedCount}개`);
        }

        if (result.analysisResults && result.analysisResults.performanceStats) {
            const p = result.analysisResults.performanceStats;
            console.log(`⚡ 성능 정보:`);
            console.log(`   • 총 처리 시간: ${Math.round(p.totalTime || 0)}ms`);
        }
    }

    // 정리
    cleanup() {
        try {
            if (fs.existsSync(this.testDir)) {
                fs.rmSync(this.testDir, { recursive: true });
                console.log('\n🧹 테스트 파일 정리 완료');
            }
        } catch (error) {
            console.log('⚠️  정리 중 오류:', error.message);
        }
    }
}

// 테스트 실행
async function runTests() {
    const tester = new ConverterTester();
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║           FieldMapper 자동 변환 도구 테스트 실행              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    
    try {
        await tester.runBasicTest();
        await tester.runComponentTests();
        
        console.log('\n🎉 모든 테스트 완료!');
        
    } catch (error) {
        console.error('\n❌ 테스트 실행 중 오류:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    } finally {
        tester.cleanup();
    }
}

if (require.main === module) {
    runTests();
}

module.exports = { ConverterTester, runTests };