#!/usr/bin/env node
/**
 * 서버 API 버전 자동 업데이트 스크립트
 * app-update-fixed.js의 버전 정보를 자동으로 업데이트합니다.
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 서버 API 버전 자동 업데이트 시작...');

// 파일 경로
const VERSION_INFO_PATH = path.join(__dirname, 'version-info.json');
const APP_UPDATE_ROUTER_PATH = path.join(__dirname, '../server/routes/app-update-fixed.js');

/**
 * 메인 실행 함수
 */
function main() {
    try {
        // 버전 정보 읽기
        if (!fs.existsSync(VERSION_INFO_PATH)) {
            throw new Error('❌ version-info.json 파일이 없습니다. increment-version.js를 먼저 실행하세요.');
        }

        const versionInfo = JSON.parse(fs.readFileSync(VERSION_INFO_PATH, 'utf8'));
        const newVersion = versionInfo.version;

        console.log(`📝 서버 API 버전을 ${newVersion}으로 업데이트 중...`);

        // app-update-fixed.js 파일 읽기
        const content = fs.readFileSync(APP_UPDATE_ROUTER_PATH, 'utf8');

        // 버전 정보 업데이트
        const updatedContent = content.replace(
            /currentVersion: '[^']+'/,
            `currentVersion: '${newVersion}'`
        ).replace(
            /latestApkPath: path\.join\(__dirname, '[^']+'\)/,
            `latestApkPath: path.join(__dirname, '../uploads/apk/InsightReel_${newVersion}.apk')`
        ).replace(
            /releaseNotes: '[^']+'/,
            `releaseNotes: '🚀 새로운 업데이트가 출시되었습니다!\\n- 버전 ${newVersion} 자동 배포\\n- 시스템 안정성 개선\\n- 성능 최적화'`
        );

        // 파일 저장
        fs.writeFileSync(APP_UPDATE_ROUTER_PATH, updatedContent, 'utf8');

        console.log('✅ 서버 API 버전 업데이트 완료');
        console.log(`   currentVersion: ${newVersion}`);
        console.log(`   latestApkPath: ../uploads/apk/InsightReel_${newVersion}.apk`);

    } catch (error) {
        console.error('❌ 서버 API 업데이트 실패:', error.message);
        process.exit(1);
    }
}

main();