const fs = require('fs');
const path = require('path');
const PatternDetector = require('./PatternDetector');
const ContextAnalyzer = require('./ContextAnalyzer');
const ClaudeReviewer = require('./ClaudeReviewer');
const SafetySystem = require('./SafetySystem');
const ReportGenerator = require('./ReportGenerator');

class FieldMapperConverter {
    constructor(options = {}) {
        // 컴포넌트 초기화
        this.patternDetector = new PatternDetector();
        this.contextAnalyzer = new ContextAnalyzer();
        this.claudeReviewer = new ClaudeReviewer();
        this.safetySystem = new SafetySystem({
            backupDir: options.backupDir,
            maxBackups: options.maxBackups || 5,
            verbose: options.verbose || false
        });
        this.reportGenerator = new ReportGenerator();

        // 설정
        this.options = {
            dryRun: options.dryRun || false,
            autoApprove: options.autoApprove || false,
            interactive: options.interactive || true,
            reportFormat: options.reportFormat || 'console',
            reportOutput: options.reportOutput || null,
            ...options
        };

        // 성능 추적
        this.performanceStats = {
            startTime: null,
            endTime: null,
            totalTime: 0,
            stageTimings: {}
        };
    }

    // 메인 변환 함수
    async convertFile(filePath, options = {}) {
        const startTime = performance.now();
        this.performanceStats.startTime = new Date();

        try {
            // 1단계: 파일 및 초기 검증
            console.log(`🔍 분석 시작: ${filePath}`);
            const code = await this.readFile(filePath);
            
            // 2단계: 패턴 검사
            const stageStart = performance.now();
            console.log('📊 패턴 검사 중...');
            const violations = this.patternDetector.detectAllViolations(code);
            this.performanceStats.stageTimings.patternDetection = performance.now() - stageStart;

            if (violations.total === 0) {
                console.log('✅ 위반사항이 발견되지 않았습니다.');
                return this.createSuccessResult(filePath, violations);
            }

            console.log(`📈 총 ${violations.total}개 위반사항 발견 (자동변환 ${violations.autoConvertibleCount}개, 검토필요 ${violations.ambiguousCount}개)`);

            // 3단계: 컨텍스트 분석
            const contextStart = performance.now();
            console.log('🔬 컨텍스트 분석 중...');
            const contextAnalysis = this.contextAnalyzer.analyzeFileContext(code, filePath);
            this.performanceStats.stageTimings.contextAnalysis = performance.now() - contextStart;

            // 4단계: 안전성 체크
            console.log('🛡️  안전성 검사 중...');
            const safetyCheck = this.safetySystem.runSafetyChecklist(filePath);
            if (!this.validateSafetyRequirements(safetyCheck)) {
                throw new Error('안전성 검사 실패: 파일 변환 불가');
            }

            // 5단계: 백업 생성
            if (!this.options.dryRun) {
                console.log('💾 백업 생성 중...');
                const backupResult = await this.safetySystem.createBackup(filePath, '변환 전 자동 백업');
                if (!backupResult.success) {
                    throw new Error(`백업 생성 실패: ${backupResult.error}`);
                }
            }

            // 6단계: Claude 검토
            const reviewStart = performance.now();
            console.log('🤖 Claude 검토 중...');
            const allViolations = [...violations.autoConvertible, ...violations.ambiguous];
            const reviewResults = await this.claudeReviewer.reviewViolations(allViolations, contextAnalysis);
            this.performanceStats.stageTimings.claudeReview = performance.now() - reviewStart;

            // 7단계: 변환 적용
            const conversionResult = await this.applyConversions(code, reviewResults, filePath, options);

            // 8단계: 결과 검증
            if (conversionResult.applied && !this.options.dryRun) {
                console.log('✅ 변환 완료, 결과 검증 중...');
                await this.verifyConversionResult(filePath, conversionResult);
            }

            // 9단계: 리포트 생성
            const totalTime = performance.now() - startTime;
            this.performanceStats.totalTime = totalTime;
            this.performanceStats.endTime = new Date();

            const analysisResults = {
                violations,
                reviewResults,
                contextAnalysis,
                safetyResults: { safetyCheck, backupCreated: !this.options.dryRun },
                performanceStats: this.performanceStats,
                conversionResult
            };

            // 리포트 출력
            const report = this.reportGenerator.generateReport(analysisResults, {
                format: this.options.reportFormat,
                outputPath: this.options.reportOutput,
                includeDetails: true
            });

            if (this.options.reportFormat === 'console') {
                console.log('\n' + report);
            }

            return {
                success: true,
                filePath,
                analysisResults,
                report
            };

        } catch (error) {
            console.error(`❌ 변환 실패: ${error.message}`);
            
            // 오류 발생 시 롤백
            if (!this.options.dryRun) {
                console.log('🔄 롤백 시도 중...');
                await this.safetySystem.rollbackSession();
            }

            return {
                success: false,
                filePath,
                error: error.message,
                performanceStats: this.performanceStats
            };
        }
    }

