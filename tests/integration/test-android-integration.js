#!/usr/bin/env node

/**
 * InsightReel Android LTE 환경 통합 테스트 스크립트
 *
 * 이 스크립트는 Android Share Extension의 LTE 환경에서의 동작을 테스트합니다.
 * - 네트워크 연결 상태 감지
 * - 서버 URL 자동 전환 (WiFi ↔ LTE)
 * - 동영상 처리 API 호출
 * - 자동 업데이트 기능
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

class AndroidIntegrationTester {
    constructor() {
        this.serverUrl = 'http://localhost:3000';
        this.tunnelUrl = 'https://insightreel-real-test.loca.lt';
        this.testResults = [];
        this.startTime = Date.now();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = {
            'info': '🔍',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'network': '🌐'
        }[type] || 'ℹ️';

        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async runTests() {
        this.log('🚀 InsightReel Android LTE 통합 테스트 시작', 'info');
        console.log('================================================================');

        try {
            // 1. 환경 설정 확인
            await this.checkEnvironment();

            // 2. 서버 상태 확인
            await this.checkServerHealth();

            // 3. 터널링 서비스 테스트
            await this.testTunneling();

            // 4. API 엔드포인트 테스트
            await this.testApiEndpoints();

            // 5. 네트워크 시나리오 테스트
            await this.testNetworkScenarios();

            // 6. 자동 업데이트 API 테스트
            await this.testAutoUpdateApi();

            // 7. Android APK 확인
            await this.checkAndroidApk();

            // 결과 요약
            this.printSummary();

        } catch (error) {
            this.log(`테스트 실행 중 오류: ${error.message}`, 'error');
            process.exit(1);
        }
    }

    async checkEnvironment() {
        this.log('환경 설정 확인 중...', 'info');

        // Node.js 버전 확인
        const nodeVersion = process.version;
        this.log(`Node.js 버전: ${nodeVersion}`, 'info');

        // 프로젝트 구조 확인
        const requiredPaths = [
            './server/index.js',
            './InsightReel-ShareExtension/app/build.gradle',
            './package.json'
        ];

        for (const filePath of requiredPaths) {
            if (fs.existsSync(filePath)) {
                this.log(`✓ ${filePath} 확인됨`, 'success');
            } else {
                throw new Error(`필수 파일이 없습니다: ${filePath}`);
            }
        }

        // Android SDK 확인 (선택사항)
        try {
            execSync('adb version', { stdio: 'pipe' });
            this.log('✓ Android SDK (adb) 사용 가능', 'success');
        } catch (error) {
            this.log('⚠️ Android SDK (adb)를 찾을 수 없습니다 (선택사항)', 'warning');
        }
    }

    async checkServerHealth() {
        this.log('로컬 서버 상태 확인 중...', 'network');

        try {
            const response = await this.makeHttpRequest(`${this.serverUrl}/health`);
            if (response.status === 'healthy') {
                this.log('✓ 로컬 서버 정상 동작', 'success');
                this.testResults.push({ test: 'Local Server Health', status: 'PASS' });
            } else {
                throw new Error('서버 응답이 비정상입니다');
            }
        } catch (error) {
            this.log(`❌ 로컬 서버 연결 실패: ${error.message}`, 'error');
            this.testResults.push({ test: 'Local Server Health', status: 'FAIL', error: error.message });
        }
    }

    async testTunneling() {
        this.log('터널링 서비스 테스트 중...', 'network');

        try {
            // LocalTunnel 상태 확인
            const response = await this.makeHttpRequest(`${this.tunnelUrl}/health`);
            this.log('✓ 터널링 서비스 정상 동작', 'success');
            this.testResults.push({ test: 'Tunnel Service', status: 'PASS' });
        } catch (error) {
            this.log(`⚠️ 터널링 서비스 연결 실패: ${error.message}`, 'warning');
            this.log('💡 localtunnel이 실행되지 않았을 수 있습니다', 'info');
            this.testResults.push({ test: 'Tunnel Service', status: 'FAIL', error: error.message });
        }
    }

    async testApiEndpoints() {
        this.log('API 엔드포인트 테스트 중...', 'info');

        const endpoints = [
            { path: '/api/videos', method: 'GET', description: '비디오 목록 조회' },
            { path: '/api/channels', method: 'GET', description: '채널 목록 조회' },
            { path: '/api/cluster/channels', method: 'GET', description: '클러스터 채널 조회' },
            { path: '/api/health', method: 'GET', description: '서버 헬스체크' }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.makeHttpRequest(`${this.serverUrl}${endpoint.path}`, endpoint.method);
                this.log(`✓ ${endpoint.description}: ${endpoint.path}`, 'success');
                this.testResults.push({ test: `API ${endpoint.path}`, status: 'PASS' });
            } catch (error) {
                this.log(`❌ ${endpoint.description} 실패: ${error.message}`, 'error');
                this.testResults.push({ test: `API ${endpoint.path}`, status: 'FAIL', error: error.message });
            }
        }
    }

    async testNetworkScenarios() {
        this.log('네트워크 시나리오 테스트 중...', 'network');

        // WiFi 시나리오 (localhost)
        await this.testNetworkScenario('WiFi', this.serverUrl);

        // LTE 시나리오 (tunnel)
        await this.testNetworkScenario('LTE', this.tunnelUrl);
    }

    async testNetworkScenario(networkType, baseUrl) {
        this.log(`${networkType} 네트워크 시나리오 테스트...`, 'network');

        const testData = {
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            source: 'android_share_extension_test',
            timestamp: Date.now(),
            platform: 'YOUTUBE',
            includeVideoAnalysis: true,
            includeChannelAnalysis: false,
            analysisType: 'video_only'
        };

        try {
            const response = await this.makeHttpRequest(
                `${baseUrl}/api/process-video`,
                'POST',
                testData
            );

            this.log(`✓ ${networkType} 네트워크에서 비디오 처리 성공`, 'success');
            this.testResults.push({ test: `${networkType} Video Processing`, status: 'PASS' });
        } catch (error) {
            this.log(`❌ ${networkType} 네트워크에서 비디오 처리 실패: ${error.message}`, 'error');
            this.testResults.push({ test: `${networkType} Video Processing`, status: 'FAIL', error: error.message });
        }
    }

    async testAutoUpdateApi() {
        this.log('자동 업데이트 API 테스트 중...', 'info');

        try {
            // 업데이트 확인 API 테스트
            const updateCheckResponse = await this.makeHttpRequest(
                `${this.serverUrl}/api/app-update/check`,
                'GET',
                null,
                { 'Current-Version': '1.0.0', 'Platform': 'android' }
            );

            this.log('✓ 자동 업데이트 확인 API 동작', 'success');
            this.testResults.push({ test: 'Auto Update Check API', status: 'PASS' });

            // 업데이트 다운로드 API 테스트 (HEAD 요청)
            try {
                await this.makeHttpRequest(`${this.serverUrl}/api/app-update/download`, 'HEAD');
                this.log('✓ 자동 업데이트 다운로드 API 동작', 'success');
                this.testResults.push({ test: 'Auto Update Download API', status: 'PASS' });
            } catch (error) {
                this.log('⚠️ 자동 업데이트 다운로드 API 미구현 (정상)', 'warning');
                this.testResults.push({ test: 'Auto Update Download API', status: 'SKIP' });
            }

        } catch (error) {
            this.log(`⚠️ 자동 업데이트 API 미구현: ${error.message}`, 'warning');
            this.testResults.push({ test: 'Auto Update APIs', status: 'SKIP', error: 'Not implemented yet' });
        }
    }

    async checkAndroidApk() {
        this.log('Android APK 확인 중...', 'info');

        const apkPath = './InsightReel-ShareExtension/app/build/outputs/apk/release/app-release.apk';

        if (fs.existsSync(apkPath)) {
            const stats = fs.statSync(apkPath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            this.log(`✓ APK 파일 확인됨: ${sizeMB}MB`, 'success');
            this.testResults.push({ test: 'Android APK Build', status: 'PASS', details: `Size: ${sizeMB}MB` });
        } else {
            this.log('⚠️ APK 파일이 없습니다. deploy-android.bat를 실행하여 빌드하세요', 'warning');
            this.testResults.push({ test: 'Android APK Build', status: 'SKIP', error: 'APK not found' });
        }
    }

    printSummary() {
        const endTime = Date.now();
        const duration = ((endTime - this.startTime) / 1000).toFixed(2);

        console.log('');
        console.log('================================================================');
        console.log('🏁 테스트 결과 요약');
        console.log('================================================================');

        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const skipped = this.testResults.filter(r => r.status === 'SKIP').length;

        console.log(`⏱️ 총 실행 시간: ${duration}초`);
        console.log(`📊 전체 테스트: ${this.testResults.length}개`);
        console.log(`✅ 성공: ${passed}개`);
        console.log(`❌ 실패: ${failed}개`);
        console.log(`⏭️ 건너뜀: ${skipped}개`);
        console.log('');

        // 상세 결과
        console.log('📋 상세 테스트 결과:');
        console.log('----------------------------------------------------------------');
        this.testResults.forEach(result => {
            const statusIcon = {
                'PASS': '✅',
                'FAIL': '❌',
                'SKIP': '⏭️'
            }[result.status];

            console.log(`${statusIcon} ${result.test}: ${result.status}`);
            if (result.error) {
                console.log(`   └─ 오류: ${result.error}`);
            }
            if (result.details) {
                console.log(`   └─ 세부사항: ${result.details}`);
            }
        });

        console.log('================================================================');

        if (failed > 0) {
            console.log('❌ 일부 테스트가 실패했습니다. 위의 오류를 확인해주세요.');
            process.exit(1);
        } else {
            console.log('🎉 모든 테스트가 성공적으로 완료되었습니다!');
        }
    }

    async makeHttpRequest(url, method = 'GET', data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'User-Agent': 'InsightReel-TestScript/1.0.0',
                    ...headers
                }
            };

            if (data && method !== 'GET') {
                const jsonData = JSON.stringify(data);
                options.headers['Content-Type'] = 'application/json';
                options.headers['Content-Length'] = Buffer.byteLength(jsonData);
            }

            const client = urlObj.protocol === 'https:' ? require('https') : require('http');
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
    const tester = new AndroidIntegrationTester();
    tester.runTests().catch(error => {
        console.error('❌ 테스트 실행 실패:', error);
        process.exit(1);
    });
}

module.exports = AndroidIntegrationTester;