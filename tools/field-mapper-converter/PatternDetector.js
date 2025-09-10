class PatternDetector {
    constructor() {
        // 명확한 FieldMapper 위반 패턴들 (95% 신뢰도)
        this.autoConvertiblePatterns = {
            // 1. 직접 프로퍼티 접근 패턴
            directPropertyAccess: {
                patterns: [
                    /\.channelName(\s*[=,\]\);])/g,
                    /\.subscribers(\s*[=,\]\);])/g,
                    /\.views(\s*[=,\]\);])/g,
                    /\.likes(\s*[=,\]\);])/g,
                    /\.videoTitle(\s*[=,\]\);])/g,
                    /\.contentType(\s*[=,\]\);])/g,
                    /\.platform(\s*[=,\]\);])/g,
                    /\.videoUrl(\s*[=,\]\);])/g,
                    /\.postUrl(\s*[=,\]\);])/g,
                    /\.analysisType(\s*[=,\]\);])/g,
                    /\.useAI(\s*[=,\]\);])/g,
                    /\.metadata(\s*[=,\]\);])/g,
                    /\.processing(\s*[=,\]\);])/g,
                    /\.analysis(\s*[=,\]\);])/g,
                    /\.files(\s*[=,\]\);])/g,
                    /\.videoPath(\s*[=,\]\);])/g,
                    /\.thumbnailPath(\s*[=,\]\);])/g,
                    /\.isProcessing(\s*[=,\]\);])/g,
                    /\.status(\s*[=,\]\);])/g,
                    /\.row(\s*[=,\]\);])/g,
                    /\.column(\s*[=,\]\);])/g
                ],
                replacement: (match, field, suffix) => {
                    const fieldName = field.substring(1); // '.' 제거
                    const mappedField = this.getFieldMapperConstant(fieldName);
                    return `[FieldMapper.get('${mappedField}')]${suffix}`;
                }
            },

            // 2. 객체 리터럴 필드 정의 패턴
            objectLiteralField: {
                patterns: [
                    /(\s+)channelName(\s*:\s*)/g,
                    /(\s+)subscribers(\s*:\s*)/g,
                    /(\s+)views(\s*:\s*)/g,
                    /(\s+)likes(\s*:\s*)/g,
                    /(\s+)videoTitle(\s*:\s*)/g,
                    /(\s+)contentType(\s*:\s*)/g,
                    /(\s+)platform(\s*:\s*)/g,
                    /(\s+)videoUrl(\s*:\s*)/g,
                    /(\s+)postUrl(\s*:\s*)/g,
                    /(\s+)analysisType(\s*:\s*)/g,
                    /(\s+)useAI(\s*:\s*)/g,
                    /(\s+)metadata(\s*:\s*)/g,
                    /(\s+)processing(\s*:\s*)/g,
                    /(\s+)analysis(\s*:\s*)/g,
                    /(\s+)files(\s*:\s*)/g,
                    /(\s+)videoPath(\s*:\s*)/g,
                    /(\s+)thumbnailPath(\s*:\s*)/g,
                    /(\s+)isProcessing(\s*:\s*)/g,
                    /(\s+)status(\s*:\s*)/g,
                    /(\s+)row(\s*:\s*)/g,
                    /(\s+)column(\s*:\s*)/g
                ],
                replacement: (match, indent, field, colon) => {
                    const mappedField = this.getFieldMapperConstant(field);
                    return `${indent}[FieldMapper.get('${mappedField}')]${colon}`;
                }
            },

            // 3. 레거시 fallback 패턴 (절대 금지)
            legacyFallback: {
                patterns: [
                    /\|\|\s*\w+\.channelName/g,
                    /\|\|\s*\w+\.subscribers/g,
                    /\|\|\s*\w+\.views/g,
                    /\|\|\s*\w+\.likes/g,
                    /\|\|\s*\w+\.videoTitle/g,
                    /\|\|\s*\w+\.contentType/g,
                    /\|\|\s*\w+\.platform/g,
                    /\|\|\s*\w+\.videoUrl/g,
                    /\|\|\s*\w+\.postUrl/g,
                    /\|\|\s*\w+\.analysisType/g,
                    /\|\|\s*\w+\.useAI/g,
                    /\|\|\s*\w+\.metadata/g
                ],
                replacement: (match) => {
                    // 레거시 fallback 완전 제거 (CLAUDE.md 규칙)
                    return '';
                }
            }
        };

        // 애매한 패턴들 (Claude 검토 필요)
        this.ambiguousPatterns = {
            // 복잡한 구조분해 할당
            complexDestructuring: /const\s*{\s*([^}]+)\s*}\s*=\s*(\w+)/g,
            
            // 중첩된 객체 접근
            nestedObjectAccess: /\w+\.\w+\.\w+/g,
            
            // 동적 프로퍼티 접근
            dynamicPropertyAccess: /\[\s*['"`][\w]+['"`]\s*\]/g,
            
            // 함수 매개변수로 전달되는 필드명
            functionParameterField: /function\s*\w*\s*\([^)]*\w+\.\w+[^)]*\)/g
        };

        // FieldMapper 상수 매핑
        this.fieldMapperConstants = {
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
            'files': 'FILES',
            'videoPath': 'VIDEO_PATH',
            'thumbnailPath': 'THUMBNAIL_PATH',
            'isProcessing': 'IS_PROCESSING',
            'status': 'STATUS',
            'row': 'ROW',
            'column': 'COLUMN'
        };
    }

    getFieldMapperConstant(fieldName) {
        return this.fieldMapperConstants[fieldName] || fieldName.toUpperCase();
    }

    // 자동 변환 가능한 패턴 검사
    detectAutoConvertibleViolations(code) {
        const violations = [];
        
        for (const [patternName, patternConfig] of Object.entries(this.autoConvertiblePatterns)) {
            for (const pattern of patternConfig.patterns) {
                let match;
                while ((match = pattern.exec(code)) !== null) {
                    violations.push({
                        type: 'auto_convertible',
                        patternName: patternName,
                        match: match[0],
                        index: match.index,
                        line: this.getLineNumber(code, match.index),
                        confidence: 0.95,
                        replacement: this.generateReplacement(patternName, match)
                    });
                }
            }
        }
        
        return violations;
    }

    // 애매한 패턴 검사 (Claude 검토 필요)
    detectAmbiguousViolations(code) {
        const violations = [];
        
        for (const [patternName, pattern] of Object.entries(this.ambiguousPatterns)) {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                violations.push({
                    type: 'requires_review',
                    patternName: patternName,
                    match: match[0],
                    index: match.index,
                    line: this.getLineNumber(code, match.index),
                    confidence: 0.7,
                    context: this.extractContext(code, match.index, 100)
                });
            }
        }
        
        return violations;
    }

    // 전체 위반사항 검사
    detectAllViolations(code) {
        const autoConvertible = this.detectAutoConvertibleViolations(code);
        const ambiguous = this.detectAmbiguousViolations(code);
        
        return {
            autoConvertible,
            ambiguous,
            total: autoConvertible.length + ambiguous.length,
            autoConvertibleCount: autoConvertible.length,
            ambiguousCount: ambiguous.length
        };
    }

    // 자동 변환 실행
    applyAutoConversions(code, violations) {
        let convertedCode = code;
        const appliedChanges = [];
        
        // 인덱스 역순으로 정렬 (뒤에서부터 변경하여 인덱스 변동 방지)
        const sortedViolations = violations
            .filter(v => v.type === 'auto_convertible')
            .sort((a, b) => b.index - a.index);
        
        for (const violation of sortedViolations) {
            const before = convertedCode.substring(violation.index, violation.index + violation.match.length);
            const after = violation.replacement;
            
            convertedCode = convertedCode.substring(0, violation.index) + 
                           after + 
                           convertedCode.substring(violation.index + violation.match.length);
            
            appliedChanges.push({
                line: violation.line,
                before,
                after,
                patternName: violation.patternName
            });
        }
        
        return {
            convertedCode,
            appliedChanges,
            changeCount: appliedChanges.length
        };
    }

    // 치환문 생성
    generateReplacement(patternName, match) {
        const patternConfig = this.autoConvertiblePatterns[patternName];
        
        if (patternName === 'directPropertyAccess') {
            const field = match[0].split(/[=,\]\);]/)[0]; // '.channelName' 추출
            const suffix = match[0].replace(field, ''); // 나머지 부분
            const fieldName = field.substring(1); // '.' 제거
            const mappedField = this.getFieldMapperConstant(fieldName);
            return `[FieldMapper.get('${mappedField}')]${suffix}`;
        }
        
        if (patternName === 'objectLiteralField') {
            const parts = match[0].match(/(\s+)(\w+)(\s*:\s*)/);
            if (parts) {
                const [, indent, field, colon] = parts;
                const mappedField = this.getFieldMapperConstant(field);
                return `${indent}[FieldMapper.get('${mappedField}')]${colon}`;
            }
        }
        
        if (patternName === 'legacyFallback') {
            return ''; // 레거시 fallback 완전 제거
        }
        
        return match[0]; // 기본값
    }

    // 라인 번호 계산
    getLineNumber(code, index) {
        return code.substring(0, index).split('\n').length;
    }

    // 컨텍스트 추출
    extractContext(code, index, radius = 50) {
        const start = Math.max(0, index - radius);
        const end = Math.min(code.length, index + radius);
        return code.substring(start, end);
    }

    // 통계 생성
    generateStats(violations) {
        const stats = {
            total: violations.total,
            autoConvertible: violations.autoConvertibleCount,
            requiresReview: violations.ambiguousCount,
            patternBreakdown: {},
            estimatedTimeToFixManually: violations.total * 0.5, // 건당 30초 추정
            estimatedTimeWithTool: violations.autoConvertibleCount * 0.01 + violations.ambiguousCount * 0.1 // 자동: 1초, 검토: 6초
        };
        
        // 패턴별 통계
        [...violations.autoConvertible, ...violations.ambiguous].forEach(v => {
            stats.patternBreakdown[v.patternName] = (stats.patternBreakdown[v.patternName] || 0) + 1;
        });
        
        return stats;
    }
}

module.exports = PatternDetector;