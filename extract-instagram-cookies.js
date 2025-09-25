const { spawn } = require('child_process');
const path = require('path');

async function extractInstagramCookies() {
    console.log('🍪 Instagram 쿠키 추출기 실행...');

    const scriptPath = path.join(__dirname, 'scripts/instagram/extract_cookies.py');

    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [scriptPath], {
            stdio: 'inherit', // 출력을 터미널로 직접 전달
            cwd: __dirname
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log('\n✅ Instagram 쿠키 추출 완료!');
                console.log('📍 쿠키 파일 위치: data/instagram_cookies.txt');
                console.log('🚀 이제 yt-dlp와 Instaloader가 쿠키를 사용합니다.');
                resolve();
            } else {
                console.log('\n❌ 쿠키 추출 실패!');
                console.log('💡 Playwright가 설치되지 않았다면: pip install playwright');
                console.log('💡 브라우저가 설치되지 않았다면: playwright install');
                reject(new Error(`Python script exited with code ${code}`));
            }
        });

        pythonProcess.on('error', (error) => {
            console.error('❌ Python 실행 실패:', error.message);
            console.log('💡 Python이 설치되어 있는지 확인하세요.');
            reject(error);
        });
    });
}

// 직접 실행 시
if (require.main === module) {
    extractInstagramCookies()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { extractInstagramCookies };