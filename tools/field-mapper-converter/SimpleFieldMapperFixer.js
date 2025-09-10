const fs = require('fs');
const path = require('path');

class SimpleFieldMapperFixer {
    constructor() {
        // 간단하고 확실한 매핑만
        this.fieldMap = {
            'channelName': 'CHANNEL_NAME',
            'subscribers': 'SUBSCRIBERS', 
            'views': 'VIEWS',
            'likes': 'LIKES',
            'videoTitle': 'VIDEO_TITLE',
            'contentType': 'CONTENT_TYPE',
            'platform': 'PLATFORM',
            'videoUrl': 'VIDEO_URL',
            'postUrl': 'POST_URL',
            'analysisType': 'ANALYSIS_TYPE',
            'useAI': 'USE_AI',
            'metadata': 'METADATA',
            'processing': 'PROCESSING',
            'analysis': 'ANALYSIS'
        };
        
        this.changes = [];
        this.backupCreated = false;
    }

    // 백업 생성
    createBackup(filePath) {
        const backupPath = filePath + '.backup-' + Date.now();
        fs.copyFileSync(filePath, backupPath);
        this.backupCreated = backupPath;
        console.log(`💾 백업 생성: ${path.basename(backupPath)}`);
        return backupPath;
    }

    // 파일 처리
    async processFile(filePath, options = {}) {
        console.log(`🔧 처리 시작: ${path.basename(filePath)}`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
        }

        // 백업 생성
        if (!options.dryRun) {
            this.createBackup(filePath);
        }

        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        
        // FieldMapper import 확인
        if (!this.hasFieldMapperImport(content)) {
            console.log('⚠️  FieldMapper import가 없습니다. 추가 권장.');
        }

        // 변환 실행
        content = this.fixDirectPropertyAccess(content);
        content = this.fixObjectLiteralFields(content);
        content = this.removeLegacyFallbacks(content);

        // 결과 확인
        if (content === originalContent) {
            console.log('✨ 변경사항이 없습니다.');
            return { changed: false, changes: 0 };
        }

        // 파일 저장
        if (!options.dryRun) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${this.changes.length}개 변경 적용됨`);
        } else {
            console.log(`🔍 DRY RUN: ${this.changes.length}개 변경 예정`);
        }

        return {
            changed: true,
            changes: this.changes.length,
            details: this.changes
        };
    }

    // FieldMapper import 확인
    hasFieldMapperImport(content) {
        return content.includes('FieldMapper') && 
               (content.includes("require('../types/field-mapper')") || 
                content.includes("require('./types/field-mapper')") ||
                content.includes('field-mapper'));
    }

    // 1. 직접 프로퍼티 접근 수정
    fixDirectPropertyAccess(content) {
        for (const [oldField, newField] of Object.entries(this.fieldMap)) {
            // obj.channelName 패턴 찾기
            const regex = new RegExp(`(\\w+)\\.${oldField}\\b`, 'g');
            content = content.replace(regex, (match, objName) => {
                this.changes.push({
                    type: 'direct_access',
                    from: match,
                    to: `${objName}[FieldMapper.get('${newField}')]`
                });
                return `${objName}[FieldMapper.get('${newField}')]`;
            });
        }
        return content;
    }

    // 2. 객체 리터럴 필드 수정
    fixObjectLiteralFields(content) {
        for (const [oldField, newField] of Object.entries(this.fieldMap)) {
            // "channelName:" 패턴 찾기
            const regex = new RegExp(`(\\s+)${oldField}(\\s*:\\s*)`, 'g');
            content = content.replace(regex, (match, indent, colon) => {
                this.changes.push({
                    type: 'object_field',
                    from: `${oldField}:`,
                    to: `[FieldMapper.get('${newField}')]:`
                });
                return `${indent}[FieldMapper.get('${newField}')]${colon}`;
            });
        }
        return content;
    }

    // 3. 레거시 fallback 제거
    removeLegacyFallbacks(content) {
        for (const [oldField, newField] of Object.entries(this.fieldMap)) {
            // || obj.channelName 패턴 제거
            const regex = new RegExp(`\\s*\\|\\|\\s*\\w+\\.${oldField}\\b`, 'g');
            content = content.replace(regex, (match) => {
                this.changes.push({
                    type: 'remove_fallback',
                    from: match,
                    to: ''
                });
                return '';
            });
        }
        return content;
    }

    // 변경사항 표시
    showChanges() {
        if (this.changes.length === 0) {
            console.log('변경사항이 없습니다.');
            return;
        }

        console.log(`\n📋 변경 내역 (${this.changes.length}개):`);
        const grouped = {};
        
        for (const change of this.changes) {
            if (!grouped[change.type]) {
                grouped[change.type] = [];
            }
            grouped[change.type].push(change);
        }

        for (const [type, changes] of Object.entries(grouped)) {
            const typeNames = {
                'direct_access': '직접 접근',
                'object_field': '객체 필드',
                'remove_fallback': '레거시 제거'
            };
            
            console.log(`\n${typeNames[type]} (${changes.length}개):`);
            changes.slice(0, 3).forEach(change => {
                console.log(`   ${change.from} → ${change.to}`);
            });
            
            if (changes.length > 3) {
                console.log(`   ... 외 ${changes.length - 3}개`);
            }
        }
    }

    // 롤백
    rollback(filePath) {
        if (!this.backupCreated) {
            console.log('❌ 생성된 백업이 없습니다.');
            return false;
        }

        try {
            fs.copyFileSync(this.backupCreated, filePath);
            console.log(`🔄 롤백 완료: ${path.basename(filePath)}`);
            return true;
        } catch (error) {
            console.error(`❌ 롤백 실패: ${error.message}`);
            return false;
        }
    }
}

// CLI 실행
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
사용법: node SimpleFieldMapperFixer.js [파일경로] [옵션]

옵션:
  --dry-run    실제 변경 없이 미리보기만
  --help       도움말

예제:
  node SimpleFieldMapperFixer.js ../../server/index.js
  node SimpleFieldMapperFixer.js ../../server/index.js --dry-run
`);
        process.exit(0);
    }

    const filePath = args[0];
    const isDryRun = args.includes('--dry-run');
    
    const fixer = new SimpleFieldMapperFixer();
    
    fixer.processFile(filePath, { dryRun: isDryRun })
        .then(result => {
            fixer.showChanges();
            
            if (result.changed && !isDryRun) {
                console.log(`\n💡 롤백하려면: fixer.rollback('${filePath}')`);
            }
        })
        .catch(error => {
            console.error(`❌ 오류: ${error.message}`);
            process.exit(1);
        });
}

module.exports = SimpleFieldMapperFixer;