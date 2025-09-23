#!/usr/bin/env node

/**
 * LTE 모드 영상 분석 테스트 스크립트
 * Android Share Extension의 LTE 환경에서 실제 영상 분석이 잘 동작하는지 테스트
 */

const http = require('http');
const https = require('https');

class LTEAnalysisTest {
    constructor() {
        this.lteUrl = 'https://lemon-brooms-shave.loca.lt';
        this.testResults = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = {
            'info': '🔍',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'lte': '📱'
        }[type] || 'ℹ️';

        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async runLTETests() {
        this.log('📱 LTE 모드 영상 분석 테스트 시작', 'lte');
        console.log('================================================================');

        try {
            // 1. LTE 터널 연결 확인
            await this.checkLTETunnel();

            // 2. Android 시나리오별 테스트
            await this.testAndroidScenarios();

            // 결과 요약
            this.printResults();

        } catch (error) {
            this.log(`테스트 실행 중 오류: ${error.message}`, 'error');
        }
    }

    async checkLTETunnel() {
        this.log('LTE 터널 연결 상태 확인 중...', 'lte');

        try {
            const response = await this.makeRequest(`${this.lteUrl}/health`);
            this.log('✓ LTE 터널 연결 성공', 'success');
            this.testResults.push({ test: 'LTE Tunnel Connection', status: 'PASS' });
        } catch (error) {
            this.log(`❌ LTE 터널 연결 실패: ${error.message}`, 'error');
            this.testResults.push({ test: 'LTE Tunnel Connection', status: 'FAIL', error: error.message });
            throw error;
        }
    }

    async testAndroidScenarios() {
        this.log('Android LTE 시나리오 테스트 중...', 'lte');

        const scenarios = [
            {
                name: '영상만 분석 (video_only)',
                data: {
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    source: 'android_lte_test',
                    platform: 'YOUTUBE',
                    includeVideoAnalysis: true,
                    includeChannelAnalysis: false,
                    analysisType: 'video_only',
                    networkType: 'LTE'
                }
            },
            {
                name: '채널만 분석 (channel_only)',
                data: {
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    source: 'android_lte_test',
                    platform: 'YOUTUBE',
                    includeVideoAnalysis: false,
                    includeChannelAnalysis: true,
                    analysisType: 'channel_only',
                    networkType: 'LTE'
                }
            },
            {
                name: '영상+채널 분석 (both)',
                data: {
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    source: 'android_lte_test',
                    platform: 'YOUTUBE',
                    includeVideoAnalysis: true,
                    includeChannelAnalysis: true,
                    analysisType: 'both',
                    networkType: 'LTE'
                }
            }
        ];

        for (const scenario of scenarios) {
            await this.testScenario(scenario);
        }
    }

    async testScenario(scenario) {
        this.log(`📱 테스트: ${scenario.name}`, 'lte');

        try {
            const response = await this.makeRequest(
                `${this.lteUrl}/api/process-video`,
                'POST',
                scenario.data
            );

            this.log(`✓ ${scenario.name} - 성공`, 'success');
            this.testResults.push({
                test: `LTE ${scenario.name}`,
                status: 'PASS',
                details: `Response: ${JSON.stringify(response).substring(0, 100)}...`
            });

        } catch (error) {
            this.log(`❌ ${scenario.name} - 실패: ${error.message}`, 'error');
            this.testResults.push({
                test: `LTE ${scenario.name}`,
                status: 'FAIL',
                error: error.message
            });
        }
    }

    printResults() {
        console.log('');
        console.log('================================================================');
        console.log('📱 LTE 모드 테스트 결과');
        console.log('================================================================');

        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;

        console.log(`📊 전체 테스트: ${this.testResults.length}개`);
        console.log(`✅ 성공: ${passed}개`);
        console.log(`❌ 실패: ${failed}개`);
        console.log('');

        this.testResults.forEach(result => {
            const statusIcon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${statusIcon} ${result.test}: ${result.status}`);

            if (result.error) {
                console.log(`   └─ 오류: ${result.error}`);
            }
            if (result.details) {
                console.log(`   └─ 세부사항: ${result.details}`);
            }
        });

        console.log('================================================================');

        if (failed === 0) {
            console.log('🎉 모든 LTE 테스트가 성공적으로 완료되었습니다!');
            console.log('📱 Android Share Extension이 LTE 환경에서 완벽하게 동작합니다!');
        } else {
            console.log('❌ 일부 LTE 테스트가 실패했습니다.');
        }
    }

    async makeRequest(url, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'User-Agent': 'Android-LTE-Test/1.0.0',
                    'Content-Type': 'application/json',
                }
            };

            if (data && method !== 'GET') {
                const jsonData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(jsonData);
            }

            const client = urlObj.protocol === 'https:' ? https : http;
            const req = client.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const jsonResponse = JSON.parse(responseData);
                        resolve(jsonResponse);
                    } catch (error) {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve({ status: 'ok', data: responseData });
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                        }
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (data && method !== 'GET') {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }
}

// 스크립트 실행
if (require.main === module) {
    const tester = new LTEAnalysisTest();
    tester.runLTETests().catch(error => {
        console.error('❌ LTE 테스트 실행 실패:', error);
        process.exit(1);
    });
}

module.exports = LTEAnalysisTest;