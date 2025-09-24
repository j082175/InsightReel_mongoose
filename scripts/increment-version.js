#!/usr/bin/env node
/**
 * 자동 버전 증가 스크립트
 * build.gradle과 AutoUpdateManager.kt의 버전을 자동으로 증가시킵니다.
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Android 앱 버전 자동 증가 시작...');

// 파일 경로
const BUILD_GRADLE_PATH = path.join(__dirname, '../InsightReel-ShareExtension/app/build.gradle');
const AUTO_UPDATE_MANAGER_PATH = path.join(__dirname, '../InsightReel-ShareExtension/app/src/main/java/com/insightreel/shareextension/AutoUpdateManager.kt');

/**
 * 버전을 증가시킵니다 (1.1.0 → 1.1.1)
 */
function incrementVersion(version) {
    const parts = version.split('.');
    const major = parseInt(parts[0]);
    const minor = parseInt(parts[1]);
    const patch = parseInt(parts[2]) + 1;
    return `${major}.${minor}.${patch}`;
}

/**
 * build.gradle 파일의 버전을 업데이트합니다
 */
function updateBuildGradle() {
    console.log('📝 build.gradle 버전 업데이트 중...');

    const content = fs.readFileSync(BUILD_GRADLE_PATH, 'utf8');

    // versionCode 증가
    const versionCodeMatch = content.match(/versionCode (\d+)/);
    if (versionCodeMatch) {
        const currentVersionCode = parseInt(versionCodeMatch[1]);
        const newVersionCode = currentVersionCode + 1;
        console.log(`   versionCode: ${currentVersionCode} → ${newVersionCode}`);

        const updatedContent = content.replace(
            /versionCode \d+/,
            `versionCode ${newVersionCode}`
        );

        // versionName 증가
        const versionNameMatch = updatedContent.match(/versionName "([^"]+)"/);
        if (versionNameMatch) {
            const currentVersionName = versionNameMatch[1];
            const newVersionName = incrementVersion(currentVersionName);
            console.log(`   versionName: ${currentVersionName} → ${newVersionName}`);

            const finalContent = updatedContent.replace(
                /versionName "[^"]+"/,
                `versionName "${newVersionName}"`
            );

            fs.writeFileSync(BUILD_GRADLE_PATH, finalContent, 'utf8');
            return newVersionName;
        }
    }

    throw new Error('❌ build.gradle에서 버전 정보를 찾을 수 없습니다');
}

/**
 * AutoUpdateManager.kt의 CURRENT_VERSION을 업데이트합니다
 */
function updateAutoUpdateManager(newVersion) {
    console.log('📝 AutoUpdateManager.kt 버전 업데이트 중...');

    const content = fs.readFileSync(AUTO_UPDATE_MANAGER_PATH, 'utf8');

    const updatedContent = content.replace(
        /private const val CURRENT_VERSION = "[^"]+"/,
        `private const val CURRENT_VERSION = "${newVersion}"`
    );

    fs.writeFileSync(AUTO_UPDATE_MANAGER_PATH, updatedContent, 'utf8');
    console.log(`   CURRENT_VERSION: ${newVersion}`);
}

/**
 * 메인 실행 함수
 */
function main() {
    try {
        const newVersion = updateBuildGradle();
        updateAutoUpdateManager(newVersion);

        console.log(`✅ 버전 증가 완료: ${newVersion}`);
        console.log('📦 다음 단계: APK 빌드 및 배포');

        // 다음 스크립트에서 사용할 수 있도록 버전 정보 저장
        const versionInfo = {
            version: newVersion,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(
            path.join(__dirname, 'version-info.json'),
            JSON.stringify(versionInfo, null, 2)
        );

    } catch (error) {
        console.error('❌ 버전 증가 실패:', error.message);
        process.exit(1);
    }
}

main();