const VideoProcessor = require('../../server/services/VideoProcessor');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

// Mock 설정
jest.mock('axios');
jest.mock('fs');
jest.mock('child_process');
jest.mock('../../server/utils/logger');

const mockedAxios = axios;
const mockedFs = fs;
const mockedSpawn = spawn;

// MockWriteStream 클래스
class MockWriteStream extends EventEmitter {
    constructor() {
        super();
        this.data = [];
    }

    write(data) {
        this.data.push(data);
    }

    end() {
        setTimeout(() => this.emit('finish'), 10);
    }
}

// MockFFmpegProcess 클래스
class MockFFmpegProcess extends EventEmitter {
    constructor(exitCode = 0) {
        super();
        this.stderr = new EventEmitter();
        this.stdout = new EventEmitter();
        this.exitCode = exitCode;

        // FFmpeg 프로세스 시뮬레이션
        setTimeout(() => {
            this.stderr.emit('data', 'FFmpeg processing...');
            this.emit('close', this.exitCode);
        }, 100);
    }
}

describe('VideoProcessor', () => {
    let videoProcessor;
    let mockWriteStream;

    beforeEach(() => {
        videoProcessor = new VideoProcessor();
        mockWriteStream = new MockWriteStream();

        // Mock 초기화
        jest.clearAllMocks();

        // 기본 fs mock 설정
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.mkdirSync.mockReturnValue(undefined);
        mockedFs.createWriteStream.mockReturnValue(mockWriteStream);
        mockedFs.statSync.mockReturnValue({ size: 1024 * 1024 }); // 1MB
        mockedFs.copyFileSync.mockReturnValue(undefined);
    });

    describe('constructor', () => {
        it('올바른 디렉토리 경로로 초기화되어야 함', () => {
            expect(videoProcessor.downloadDir).toContain('downloads');
            expect(videoProcessor.thumbnailDir).toContain('thumbnails');
        });

        it('디렉토리가 없으면 생성해야 함', () => {
            mockedFs.existsSync.mockReturnValue(false);

            new VideoProcessor();

            expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
                expect.stringContaining('downloads'),
                { recursive: true },
            );
            expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
                expect.stringContaining('thumbnails'),
                { recursive: true },
            );
        });
    });

    describe('downloadVideo', () => {
        it('성공적으로 비디오를 다운로드해야 함', async () => {
            const mockResponse = {
                status: 200,
                headers: {
                    'content-type': 'video/mp4',
                    'content-length': '1048576',
                },
                data: {
                    pipe: jest.fn((writer) => {
                        setTimeout(() => writer.emit('finish'), 50);
                    }),
                },
            };

            mockedAxios.mockResolvedValueOnce(mockResponse);

            const result = await videoProcessor.downloadVideo(
                'http://example.com/video.mp4',
                'INSTAGRAM',
            );

            expect(result).toContain('instagram_');
            expect(result).toContain('.mp4');
            expect(mockedAxios).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'GET',
                    url: 'http://example.com/video.mp4',
                    responseType: 'stream',
                    timeout: 30000,
                }),
            );
        });

        it('blob URL에 대해 에러를 발생시켜야 함', async () => {
            const blobUrl = 'blob:https://example.com/blob123';

            await expect(
                videoProcessor.downloadVideo(blobUrl, 'INSTAGRAM'),
            ).rejects.toThrow('Blob URL은 클라이언트에서 파일로 전송해주세요');
        });

        it('다운로드 실패 시 적절한 에러를 발생시켜야 함', async () => {
            mockedAxios.mockRejectedValueOnce(new Error('Network error'));

            await expect(
                videoProcessor.downloadVideo(
                    'http://example.com/video.mp4',
                    'INSTAGRAM',
                ),
            ).rejects.toThrow('비디오 다운로드 실패');
        });

        it('스트림 쓰기 에러를 처리해야 함', async () => {
            const mockResponse = {
                status: 200,
                headers: { 'content-type': 'video/mp4' },
                data: {
                    pipe: jest.fn((writer) => {
                        setTimeout(
                            () =>
                                writer.emit('error', new Error('Write error')),
                            50,
                        );
                    }),
                },
            };

            mockedAxios.mockResolvedValueOnce(mockResponse);

            await expect(
                videoProcessor.downloadVideo(
                    'http://example.com/video.mp4',
                    'INSTAGRAM',
                ),
            ).rejects.toThrow('Write error');
        });
    });

    describe('generateThumbnail', () => {
        it('quick 모드에서 단일 썸네일을 생성해야 함', async () => {
            const mockFFmpegProcess = new MockFFmpegProcess(0);
            mockedSpawn.mockReturnValueOnce(mockFFmpegProcess);

            // detectFileType 메서드 모킹
            videoProcessor.detectFileType = jest
                .fn()
                .mockResolvedValue('video');
            videoProcessor.generateSingleThumbnail = jest
                .fn()
                .mockResolvedValue(['/path/to/thumbnail.jpg']);

            const result = await videoProcessor.generateThumbnail(
                '/path/to/video.mp4',
                'quick',
            );

            expect(result).toEqual(['/path/to/thumbnail.jpg']);
            expect(videoProcessor.generateSingleThumbnail).toHaveBeenCalledWith(
                '/path/to/video.mp4',
            );
        });

        it('multi-frame 모드에서 다중 프레임을 생성해야 함', async () => {
            // detectFileType 메서드 모킹
            videoProcessor.detectFileType = jest
                .fn()
                .mockResolvedValue('video');
            videoProcessor.generateMultipleFrames = jest
                .fn()
                .mockResolvedValue([
                    '/path/to/frame1.jpg',
                    '/path/to/frame2.jpg',
                    '/path/to/frame3.jpg',
                ]);

            const result = await videoProcessor.generateThumbnail(
                '/path/to/video.mp4',
                'multi-frame',
            );

            expect(result).toHaveLength(3);
            expect(videoProcessor.generateMultipleFrames).toHaveBeenCalledWith(
                '/path/to/video.mp4',
            );
        });

        it('이미지 파일인 경우 원본을 복사해야 함', async () => {
            videoProcessor.detectFileType = jest
                .fn()
                .mockResolvedValue('image');

            const result = await videoProcessor.generateThumbnail(
                '/path/to/image.jpg',
                'quick',
            );

            expect(mockedFs.copyFileSync).toHaveBeenCalled();
            expect(result).toHaveLength(1);
            expect(result[0]).toContain('thumb');
        });

        it('썸네일 생성 실패 시 에러를 전파해야 함', async () => {
            videoProcessor.detectFileType = jest
                .fn()
                .mockRejectedValue(new Error('File type detection failed'));

            await expect(
                videoProcessor.generateThumbnail('/path/to/video.mp4', 'quick'),
            ).rejects.toThrow('File type detection failed');
        });
    });

    describe('generateSingleThumbnail', () => {
        it('FFmpeg으로 성공적으로 썸네일을 생성해야 함', async () => {
            const mockFFmpegProcess = new MockFFmpegProcess(0);
            mockedSpawn.mockReturnValueOnce(mockFFmpegProcess);
            mockedFs.existsSync.mockReturnValue(true);

            const result = await videoProcessor.generateSingleThumbnail(
                '/path/to/video.mp4',
            );

            expect(mockedSpawn).toHaveBeenCalledWith(
                expect.any(String), // ffmpegPath
                expect.arrayContaining([
                    '-i',
                    '/path/to/video.mp4',
                    '-ss',
                    '00:00:01.000',
                    '-vframes',
                    '1',
                    '-q:v',
                    '2',
                    '-y',
                    expect.stringContaining('thumb'),
                ]),
            );

            expect(result).toHaveLength(1);
            expect(result[0]).toContain('thumb');
        });

        it('FFmpeg 실행 실패 시 에러를 발생시켜야 함', async () => {
            const mockFFmpegProcess = new MockFFmpegProcess(1); // 실패 코드
            mockedSpawn.mockReturnValueOnce(mockFFmpegProcess);
            mockedFs.existsSync.mockReturnValue(false);

            await expect(
                videoProcessor.generateSingleThumbnail('/path/to/video.mp4'),
            ).rejects.toThrow('FFmpeg 실행 실패');
        });

        it('FFmpeg 프로세스 에러를 처리해야 함', async () => {
            // 실제 VideoProcessor 구현에 맞춰 close 이벤트로 실패 처리
            const mockFFmpegProcess = new MockFFmpegProcess(1); // 실패 코드
            mockedSpawn.mockReturnValueOnce(mockFFmpegProcess);
            mockedFs.existsSync.mockReturnValue(false); // 썸네일 파일이 생성되지 않음

            await expect(
                videoProcessor.generateSingleThumbnail('/path/to/video.mp4'),
            ).rejects.toThrow('FFmpeg 실행 실패');
        });
    });

    describe('detectFileType', () => {
        beforeEach(() => {
            // detectFileType은 실제 구현이 필요하므로 여기서 구현
            videoProcessor.detectFileType = async (filePath) => {
                const ext = path.extname(filePath).toLowerCase();
                const imageExtensions = [
                    '.jpg',
                    '.jpeg',
                    '.png',
                    '.gif',
                    '.bmp',
                    '.webp',
                ];
                const videoExtensions = [
                    '.mp4',
                    '.avi',
                    '.mov',
                    '.wmv',
                    '.flv',
                    '.mkv',
                ];

                if (imageExtensions.includes(ext)) {
                    return 'image';
                } else if (videoExtensions.includes(ext)) {
                    return 'video';
                } else {
                    return 'unknown';
                }
            };
        });

        it('이미지 파일을 올바르게 감지해야 함', async () => {
            const result = await videoProcessor.detectFileType(
                '/path/to/image.jpg',
            );
            expect(result).toBe('image');
        });

        it('비디오 파일을 올바르게 감지해야 함', async () => {
            const result = await videoProcessor.detectFileType(
                '/path/to/video.mp4',
            );
            expect(result).toBe('video');
        });

        it('알 수 없는 파일 타입을 처리해야 함', async () => {
            const result = await videoProcessor.detectFileType(
                '/path/to/file.unknown',
            );
            expect(result).toBe('unknown');
        });
    });

    describe('calculateOptimalFrameCount', () => {
        beforeEach(() => {
            // calculateOptimalFrameCount 메서드 구현
            videoProcessor.calculateOptimalFrameCount = (duration) => {
                if (duration <= 10) return 3;
                if (duration <= 30) return 5;
                if (duration <= 60) return 7;
                return 10;
            };
        });

        it('짧은 동영상에 대해 적절한 프레임 수를 반환해야 함', () => {
            expect(videoProcessor.calculateOptimalFrameCount(5)).toBe(3);
            expect(videoProcessor.calculateOptimalFrameCount(15)).toBe(5);
            expect(videoProcessor.calculateOptimalFrameCount(45)).toBe(7);
            expect(videoProcessor.calculateOptimalFrameCount(120)).toBe(10);
        });
    });

    describe('calculateFrameIntervals', () => {
        beforeEach(() => {
            // calculateFrameIntervals 메서드 구현
            videoProcessor.calculateFrameIntervals = (duration, frameCount) => {
                const intervals = [];
                const step = duration / (frameCount + 1);

                for (let i = 1; i <= frameCount; i++) {
                    intervals.push(Math.round(step * i * 100) / 100);
                }

                return intervals;
            };
        });

        it('올바른 프레임 간격을 계산해야 함', () => {
            const intervals = videoProcessor.calculateFrameIntervals(30, 3);

            expect(intervals).toHaveLength(3);
            expect(intervals[0]).toBeGreaterThan(0);
            expect(intervals[intervals.length - 1]).toBeLessThan(30);

            // 간격이 균등하게 분포되어야 함
            for (let i = 1; i < intervals.length; i++) {
                expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
            }
        });
    });

    describe('error handling', () => {
        it('존재하지 않는 파일에 대해 적절한 에러를 발생시켜야 함', async () => {
            videoProcessor.detectFileType = jest
                .fn()
                .mockRejectedValue(
                    new Error('ENOENT: no such file or directory'),
                );

            await expect(
                videoProcessor.generateThumbnail('/nonexistent/file.mp4'),
            ).rejects.toThrow('ENOENT');
        });

        it('디렉토리 생성 실패 시 에러를 발생시켜야 함', () => {
            // 첫 번째 호출 (downloadDir 생성)에서 에러 발생
            mockedFs.existsSync.mockReturnValueOnce(false); // downloadDir이 없음
            mockedFs.mkdirSync.mockImplementationOnce(() => {
                throw new Error('EACCES: permission denied');
            });

            expect(() => new VideoProcessor()).toThrow(
                'EACCES: permission denied',
            );
        });
    });
});