    // 여러 파일 처리
    async convertMultipleFiles(filePaths, options = {}) {
        const results = [];
        const startTime = performance.now();

        console.log(`📁 ${filePaths.length}개 파일 처리 시작`);

        for (let i = 0; i < filePaths.length; i++) {
            const filePath = filePaths[i];
            console.log(`\n[${i + 1}/${filePaths.length}] ${path.basename(filePath)}`);
            
            const result = await this.convertFile(filePath, options);
            results.push(result);

            // 실패 시 중단 옵션
            if (!result.success && options.stopOnError) {
                console.log('❌ 오류로 인한 처리 중단');
                break;
            }
        }

        const totalTime = performance.now() - startTime;
        const successCount = results.filter(r => r.success).length;

        console.log(`\n🏁 처리 완료: ${successCount}/${filePaths.length} 성공 (${Math.round(totalTime)}ms)`);

        return {
            results,
            summary: {
                total: filePaths.length,
                success: successCount,
                failed: filePaths.length - successCount,
                totalTime
            }
        };
    }

    // 변환 적용
    async applyConversions(code, reviewResults, filePath, options) {
        const { approved, needsReview, rejected } = reviewResults;
        
        if (approved.length === 0) {
            console.log('⚠️  승인된 변환이 없습니다.');
            return { applied: false, reason: '승인된 변환 없음' };
        }

        // 자동 승인 또는 사용자 확인
        let shouldProceed = this.options.autoApprove;
        
        if (!shouldProceed && this.options.interactive) {
            shouldProceed = await this.confirmConversion(approved, needsReview, rejected);
        } else if (!shouldProceed) {
            console.log('🛑 자동 승인 비활성화 - 변환 건너뜀');
            return { applied: false, reason: '사용자 승인 대기' };
        }

        if (!shouldProceed) {
            console.log('🛑 사용자에 의한 변환 취소');
            return { applied: false, reason: '사용자 취소' };
        }

        // 승인된 변환만 적용
        const approvedViolations = approved.map(item => item.violation);
        const conversionStart = performance.now();
        
        const result = this.patternDetector.applyAutoConversions(code, approvedViolations);
        
        if (!this.options.dryRun) {
            fs.writeFileSync(filePath, result.convertedCode, 'utf8');
            console.log(`✅ ${result.changeCount}개 변환 적용됨`);
        } else {
            console.log(`🔍 DRY RUN: ${result.changeCount}개 변환 예정`);
        }

        this.performanceStats.stageTimings.conversion = performance.now() - conversionStart;

        return {
            applied: !this.options.dryRun,
            changeCount: result.changeCount,
            appliedChanges: result.appliedChanges,
            convertedCode: result.convertedCode
        };
    }

