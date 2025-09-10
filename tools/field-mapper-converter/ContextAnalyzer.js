class ContextAnalyzer {
    constructor() {
        // 안전한 변환 컨텍스트 패턴
        this.safeContextPatterns = {
            // 변수 선언/할당
            variableAssignment: /^(\s*)(const|let|var)\s+\w+\s*=/,
            
            // 객체 리터럴 내부
            objectLiteral: /{\s*[^}]*$/,
            
            // 함수 매개변수
            functionParameter: /function\s*\w*\s*\([^)]*$/,
            
            // 배열 요소
            arrayElement: /\[\s*[^\]]*$/,
            
            // 조건문
            conditionalExpression: /(if|while|switch)\s*\([^)]*$/
        };

        // 위험한 변환 컨텍스트 패턴
        this.unsafeContextPatterns = {
            // 문자열 리터럴 내부
            stringLiteral: /(['"`])[^'"`]*$/,
            
            // 주석 내부  
            comment: /(\/\/.*$|\/\*[^*]*\*?(?:[^/*][^*]*\*+)*)/,
            
            // 정규표현식 내부
            regexLiteral: /\/[^\/\n]*$/,
            
            // 템플릿 리터럴 내부
            templateLiteral: /`[^`]*$/,
            
            // JSDoc 주석
            jsdocComment: /\/\*\*[^*]*\*+(?:[^/*][^*]*\*+)*\//
        };

        // FieldMapper import 확인 패턴
        this.fieldMapperImportPatterns = [
            /const\s+FieldMapper\s*=\s*require\s*\(\s*['"`][^'"`]*field-mapper[^'"`]*['"`]\s*\)/,
            /import\s+FieldMapper\s+from\s+['"`][^'"`]*field-mapper[^'"`]*['"`]/,
            /import\s*{\s*FieldMapper\s*}\s*from\s+['"`][^'"`]*['"`]/
        ];
    }

    // 전체 파일 컨텍스트 분석
    analyzeFileContext(code, filePath) {
        const analysis = {
            filePath,
            isJavaScript: this.isJavaScriptFile(filePath),
            hasFieldMapperImport: this.hasFieldMapperImport(code),
            codeStructure: this.analyzeCodeStructure(code),
            riskFactors: this.identifyRiskFactors(code),
            safetyScore: 0,
            recommendations: []
        };

        // 안전성 점수 계산
        analysis.safetyScore = this.calculateSafetyScore(analysis);
        
        // 권장사항 생성
        analysis.recommendations = this.generateRecommendations(analysis);

        return analysis;
    }

    // JavaScript 파일 여부 확인
    isJavaScriptFile(filePath) {
        return /\.(js|mjs|cjs|jsx|ts|tsx)$/.test(filePath);
    }

    // FieldMapper import 존재 여부 확인
    hasFieldMapperImport(code) {
        return this.fieldMapperImportPatterns.some(pattern => pattern.test(code));
    }

    // 코드 구조 분석
    analyzeCodeStructure(code) {
        const structure = {
            totalLines: code.split('\n').length,
            codeLines: this.countCodeLines(code),
            commentLines: this.countCommentLines(code),
            functions: this.countFunctions(code),
            classes: this.countClasses(code),
            exports: this.countExports(code),
            complexity: this.calculateComplexity(code)
        };

        return structure;
    }

    // 위험 요소 식별
    identifyRiskFactors(code) {
        const risks = [];

        // 1. eval 사용
        if (/\beval\s*\(/.test(code)) {
            risks.push({
                type: 'eval_usage',
                severity: 'high',
                message: 'eval() 사용으로 인한 동적 코드 실행 위험'
            });
        }

        // 2. Function 생성자
        if (/new\s+Function\s*\(/.test(code)) {
            risks.push({
                type: 'function_constructor',
                severity: 'high', 
                message: 'Function 생성자 사용으로 인한 동적 코드 실행 위험'
            });
        }

        // 3. 복잡한 중첩 구조
        const nestingDepth = this.calculateMaxNestingDepth(code);
        if (nestingDepth > 5) {
            risks.push({
                type: 'high_nesting',
                severity: 'medium',
                message: `과도한 중첩 구조 (깊이: ${nestingDepth})`
            });
        }

        // 4. 대용량 파일
        const lineCount = code.split('\n').length;
        if (lineCount > 1000) {
            risks.push({
                type: 'large_file',
                severity: 'medium',
                message: `대용량 파일 (${lineCount}줄) - 변환 시 주의 필요`
            });
        }

        // 5. 많은 정규표현식
        const regexCount = (code.match(/\/[^\/\n]+\/[gimuy]*/g) || []).length;
        if (regexCount > 10) {
            risks.push({
                type: 'many_regex',
                severity: 'low',
                message: `정규표현식 과다 사용 (${regexCount}개)`
            });
        }

        return risks;
    }

    // 특정 위치의 컨텍스트 분석
    analyzePositionContext(code, position) {
        const context = {
            position,
            line: this.getLineNumber(code, position),
            lineContent: this.getLineContent(code, position),
            surroundingContext: this.getSurroundingContext(code, position, 5),
            isSafeToModify: true,
            contextType: 'unknown',
            warnings: []
        };

        // 위치별 컨텍스트 타입 확인
        context.contextType = this.identifyContextType(code, position);
        
        // 수정 안전성 검사
        context.isSafeToModify = this.isSafeToModify(code, position);
        
        // 경고사항 생성
        if (!context.isSafeToModify) {
            context.warnings.push('이 위치는 수정하기 위험할 수 있습니다');
        }

        return context;
    }

    // 컨텍스트 타입 식별
    identifyContextType(code, position) {
        const beforePosition = code.substring(0, position);
        const lineStart = beforePosition.lastIndexOf('\n') + 1;
        const lineContent = code.substring(lineStart, position + 50);

        // 문자열 리터럴 내부 확인
        if (this.isInsideStringLiteral(beforePosition)) {
            return 'string_literal';
        }

        // 주석 내부 확인
        if (this.isInsideComment(beforePosition)) {
            return 'comment';
        }

        // 정규표현식 내부 확인
        if (this.isInsideRegex(beforePosition)) {
            return 'regex_literal';
        }

        // 객체 리터럴 내부 확인
        if (this.safeContextPatterns.objectLiteral.test(lineContent)) {
            return 'object_literal';
        }

        // 변수 할당 확인
        if (this.safeContextPatterns.variableAssignment.test(lineContent)) {
            return 'variable_assignment';
        }

        return 'code_block';
    }

    // 수정 안전성 확인
    isSafeToModify(code, position) {
        // 문자열, 주석, 정규표현식 내부는 수정 불가
        const beforePosition = code.substring(0, position);
        
        if (this.isInsideStringLiteral(beforePosition) ||
            this.isInsideComment(beforePosition) ||
            this.isInsideRegex(beforePosition)) {
            return false;
        }

        return true;
    }

    // 문자열 리터럴 내부 여부 확인
    isInsideStringLiteral(code) {
        let inString = false;
        let stringChar = '';
        let escaped = false;

        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            
            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            if (!inString && (char === '"' || char === "'" || char === '`')) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar) {
                inString = false;
                stringChar = '';
            }
        }

        return inString;
    }

    // 주석 내부 여부 확인
    isInsideComment(code) {
        const lines = code.split('\n');
        const lastLine = lines[lines.length - 1];
        
        // 단일 라인 주석
        if (lastLine.includes('//')) {
            return true;
        }

        // 다중 라인 주석
        let inMultilineComment = false;
        for (const line of lines) {
            if (line.includes('/*') && !line.includes('*/')) {
                inMultilineComment = true;
            } else if (line.includes('*/') && inMultilineComment) {
                inMultilineComment = false;
            }
        }

        return inMultilineComment;
    }

    // 정규표현식 내부 여부 확인
    isInsideRegex(code) {
        // 정규표현식 패턴 대략적 확인
        const regexPattern = /\/[^\/\n]*$/;
        return regexPattern.test(code);
    }

    // 안전성 점수 계산 (0-100)
    calculateSafetyScore(analysis) {
        let score = 100;

        // FieldMapper import가 없으면 -30점
        if (!analysis.hasFieldMapperImport) {
            score -= 30;
        }

        // 위험 요소에 따른 점수 차감
        for (const risk of analysis.riskFactors) {
            switch (risk.severity) {
                case 'high':
                    score -= 25;
                    break;
                case 'medium':
                    score -= 15;
                    break;
                case 'low':
                    score -= 5;
                    break;
            }
        }

        // 코드 복잡도에 따른 점수 차감
        if (analysis.codeStructure.complexity > 20) {
            score -= 10;
        }

        return Math.max(0, score);
    }

    // 권장사항 생성
    generateRecommendations(analysis) {
        const recommendations = [];

        if (!analysis.hasFieldMapperImport) {
            recommendations.push({
                type: 'missing_import',
                priority: 'high',
                message: 'FieldMapper import를 추가해야 합니다',
                solution: "const FieldMapper = require('../types/field-mapper');"
            });
        }

        if (analysis.safetyScore < 70) {
            recommendations.push({
                type: 'low_safety_score',
                priority: 'medium',
                message: '파일의 안전성 점수가 낮습니다. 수동 검토를 권장합니다',
                solution: '위험 요소를 제거하거나 더 신중한 변환 접근이 필요합니다'
            });
        }

        // 대용량 파일 권장사항
        if (analysis.codeStructure.totalLines > 1000) {
            recommendations.push({
                type: 'large_file',
                priority: 'medium', 
                message: '대용량 파일입니다. 부분별 변환을 고려하세요',
                solution: '파일을 더 작은 단위로 분할하거나 배치 처리를 사용하세요'
            });
        }

        return recommendations;
    }

    // 유틸리티 메서드들
    countCodeLines(code) {
        return code.split('\n')
            .filter(line => line.trim() && !line.trim().startsWith('//'))
            .length;
    }

    countCommentLines(code) {
        return (code.match(/\/\/.*$/gm) || []).length + 
               (code.match(/\/\*[\s\S]*?\*\//g) || []).length;
    }

    countFunctions(code) {
        return (code.match(/function\s+\w+/g) || []).length + 
               (code.match(/=\s*\([^)]*\)\s*=>/g) || []).length;
    }

    countClasses(code) {
        return (code.match(/class\s+\w+/g) || []).length;
    }

    countExports(code) {
        return (code.match(/module\.exports|export\s/g) || []).length;
    }

    calculateComplexity(code) {
        // McCabe 복잡도 근사치
        const complexityPatterns = [
            /if\s*\(/g,
            /else/g, 
            /for\s*\(/g,
            /while\s*\(/g,
            /switch\s*\(/g,
            /case\s+/g,
            /catch\s*\(/g,
            /&&|\|\|/g
        ];

        let complexity = 1; // 기본 복잡도
        for (const pattern of complexityPatterns) {
            const matches = code.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        }

        return complexity;
    }

    calculateMaxNestingDepth(code) {
        let depth = 0;
        let maxDepth = 0;

        for (const char of code) {
            if (char === '{') {
                depth++;
                maxDepth = Math.max(maxDepth, depth);
            } else if (char === '}') {
                depth--;
            }
        }

        return maxDepth;
    }

    getLineNumber(code, position) {
        return code.substring(0, position).split('\n').length;
    }

    getLineContent(code, position) {
        const lines = code.split('\n');
        const lineNumber = this.getLineNumber(code, position);
        return lines[lineNumber - 1] || '';
    }

    getSurroundingContext(code, position, radius) {
        const lines = code.split('\n');
        const lineNumber = this.getLineNumber(code, position);
        const start = Math.max(0, lineNumber - radius - 1);
        const end = Math.min(lines.length, lineNumber + radius);
        
        return {
            lines: lines.slice(start, end),
            startLine: start + 1,
            endLine: end,
            focusLine: lineNumber
        };
    }
}

module.exports = ContextAnalyzer;