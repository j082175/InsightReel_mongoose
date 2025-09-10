class ClaudeReviewer {
    constructor() {
        // 판단 기준 가중치
        this.judgmentWeights = {
            contextSafety: 0.4,      // 컨텍스트 안전성
            patternConfidence: 0.3,   // 패턴 신뢰도  
            codeComplexity: 0.2,      // 코드 복잡도
            riskAssessment: 0.1       // 위험도 평가
        };

        // 변환 결정 임계값
        this.decisionThresholds = {
            autoApprove: 0.85,    // 자동 승인
            needsReview: 0.60,    // 검토 필요
            reject: 0.40          // 거부 (위험)
        };

        // 학습된 패턴 데이터베이스 (실제로는 외부 파일에서 로드)
        this.learnedPatterns = {
            safePatterns: [
                // 안전한 변환 패턴들
                {
                    pattern: /const\s+\w+\s*=\s*\w+\.channelName/,
                    confidence: 0.95,
                    reason: '단순 변수 할당은 안전함'
                },
                {
                    pattern: /return\s+\{[^}]*channelName:/,
                    confidence: 0.90,
                    reason: '객체 리턴 시 필드 정의는 안전함'
                }
            ],
            riskyPatterns: [
                // 위험한 변환 패턴들
                {
                    pattern: /eval\([^)]*channelName/,
                    confidence: 0.05,
                    reason: 'eval 내부는 동적 실행으로 위험'
                },
                {
                    pattern: /['"`][^'"`]*channelName[^'"`]*['"`]/,
                    confidence: 0.10,
                    reason: '문자열 내부는 변환하면 안됨'
                }
            ]
        };

        // 컨텍스트별 판단 로직
        this.contextJudgmentRules = {
            'variable_assignment': this.judgeVariableAssignment.bind(this),
            'object_literal': this.judgeObjectLiteral.bind(this),
            'function_parameter': this.judgeFunctionParameter.bind(this),
            'string_literal': this.judgeStringLiteral.bind(this),
            'comment': this.judgeComment.bind(this),
            'destructuring': this.judgeDestructuring.bind(this)
        };
    }

    // 메인 검토 함수
    async reviewViolations(violations, contextAnalysis) {
        const reviewResults = {
            approved: [],
            needsReview: [], 
            rejected: [],
            summary: {
                total: violations.length,
                approvedCount: 0,
                needsReviewCount: 0,
                rejectedCount: 0,
                confidence: 0
            }
        };

        for (const violation of violations) {
            const decision = await this.makeDecision(violation, contextAnalysis);
            
            switch (decision.action) {
                case 'approve':
                    reviewResults.approved.push({ violation, decision });
                    reviewResults.summary.approvedCount++;
                    break;
                case 'review':
                    reviewResults.needsReview.push({ violation, decision });
                    reviewResults.summary.needsReviewCount++;
                    break;
                case 'reject':
                    reviewResults.rejected.push({ violation, decision });
                    reviewResults.summary.rejectedCount++;
                    break;
            }
        }

        // 전체 신뢰도 계산
        reviewResults.summary.confidence = this.calculateOverallConfidence(reviewResults);

        return reviewResults;
    }

    // 개별 위반사항에 대한 결정
    async makeDecision(violation, contextAnalysis) {
        // 1. 컨텍스트 분석
        const contextJudgment = this.analyzeContext(violation, contextAnalysis);
        
        // 2. 패턴 매칭
        const patternJudgment = this.analyzePattern(violation);
        
        // 3. 복잡도 분석
        const complexityJudgment = this.analyzeComplexity(violation, contextAnalysis);
        
        // 4. 위험도 평가
        const riskJudgment = this.assessRisk(violation, contextAnalysis);

        // 5. 종합 점수 계산
        const totalScore = 
            contextJudgment.score * this.judgmentWeights.contextSafety +
            patternJudgment.score * this.judgmentWeights.patternConfidence +
            complexityJudgment.score * this.judgmentWeights.codeComplexity +
            riskJudgment.score * this.judgmentWeights.riskAssessment;

        // 6. 결정 내리기
        let action, reason;
        if (totalScore >= this.decisionThresholds.autoApprove) {
            action = 'approve';
            reason = '높은 신뢰도로 자동 변환 승인';
        } else if (totalScore >= this.decisionThresholds.needsReview) {
            action = 'review';
            reason = '수동 검토 필요';
        } else {
            action = 'reject';
            reason = '위험도가 높아 변환 거부';
        }

        return {
            action,
            confidence: totalScore,
            reason,
            details: {
                context: contextJudgment,
                pattern: patternJudgment,
                complexity: complexityJudgment,
                risk: riskJudgment
            }
        };
    }

    // 컨텍스트 분석
    analyzeContext(violation, contextAnalysis) {
        const contextType = violation.contextType || 'unknown';
        const judgmentFunction = this.contextJudgmentRules[contextType];
        
        if (judgmentFunction) {
            return judgmentFunction(violation, contextAnalysis);
        }

        // 기본 판단
        return {
            score: 0.5,
            reason: `알 수 없는 컨텍스트: ${contextType}`,
            confidence: 0.3
        };
    }

    // 변수 할당 판단
    judgeVariableAssignment(violation, contextAnalysis) {
        // 변수 할당은 일반적으로 안전
        return {
            score: 0.85,
            reason: '변수 할당은 일반적으로 안전한 변환',
            confidence: 0.9
        };
    }

    // 객체 리터럴 판단
    judgeObjectLiteral(violation, contextAnalysis) {
        // 객체 필드 정의도 안전
        return {
            score: 0.88,
            reason: '객체 리터럴 필드 정의는 안전한 변환',
            confidence: 0.92
        };
    }

    // 함수 매개변수 판단
    judgeFunctionParameter(violation, contextAnalysis) {
        // 함수 매개변수는 조심스러움
        return {
            score: 0.65,
            reason: '함수 매개변수는 신중한 검토 필요',
            confidence: 0.7
        };
    }

    // 문자열 리터럴 판단
    judgeStringLiteral(violation, contextAnalysis) {
        // 문자열 내부는 절대 변환하면 안됨
        return {
            score: 0.1,
            reason: '문자열 리터럴 내부는 변환 금지',
            confidence: 0.95
        };
    }

    // 주석 판단
    judgeComment(violation, contextAnalysis) {
        // 주석 내부는 변환하면 안됨
        return {
            score: 0.05,
            reason: '주석 내부는 변환 금지',
            confidence: 0.98
        };
    }

    // 구조분해 할당 판단
    judgeDestructuring(violation, contextAnalysis) {
        // 구조분해 할당은 복잡하므로 검토 필요
        return {
            score: 0.6,
            reason: '구조분해 할당은 복잡하여 수동 검토 필요',
            confidence: 0.75
        };
    }

    // 패턴 분석
    analyzePattern(violation) {
        let highestScore = 0;
        let bestMatch = null;

        // 안전한 패턴 확인
        for (const safePattern of this.learnedPatterns.safePatterns) {
            if (safePattern.pattern.test(violation.match)) {
                if (safePattern.confidence > highestScore) {
                    highestScore = safePattern.confidence;
                    bestMatch = {
                        type: 'safe',
                        reason: safePattern.reason,
                        confidence: safePattern.confidence
                    };
                }
            }
        }

        // 위험한 패턴 확인
        for (const riskyPattern of this.learnedPatterns.riskyPatterns) {
            if (riskyPattern.pattern.test(violation.match)) {
                // 위험한 패턴이 매칭되면 점수를 낮춤
                return {
                    score: riskyPattern.confidence,
                    reason: riskyPattern.reason,
                    confidence: 0.95,
                    type: 'risky'
                };
            }
        }

        if (bestMatch) {
            return {
                score: bestMatch.confidence,
                reason: bestMatch.reason,
                confidence: bestMatch.confidence,
                type: bestMatch.type
            };
        }

        // 패턴 매칭 실패
        return {
            score: 0.5,
            reason: '알려진 패턴과 일치하지 않음',
            confidence: 0.4
        };
    }

    // 복잡도 분석
    analyzeComplexity(violation, contextAnalysis) {
        const complexity = contextAnalysis.codeStructure?.complexity || 1;
        const nestingDepth = this.calculateLocalNestingDepth(violation);

        let score = 1.0;
        let reason = '단순한 구조로 변환 용이';

        // 복잡도에 따른 점수 조정
        if (complexity > 20) {
            score -= 0.3;
            reason = '높은 복잡도로 인한 변환 위험 증가';
        } else if (complexity > 10) {
            score -= 0.15;
            reason = '중간 복잡도로 신중한 변환 필요';
        }

        // 중첩 깊이에 따른 점수 조정
        if (nestingDepth > 4) {
            score -= 0.2;
            reason += ', 깊은 중첩 구조';
        }

        return {
            score: Math.max(0, score),
            reason,
            confidence: 0.8,
            complexity,
            nestingDepth
        };
    }

    // 위험도 평가
    assessRisk(violation, contextAnalysis) {
        let riskScore = 1.0; // 기본적으로 안전
        const risks = [];

        // 파일 크기 위험
        if (contextAnalysis.codeStructure?.totalLines > 1000) {
            riskScore -= 0.1;
            risks.push('대용량 파일');
        }

        // 안전성 점수 위험
        if (contextAnalysis.safetyScore < 70) {
            riskScore -= 0.2;
            risks.push('낮은 안전성 점수');
        }

        // 위험 요소 존재
        if (contextAnalysis.riskFactors?.length > 0) {
            riskScore -= 0.15 * contextAnalysis.riskFactors.length;
            risks.push(`위험 요소 ${contextAnalysis.riskFactors.length}개`);
        }

        // FieldMapper import 누락
        if (!contextAnalysis.hasFieldMapperImport) {
            riskScore -= 0.25;
            risks.push('FieldMapper import 누락');
        }

        return {
            score: Math.max(0, riskScore),
            reason: risks.length > 0 ? `위험 요소: ${risks.join(', ')}` : '위험 요소 없음',
            confidence: 0.85,
            risks
        };
    }

    // 지역 중첩 깊이 계산
    calculateLocalNestingDepth(violation) {
        const contextRadius = 200; // 검사할 컨텍스트 범위
        const start = Math.max(0, violation.index - contextRadius);
        const end = Math.min(violation.code?.length || 0, violation.index + contextRadius);
        const localContext = violation.code?.substring(start, end) || '';

        let depth = 0;
        let maxDepth = 0;

        for (const char of localContext) {
            if (char === '{') {
                depth++;
                maxDepth = Math.max(maxDepth, depth);
            } else if (char === '}') {
                depth--;
            }
        }

        return maxDepth;
    }

    // 전체 신뢰도 계산
    calculateOverallConfidence(reviewResults) {
        const total = reviewResults.summary.total;
        if (total === 0) return 1.0;

        let totalConfidence = 0;
        
        [...reviewResults.approved, ...reviewResults.needsReview, ...reviewResults.rejected]
            .forEach(item => {
                totalConfidence += item.decision.confidence;
            });

        return totalConfidence / total;
    }

    // 검토 요약 생성
    generateReviewSummary(reviewResults) {
        const summary = {
            recommendation: this.getOverallRecommendation(reviewResults),
            statistics: {
                total: reviewResults.summary.total,
                approved: reviewResults.summary.approvedCount,
                needsReview: reviewResults.summary.needsReviewCount,
                rejected: reviewResults.summary.rejectedCount,
                confidence: reviewResults.summary.confidence
            },
            riskAnalysis: this.analyzeOverallRisk(reviewResults),
            nextSteps: this.recommendNextSteps(reviewResults)
        };

        return summary;
    }

    // 전체 권장사항
    getOverallRecommendation(reviewResults) {
        const { approved, needsReview, rejected } = reviewResults.summary;
        const total = reviewResults.summary.total;

        if (total === 0) {
            return 'processed';
        }

        const approvedRatio = approved / total;
        const rejectedRatio = rejected / total;

        if (rejectedRatio > 0.3) {
            return 'high_risk'; // 고위험 - 변환 중단 권장
        } else if (approvedRatio > 0.8) {
            return 'safe_to_proceed'; // 안전 - 변환 진행 가능
        } else {
            return 'needs_careful_review'; // 신중한 검토 필요
        }
    }

    // 전체 위험도 분석
    analyzeOverallRisk(reviewResults) {
        const rejectedCount = reviewResults.summary.rejectedCount;
        const needsReviewCount = reviewResults.summary.needsReviewCount;
        const total = reviewResults.summary.total;

        let riskLevel = 'low';
        let riskFactors = [];

        if (rejectedCount / total > 0.3) {
            riskLevel = 'high';
            riskFactors.push(`거부된 변환 ${rejectedCount}개 (${Math.round(rejectedCount/total*100)}%)`);
        } else if (rejectedCount / total > 0.1) {
            riskLevel = 'medium';
            riskFactors.push(`거부된 변환 ${rejectedCount}개`);
        }

        if (needsReviewCount / total > 0.5) {
            riskLevel = riskLevel === 'low' ? 'medium' : 'high';
            riskFactors.push(`검토 필요 변환 ${needsReviewCount}개 (${Math.round(needsReviewCount/total*100)}%)`);
        }

        return {
            level: riskLevel,
            factors: riskFactors,
            confidence: reviewResults.summary.confidence
        };
    }

    // 다음 단계 권장
    recommendNextSteps(reviewResults) {
        const recommendation = this.getOverallRecommendation(reviewResults);
        const steps = [];

        switch (recommendation) {
            case 'safe_to_proceed':
                steps.push('승인된 변환들을 자동으로 적용할 수 있습니다');
                if (reviewResults.summary.needsReviewCount > 0) {
                    steps.push('검토가 필요한 항목들을 수동으로 확인하세요');
                }
                break;

            case 'needs_careful_review':
                steps.push('검토가 필요한 모든 항목을 수동으로 확인하세요');
                steps.push('승인된 변환만 적용하는 것을 고려하세요');
                steps.push('복잡한 변환은 수동으로 처리하는 것이 안전합니다');
                break;

            case 'high_risk':
                steps.push('자동 변환을 중단하고 수동 변환을 권장합니다');
                steps.push('코드 구조를 단순화한 후 다시 시도하세요');
                steps.push('전체 파일을 더 작은 단위로 분할하는 것을 고려하세요');
                break;

            default:
                steps.push('변환이 완료되었습니다');
        }

        return steps;
    }
}

module.exports = ClaudeReviewer;