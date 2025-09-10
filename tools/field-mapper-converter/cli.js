#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FieldMapperConverter = require('./FieldMapperConverter');

class CLI {
    constructor() {
        this.converter = null;
        this.args = process.argv.slice(2);
        
        // CLI 옵션
        this.options = {
            help: false,
            version: false,
            dryRun: false,
            verbose: false,
            interactive: true,
            autoApprove: false,
            format: 'console',
            output: null,
            backup: true,
            maxBackups: 5,
            scan: false,
            files: []
        };
    }

    // 메인 실행 함수
    async run() {
        try {
            this.parseArguments();
            
            if (this.options.help) {
                this.showHelp();
                return;
            }
            
            if (this.options.version) {
                this.showVersion();
                return;
            }

            // Converter 초기화
            this.converter = new FieldMapperConverter({
                dryRun: this.options.dryRun,
                autoApprove: this.options.autoApprove,
                interactive: this.options.interactive,
                reportFormat: this.options.format,
                reportOutput: this.options.output,
                verbose: this.options.verbose,
                maxBackups: this.options.maxBackups
            });

            if (this.options.scan) {
                await this.runProjectScan();
            } else {
                await this.runFileConversion();
            }

        } catch (error) {
            console.error(`❌ 오류 발생: ${error.message}`);
            if (this.options.verbose) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    }

    // 인수 파싱
    parseArguments() {
        for (let i = 0; i < this.args.length; i++) {
            const arg = this.args[i];
            
            switch (arg) {
                case '-h':
                case '--help':
                    this.options.help = true;
                    break;
                    
                case '-v':
                case '--version':
                    this.options.version = true;
                    break;
                    
                case '--dry-run':
                    this.options.dryRun = true;
                    break;
                    
                case '--verbose':
                    this.options.verbose = true;
                    break;
                    
                case '--no-interactive':
                    this.options.interactive = false;
                    break;
                    
                case '--auto-approve':
                    this.options.autoApprove = true;
                    break;
                    
                case '--no-backup':
                    this.options.backup = false;
                    break;
                    
                case '--scan':
                    this.options.scan = true;
                    break;
                    
                case '--format':
                    if (i + 1 < this.args.length) {
                        this.options.format = this.args[++i];
                    } else {
                        throw new Error('--format 옵션에 값이 필요합니다');
                    }
                    break;
                    
                case '--output':
                case '-o':
                    if (i + 1 < this.args.length) {
                        this.options.output = this.args[++i];
                    } else {
                        throw new Error('--output 옵션에 파일 경로가 필요합니다');
                    }
                    break;
                    
                case '--max-backups':
                    if (i + 1 < this.args.length) {
                        this.options.maxBackups = parseInt(this.args[++i]);
                        if (isNaN(this.options.maxBackups)) {
                            throw new Error('--max-backups 옵션에 숫자가 필요합니다');
                        }
                    } else {
                        throw new Error('--max-backups 옵션에 값이 필요합니다');
                    }
                    break;
                    
                default:
                    if (!arg.startsWith('-')) {
                        this.options.files.push(arg);
                    } else {
                        console.warn(`알 수 없는 옵션: ${arg}`);
                    }
                    break;
            }
        }

        // 기본값 설정
        if (this.options.files.length === 0 && !this.options.scan) {
            this.options.files.push(process.cwd());
        }
    }

    // 프로젝트 스캔 실행
    async runProjectScan() {
        const projectRoot = this.options.files[0] || process.cwd();
        
        if (!fs.existsSync(projectRoot)) {
            throw new Error(`경로를 찾을 수 없습니다: ${projectRoot}`);
        }

        console.log(`🔍 프로젝트 스캔 모드`);
        console.log(`📂 대상: ${projectRoot}`);
        
        const files = await this.converter.scanProject(projectRoot, {
            maxFiles: 50
        });

        if (files.length === 0) {
            console.log('✨ 스캔할 파일을 찾지 못했습니다.');
            return;
        }

        console.log(`\n📋 발견된 파일: ${files.length}개`);
        
        // 각 파일을 미리 분석 (dry-run)
        const analysisResults = [];
        
        for (const file of files.slice(0, 10)) { // 처음 10개만 분석
            console.log(`\n📄 ${path.relative(projectRoot, file)}`);
            
            const originalDryRun = this.options.dryRun;
            this.converter.updateOptions({ dryRun: true });
            
            const result = await this.converter.convertFile(file);
            analysisResults.push(result);
            
            this.converter.updateOptions({ dryRun: originalDryRun });
        }

        // 통합 요약
        this.showScanSummary(analysisResults, files.length);
    }

    // 파일 변환 실행
    async runFileConversion() {
        const targets = [];
        
        for (const fileOrDir of this.options.files) {
            if (fs.existsSync(fileOrDir)) {
                const stat = fs.statSync(fileOrDir);
                
                if (stat.isDirectory()) {
                    // 디렉터리인 경우 JavaScript 파일 찾기
                    const files = await this.findJavaScriptFiles(fileOrDir);
                    targets.push(...files);
                } else {
                    targets.push(fileOrDir);
                }
            } else {
                console.warn(`⚠️  파일을 찾을 수 없습니다: ${fileOrDir}`);
            }
        }

        if (targets.length === 0) {
            console.log('✨ 처리할 파일이 없습니다.');
            return;
        }

        console.log(`🚀 ${targets.length}개 파일 변환 시작`);
        
        if (targets.length === 1) {
            const result = await this.converter.convertFile(targets[0]);
            this.showSingleFileResult(result);
        } else {
            const results = await this.converter.convertMultipleFiles(targets, {
                stopOnError: false
            });
            this.showMultipleFileResults(results);
        }
    }

    // JavaScript 파일 찾기
    async findJavaScriptFiles(directory) {
        const files = [];
        
        const scanDir = (dir, maxDepth = 2, currentDepth = 0) => {
            if (currentDepth >= maxDepth) return;
            
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory()) {
                        if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
                            scanDir(fullPath, maxDepth, currentDepth + 1);
                        }
                    } else if (entry.isFile()) {
                        if (['.js', '.jsx', '.ts', '.tsx'].includes(path.extname(entry.name))) {
                            files.push(fullPath);
                        }
                    }
                }
            } catch (error) {
                if (this.options.verbose) {
                    console.warn(`디렉터리 스캔 실패: ${dir} - ${error.message}`);
                }
            }
        };

        scanDir(directory);
        return files.slice(0, 20); // 최대 20개 파일
    }

    // 스캔 요약 표시
    showScanSummary(results, totalFiles) {
        let totalViolations = 0;
        let totalAutoConvertible = 0;
        let totalNeedsReview = 0;

        for (const result of results) {
            if (result.success && result.analysisResults?.violations) {
                totalViolations += result.analysisResults.violations.total || 0;
                totalAutoConvertible += result.analysisResults.violations.autoConvertibleCount || 0;
                totalNeedsReview += result.analysisResults.violations.ambiguousCount || 0;
            }
        }

        console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
        console.log(`║                     프로젝트 스캔 요약                        ║`);
        console.log(`╚═══════════════════════════════════════════════════════════════╝`);
        console.log(`📁 총 파일: ${totalFiles}개`);
        console.log(`🔍 분석된 파일: ${results.length}개`);
        console.log(`📊 총 위반사항: ${totalViolations}개`);
        console.log(`✅ 자동 변환 가능: ${totalAutoConvertible}개`);
        console.log(`⚠️  검토 필요: ${totalNeedsReview}개`);

        if (totalViolations > 0) {
            console.log(`\n💡 권장 명령어:`);
            if (totalAutoConvertible > 0) {
                console.log(`   자동 변환: node cli.js --auto-approve ${this.options.files[0]}`);
            }
            console.log(`   수동 검토: node cli.js --interactive ${this.options.files[0]}`);
            console.log(`   안전 모드: node cli.js --dry-run ${this.options.files[0]}`);
        }
    }

    // 단일 파일 결과 표시
    showSingleFileResult(result) {
        if (result.success) {
            console.log(`\n✅ ${path.basename(result.filePath)} 처리 완료`);
        } else {
            console.log(`\n❌ ${path.basename(result.filePath)} 처리 실패: ${result.error}`);
        }
    }

    // 다중 파일 결과 표시
    showMultipleFileResults(results) {
        const { success, failed } = results.summary;
        
        console.log(`\n🏁 배치 처리 완료`);
        console.log(`✅ 성공: ${success}개`);
        console.log(`❌ 실패: ${failed}개`);
        console.log(`⏱️  총 시간: ${Math.round(results.summary.totalTime)}ms`);

        if (failed > 0) {
            console.log(`\n실패한 파일:`);
            results.results
                .filter(r => !r.success)
                .forEach(r => {
                    console.log(`   ❌ ${path.basename(r.filePath)}: ${r.error}`);
                });
        }
    }

    // 도움말 표시
    showHelp() {
        console.log(`
FieldMapper 자동 변환 도구

사용법: node cli.js [옵션] [파일/디렉터리...]

옵션:
  -h, --help              이 도움말 표시
  -v, --version           버전 정보 표시
  --dry-run               실제 변환 없이 미리 보기만
  --verbose               자세한 로그 출력
  --no-interactive        대화형 모드 비활성화
  --auto-approve          모든 변환 자동 승인
  --no-backup             백업 생성 건너뛰기
  --scan                  프로젝트 스캔 모드
  --format FORMAT         리포트 형식 (console, html, json, markdown)
  -o, --output FILE       리포트 출력 파일
  --max-backups N         최대 백업 개수 (기본: 5)

예제:
  node cli.js server/index.js           # 단일 파일 변환
  node cli.js src/                      # 디렉터리 변환
  node cli.js --scan .                  # 프로젝트 스캔
  node cli.js --dry-run --verbose       # 안전 모드로 미리보기
  node cli.js --auto-approve src/       # 자동 승인 모드
  node cli.js --format html -o report.html  # HTML 리포트 생성

자동 변환되는 패턴:
  - 직접 프로퍼티 접근: obj.channelName → obj[FieldMapper.get('CHANNEL_NAME')]
  - 객체 필드 정의: {channelName: value} → {[FieldMapper.get('CHANNEL_NAME')]: value}
  - 레거시 fallback 제거: || metadata.channelName (완전 제거)

주의사항:
  - 변환 전 자동으로 백업이 생성됩니다
  - 복잡한 패턴은 Claude가 검토 후 수동 처리를 권장할 수 있습니다
  - --dry-run 옵션으로 먼저 테스트해보세요
`);
    }

    // 버전 표시
    showVersion() {
        const packagePath = path.join(__dirname, '..', '..', 'package.json');
        
        try {
            const packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            console.log(`FieldMapper 자동 변환 도구 v1.0.0`);
            console.log(`프로젝트: ${packageInfo.name || 'InsightReel'} v${packageInfo.version || '1.0.0'}`);
        } catch (error) {
            console.log(`FieldMapper 자동 변환 도구 v1.0.0`);
        }
    }
}

// CLI 실행
if (require.main === module) {
    const cli = new CLI();
    cli.run().catch(error => {
        console.error(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = CLI;