const express = require('express');
const router = express.Router();
const multer = require('multer');
const MemoryMonitor = require('../utils/memory-monitor');
const { ServerLogger } = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

// 메모리 스토리지를 사용하는 multer 설정
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 1024 * 1024 // 1MB 제한
    },
    fileFilter: (req, file, cb) => {
        // .txt 파일만 허용
        if (file.originalname.endsWith('.txt')) {
            cb(null, true);
        } else {
            cb(new Error('Only .txt files are allowed'), false);
        }
    }
});

/**
 * 시스템 상태 관련 API 엔드포인트
 */

/**
 * @route GET /api/system/memory
 * @desc 메모리 사용량 확인
 */
router.get('/memory', (req, res) => {
    try {
        const memoryMonitor = MemoryMonitor.getInstance();
        const report = memoryMonitor.generateMemoryReport();

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        ServerLogger.error('메모리 리포트 생성 실패', error.message, 'SYSTEM-API');
        res.status(500).json({
            success: false,
            error: '메모리 리포트 생성 실패',
            message: error.message
        });
    }
});

/**
 * @route POST /api/system/gc
 * @desc 가비지 컬렉션 강제 실행
 */
router.post('/gc', (req, res) => {
    try {
        const memoryMonitor = MemoryMonitor.getInstance();
        const success = memoryMonitor.performGarbageCollection(true);

        if (success) {
            res.json({
                success: true,
                message: '가비지 컬렉션이 실행되었습니다'
            });
        } else {
            res.status(400).json({
                success: false,
                message: '가비지 컬렉션을 사용할 수 없습니다. Node.js를 --expose-gc 플래그로 시작하세요.'
            });
        }
    } catch (error) {
        ServerLogger.error('가비지 컬렉션 실행 실패', error.message, 'SYSTEM-API');
        res.status(500).json({
            success: false,
            error: '가비지 컬렉션 실행 실패',
            message: error.message
        });
    }
});

/**
 * @route GET /api/system/health
 * @desc 시스템 전체 상태 확인
 */
router.get('/health', (req, res) => {
    try {
        const memoryMonitor = MemoryMonitor.getInstance();
        const memoryReport = memoryMonitor.generateMemoryReport();

        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            memory: memoryReport.current,
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid
        };

        // 메모리 임계값 검사
        if (memoryReport.current.rss > 1000) { // 1GB 이상
            health.status = 'critical';
        } else if (memoryReport.current.rss > 500) { // 500MB 이상
            health.status = 'warning';
        }

        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        ServerLogger.error('시스템 상태 확인 실패', error.message, 'SYSTEM-API');
        res.status(500).json({
            success: false,
            error: '시스템 상태 확인 실패',
            message: error.message
        });
    }
});

/**
 * @route POST /api/system/cleanup
 * @desc 메모리 정리 강제 실행
 */
router.post('/cleanup', (req, res) => {
    try {
        const memoryMonitor = MemoryMonitor.getInstance();
        memoryMonitor.performEmergencyCleanup();

        res.json({
            success: true,
            message: '메모리 정리가 완료되었습니다'
        });
    } catch (error) {
        ServerLogger.error('메모리 정리 실패', error.message, 'SYSTEM-API');
        res.status(500).json({
            success: false,
            error: '메모리 정리 실패',
            message: error.message
        });
    }
});

/**
 * @route GET /api/system/cookie-status
 * @desc Instagram 쿠키 상태 확인
 */
router.get('/cookie-status', async (req, res) => {
    try {
        const cookiePath = path.join(__dirname, '../../data/instagram_cookies.txt');
        const stats = await fs.stat(cookiePath);
        const daysOld = Math.floor((Date.now() - stats.mtime) / (1000 * 60 * 60 * 24));
        const daysRemaining = 90 - daysOld;

        res.json({
            success: true,
            isExpiringSoon: daysRemaining < 15,
            daysRemaining: daysRemaining,
            daysOld: daysOld,
            lastUpdated: stats.mtime
        });
    } catch (error) {
        ServerLogger.error('쿠키 상태 확인 실패', error.message, 'SYSTEM-API');
        res.status(500).json({
            success: false,
            error: '쿠키 파일을 찾을 수 없습니다'
        });
    }
});

/**
 * @route POST /api/system/update-cookies
 * @desc Instagram 쿠키 업데이트 (Chrome 확장 프로그램에서 전송)
 */
