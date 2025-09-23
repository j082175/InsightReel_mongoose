const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ResponseHandler, API_MESSAGES } = require('../config/api-messages');

const router = express.Router();

// APK 업로드를 위한 multer 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/apk');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const version = req.body.version || 'unknown';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        cb(null, `InsightReel_${version}_${timestamp}.apk`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.android.package-archive' ||
            file.originalname.endsWith('.apk')) {
            cb(null, true);
        } else {
            cb(new Error('APK 파일만 업로드 가능합니다.'), false);
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB 제한
    }
});

// 현재 앱 정보
const APP_INFO = {
    currentVersion: '1.0.0',
    minSupportedVersion: '1.0.0',
    latestApkPath: null,
    releaseNotes: '성능 개선 및 버그 수정'
};

/**
 * GET /api/app-update/check
 * 앱 업데이트 확인
 */
router.get('/check', (req, res) => {
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

        ResponseHandler.success(res, updateInfo, '업데이트 확인 완료');
    } catch (error) {
        console.error('❌ 업데이트 확인 실패:', error);
        ResponseHandler.error(res, '업데이트 확인 중 오류가 발생했습니다', 500);
    }
});

/**
 * GET /api/app-update/download
 * 최신 APK 파일 다운로드
 */
router.get('/download', (req, res) => {
    try {
        if (!APP_INFO.latestApkPath || !fs.existsSync(APP_INFO.latestApkPath)) {
            return ResponseHandler.error(res, 'APK 파일을 찾을 수 없습니다', 404);
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
                ResponseHandler.error(res, 'APK 파일 전송 중 오류가 발생했습니다', 500);
            }
        });

        fileStream.on('end', () => {
            console.log(`✅ APK 다운로드 완료: ${fileName}`);
        });

    } catch (error) {
        console.error('❌ APK 다운로드 실패:', error);
        ResponseHandler.error(res, 'APK 다운로드 중 오류가 발생했습니다', 500);
    }
});

/**
 * POST /api/app-update/upload
 * 새 APK 파일 업로드 (관리자용)
 */
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return ResponseHandler.error(res, 'APK 파일이 업로드되지 않았습니다', 400);
        }

        const version = req.body.version || APP_INFO.currentVersion;
        const releaseNotes = req.body.releaseNotes || APP_INFO.releaseNotes;

        // 앱 정보 업데이트
        APP_INFO.currentVersion = version;
        APP_INFO.latestApkPath = req.file.path;
        APP_INFO.releaseNotes = releaseNotes;

        console.log(`📱 새 APK 업로드 완료: ${req.file.filename}`);
        console.log(`🏷️ 버전: ${version}`);
        console.log(`📍 경로: ${req.file.path}`);

        const uploadInfo = {
            fileName: req.file.filename,
            version: version,
            fileSize: req.file.size,
            uploadTime: new Date().toISOString(),
            releaseNotes: releaseNotes
        };

        ResponseHandler.success(res, uploadInfo, 'APK 업로드 완료');
    } catch (error) {
        console.error('❌ APK 업로드 실패:', error);
        ResponseHandler.error(res, 'APK 업로드 중 오류가 발생했습니다', 500);
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

        ResponseHandler.success(res, appInfo, '앱 정보 조회 완료');
    } catch (error) {
        console.error('❌ 앱 정보 조회 실패:', error);
        ResponseHandler.error(res, '앱 정보 조회 중 오류가 발생했습니다', 500);
    }
});

/**
 * DELETE /api/app-update/clean
 * 오래된 APK 파일 정리 (관리자용)
 */
router.delete('/clean', (req, res) => {
    try {
        const uploadDir = path.join(__dirname, '../uploads/apk');

        if (!fs.existsSync(uploadDir)) {
            return ResponseHandler.success(res, { cleaned: 0 }, '정리할 파일이 없습니다');
        }

        const files = fs.readdirSync(uploadDir);
        const apkFiles = files.filter(file => file.endsWith('.apk'));

        // 현재 사용 중인 APK 제외하고 삭제
        let cleanedCount = 0;
        for (const file of apkFiles) {
            const filePath = path.join(uploadDir, file);
            if (filePath !== APP_INFO.latestApkPath) {
                fs.unlinkSync(filePath);
                cleanedCount++;
                console.log(`🗑️ 삭제됨: ${file}`);
            }
        }

        console.log(`🧹 APK 파일 정리 완료: ${cleanedCount}개 파일 삭제`);
        ResponseHandler.success(res, { cleaned: cleanedCount }, 'APK 파일 정리 완료');
    } catch (error) {
        console.error('❌ APK 파일 정리 실패:', error);
        ResponseHandler.error(res, 'APK 파일 정리 중 오류가 발생했습니다', 500);
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

module.exports = router;