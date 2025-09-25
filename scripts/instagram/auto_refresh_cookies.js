const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Instagram 쿠키 자동 갱신 스케줄러
 * 매일 실행해서 쿠키가 곧 만료되면 자동으로 갱신
 */

class InstagramCookieScheduler {
    constructor() {
        this.cookiesPath = path.join(__dirname, '../../data/instagram_cookies.txt');
        this.refreshScript = path.join(__dirname, 'extract_cookies.py');
    }

    // 쿠키 파일 존재 및 만료 확인
    checkCookieStatus() {
        try {
            if (!fs.existsSync(this.cookiesPath)) {
                return { exists: false, needsRefresh: true, reason: 'File not found' };
            }

            const content = fs.readFileSync(this.cookiesPath, 'utf-8');
            const lines = content.split('\n');

            let sessionCookie = null;
            let oldestExpiry = null;

            for (const line of lines) {
                if (line.startsWith('#') || !line.trim()) continue;

                const parts = line.trim().split('\t');
                if (parts.length >= 7) {
                    const name = parts[5];
                    const expires = parseInt(parts[4]);

                    // sessionid 쿠키 확인 (가장 중요)
                    if (name === 'sessionid') {
                        sessionCookie = { expires, value: parts[6] };
                    }

                    // 가장 빠른 만료 시간 추적
                    if (expires > 0) {
                        if (!oldestExpiry || expires < oldestExpiry) {
                            oldestExpiry = expires;
                        }
                    }
                }
            }

            if (!sessionCookie) {
                return { exists: true, needsRefresh: true, reason: 'No sessionid cookie found' };
            }

            const now = Math.floor(Date.now() / 1000);
            const daysUntilExpiry = (sessionCookie.expires - now) / (24 * 60 * 60);

            console.log(`Session cookie expires in ${Math.round(daysUntilExpiry)} days`);

            // 7일 이내 만료되면 갱신 필요
            if (daysUntilExpiry <= 7) {
                return {
                    exists: true,
                    needsRefresh: true,
                    reason: `Expires in ${Math.round(daysUntilExpiry)} days`
                };
            }

            return {
                exists: true,
                needsRefresh: false,
                daysLeft: Math.round(daysUntilExpiry)
            };

        } catch (error) {
            return { exists: false, needsRefresh: true, reason: `Error: ${error.message}` };
        }
    }

    // 쿠키 갱신 실행
    async refreshCookies() {
        console.log('🔄 Starting cookie refresh...');

        return new Promise((resolve, reject) => {
            const pythonProcess = spawn('python', [this.refreshScript], {
                stdio: 'inherit',
                cwd: path.dirname(this.refreshScript)
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Cookie refresh completed successfully!');
                    resolve();
                } else {
                    console.log('❌ Cookie refresh failed!');
                    reject(new Error(`Python script exited with code ${code}`));
                }
            });

            pythonProcess.on('error', (error) => {
                console.error('❌ Failed to start cookie refresh:', error.message);
                reject(error);
            });
        });
    }

    // 메인 스케줄러 실행
    async run() {
        console.log('🕐 Instagram Cookie Scheduler Running...');
        console.log('=' * 50);

        const status = this.checkCookieStatus();

        console.log('📊 Cookie Status:');
        console.log(`- File exists: ${status.exists}`);
        console.log(`- Needs refresh: ${status.needsRefresh}`);
        if (status.reason) console.log(`- Reason: ${status.reason}`);
        if (status.daysLeft) console.log(`- Days left: ${status.daysLeft}`);

        if (status.needsRefresh) {
            console.log('\n🔄 Cookie refresh required!');

            try {
                await this.refreshCookies();
                console.log('\n🎉 Cookie refresh completed successfully!');
                return true;
            } catch (error) {
                console.error('\n💥 Cookie refresh failed:', error.message);
                return false;
            }
        } else {
            console.log('\n✨ Cookies are still fresh! No refresh needed.');
            return true;
        }
    }
}

// 직접 실행 시
if (require.main === module) {
    const scheduler = new InstagramCookieScheduler();

    scheduler.run()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('Scheduler error:', error);
            process.exit(1);
        });
}

module.exports = { InstagramCookieScheduler };