router.post('/update-cookies', async (req, res) => {
    try {
        const { cookies, source } = req.body;

        if (!cookies) {
            return res.status(400).json({
                success: false,
                error: '쿠키 데이터가 없습니다'
            });
        }

        // Netscape 형식 헤더 추가
        const netscapeHeader = '# Netscape HTTP Cookie File\n# This file is generated by yt-dlp.  Do not edit.\n\n';
        const fullCookieContent = netscapeHeader + cookies;

        // 파일 저장
        const cookiePath = path.join(__dirname, '../../data/instagram_cookies.txt');
        await fs.writeFile(cookiePath, fullCookieContent, 'utf8');

        ServerLogger.info('Instagram 쿠키 업데이트', `소스: ${source || 'unknown'}`, 'SYSTEM-API');

        res.json({
            success: true,
            message: '쿠키가 성공적으로 업데이트되었습니다',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        ServerLogger.error('쿠키 업데이트 실패', error.message, 'SYSTEM-API');
        res.status(500).json({
            success: false,
            error: '쿠키 업데이트 중 오류가 발생했습니다'
        });
    }
});

/**
 * @route POST /api/system/upload-cookie-file
 * @desc Instagram 쿠키 파일 업로드 (드래그앤드롭)
 */
router.post('/upload-cookie-file', upload.single('cookieFile'), async (req, res) => {
    console.log('🍪 쿠키 업로드 요청 받음:', {
        hasFile: !!req.file,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        body: req.body
    });

    try {
        const { source } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: '쿠키 파일이 업로드되지 않았습니다'
            });
        }

        // 파일 내용을 문자열로 변환
        const fileContent = req.file.buffer.toString('utf8');
        console.log('📄 쿠키 파일 내용:', fileContent.substring(0, 200) + '...');

        // 쿠키 파일 내용 검증
        const validationResult = validateCookieFile(fileContent);
        console.log('✅ 쿠키 검증 결과:', validationResult);
        if (!validationResult.isValid) {
            return res.status(400).json({
                success: false,
                error: validationResult.error
            });
        }

        // Netscape 형식으로 변환 (필요시)
        let processedContent = fileContent;
        if (!fileContent.includes('# Netscape HTTP Cookie File')) {
            // JSON 형태의 쿠키를 Netscape 형식으로 변환
            if (fileContent.trim().startsWith('[') || fileContent.trim().startsWith('{')) {
                processedContent = convertJsonToNetscape(fileContent);
            } else {
                // 이미 Netscape 형식이거나 다른 텍스트 형식이면 헤더만 추가
                const netscapeHeader = '# Netscape HTTP Cookie File\n# This file is generated by InsightReel Cookie Upload.\n\n';
                processedContent = netscapeHeader + fileContent;
            }
        }

        // 파일 저장
        const cookiePath = path.join(__dirname, '../../data/instagram_cookies.txt');
        await fs.writeFile(cookiePath, processedContent, 'utf8');

        ServerLogger.info('Instagram 쿠키 파일 업로드', `파일명: ${req.file.originalname}, 소스: ${source || 'unknown'}`, 'SYSTEM-API');

        res.json({
            success: true,
            message: '쿠키 파일이 성공적으로 업로드되었습니다',
            filename: req.file.originalname,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        ServerLogger.error('쿠키 파일 업로드 실패', error.message, 'SYSTEM-API');

        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: '파일 크기가 너무 큽니다 (최대 1MB)'
            });
        }

        res.status(500).json({
            success: false,
            error: '쿠키 파일 업로드 중 오류가 발생했습니다'
        });
    }
});

/**
 * 쿠키 파일 내용 검증
 */
function validateCookieFile(content) {
    if (!content || content.trim().length === 0) {
        return { isValid: false, error: '쿠키 파일이 비어있습니다' };
    }

    // Instagram 관련 쿠키가 있는지 확인
    const hasInstagramCookies = content.toLowerCase().includes('instagram.com') ||
                               content.toLowerCase().includes('sessionid') ||
                               content.toLowerCase().includes('csrftoken');

    if (!hasInstagramCookies) {
        return { isValid: false, error: 'Instagram 쿠키를 찾을 수 없습니다' };
    }

    // 최소 쿠키 개수 확인 (너무 적으면 부분적인 데이터)
    const cookieCount = (content.match(/instagram\.com/gi) || []).length;
    if (cookieCount < 3) {
        return { isValid: false, error: 'Instagram 쿠키가 충분하지 않습니다 (최소 3개 이상 필요)' };
    }

    return { isValid: true };
}

/**
 * JSON 형태의 쿠키를 Netscape 형식으로 변환
 */
function convertJsonToNetscape(jsonContent) {
    try {
        const cookies = JSON.parse(jsonContent);

        if (!Array.isArray(cookies)) {
            throw new Error('JSON 배열 형태여야 합니다');
        }

        const netscapeHeader = '# Netscape HTTP Cookie File\n# This file is generated by InsightReel Cookie Upload.\n\n';

        const netscapeCookies = cookies
            .filter(cookie => cookie.domain && cookie.domain.includes('instagram.com'))
            .map(cookie => {
                const domain = cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`;
                const secure = cookie.secure ? 'TRUE' : 'FALSE';
                const httpOnly = cookie.httpOnly ? 'TRUE' : 'FALSE';
                const path = cookie.path || '/';
                const expiry = Math.floor(cookie.expirationDate || (Date.now() / 1000) + (90 * 24 * 60 * 60));

                return `${domain}\t${httpOnly}\t${path}\t${secure}\t${expiry}\t${cookie.name}\t${cookie.value}`;
            })
            .join('\n');

        return netscapeHeader + netscapeCookies;
    } catch (error) {
        throw new Error('JSON 쿠키 형식 변환 실패: ' + error.message);
    }
}

module.exports = router;