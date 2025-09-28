/**
 * 💾 Channel Backup File Service
 * 채널 데이터 백업 파일 관리 전담 서비스
 */

import { promises as fs } from 'fs';
import path from 'path';
import { ServerLogger } from '../../../utils/logger';
import { ChannelData } from '../../../types/channel.types';

import Channel from '../../../models/Channel';

export class ChannelBackupService {
    private dataPath: string;
    private channelsFile: string;

    constructor() {
        this.dataPath = path.join(__dirname, '../../../data');
        this.channelsFile = path.join(this.dataPath, 'channels.json');
    }

    /**
     * 🚀 초기화
     */
    async initialize() {
        try {
            // 데이터 폴더 생성
            await fs.mkdir(this.dataPath, { recursive: true });

            // 기존 데이터 로드
            await this.loadChannels();

            ServerLogger.success('✅ ChannelBackupService 초기화 완료');
        } catch (error) {
            ServerLogger.error('❌ ChannelBackupService 초기화 실패', error);
            throw error;
        }
    }

    /**
     * 📚 채널 데이터 초기화 (백업 파일 확인만)
     */
    async loadChannels() {
        try {
            // 백업 파일 존재 확인 (파일이 없으면 생성)
            try {
                await fs.access(this.channelsFile);
                ServerLogger.info('✅ 백업 파일 확인 완료: channels.json');
            } catch (fileError: any) {
                if (fileError.code === 'ENOENT') {
                    // 백업 파일이 없으면 빈 배열로 생성
                    await fs.writeFile(this.channelsFile, '[]', 'utf8');
                    ServerLogger.info(
                        '📝 새로운 백업 파일 생성: channels.json',
                    );
                } else {
                    throw fileError;
                }
            }

            // MongoDB 연결 상태 확인
            try {
                const count = await Channel.countDocuments();
                ServerLogger.info('🍃 MongoDB 연결 확인 완료', {
                    channelCount: count,
                });
            } catch (mongoError: any) {
                ServerLogger.warn(
                    '⚠️ MongoDB 연결 실패, 백업 파일만 사용 가능',
                    mongoError,
                );
            }

            ServerLogger.success(
                '✅ ChannelBackupService 초기화 완료 (MongoDB 전용 모드)',
            );
        } catch (error) {
            ServerLogger.error('❌ 채널 데이터 초기화 실패', error);
            throw error;
        }
    }

    /**
     * 🔄 백업 파일 동기화 (MongoDB → JSON)
     * 주기적으로 호출하거나 중요한 변경 후 호출
     */
    async syncBackupFile(): Promise<void> {
        try {
            // MongoDB에서 모든 채널 가져오기
            const mongoChannels = await Channel.find({}).lean();

            // 백업 파일에 저장
            await fs.writeFile(
                this.channelsFile,
                JSON.stringify(mongoChannels, null, 2),
                'utf8',
            );

            ServerLogger.info('🔄 백업 파일 동기화 완료', {
                channelCount: mongoChannels.length,
            });

            // void 함수이므로 return 제거
        } catch (error) {
            ServerLogger.warn('⚠️ 백업 파일 동기화 실패', error);
            throw error;
        }
    }

    /**
     * 💾 채널 데이터 백업 파일 저장 (MongoDB 데이터 기준)
     */
    async saveChannels() {
        try {
            // MongoDB에서 모든 채널 가져와서 백업
            const allChannels = await Channel.find({}).lean();

            await fs.writeFile(
                this.channelsFile,
                JSON.stringify(allChannels, null, 2),
                'utf8',
            );

            ServerLogger.debug('💾 백업 파일 저장 완료', {
                count: allChannels.length,
            });
        } catch (error) {
            ServerLogger.error('❌ 백업 파일 저장 실패', error);
            throw error;
        }
    }

    /**
     * 📁 백업 파일 비동기 업데이트 (성능 최적화)
     */
    saveChannelsAsync() {
        this.saveChannels().catch((error) => {
            ServerLogger.warn('⚠️ 백업 파일 업데이트 실패 (무시)', error);
        });
    }
}