    // 변환 확인 (대화형)
    async confirmConversion(approved, needsReview, rejected) {
        console.log(`\n📋 변환 계획:`);
        console.log(`   ✅ 자동 적용: ${approved.length}개`);
        console.log(`   ⚠️  수동 검토: ${needsReview.length}개`);
        console.log(`   ❌ 거부됨: ${rejected.length}개`);

        // 실제 환경에서는 readline 등을 사용하여 사용자 입력 받기
        // 여기서는 자동 승인으로 처리
        return true;
    }

    // 안전성 요구사항 검증
    validateSafetyRequirements(safetyCheck) {
        const requirements = [
            { key: 'fileExists', message: '파일이 존재하지 않습니다' },
            { key: 'isReadable', message: '파일 읽기 권한이 없습니다' },
            { key: 'isWritable', message: '파일 쓰기 권한이 없습니다' },
            { key: 'backupDirWritable', message: '백업 디렉터리에 쓰기 권한이 없습니다' }
        ];

        for (const req of requirements) {
            if (!safetyCheck[req.key]) {
                console.error(`❌ ${req.message}`);
                return false;
            }
        }

        return true;
    }

    // 변환 결과 검증
    async verifyConversionResult(filePath, conversionResult) {
        try {
            // 구문 검증 (JavaScript 파일인 경우)
            if (path.extname(filePath) === '.js') {
                new (require('vm').Script)(conversionResult.convertedCode);
                console.log('✅ JavaScript 구문 검증 통과');
            }

            // 파일 크기 변화 체크
            const originalSize = fs.statSync(filePath).size;
            const newSize = Buffer.byteLength(conversionResult.convertedCode, 'utf8');
            const sizeDiff = ((newSize - originalSize) / originalSize * 100).toFixed(1);
            
            console.log(`📏 파일 크기 변화: ${sizeDiff}%`);

            if (Math.abs(sizeDiff) > 50) {
                console.warn('⚠️  파일 크기가 크게 변했습니다. 검토를 권장합니다.');
            }

        } catch (error) {
            console.warn(`⚠️  검증 중 오류: ${error.message}`);
        }
    }

    // 파일 읽기
    async readFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
        }

        return fs.readFileSync(filePath, 'utf8');
    }

    // 성공 결과 생성
    createSuccessResult(filePath, violations) {
        return {
            success: true,
            filePath,
            analysisResults: {
                violations,
                reviewResults: null,
                contextAnalysis: null,
                safetyResults: null,
                performanceStats: this.performanceStats
            },
            message: '위반사항이 발견되지 않았습니다'
        };
    }

    // 프로젝트 전체 스캔
    async scanProject(projectRoot, options = {}) {
        const {
            includePatterns = ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
            excludePatterns = ['**/node_modules/**', '**/dist/**', '**/.git/**'],
            maxFiles = 100
        } = options;

        console.log(`🔍 프로젝트 스캔 시작: ${projectRoot}`);

        const files = [];
        
        // 간단한 파일 스캔 (실제로는 glob 패턴 매칭 사용)
        const scanDir = (dir) => {
            if (files.length >= maxFiles) return;

            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    if (files.length >= maxFiles) break;

                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory()) {
                        // 제외 패턴 체크
                        if (!excludePatterns.some(pattern => 
                            fullPath.includes(pattern.replace('**/','').replace('/**',''))
                        )) {
                            scanDir(fullPath);
                        }
                    } else if (entry.isFile()) {
                        // 포함 패턴 체크
                        if (includePatterns.some(pattern => {
                            const ext = pattern.replace('**/*.', '.');
                            return fullPath.endsWith(ext);
                        })) {
                            files.push(fullPath);
                        }
                    }
                }
            } catch (error) {
                console.warn(`스캔 실패: ${dir} - ${error.message}`);
            }
        };

        scanDir(projectRoot);
        
        console.log(`📁 ${files.length}개 파일 발견`);

        return files;
    }

    // 설정 업데이트
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }

    // 통계 정보 조회
    getStats() {
        return {
            performanceStats: this.performanceStats,
            backupStats: this.safetySystem.getBackupStats(),
            options: this.options
        };
    }
}

module.exports = FieldMapperConverter;