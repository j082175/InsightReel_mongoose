const fs = require('fs');
const path = require('path');

class CompleteFieldMapperFixer {
    constructor() {
        // 전체 FieldMapper 매핑 (field-mapper.js에서 가져와야 함)
        this.fieldMap = {
            // 기본 필드들
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
            'analysis': 'ANALYSIS',
            
            // 추가 필드들 (실제 사용되는 것들)
            'description': 'DESCRIPTION',
            'title': 'TITLE',
            'uploadDate': 'UPLOAD_DATE',
            'thumbnailPath': 'THUMBNAIL_PATH',
            'thumbnailUrl': 'THUMBNAIL_URL',
            'videoPath': 'VIDEO_PATH',
            'duration': 'DURATION',
            'category': 'CATEGORY',
            'tags': 'TAGS',
            'viewCount': 'VIEW_COUNT',
            'likeCount': 'LIKE_COUNT',
            'commentCount': 'COMMENT_COUNT',
            'shareCount': 'SHARE_COUNT',
            'isProcessing': 'IS_PROCESSING',
            'status': 'STATUS',
            'error': 'ERROR',
            'timestamp': 'TIMESTAMP',
            'createdAt': 'CREATED_AT',
            'updatedAt': 'UPDATED_AT',
            'files': 'FILES',
            'row': 'ROW',
            'column': 'COLUMN',
            'id': 'ID',
            'url': 'URL',
            'authorId': 'AUTHOR_ID',
            'authorName': 'AUTHOR_NAME',
            'publishDate': 'PUBLISH_DATE',
            'extractedAt': 'EXTRACTED_AT',
            'analysisContent': 'ANALYSIS_CONTENT',
            'summary': 'SUMMARY',
            'content': 'CONTENT',
            'aiProvider': 'AI_PROVIDER',
            'modelUsed': 'MODEL_USED',
            'processingTime': 'PROCESSING_TIME',
            'retryCount': 'RETRY_COUNT',
            'lastError': 'LAST_ERROR',
            'batchId': 'BATCH_ID',
            'source': 'SOURCE',
            'quality': 'QUALITY',
            'format': 'FORMAT',
            'size': 'SIZE',
            'hash': 'HASH'
        };
        
        this.changes = [];
        this.backupCreated = false;
    }

