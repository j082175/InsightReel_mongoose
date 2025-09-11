const DynamicCategoryManager = require('../../server/services/DynamicCategoryManager');
const fs = require('fs');
const path = require('path');

// Mock 설정
jest.mock('fs');
jest.mock('../../server/utils/logger');

const mockedFs = fs;

describe('DynamicCategoryManager', () => {
    let manager;

    beforeEach(() => {
        // Mock 초기화
        jest.clearAllMocks();

        // fs Mock 기본 설정
        mockedFs.existsSync.mockReturnValue(false);
        mockedFs.readFileSync.mockReturnValue('{}');
        mockedFs.writeFileSync.mockReturnValue(true);

        manager = new DynamicCategoryManager();
    });

    describe('constructor', () => {
        it('기본 설정으로 초기화되어야 함', () => {
            expect(manager.PLATFORM_CATEGORIES).toBeDefined();
            expect(manager.PLATFORM_CATEGORIES.youtube).toHaveLength(15);
            expect(manager.PLATFORM_CATEGORIES.tiktok).toHaveLength(12);
            expect(manager.PLATFORM_CATEGORIES.instagram).toHaveLength(12);
            expect(manager.FIXED_MAIN_CATEGORIES).toEqual(
                manager.PLATFORM_CATEGORIES.youtube,
            );
        });

        it('정규화 규칙이 초기화되어야 함', () => {
            expect(manager.normalizationRules).toBeDefined();
            expect(manager.normalizationRules.synonyms).toBeDefined();
            expect(manager.normalizationRules.preferred).toBeDefined();
        });

        it('카테고리 통계가 초기화되어야 함', () => {
            expect(manager.categoryStats).toBeDefined();
            expect(manager.categoryStats.usage).toBeDefined();
            expect(manager.categoryStats.created).toBeDefined();
        });
    });

    describe('getMainCategoriesForPlatform', () => {
        it('YouTube 플랫폼에 대해 15개 카테고리를 반환해야 함', () => {
            const categories = manager.getMainCategoriesForPlatform('YOUTUBE');

            expect(categories).toHaveLength(15);
            expect(categories).toContain('게임');
            expect(categories).toContain('과학기술');
            expect(categories).toContain('엔터테인먼트');
        });

        it('TikTok 플랫폼에 대해 12개 카테고리를 반환해야 함', () => {
            const categories = manager.getMainCategoriesForPlatform('TIKTOK');

            expect(categories).toHaveLength(12);
            expect(categories).toContain('엔터테인먼트');
            expect(categories).toContain('뷰티 및 스타일');
            expect(categories).toContain('라이프스타일');
        });

        it('Instagram 플랫폼에 대해 12개 카테고리를 반환해야 함', () => {
            const categories =
                manager.getMainCategoriesForPlatform('INSTAGRAM');

            expect(categories).toHaveLength(12);
            expect(categories).toContain('엔터테인먼트');
            expect(categories).toContain('뷰티 및 스타일');
            expect(categories).toContain('가족 및 연애');
        });

        it('알 수 없는 플랫폼에 대해 YouTube 카테고리를 기본값으로 반환해야 함', () => {
            const categories = manager.getMainCategoriesForPlatform('unknown');

            expect(categories).toHaveLength(15);
            expect(categories).toEqual(manager.PLATFORM_CATEGORIES.youtube);
        });

        it('플랫폼이 null이면 YouTube 카테고리를 반환해야 함', () => {
            const categories = manager.getMainCategoriesForPlatform(null);

            expect(categories).toHaveLength(15);
            expect(categories).toEqual(manager.PLATFORM_CATEGORIES.youtube);
        });
    });

    describe('normalizeCategoryPath', () => {
        it('유효한 카테고리 경로를 정규화해야 함', () => {
            const result =
                manager.normalizeCategoryPath('게임 > 실황 > 호러게임');

            expect(result).toBeDefined();
            expect(result.original).toBe('게임 > 실황 > 호러게임');
            expect(result.normalized).toBe('게임 > 실황 > 호러');
            expect(result.parts).toEqual(['게임', '실황', '호러']);
            expect(result.depth).toBe(3);
        });

        it('유효하지 않은 대카테고리에 대해 null을 반환해야 함', () => {
            const result =
                manager.normalizeCategoryPath('잘못된카테고리 > 서브카테고리');

            expect(result).toBeNull();
        });

        it('빈 문자열에 대해 null을 반환해야 함', () => {
            const result = manager.normalizeCategoryPath('');

            expect(result).toBeNull();
        });

        it('null 입력에 대해 null을 반환해야 함', () => {
            const result = manager.normalizeCategoryPath(null);

            expect(result).toBeNull();
        });

        it('문자열이 아닌 입력에 대해 null을 반환해야 함', () => {
            const result = manager.normalizeCategoryPath(123);

            expect(result).toBeNull();
        });

        it('Instagram 플랫폼에서 자연 카테고리를 정규화해야 함', () => {
            const result = manager.normalizeCategoryPath(
                '자연 > 동물 > 생물학적 특징',
                'INSTAGRAM',
            );

            expect(result).toBeDefined();
            expect(result.original).toBe('자연 > 동물 > 생물학적 특징');
            expect(result.normalized).toBe('자연 > 동물 > 생물학적 특징');
            expect(result.parts).toEqual(['자연', '동물', '생물학적 특징']);
            expect(result.depth).toBe(3);
        });

        it('YouTube 플랫폼에서 자연 카테고리는 유효하지 않아야 함', () => {
            const result = manager.normalizeCategoryPath(
                '자연 > 동물',
                'YOUTUBE',
            );

            expect(result).toBeNull();
        });
    });

    describe('getFallbackCategory', () => {
        it('게임 관련 메타데이터에 대해 게임 카테고리를 반환해야 함', () => {
            const metadata = {
                caption: '오늘은 새로운 게임을 플레이해봤어요!',
                hashtags: ['#gaming', '#gameplay'],
            };

            const result = manager.getFallbackCategory(metadata);

            expect(result.mainCategory).toBe('게임');
            expect(result.middleCategory).toBe('일반');
            expect(result.confidence).toBe(0.5);
            expect(result.source).toBe('fallback-metadata');
        });

        it('요리 관련 메타데이터에 대해 노하우/스타일 카테고리를 반환해야 함', () => {
            const metadata = {
                caption: '맛있는 요리 레시피를 소개합니다',
                hashtags: ['#cooking', '#recipe'],
            };

            const result = manager.getFallbackCategory(metadata);

            expect(result.mainCategory).toBe('노하우/스타일');
            expect(result.middleCategory).toBe('일반');
            expect(result.source).toBe('fallback-metadata');
        });

        it('키워드가 없으면 플랫폼별 기본 카테고리를 반환해야 함', () => {
            // YouTube (기본값): 첫 번째 카테고리 = "게임"
            const metadata = {
                caption: '',
                hashtags: [],
            };

            const result = manager.getFallbackCategory(metadata);

            expect(result.mainCategory).toBe('게임'); // YouTube 첫 번째 카테고리
            expect(result.middleCategory).toBe('일반');
        });

        it('메타데이터가 비어있어도 플랫폼별 기본 카테고리를 반환해야 함', () => {
            // YouTube (기본값): 첫 번째 카테고리 = "게임"
            const result = manager.getFallbackCategory({});

            expect(result.mainCategory).toBe('게임');
            expect(result.fullPath).toBe('게임 > 일반');
            expect(result.keywords).toEqual(['영상', '콘텐츠']);
            expect(result.hashtags).toEqual(['#영상', '#콘텐츠']);
        });

        it('Instagram 플랫폼 기본 카테고리를 반환해야 함', () => {
            const metadata = { platform: 'INSTAGRAM' };
            const result = manager.getFallbackCategory(metadata);

            expect(result.mainCategory).toBe('엔터테인먼트'); // Instagram 첫 번째 카테고리
            expect(result.middleCategory).toBe('일반');
        });

        it('TikTok 플랫폼 기본 카테고리를 반환해야 함', () => {
            const metadata = { platform: 'TIKTOK' };
            const result = manager.getFallbackCategory(metadata);

            expect(result.mainCategory).toBe('엔터테인먼트'); // TikTok 첫 번째 카테고리
            expect(result.middleCategory).toBe('일반');
        });
    });

    describe('processDynamicCategoryResponse', () => {
        it('유효한 AI 응답을 처리해야 함', () => {
            const aiResponse = {
                full_path: '게임 > 플레이 > 호러',
                keywords: ['게임', '호러', '플레이'],
                hashtags: ['#게임', '#호러'],
                content: '무서운 호러 게임 플레이',
                confidence: 0.9,
            };

            const result = manager.processDynamicCategoryResponse(
                aiResponse,
                {},
            );

            expect(result.mainCategory).toBe('게임');
            expect(result.middleCategory).toBe('실황'); // 정규화 규칙에 의해 "플레이" → "실황"
            expect(result.source).toBe('dynamic-ai-generated');
            expect(result.normalized).toBe(true);
        });

        it('JSON 문자열 응답을 파싱해야 함', () => {
            const jsonString =
                '{"full_path": "음악 > 커버", "content": "노래 커버 영상"}';

            const result = manager.processDynamicCategoryResponse(
                jsonString,
                {},
            );

            expect(result.mainCategory).toBe('음악');
            expect(result.middleCategory).toBe('커버');
        });

        it('유효하지 않은 응답에 대해 폴백 카테고리를 반환해야 함', () => {
            const invalidResponse = { invalid: 'data' };
            const metadata = { caption: '테스트', hashtags: [] };

            const result = manager.processDynamicCategoryResponse(
                invalidResponse,
                metadata,
            );

            expect(result.source).toBe('fallback-metadata');
            expect(result.normalized).toBe(false);
        });

        it('파싱 에러 발생 시 폴백 카테고리를 반환해야 함', () => {
            const invalidJson = 'invalid json string';
            const metadata = { caption: '테스트', hashtags: [] };

            const result = manager.processDynamicCategoryResponse(
                invalidJson,
                metadata,
            );

            expect(result.source).toBe('fallback-metadata');
        });
    });

    describe('buildDynamicCategoryPrompt', () => {
        it('YouTube 플랫폼에 대한 프롬프트를 생성해야 함', () => {
            const metadata = {
                platform: 'YOUTUBE',
                caption: '게임 플레이 영상입니다',
            };

            const prompt = manager.buildDynamicCategoryPrompt(metadata);

            expect(prompt).toContain('youtube 영상을 분석하여');
            expect(prompt).toContain('게임, 과학기술, 교육'); // YouTube 카테고리 포함
            expect(prompt).toContain('게임 플레이 영상입니다');
        });

        it('TikTok 플랫폼에 대한 프롬프트를 생성해야 함', () => {
            const metadata = {
                platform: 'TIKTOK',
                caption: '뷰티 튜토리얼',
            };

            const prompt = manager.buildDynamicCategoryPrompt(metadata);

            expect(prompt).toContain('tiktok 영상을 분석하여');
            expect(prompt).toContain('엔터테인먼트, 뷰티 및 스타일'); // TikTok 카테고리 포함
            expect(prompt).toContain('뷰티 튜토리얼');
        });

        it('플랫폼이 없으면 기본값으로 YouTube를 사용해야 함', () => {
            const metadata = {
                caption: '테스트 영상',
            };

            const prompt = manager.buildDynamicCategoryPrompt(metadata);

            expect(prompt).toContain('youtube 영상을 분석하여');
            expect(prompt).toContain('게임, 과학기술, 교육'); // YouTube 카테고리
        });
    });

    describe('getFixedMainCategories', () => {
        it('YouTube 카테고리의 복사본을 반환해야 함', () => {
            const categories = manager.getFixedMainCategories();

            expect(categories).toHaveLength(15);
            expect(categories).toEqual(manager.PLATFORM_CATEGORIES.youtube);

            // 원본 배열이 수정되지 않도록 복사본인지 확인
            categories.push('테스트');
            expect(manager.FIXED_MAIN_CATEGORIES).not.toContain('테스트');
        });
    });

    describe('updateCategoryUsage', () => {
        it('새로운 카테고리 경로의 사용 통계를 생성해야 함', () => {
            const categoryPath = '게임 > 호러';

            manager.updateCategoryUsage(categoryPath);

            expect(manager.categoryStats.usage[categoryPath]).toBeDefined();
            expect(manager.categoryStats.usage[categoryPath].count).toBe(1);
            expect(
                manager.categoryStats.usage[categoryPath].firstUsed,
            ).toBeDefined();
            expect(
                manager.categoryStats.usage[categoryPath].lastUsed,
            ).toBeDefined();
        });

        it('기존 카테고리 경로의 사용 횟수를 증가시켜야 함', () => {
            const categoryPath = '음악 > 커버';

            manager.updateCategoryUsage(categoryPath);
            manager.updateCategoryUsage(categoryPath);

            expect(manager.categoryStats.usage[categoryPath].count).toBe(2);
        });
    });

    describe('getSystemStats', () => {
        it('시스템 통계를 반환해야 함', () => {
            // 몇 개의 카테고리 사용 추가
            manager.updateCategoryUsage('게임 > 호러');
            manager.updateCategoryUsage('음악 > 커버');
            manager.updateCategoryUsage('게임 > 호러');

            const stats = manager.getSystemStats();

            expect(stats.totalCategories).toBe(2);
            expect(stats.totalUsage).toBe(3);
            expect(stats.averageDepth).toBe(2);
            expect(stats.normalizationRules).toBeGreaterThan(0);
            expect(stats.synonymGroups).toBeGreaterThan(0);
            expect(stats.lastUpdated).toBeDefined();
        });
    });
});
