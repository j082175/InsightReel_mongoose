#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function forceCleanup() {
    console.log('🧹 강제 프로세스 정리 시작...');
    
    try {
        // 1. 포트 3000, 8000 정리
        console.log('📍 포트 정리 중...');
        try {
            await execAsync('npx kill-port 3000');
            console.log('✅ 포트 3000 정리됨');
        } catch (e) {
            console.log('ℹ️ 포트 3000 이미 정리됨');
        }
        
        try {
            await execAsync('npx kill-port 8000');
            console.log('✅ 포트 8000 정리됨');
        } catch (e) {
            console.log('ℹ️ 포트 8000 이미 정리됨');
        }

        // 2. InsightReel 관련 Node.js 프로세스 찾기
        console.log('🔍 InsightReel 프로세스 검색 중...');
        
        const { stdout } = await execAsync('wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /format:csv');
        const lines = stdout.split('\n').filter(line => line.trim());
        
        const insightReelProcesses = [];
        for (const line of lines) {
            if (line.includes('InsightReel') || line.includes('server/index.js')) {
                const parts = line.split(',');
                if (parts.length >= 3) {
                    const pid = parts[2].trim();
                    if (pid && pid !== 'ProcessId') {
                        insightReelProcesses.push(pid);
                    }
                }
            }
        }

        // 3. 찾은 프로세스들 종료
        if (insightReelProcesses.length > 0) {
            console.log(`💀 ${insightReelProcesses.length}개 InsightReel 프로세스 발견:`, insightReelProcesses);
            
            for (const pid of insightReelProcesses) {
                try {
                    await execAsync(`taskkill /PID ${pid} /F`);
                    console.log(`✅ 프로세스 ${pid} 종료됨`);
                } catch (e) {
                    console.log(`⚠️ 프로세스 ${pid} 종료 실패: ${e.message}`);
                }
            }
        } else {
            console.log('ℹ️ InsightReel 프로세스 없음');
        }

        // 4. 최종 상태 확인
        console.log('🔍 최종 포트 상태 확인...');
        try {
            const { stdout: portCheck } = await execAsync('netstat -ano | findstr :3000');
            if (portCheck.trim()) {
                console.log('⚠️ 포트 3000 여전히 사용 중:');
                console.log(portCheck);
            } else {
                console.log('✅ 포트 3000 완전히 정리됨');
            }
        } catch (e) {
            console.log('✅ 포트 3000 완전히 정리됨');
        }

        console.log('🎉 강제 정리 완료!');
        
    } catch (error) {
        console.error('❌ 정리 중 오류:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    forceCleanup();
}

module.exports = forceCleanup;