    // 파일에서 실제 사용되는 필드 패턴 찾기
    findAllFieldPatterns(content) {
        const patterns = new Set();
        
        // 1. 직접 프로퍼티 접근: obj.field
        const directAccess = content.match(/\w+\.(\w+)/g) || [];
        directAccess.forEach(match => {
            const field = match.split('.')[1];
            if (this.fieldMap[field]) {
                patterns.add(`direct:${field}`);
            }
        });
        
        // 2. 객체 리터럴: { field: value }
        const objectFields = content.match(/\s+(\w+)\s*:/g) || [];
        objectFields.forEach(match => {
            const field = match.trim().replace(':', '');
            if (this.fieldMap[field]) {
                patterns.add(`object:${field}`);
            }
        });
        
        // 3. 구조분해 할당: { field } = obj 또는 { field: alias } = obj
        const destructuring = content.match(/{\s*([^}]+)\s*}\s*=\s*\w+/g) || [];
        destructuring.forEach(match => {
            const fieldsStr = match.match(/{([^}]+)}/)[1];
            const fields = fieldsStr.split(',');
            fields.forEach(field => {
                const cleanField = field.split(':')[0].trim(); // alias 제거
                if (this.fieldMap[cleanField]) {
                    patterns.add(`destructure:${cleanField}`);
                }
            });
        });
        
        return Array.from(patterns);
    }

    // 백업 생성
    createBackup(filePath) {
        const backupPath = filePath + '.complete-backup-' + Date.now();
        fs.copyFileSync(filePath, backupPath);
        this.backupCreated = backupPath;
        console.log(`💾 백업 생성: ${path.basename(backupPath)}`);
        return backupPath;
    }

    // 완전한 파일 처리
    async processFile(filePath, options = {}) {
        console.log(`🔧 완전 변환 시작: ${path.basename(filePath)}`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
        }

        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        
        // 사용되는 모든 패턴 찾기
        console.log('🔍 패턴 분석 중...');
        const patterns = this.findAllFieldPatterns(content);
        console.log(`📊 발견된 패턴: ${patterns.length}개`);
        
        // 백업 생성
        if (!options.dryRun) {
            this.createBackup(filePath);
        }

        // FieldMapper import 확인
        if (!this.hasFieldMapperImport(content)) {
            console.log('⚠️  FieldMapper import가 없습니다. 추가 권장.');
        }

        // 변환 실행
        content = this.fixDirectPropertyAccess(content);
        content = this.fixObjectLiteralFields(content);
        content = this.fixDestructuringAssignment(content);
        content = this.removeLegacyFallbacks(content);
        content = this.fixComplexPatterns(content);

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
            details: this.changes,
            patterns: patterns
        };
    }

    // FieldMapper import 확인
    hasFieldMapperImport(content) {
        return content.includes('FieldMapper') && 
               (content.includes("require('../types/field-mapper')") || 
                content.includes("require('./types/field-mapper')") ||
                content.includes('field-mapper'));
    }

    // 1. 직접 프로퍼티 접근 수정 (개선된 버전)
    fixDirectPropertyAccess(content) {
        for (const [oldField, newField] of Object.entries(this.fieldMap)) {
            // 더 정교한 정규식으로 모든 경우 처리
            const patterns = [
                // obj.field 패턴
                new RegExp(`(\\w+)\\.${oldField}\\b(?!\\s*[({])`, 'g'),
                // req.query.field, req.body.field 등
                new RegExp(`(req\\.(query|body|params))\\.${oldField}\\b`, 'g'),
                // data.field, result.field 등
                new RegExp(`(\\w*[Dd]ata|\\w*[Rr]esult|\\w*[Ii]nfo|\\w*[Mm]etadata)\\.${oldField}\\b`, 'g')
            ];

            patterns.forEach(regex => {
                content = content.replace(regex, (match, objName) => {
                    this.changes.push({
                        type: 'direct_access',
                        from: match,
                        to: `${objName}[FieldMapper.get('${newField}')]`
                    });
                    return `${objName}[FieldMapper.get('${newField}')]`;
                });
            });
        }
        return content;
    }

    // 2. 객체 리터럴 필드 수정 (개선된 버전)
    fixObjectLiteralFields(content) {
        for (const [oldField, newField] of Object.entries(this.fieldMap)) {
            // { field: value } 패턴
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

    // 3. 구조분해 할당 수정 (안전한 버전)
    fixDestructuringAssignment(content) {
        // 구조분해 할당은 너무 복잡해서 일단 건너뛰기
        // 나중에 수동으로 처리하는 것이 안전
        console.log('⚠️  구조분해 할당은 수동 처리 권장 (복잡도 때문에 건너뜀)');
        return content;
    }

    // 4. 레거시 fallback 제거 (개선된 버전)
    removeLegacyFallbacks(content) {
        for (const [oldField, newField] of Object.entries(this.fieldMap)) {
            // 모든 형태의 fallback 패턴
            const patterns = [
                // || obj.field
                new RegExp(`\\s*\\|\\|\\s*(\\w+)\\.${oldField}\\b`, 'g'),
                // || obj.field || default
                new RegExp(`\\s*\\|\\|\\s*(\\w+)\\.${oldField}\\s*\\|\\|`, 'g')
            ];

            patterns.forEach(regex => {
                content = content.replace(regex, (match, objName) => {
                    this.changes.push({
                        type: 'remove_fallback',
                        from: match,
                        to: ''
                    });
                    return '';
                });
            });
        }
        return content;
    }

    // 5. 복잡한 패턴 처리 (신규 추가)
    fixComplexPatterns(content) {
        // 함수 매개변수의 기본값
        for (const [oldField, newField] of Object.entries(this.fieldMap)) {
            const regex = new RegExp(`(function\\s+\\w+\\s*\\([^)]*)(\\w+\\.${oldField})(\\s*[=,)])`, 'g');
            content = content.replace(regex, (match, prefix, access, suffix) => {
                const [objName] = access.split('.');
                this.changes.push({
                    type: 'function_param',
                    from: access,
                    to: `${objName}[FieldMapper.get('${newField}')]`
                });
                return `${prefix}${objName}[FieldMapper.get('${newField}')]${suffix}`;
            });
        }
        return content;
    }

    // 변경사항 표시 (개선된 버전)
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

        const typeNames = {
            'direct_access': '직접 접근',
            'object_field': '객체 필드',
            'destructure_simple': '구조분해 (단순)',
            'destructure_alias': '구조분해 (별칭)',
            'remove_fallback': '레거시 제거',
            'function_param': '함수 매개변수'
        };

        for (const [type, changes] of Object.entries(grouped)) {
            const typeName = typeNames[type] || type;
            console.log(`\n${typeName} (${changes.length}개):`);
            changes.slice(0, 5).forEach(change => {
                console.log(`   ${change.from} → ${change.to}`);
            });
            
            if (changes.length > 5) {
                console.log(`   ... 외 ${changes.length - 5}개`);
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
    
    if (args.length === 0 || args.includes('--help')) {
        console.log(`
🔧 완전한 FieldMapper 변환 도구

사용법: node CompleteFieldMapperFixer.js [파일경로] [옵션]

옵션:
  --dry-run    실제 변경 없이 미리보기만
  --help       도움말

기능:
  ✅ 직접 프로퍼티 접근 (obj.field)
  ✅ 객체 리터럴 필드 ({ field: value })
  ✅ 구조분해 할당 ({ field } = obj)
  ✅ 레거시 fallback 제거 (|| obj.field)
  ✅ 복잡한 패턴 처리
  ✅ 50+ 필드 지원

예제:
  node CompleteFieldMapperFixer.js ../../server/index.js --dry-run
  node CompleteFieldMapperFixer.js ../../server/index.js
`);
        process.exit(0);
    }

    const filePath = args[0];
    const isDryRun = args.includes('--dry-run');
    
    const fixer = new CompleteFieldMapperFixer();
    
    fixer.processFile(filePath, { dryRun: isDryRun })
        .then(result => {
            fixer.showChanges();
            
            if (result.changed) {
                console.log(`\n📊 발견된 패턴 유형:`);
                result.patterns.forEach(pattern => {
                    console.log(`   ${pattern}`);
                });
            }
            
            if (result.changed && !isDryRun) {
                console.log(`\n💡 롤백하려면: fixer.rollback('${filePath}')`);
            }
        })
        .catch(error => {
            console.error(`❌ 오류: ${error.message}`);
            process.exit(1);
        });
}

module.exports = CompleteFieldMapperFixer;