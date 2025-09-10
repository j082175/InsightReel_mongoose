const fs = require('fs');
const path = require('path');

class ReportGenerator {
    constructor() {
        // 리포트 템플릿
        this.templates = {
            console: this.generateConsoleReport.bind(this),
            html: this.generateHtmlReport.bind(this),
            json: this.generateJsonReport.bind(this),
            markdown: this.generateMarkdownReport.bind(this)
        };

        // 색상 코드 (콘솔 출력용)
        this.colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            dim: '\x1b[2m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m'
        };
    }

    // 메인 리포트 생성 함수
    generateReport(analysisResults, options = {}) {
        const {
            format = 'console',
            outputPath = null,
            includeDetails = true,
            includeStats = true,
            includeRecommendations = true
        } = options;

        const reportData = this.prepareReportData(analysisResults, {
            includeDetails,
            includeStats, 
            includeRecommendations
        });

        const generator = this.templates[format];
        if (!generator) {
            throw new Error(`지원하지 않는 리포트 형식: ${format}`);
        }

        const report = generator(reportData, options);

        if (outputPath) {
            this.saveReport(report, outputPath, format);
        }

        return report;
    }

    // 리포트 데이터 준비
    prepareReportData(analysisResults, options) {
        const {
            violations,
            reviewResults,
            contextAnalysis,
            safetyResults,
            performanceStats
        } = analysisResults;

        return {
            summary: this.generateSummary(violations, reviewResults, contextAnalysis),
            violations: options.includeDetails ? violations : null,
            reviewResults: options.includeDetails ? reviewResults : null,
            contextAnalysis: options.includeStats ? contextAnalysis : null,
            safetyResults: options.includeStats ? safetyResults : null,
            performanceStats: options.includeStats ? performanceStats : null,
            recommendations: options.includeRecommendations ? 
                this.generateRecommendations(reviewResults, contextAnalysis) : null,
            timestamp: new Date(),
            metadata: {
                toolVersion: '1.0.0',
                analysisMode: '3-stage-automated',
                totalProcessingTime: performanceStats?.totalTime || 0
            }
        };
    }

    // 요약 정보 생성
    generateSummary(violations, reviewResults, contextAnalysis) {
        const total = violations?.total || 0;
        const approved = reviewResults?.summary?.approvedCount || 0;
        const needsReview = reviewResults?.summary?.needsReviewCount || 0;
        const rejected = reviewResults?.summary?.rejectedCount || 0;

        return {
            totalViolations: total,
            autoConvertible: violations?.autoConvertibleCount || 0,
            requiresReview: violations?.ambiguousCount || 0,
            approved: approved,
            needsReview: needsReview,
            rejected: rejected,
            safetyScore: contextAnalysis?.safetyScore || 0,
            confidence: reviewResults?.summary?.confidence || 0,
            timeSaved: this.calculateTimeSaved(total, approved),
            riskLevel: this.assessOverallRisk(rejected, total)
        };
    }

    // 권장사항 생성
    generateRecommendations(reviewResults, contextAnalysis) {
        const recommendations = [];

        // 컨텍스트 분석 기반 권장사항
        if (contextAnalysis?.recommendations) {
            recommendations.push(...contextAnalysis.recommendations);
        }

        // 검토 결과 기반 권장사항
        if (reviewResults?.summary) {
            const { approvedCount, needsReviewCount, rejectedCount } = reviewResults.summary;

            if (rejectedCount > approvedCount * 0.3) {
                recommendations.push({
                    type: 'high_rejection_rate',
                    priority: 'high',
                    message: '거부된 변환이 너무 많습니다. 파일 구조를 단순화하거나 수동 변환을 고려하세요.',
                    action: 'manual_conversion_recommended'
                });
            }

            if (needsReviewCount > approvedCount) {
                recommendations.push({
                    type: 'many_manual_reviews',
                    priority: 'medium',
                    message: '수동 검토가 필요한 항목이 많습니다. 시간을 충분히 확보하여 신중히 검토하세요.',
                    action: 'allocate_review_time'
                });
            }

            if (approvedCount > 0) {
                recommendations.push({
                    type: 'auto_conversion_available',
                    priority: 'low',
                    message: `${approvedCount}개의 변환을 자동으로 적용할 수 있습니다.`,
                    action: 'apply_approved_conversions'
                });
            }
        }

        return recommendations;
    }

    // 콘솔 리포트 생성
    generateConsoleReport(reportData, options) {
        const lines = [];
        const c = this.colors;

        // 헤더
        lines.push(`${c.bright}${c.cyan}╔═══════════════════════════════════════════════════════════════╗${c.reset}`);
        lines.push(`${c.bright}${c.cyan}║              FieldMapper 자동 변환 도구 리포트                ║${c.reset}`);
        lines.push(`${c.bright}${c.cyan}╚═══════════════════════════════════════════════════════════════╝${c.reset}`);
        lines.push('');

        // 요약 정보
        const summary = reportData.summary;
        lines.push(`${c.bright}📊 변환 요약${c.reset}`);
        lines.push(`   총 위반사항: ${c.yellow}${summary.totalViolations}개${c.reset}`);
        lines.push(`   자동 변환 가능: ${c.green}${summary.autoConvertible}개${c.reset}`);
        lines.push(`   검토 필요: ${c.yellow}${summary.requiresReview}개${c.reset}`);
        lines.push('');

        // 검토 결과
        if (reportData.reviewResults) {
            lines.push(`${c.bright}🔍 Claude 검토 결과${c.reset}`);
            lines.push(`   승인됨: ${c.green}${summary.approved}개${c.reset}`);
            lines.push(`   수동 검토 필요: ${c.yellow}${summary.needsReview}개${c.reset}`);
            lines.push(`   거부됨: ${c.red}${summary.rejected}개${c.reset}`);
            lines.push(`   신뢰도: ${this.formatConfidence(summary.confidence)}`);
            lines.push('');
        }

        // 안전성 정보
        if (reportData.contextAnalysis) {
            lines.push(`${c.bright}🛡️  안전성 분석${c.reset}`);
            lines.push(`   안전성 점수: ${this.formatSafetyScore(summary.safetyScore)}`);
            lines.push(`   위험 수준: ${this.formatRiskLevel(summary.riskLevel)}`);
            lines.push('');
        }

        // 성능 정보
        if (reportData.performanceStats) {
            lines.push(`${c.bright}⚡ 성능 정보${c.reset}`);
            lines.push(`   예상 시간 절약: ${c.green}${summary.timeSaved}${c.reset}`);
            lines.push(`   처리 시간: ${reportData.performanceStats.totalTime || 0}ms`);
            lines.push('');
        }

        // 권장사항
        if (reportData.recommendations && reportData.recommendations.length > 0) {
            lines.push(`${c.bright}💡 권장사항${c.reset}`);
            reportData.recommendations.forEach(rec => {
                const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
                lines.push(`   ${icon} ${rec.message}`);
            });
            lines.push('');
        }

        // 다음 단계
        lines.push(`${c.bright}🚀 다음 단계${c.reset}`);
        if (summary.approved > 0) {
            lines.push(`   1. ${c.green}승인된 ${summary.approved}개 변환을 자동 적용${c.reset}`);
        }
        if (summary.needsReview > 0) {
            lines.push(`   2. ${c.yellow}${summary.needsReview}개 항목 수동 검토${c.reset}`);
        }
        if (summary.rejected > 0) {
            lines.push(`   3. ${c.red}거부된 ${summary.rejected}개 항목 수동 처리 고려${c.reset}`);
        }

        return lines.join('\n');
    }

    // HTML 리포트 생성
    generateHtmlReport(reportData, options) {
        const summary = reportData.summary;
        
        const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FieldMapper 변환 도구 리포트</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .metric-label { color: #7f8c8d; font-size: 0.9em; margin-top: 5px; }
        .status-approved { color: #27ae60; }
        .status-review { color: #f39c12; }
        .status-rejected { color: #e74c3c; }
        .progress-bar { background: #ecf0f1; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .recommendation-item { margin: 10px 0; padding: 10px; border-left: 4px solid #fdcb6e; background: rgba(253, 203, 110, 0.1); }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 FieldMapper 자동 변환 도구 리포트</h1>
        <p><strong>생성 시간:</strong> ${reportData.timestamp.toLocaleString()}</p>
        
        <h2>📊 변환 요약</h2>
        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-value">${summary.totalViolations}</div>
                <div class="metric-label">총 위반사항</div>
            </div>
            <div class="metric-card">
                <div class="metric-value status-approved">${summary.approved}</div>
                <div class="metric-label">승인됨</div>
            </div>
            <div class="metric-card">
                <div class="metric-value status-review">${summary.needsReview}</div>
                <div class="metric-label">검토 필요</div>
            </div>
            <div class="metric-card">
                <div class="metric-value status-rejected">${summary.rejected}</div>
                <div class="metric-label">거부됨</div>
            </div>
        </div>

        <h2>🛡️ 안전성 분석</h2>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${summary.safetyScore}%; background: ${this.getScoreColor(summary.safetyScore)};"></div>
        </div>
        <p>안전성 점수: <strong>${summary.safetyScore}/100</strong></p>

        ${reportData.recommendations ? `
        <h2>💡 권장사항</h2>
        <div class="recommendations">
            ${reportData.recommendations.map(rec => `
                <div class="recommendation-item">
                    <strong>${rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'} ${rec.type}:</strong><br>
                    ${rec.message}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <h2>🚀 다음 단계</h2>
        <ol>
            ${summary.approved > 0 ? `<li><span class="status-approved">승인된 ${summary.approved}개 변환을 자동 적용</span></li>` : ''}
            ${summary.needsReview > 0 ? `<li><span class="status-review">${summary.needsReview}개 항목 수동 검토</span></li>` : ''}
            ${summary.rejected > 0 ? `<li><span class="status-rejected">거부된 ${summary.rejected}개 항목 수동 처리 고려</span></li>` : ''}
        </ol>

        <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; text-align: center;">
            <p>FieldMapper 자동 변환 도구 v${reportData.metadata.toolVersion} | 처리 시간: ${reportData.metadata.totalProcessingTime}ms</p>
        </footer>
    </div>
</body>
</html>`;

        return html;
    }

    // JSON 리포트 생성
    generateJsonReport(reportData, options) {
        return JSON.stringify(reportData, null, 2);
    }

    // Markdown 리포트 생성
    generateMarkdownReport(reportData, options) {
        const summary = reportData.summary;
        const lines = [];

        lines.push('# 🔧 FieldMapper 자동 변환 도구 리포트\n');
        lines.push(`**생성 시간:** ${reportData.timestamp.toLocaleString()}\n`);

        lines.push('## 📊 변환 요약\n');
        lines.push('| 항목 | 개수 |');
        lines.push('|------|------|');
        lines.push(`| 총 위반사항 | ${summary.totalViolations} |`);
        lines.push(`| 자동 변환 가능 | ${summary.autoConvertible} |`);
        lines.push(`| 검토 필요 | ${summary.requiresReview} |`);
        lines.push(`| 승인됨 | ✅ ${summary.approved} |`);
        lines.push(`| 수동 검토 필요 | ⚠️ ${summary.needsReview} |`);
        lines.push(`| 거부됨 | ❌ ${summary.rejected} |\n`);

        lines.push('## 🛡️ 안전성 분석\n');
        lines.push(`- **안전성 점수:** ${summary.safetyScore}/100`);
        lines.push(`- **위험 수준:** ${summary.riskLevel}`);
        lines.push(`- **신뢰도:** ${Math.round(summary.confidence * 100)}%\n`);

        if (reportData.recommendations) {
            lines.push('## 💡 권장사항\n');
            reportData.recommendations.forEach(rec => {
                const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
                lines.push(`${icon} **${rec.type}:** ${rec.message}\n`);
            });
        }

        lines.push('## 🚀 다음 단계\n');
        if (summary.approved > 0) {
            lines.push(`1. ✅ 승인된 ${summary.approved}개 변환을 자동 적용`);
        }
        if (summary.needsReview > 0) {
            lines.push(`2. ⚠️ ${summary.needsReview}개 항목 수동 검토`);
        }
        if (summary.rejected > 0) {
            lines.push(`3. ❌ 거부된 ${summary.rejected}개 항목 수동 처리 고려`);
        }

        return lines.join('\n');
    }

    // 리포트 저장
    saveReport(report, outputPath, format) {
        try {
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(outputPath, report, 'utf8');
            console.log(`리포트 저장됨: ${outputPath}`);
        } catch (error) {
            console.error(`리포트 저장 실패: ${error.message}`);
        }
    }

    // 유틸리티 메서드들
    calculateTimeSaved(total, approved) {
        const manualTimePerViolation = 0.5; // 30초
        const toolTimePerViolation = 0.01; // 1초
        const timeSaved = approved * (manualTimePerViolation - toolTimePerViolation);
        
        if (timeSaved < 1) {
            return `${Math.round(timeSaved * 60)}초`;
        } else if (timeSaved < 60) {
            return `${Math.round(timeSaved)}분`;
        } else {
            return `${Math.round(timeSaved / 60)}시간`;
        }
    }

    assessOverallRisk(rejected, total) {
        if (total === 0) return 'none';
        const rejectionRate = rejected / total;
        
        if (rejectionRate > 0.3) return 'high';
        if (rejectionRate > 0.1) return 'medium';
        return 'low';
    }

    formatConfidence(confidence) {
        const percentage = Math.round(confidence * 100);
        const color = percentage >= 80 ? this.colors.green : 
                     percentage >= 60 ? this.colors.yellow : this.colors.red;
        return `${color}${percentage}%${this.colors.reset}`;
    }

    formatSafetyScore(score) {
        const color = score >= 80 ? this.colors.green : 
                     score >= 60 ? this.colors.yellow : this.colors.red;
        return `${color}${score}/100${this.colors.reset}`;
    }

    formatRiskLevel(level) {
        const colors = {
            low: this.colors.green,
            medium: this.colors.yellow,
            high: this.colors.red,
            none: this.colors.green
        };
        return `${colors[level] || this.colors.white}${level}${this.colors.reset}`;
    }

    getScoreColor(score) {
        if (score >= 80) return '#27ae60';
        if (score >= 60) return '#f39c12';
        return '#e74c3c';
    }
}

module.exports = ReportGenerator;