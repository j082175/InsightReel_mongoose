const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SafetySystem {
    constructor(options = {}) {
        this.backupDir = options.backupDir || path.join(process.cwd(), '.field-mapper-backups');
        this.maxBackups = options.maxBackups || 10;
        this.compressionEnabled = options.compression || false;
        this.verboseMode = options.verbose || false;
        
        // 백업 디렉터리 생성
        this.ensureBackupDirectory();
        
        // 세션 ID 생성 (변환 작업별 고유 식별자)
        this.sessionId = this.generateSessionId();
        this.sessionBackups = new Map(); // 세션별 백업 관리
    }

    // 백업 디렉터리 확인/생성
    ensureBackupDirectory() {
        try {
            if (!fs.existsSync(this.backupDir)) {
                fs.mkdirSync(this.backupDir, { recursive: true });
                this.log('백업 디렉터리 생성됨:', this.backupDir);
            }
        } catch (error) {
            throw new Error(`백업 디렉터리 생성 실패: ${error.message}`);
        }
    }

    // 세션 ID 생성
    generateSessionId() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const randomStr = crypto.randomBytes(4).toString('hex');
        return `session-${timestamp}-${randomStr}`;
    }

    // 파일 백업 생성
    async createBackup(filePath, reason = '자동백업') {
        try {
            // 파일 존재 여부 확인
            if (!fs.existsSync(filePath)) {
                throw new Error(`백업할 파일이 존재하지 않습니다: ${filePath}`);
            }

            // 파일 정보 읽기
            const fileStats = fs.statSync(filePath);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            
            // 백업 메타데이터 생성
            const backupMetadata = {
                originalPath: filePath,
                originalSize: fileStats.size,
                originalModified: fileStats.mtime,
                backupCreated: new Date(),
                reason: reason,
                sessionId: this.sessionId,
                checksum: this.calculateChecksum(fileContent),
                version: this.getNextVersionNumber(filePath)
            };

            // 백업 파일명 생성
            const backupFileName = this.generateBackupFileName(filePath, backupMetadata.version);
            const backupFilePath = path.join(this.backupDir, backupFileName);
            const metadataFilePath = backupFilePath + '.meta.json';

            // 백업 파일 저장
            fs.writeFileSync(backupFilePath, fileContent);
            fs.writeFileSync(metadataFilePath, JSON.stringify(backupMetadata, null, 2));

            // 세션 백업 목록에 추가
            if (!this.sessionBackups.has(filePath)) {
                this.sessionBackups.set(filePath, []);
            }
            this.sessionBackups.get(filePath).push({
                backupPath: backupFilePath,
                metadataPath: metadataFilePath,
                metadata: backupMetadata
            });

            this.log(`백업 생성 완료: ${filePath} -> ${backupFileName}`);

            // 오래된 백업 정리
            await this.cleanupOldBackups(filePath);

            return {
                success: true,
                backupPath: backupFilePath,
                metadataPath: metadataFilePath,
                metadata: backupMetadata
            };

        } catch (error) {
            this.log(`백업 생성 실패: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 파일 복원
    async restoreBackup(filePath, version = 'latest') {
        try {
            const availableBackups = this.getAvailableBackups(filePath);
            
            if (availableBackups.length === 0) {
                throw new Error(`복원할 백업이 없습니다: ${filePath}`);
            }

            let selectedBackup;
            if (version === 'latest') {
                // 가장 최근 백업 선택
                selectedBackup = availableBackups.sort((a, b) => 
                    new Date(b.metadata.backupCreated) - new Date(a.metadata.backupCreated)
                )[0];
            } else if (typeof version === 'number') {
                // 버전 번호로 선택
                selectedBackup = availableBackups.find(backup => 
                    backup.metadata.version === version
                );
            } else {
                throw new Error(`잘못된 버전 지정: ${version}`);
            }

            if (!selectedBackup) {
                throw new Error(`지정된 버전의 백업을 찾을 수 없습니다: ${version}`);
            }

            // 현재 파일을 백업 생성 (복원 전 안전장치)
            await this.createBackup(filePath, `복원 전 백업 (v${selectedBackup.metadata.version} 복원 시)`);

            // 백업 파일로 복원
            const backupContent = fs.readFileSync(selectedBackup.backupPath, 'utf8');
            fs.writeFileSync(filePath, backupContent);

            // 복원 후 체크섬 검증
            const currentChecksum = this.calculateChecksum(backupContent);
            if (currentChecksum !== selectedBackup.metadata.checksum) {
                throw new Error('복원 후 체크섬 검증 실패');
            }

            this.log(`복원 완료: ${filePath} (버전 ${selectedBackup.metadata.version})`);

            return {
                success: true,
                restoredFrom: selectedBackup.backupPath,
                version: selectedBackup.metadata.version,
                metadata: selectedBackup.metadata
            };

        } catch (error) {
            this.log(`복원 실패: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 전체 세션 롤백
    async rollbackSession(sessionId = null) {
        const targetSessionId = sessionId || this.sessionId;
        const rollbackResults = [];

        try {
            for (const [filePath, backups] of this.sessionBackups.entries()) {
                const sessionBackups = backups.filter(backup => 
                    backup.metadata.sessionId === targetSessionId
                );

                if (sessionBackups.length > 0) {
                    // 해당 세션의 첫 번째 백업으로 복원
                    const firstBackup = sessionBackups[0];
                    const result = await this.restoreFromBackupObject(filePath, firstBackup);
                    rollbackResults.push({
                        filePath,
                        ...result
                    });
                }
            }

            this.log(`세션 롤백 완료: ${targetSessionId} (${rollbackResults.length}개 파일)`);

            return {
                success: true,
                sessionId: targetSessionId,
                rollbackResults
            };

        } catch (error) {
            this.log(`세션 롤백 실패: ${error.message}`);
            return {
                success: false,
                error: error.message,
                partialResults: rollbackResults
            };
        }
    }

    // 백업 객체로부터 직접 복원
    async restoreFromBackupObject(filePath, backupObject) {
        try {
            const backupContent = fs.readFileSync(backupObject.backupPath, 'utf8');
            
            // 현재 파일 백업 (안전장치)
            await this.createBackup(filePath, '롤백 전 백업');
            
            // 복원
            fs.writeFileSync(filePath, backupContent);

            return {
                success: true,
                restoredFrom: backupObject.backupPath,
                version: backupObject.metadata.version
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 가용 백업 목록 조회
    getAvailableBackups(filePath) {
        const backups = [];
        
        try {
            const files = fs.readdirSync(this.backupDir);
            const normalizedPath = this.normalizeFilePath(filePath);
            
            for (const file of files) {
                if (file.endsWith('.meta.json')) {
                    const metadataPath = path.join(this.backupDir, file);
                    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    
                    if (this.normalizeFilePath(metadata.originalPath) === normalizedPath) {
                        const backupPath = metadataPath.replace('.meta.json', '');
                        
                        if (fs.existsSync(backupPath)) {
                            backups.push({
                                backupPath,
                                metadataPath,
                                metadata
                            });
                        }
                    }
                }
            }
            
        } catch (error) {
            this.log(`백업 목록 조회 실패: ${error.message}`);
        }

        return backups.sort((a, b) => 
            new Date(b.metadata.backupCreated) - new Date(a.metadata.backupCreated)
        );
    }

    // 백업 상태 검증
    verifyBackupIntegrity(backupPath) {
        try {
            const metadataPath = backupPath + '.meta.json';
            
            if (!fs.existsSync(backupPath) || !fs.existsSync(metadataPath)) {
                return { valid: false, error: '백업 파일 또는 메타데이터 누락' };
            }

            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            const backupContent = fs.readFileSync(backupPath, 'utf8');
            const currentChecksum = this.calculateChecksum(backupContent);

            if (currentChecksum !== metadata.checksum) {
                return { valid: false, error: '체크섬 불일치 - 백업 파일 손상' };
            }

            return { valid: true, metadata };

        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // 오래된 백업 정리
    async cleanupOldBackups(filePath) {
        try {
            const backups = this.getAvailableBackups(filePath);
            
            if (backups.length > this.maxBackups) {
                const backupsToDelete = backups.slice(this.maxBackups);
                
                for (const backup of backupsToDelete) {
                    fs.unlinkSync(backup.backupPath);
                    fs.unlinkSync(backup.metadataPath);
                    this.log(`오래된 백업 삭제: ${path.basename(backup.backupPath)}`);
                }
            }
            
        } catch (error) {
            this.log(`백업 정리 중 오류: ${error.message}`);
        }
    }

    // 백업 통계 생성
    getBackupStats() {
        try {
            const files = fs.readdirSync(this.backupDir);
            const metadataFiles = files.filter(f => f.endsWith('.meta.json'));
            
            let totalSize = 0;
            let oldestBackup = null;
            let newestBackup = null;
            const fileStats = {};

            for (const metaFile of metadataFiles) {
                const metadataPath = path.join(this.backupDir, metaFile);
                const backupPath = metadataPath.replace('.meta.json', '');
                
                if (fs.existsSync(backupPath)) {
                    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    const backupSize = fs.statSync(backupPath).size;
                    
                    totalSize += backupSize;
                    
                    if (!oldestBackup || new Date(metadata.backupCreated) < new Date(oldestBackup.backupCreated)) {
                        oldestBackup = metadata;
                    }
                    
                    if (!newestBackup || new Date(metadata.backupCreated) > new Date(newestBackup.backupCreated)) {
                        newestBackup = metadata;
                    }

                    const filePath = metadata.originalPath;
                    if (!fileStats[filePath]) {
                        fileStats[filePath] = { count: 0, totalSize: 0 };
                    }
                    fileStats[filePath].count++;
                    fileStats[filePath].totalSize += backupSize;
                }
            }

            return {
                totalBackups: metadataFiles.length,
                totalSize: totalSize,
                totalSizeFormatted: this.formatFileSize(totalSize),
                oldestBackup: oldestBackup,
                newestBackup: newestBackup,
                fileStats: fileStats,
                currentSessionId: this.sessionId,
                backupDirectory: this.backupDir
            };

        } catch (error) {
            return {
                error: error.message
            };
        }
    }

    // 유틸리티 메서드들
    generateBackupFileName(filePath, version) {
        const fileName = path.basename(filePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${fileName}.v${version}.${timestamp}.backup`;
    }

    getNextVersionNumber(filePath) {
        const backups = this.getAvailableBackups(filePath);
        if (backups.length === 0) return 1;
        
        const maxVersion = Math.max(...backups.map(b => b.metadata.version || 0));
        return maxVersion + 1;
    }

    calculateChecksum(content) {
        return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    }

    normalizeFilePath(filePath) {
        return path.resolve(filePath).toLowerCase();
    }

    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    log(message, ...args) {
        if (this.verboseMode) {
            console.log(`[SafetySystem] ${message}`, ...args);
        }
    }

    // 안전성 체크리스트
    runSafetyChecklist(filePath) {
        const checklist = {
            fileExists: fs.existsSync(filePath),
            isReadable: false,
            isWritable: false,
            hasBackup: false,
            diskSpace: null,
            backupDirExists: fs.existsSync(this.backupDir),
            backupDirWritable: false
        };

        try {
            // 파일 읽기 권한 체크
            fs.accessSync(filePath, fs.constants.R_OK);
            checklist.isReadable = true;
        } catch (error) {
            // 읽기 권한 없음
        }

        try {
            // 파일 쓰기 권한 체크
            fs.accessSync(filePath, fs.constants.W_OK);
            checklist.isWritable = true;
        } catch (error) {
            // 쓰기 권한 없음
        }

        // 백업 존재 여부 체크
        checklist.hasBackup = this.getAvailableBackups(filePath).length > 0;

        try {
            // 백업 디렉터리 쓰기 권한 체크
            fs.accessSync(this.backupDir, fs.constants.W_OK);
            checklist.backupDirWritable = true;
        } catch (error) {
            // 백업 디렉터리 쓰기 권한 없음
        }

        // 디스크 공간 체크 (근사치)
        try {
            const stats = fs.statSync(filePath);
            checklist.diskSpace = stats.size * 2; // 백업용 최소 공간
        } catch (error) {
            // 디스크 공간 체크 실패
        }

        return checklist;
    }
}

module.exports = SafetySystem;