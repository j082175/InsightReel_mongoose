const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

console.log('🔧 app-update-fixed.js 모듈 로딩 중...');

const router = express.Router();

// 테스트 라우트
router.get('/test', (req, res) => {
    console.log('🧪 app-update test 라우트 호출됨!');
    res.json({ message: 'app-update router 작동 중!', timestamp: new Date().toISOString() });
});

console.log('🔧 테스트 라우트 등록됨: /test');

// 라우트 등록 확인
console.log('🔧 /check 라우트 등록 중...');

// 현재 앱 정보
const APP_INFO = {
    currentVersion: '1.1.11',
    minSupportedVersion: '1.0.0',
    latestApkPath: path.join(__dirname, '../uploads/apk/InsightReel_1.1.11.apk'),
    releaseNotes: '🚀 새로운 업데이트가 출시되었습니다!\n- 버전 1.1.11 자동 배포\n- 시스템 안정성 개선\n- 성능 최적화'
};

/**
 * GET /api/app-update/check
 * 앱 업데이트 확인
 */
router.get('/check', (req, res) => {
    console.log('🔍 /check 라우트 호출됨!');
    try {
        const currentVersion = req.headers['current-version'] || '0.0.0';
        const platform = req.headers['platform'] || 'unknown';

        console.log(`📱 업데이트 확인 요청: 현재 버전 ${currentVersion}, 플랫폼: ${platform}`);

        // 버전 비교 로직
        const hasUpdate = isNewerVersion(APP_INFO.currentVersion, currentVersion);

        const updateInfo = {
            hasUpdate: hasUpdate,
            latestVersion: APP_INFO.currentVersion,
            currentVersion: currentVersion,
            downloadUrl: hasUpdate ? '/api/app-update/download' : null,
            releaseNotes: APP_INFO.releaseNotes,
            isForced: false, // 강제 업데이트 여부
            fileSize: hasUpdate ? getApkFileSize() : 0,
            checkTime: new Date().toISOString()
        };

        if (hasUpdate) {
            console.log(`✨ 새 버전 업데이트 발견: ${currentVersion} → ${APP_INFO.currentVersion}`);
        } else {
            console.log(`✅ 최신 버전 사용 중: ${currentVersion}`);
        }

        res.json(updateInfo);
    } catch (error) {
        console.error('❌ 업데이트 확인 실패:', error);
        res.status(500).json({
            success: false,
            error: '업데이트 확인 중 오류가 발생했습니다'
        });
    }
});

console.log('✅ /check 라우트 등록 완료!');

/**
 * GET /api/app-update/download
 * 최신 APK 파일 다운로드
 */
router.get('/download', (req, res) => {
    try {
        console.log(`📥 APK 다운로드 요청: latestApkPath=${APP_INFO.latestApkPath}`);

        if (!APP_INFO.latestApkPath || !fs.existsSync(APP_INFO.latestApkPath)) {
            console.log('❌ APK 파일이 설정되지 않았거나 존재하지 않음');
            return res.status(404).json({
                success: false,
                error: 'APK 파일을 찾을 수 없습니다'
            });
        }

        const fileName = `InsightReel_${APP_INFO.currentVersion}.apk`;
        console.log(`📥 APK 다운로드 시작: ${fileName}`);

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');

        const fileStream = fs.createReadStream(APP_INFO.latestApkPath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('❌ APK 파일 전송 실패:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: 'APK 파일 전송 중 오류가 발생했습니다'
                });
            }
        });

        fileStream.on('end', () => {
            console.log(`✅ APK 다운로드 완료: ${fileName}`);
        });

    } catch (error) {
        console.error('❌ APK 다운로드 실패:', error);
        res.status(500).json({
            success: false,
            error: 'APK 다운로드 중 오류가 발생했습니다'
        });
    }
});

/**
 * GET /api/app-update/info
 * 현재 앱 정보 조회
 */
router.get('/info', (req, res) => {
    try {
        const appInfo = {
            currentVersion: APP_INFO.currentVersion,
            minSupportedVersion: APP_INFO.minSupportedVersion,
            releaseNotes: APP_INFO.releaseNotes,
            hasApkFile: APP_INFO.latestApkPath && fs.existsSync(APP_INFO.latestApkPath),
            apkFileSize: getApkFileSize(),
            lastUpdateTime: APP_INFO.latestApkPath ? fs.statSync(APP_INFO.latestApkPath).mtime : null
        };

        res.json({
            success: true,
            data: appInfo,
            message: '앱 정보 조회 완료'
        });
    } catch (error) {
        console.error('❌ 앱 정보 조회 실패:', error);
        res.status(500).json({
            success: false,
            error: '앱 정보 조회 중 오류가 발생했습니다'
        });
    }
});

// ==================== 유틸리티 함수들 ====================

/**
 * 버전 비교 함수
 * @param {string} newVersion - 새 버전
 * @param {string} currentVersion - 현재 버전
 * @returns {boolean} 새 버전이 더 높으면 true
 */
function isNewerVersion(newVersion, currentVersion) {
    const parseVersion = (version) => {
        return version.split('.').map(num => parseInt(num, 10));
    };

    const newVersionParts = parseVersion(newVersion);
    const currentVersionParts = parseVersion(currentVersion);

    for (let i = 0; i < Math.max(newVersionParts.length, currentVersionParts.length); i++) {
        const newPart = newVersionParts[i] || 0;
        const currentPart = currentVersionParts[i] || 0;

        if (newPart > currentPart) return true;
        if (newPart < currentPart) return false;
    }

    return false; // 같은 버전
}

/**
 * APK 파일 크기 반환
 * @returns {number} 파일 크기 (bytes)
 */
function getApkFileSize() {
    try {
        if (APP_INFO.latestApkPath && fs.existsSync(APP_INFO.latestApkPath)) {
            return fs.statSync(APP_INFO.latestApkPath).size;
        }
        return 0;
    } catch (error) {
        console.error('❌ APK 파일 크기 확인 실패:', error);
        return 0;
    }
}

console.log('✅ app-update-fixed 라우터 로드 완료');

module.exports = router;