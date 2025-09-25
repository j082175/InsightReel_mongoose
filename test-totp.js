const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * TOTP 설정 테스트 도구
 * Instagram 2FA TOTP 설정이 올바른지 확인
 */

async function testTOTP() {
    console.log('🔐 Instagram TOTP 설정 테스트');
    console.log('=' * 40);

    // 설정 파일 확인
    const configPath = path.join(__dirname, 'data/instagram_totp_config.json');

    if (!fs.existsSync(configPath)) {
        console.log('❌ TOTP 설정 파일이 없습니다.');
        console.log('📍 파일 위치: data/instagram_totp_config.json');
        console.log('💡 설정 방법은 data/README.md를 참조하세요.');
        return false;
    }

    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const secret = config.totp_secret?.trim();

        if (!secret || secret === '') {
            console.log('❌ TOTP Secret이 설정되지 않았습니다.');
            console.log('💡 Instagram 2FA 설정에서 SECRET KEY를 복사하세요.');
            return false;
        }

        console.log('✅ TOTP 설정 파일 발견');
        console.log(`📝 Secret 길이: ${secret.length} 문자`);

        // Python으로 TOTP 코드 생성 테스트
        console.log('\n🧪 TOTP 코드 생성 테스트...');

        // Python 파일로 생성해서 실행
        const tempPythonFile = path.join(__dirname, 'temp_totp_test.py');
        const pythonCode = `import pyotp
import time
import sys

try:
    secret = "${secret}"
    totp = pyotp.TOTP(secret)
    code = totp.now()
    remaining = 30 - (int(time.time()) % 30)
    print(f"Generated Code: {code}")
    print(f"Valid for: {remaining} seconds")
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)`;

        fs.writeFileSync(tempPythonFile, pythonCode);

        return new Promise((resolve) => {
            const pythonProcess = spawn('python', [tempPythonFile], {
                stdio: 'pipe'
            });

            let output = '';
            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.on('close', (code) => {
                // 임시 파일 정리
                try {
                    fs.unlinkSync(tempPythonFile);
                } catch {}

                if (code === 0 && output.includes('SUCCESS')) {
                    console.log('✅ TOTP 코드 생성 성공!');
                    const lines = output.split('\n');
                    lines.forEach(line => {
                        if (line.trim() && !line.includes('SUCCESS')) {
                            console.log(`📱 ${line.trim()}`);
                        }
                    });
                    console.log('\n🎉 TOTP 설정이 올바릅니다!');
                    console.log('💡 이제 완전 자동 2FA가 작동할 것입니다.');
                    resolve(true);
                } else {
                    console.log('❌ TOTP 코드 생성 실패');
                    console.log('💥 에러:', output);
                    console.log('💡 pyotp가 설치되지 않았을 수 있습니다: pip install pyotp');
                    resolve(false);
                }
            });

            pythonProcess.on('error', (error) => {
                console.log('❌ Python 실행 실패:', error.message);
                console.log('💡 Python이 설치되어 있는지 확인하세요.');
                resolve(false);
            });
        });

    } catch (error) {
        console.log('❌ 설정 파일 읽기 실패:', error.message);
        return false;
    }
}

// 직접 실행 시
if (require.main === module) {
    testTOTP()
        .then((success) => {
            console.log('\n' + '='.repeat(50));
            if (success) {
                console.log('🚀 준비 완료! node extract-instagram-cookies.js 실행하세요.');
            } else {
                console.log('🔧 설정을 완료한 후 다시 테스트하세요.');
            }
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('테스트 실행 오류:', error);
            process.exit(1);
        });
}

module.exports = { testTOTP };