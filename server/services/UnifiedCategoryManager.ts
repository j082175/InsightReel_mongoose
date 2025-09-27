import * as fs from 'fs';
import * as path from 'path';
import { ServerLogger } from '../utils/logger';

interface CategoryConfig {
    categories: any;
    defaultCategory: {
        main: string;
        middle: string;
    };
    version: string;
}

interface CategoryAnalysisResult {
    majorCategory: string;
    middleCategory: string;
    subCategory?: string;
    confidence: number;
    source: 'url' | 'ai' | 'default';
}

interface NormalizationRule {
    keywords: string[];
    targetCategory: string;
    confidence: number;
}

interface CategoryStats {
    [category: string]: {
        count: number;
        accuracy: number;
        lastUpdated: string;
    };
}

interface VerifiedCategory {
    url: string;
    category: string;
    verifiedAt: string;
    verifiedBy: string;
}

type CategoryMode = 'basic' | 'dynamic' | 'flexible';

interface UnifiedCategoryManagerOptions {
    mode?: CategoryMode;
}

/**
 * 통합 카테고리 관리자 (싱글톤)
 * 기존 3개 클래스의 모든 기능을 통합:
 * - CategoryManager: 기본 2단계 카테고리 시스템
 * - DynamicCategoryManager: AI 동적 카테고리 + 자가학습
 * - FlexibleCategoryManager: 무한 깊이 + 태그 시스템
 */
export class UnifiedCategoryManager {
    private static instance: UnifiedCategoryManager | null = null;

    private mode: CategoryMode;
    private categoriesPath: string;
    private categoriesV2Path: string;
    private normalizationRulesPath: string;
    private categoryStatsPath: string;
    private verifiedCategoriesPath: string;

    private categories: any = null;
    private categoriesV2: any = null;
    private normalizationRules: { [key: string]: NormalizationRule } = {};
    private categoryStats: CategoryStats = {};
    private verifiedCategories: { [key: string]: VerifiedCategory } = {};
    private defaultCategory: { main: string; middle: string } = { main: '미분류', middle: '기본' };
    private version: string = '1.0.0';

    private readonly PLATFORM_CATEGORIES = {
        youtube: [
            '게임', '과학기술', '교육', '노하우/스타일', '뉴스/정치',
            '비영리/사회운동', '스포츠', '애완동물/동물', '엔터테인먼트',
            '여행/이벤트', '영화/애니메이션', '음악', '인물/블로그',
            '자동차/교통', '코미디'
        ],
        tiktok: [
            '엔터테인먼트', '뷰티 및 스타일', '퍼포먼스', '스포츠 및 아웃도어',
            '사회', '라이프스타일', '차량 및 교통', '재능', '자연',
            '문화/교육/기술', '가족/연애', '초자연적 현상 및 공포'
        ],
        instagram: [
            '엔터테인먼트', '뷰티 및 스타일', '퍼포먼스', '스포츠 및 아웃도어',
            '사회', '라이프스타일', '차량 및 교통', '재능', '자연',
            '문화/교육/기술', '가족/연애', '초자연적 현상 및 공포'
        ]
    };

    private constructor(options: UnifiedCategoryManagerOptions = {}) {
        this.mode = options.mode || (process.env.CATEGORY_MANAGER_MODE as CategoryMode) || 'dynamic';

        // 파일 경로들
        this.categoriesPath = path.join(__dirname, '../config/categories.json');
        this.categoriesV2Path = path.join(__dirname, '../config/categories-v2.json');
        this.normalizationRulesPath = path.join(__dirname, '../config/normalization-rules.json');
        this.categoryStatsPath = path.join(__dirname, '../config/category-stats.json');
        this.verifiedCategoriesPath = path.join(__dirname, '../config/verified-categories.json');

        // 모드에 따른 초기화
        this.initializeByMode();

        ServerLogger.success(
            `통합 카테고리 관리자 초기화 완료 (모드: ${this.mode})`,
            null,
            'UNIFIED_CATEGORY'
        );
    }

    /**
     * 싱글톤 인스턴스 반환
     */
    static getInstance(options: UnifiedCategoryManagerOptions = {}): UnifiedCategoryManager {
        if (!UnifiedCategoryManager.instance) {
            UnifiedCategoryManager.instance = new UnifiedCategoryManager(options);
        }
        return UnifiedCategoryManager.instance;
    }

    /**
     * 모드별 초기화
     */
    private initializeByMode(): void {
        switch (this.mode) {
            case 'basic':
                this.loadCategories();
                break;
            case 'dynamic':
                this.loadNormalizationRules();
                this.loadCategoryStats();
                this.loadVerifiedCategories();
                break;
            case 'flexible':
                this.loadCategoriesV2();
                break;
            default:
                ServerLogger.warn(
                    `알 수 없는 카테고리 모드: ${this.mode}, dynamic으로 기본 설정`,
                    null,
                    'UNIFIED_CATEGORY'
                );
                this.mode = 'dynamic';
                this.loadNormalizationRules();
                this.loadCategoryStats();
                this.loadVerifiedCategories();
        }
    }

    /**
     * 기본 카테고리 로드 (CategoryManager)
     */
    private loadCategories(): void {
        try {
            if (!fs.existsSync(this.categoriesPath)) {
                this.createDefaultCategoriesFile();
            }

            const data = fs.readFileSync(this.categoriesPath, 'utf8');
            const config: CategoryConfig = JSON.parse(data);
            this.categories = config.categories;
            this.defaultCategory = config.defaultCategory;
            this.version = config.version;

            ServerLogger.success(
                `기본 카테고리 로드 완료 (v${this.version})`,
                null,
                'UNIFIED_CATEGORY'
            );
        } catch (error) {
            ServerLogger.error('기본 카테고리 파일 로드 실패', error, 'UNIFIED_CATEGORY');
            this.categories = {};
            this.defaultCategory = { main: '미분류', middle: '기본' };
        }
    }

    /**
     * V2 카테고리 로드 (FlexibleCategoryManager)
     */
    private loadCategoriesV2(): void {
        try {
            if (!fs.existsSync(this.categoriesV2Path)) {
                this.createDefaultCategoriesV2File();
            }

            const data = fs.readFileSync(this.categoriesV2Path, 'utf8');
            this.categoriesV2 = JSON.parse(data);

            ServerLogger.success('V2 카테고리 로드 완료', null, 'UNIFIED_CATEGORY');
        } catch (error) {
            ServerLogger.error('V2 카테고리 파일 로드 실패', error, 'UNIFIED_CATEGORY');
            this.categoriesV2 = {};
        }
    }

    /**
     * 정규화 규칙 로드 (DynamicCategoryManager)
     */
    private loadNormalizationRules(): void {
        try {
            if (fs.existsSync(this.normalizationRulesPath)) {
                const data = fs.readFileSync(this.normalizationRulesPath, 'utf8');
                this.normalizationRules = JSON.parse(data);
                ServerLogger.success('정규화 규칙 로드 완료', null, 'UNIFIED_CATEGORY');
            } else {
                this.normalizationRules = {};
                ServerLogger.info('정규화 규칙 파일이 없습니다. 빈 객체로 초기화', null, 'UNIFIED_CATEGORY');
            }
        } catch (error) {
            ServerLogger.error('정규화 규칙 로드 실패', error, 'UNIFIED_CATEGORY');
            this.normalizationRules = {};
        }
    }

    /**
     * 카테고리 통계 로드
     */
    private loadCategoryStats(): void {
        try {
            if (fs.existsSync(this.categoryStatsPath)) {
                const data = fs.readFileSync(this.categoryStatsPath, 'utf8');
                this.categoryStats = JSON.parse(data);
                ServerLogger.success('카테고리 통계 로드 완료', null, 'UNIFIED_CATEGORY');
            } else {
                this.categoryStats = {};
                ServerLogger.info('카테고리 통계 파일이 없습니다. 빈 객체로 초기화', null, 'UNIFIED_CATEGORY');
            }
        } catch (error) {
            ServerLogger.error('카테고리 통계 로드 실패', error, 'UNIFIED_CATEGORY');
            this.categoryStats = {};
        }
    }

    /**
     * 검증된 카테고리 로드
     */
    private loadVerifiedCategories(): void {
        try {
            if (fs.existsSync(this.verifiedCategoriesPath)) {
                const data = fs.readFileSync(this.verifiedCategoriesPath, 'utf8');
                const verifiedArray: VerifiedCategory[] = JSON.parse(data);

                // 배열을 객체로 변환 (URL을 키로 사용)
                this.verifiedCategories = {};
                verifiedArray.forEach(item => {
                    this.verifiedCategories[item.url] = item;
                });

                ServerLogger.success('검증된 카테고리 로드 완료', null, 'UNIFIED_CATEGORY');
            } else {
                this.verifiedCategories = {};
                ServerLogger.info('검증된 카테고리 파일이 없습니다. 빈 객체로 초기화', null, 'UNIFIED_CATEGORY');
            }
        } catch (error) {
            ServerLogger.error('검증된 카테고리 로드 실패', error, 'UNIFIED_CATEGORY');
            this.verifiedCategories = {};
        }
    }

    /**
     * URL 기반 카테고리 분석
     */
    analyzeBasedOnUrl(url: string): CategoryAnalysisResult | null {
        if (!url || typeof url !== 'string') {
            return null;
        }

        try {
            // 검증된 카테고리에서 우선 확인
            if (this.verifiedCategories[url]) {
                const verified = this.verifiedCategories[url];
                const [majorCategory, middleCategory] = verified.category.split(' > ');
                return {
                    majorCategory: majorCategory || verified.category,
                    middleCategory: middleCategory || '',
                    confidence: 1.0,
                    source: 'url'
                };
            }

            // URL 패턴 기반 분석
            const urlAnalysis = this.analyzeUrlPattern(url);
            if (urlAnalysis) {
                return urlAnalysis;
            }

            // 정규화 규칙 적용
            const normalizedAnalysis = this.applyNormalizationRules(url);
            if (normalizedAnalysis) {
                return normalizedAnalysis;
            }

            return null;

        } catch (error) {
            ServerLogger.error('URL 기반 카테고리 분석 실패:', error);
            return null;
        }
    }

    /**
     * URL 패턴 분석
     */
    private analyzeUrlPattern(url: string): CategoryAnalysisResult | null {
        const urlLower = url.toLowerCase();

        // YouTube 채널 패턴 분석
        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
            return this.analyzeYouTubeUrl(url);
        }

        // Instagram 패턴 분석
        if (urlLower.includes('instagram.com')) {
            return this.analyzeInstagramUrl(url);
        }

        // TikTok 패턴 분석
        if (urlLower.includes('tiktok.com')) {
            return this.analyzeTikTokUrl(url);
        }

        return null;
    }

    /**
     * YouTube URL 분석
     */
    private analyzeYouTubeUrl(url: string): CategoryAnalysisResult | null {
        // 간단한 키워드 기반 분석
        const keywords = {
            '게임': ['game', 'gaming', 'play', 'minecraft', 'fortnite'],
            '음악': ['music', 'song', 'mv', 'official'],
            '교육': ['tutorial', 'how', 'learn', 'education'],
            '엔터테인먼트': ['entertainment', 'funny', 'comedy']
        };

        for (const [category, keywordList] of Object.entries(keywords)) {
            if (keywordList.some(keyword => url.toLowerCase().includes(keyword))) {
                return {
                    majorCategory: category,
                    middleCategory: '',
                    confidence: 0.6,
                    source: 'url'
                };
            }
        }

        return null;
    }

    /**
     * Instagram URL 분석
     */
    private analyzeInstagramUrl(url: string): CategoryAnalysisResult | null {
        // Instagram은 기본적으로 엔터테인먼트로 분류
        return {
            majorCategory: '엔터테인먼트',
            middleCategory: '소셜미디어',
            confidence: 0.5,
            source: 'url'
        };
    }

    /**
     * TikTok URL 분석
     */
    private analyzeTikTokUrl(url: string): CategoryAnalysisResult | null {
        // TikTok도 기본적으로 엔터테인먼트로 분류
        return {
            majorCategory: '엔터테인먼트',
            middleCategory: '숏폼 콘텐츠',
            confidence: 0.5,
            source: 'url'
        };
    }

    /**
     * 정규화 규칙 적용
     */
    private applyNormalizationRules(url: string): CategoryAnalysisResult | null {
        for (const [ruleId, rule] of Object.entries(this.normalizationRules)) {
            if (rule.keywords.some(keyword => url.toLowerCase().includes(keyword.toLowerCase()))) {
                const [majorCategory, middleCategory] = rule.targetCategory.split(' > ');
                return {
                    majorCategory: majorCategory || rule.targetCategory,
                    middleCategory: middleCategory || '',
                    confidence: rule.confidence,
                    source: 'url'
                };
            }
        }

        return null;
    }

    /**
     * 플랫폼별 카테고리 목록 반환
     */
    getCategoriesForPlatform(platform: string): string[] {
        const normalizedPlatform = platform.toLowerCase();
        return this.PLATFORM_CATEGORIES[normalizedPlatform as keyof typeof this.PLATFORM_CATEGORIES] ||
               this.PLATFORM_CATEGORIES.youtube;
    }

    /**
     * 카테고리 검증 및 추가
     */
    async verifyAndAddCategory(url: string, category: string, verifiedBy: string = 'system'): Promise<boolean> {
        try {
            const verifiedCategory: VerifiedCategory = {
                url,
                category,
                verifiedAt: new Date().toISOString(),
                verifiedBy
            };

            this.verifiedCategories[url] = verifiedCategory;

            // 파일에 저장
            await this.saveVerifiedCategories();

            ServerLogger.success(`카테고리 검증 추가: ${url} -> ${category}`, null, 'UNIFIED_CATEGORY');
            return true;

        } catch (error) {
            ServerLogger.error('카테고리 검증 추가 실패:', error);
            return false;
        }
    }

    /**
     * 카테고리 통계 업데이트
     */
    updateCategoryStats(category: string, isCorrect: boolean): void {
        if (!this.categoryStats[category]) {
            this.categoryStats[category] = {
                count: 0,
                accuracy: 0,
                lastUpdated: new Date().toISOString()
            };
        }

        const stats = this.categoryStats[category];
        const newCount = stats.count + 1;
        const newAccuracy = ((stats.accuracy * stats.count) + (isCorrect ? 1 : 0)) / newCount;

        this.categoryStats[category] = {
            count: newCount,
            accuracy: newAccuracy,
            lastUpdated: new Date().toISOString()
        };

        // 주기적으로 파일에 저장 (매 10회마다)
        if (newCount % 10 === 0) {
            this.saveCategoryStats();
        }
    }

    /**
     * 기본 카테고리 파일 생성
     */
    private createDefaultCategoriesFile(): void {
        const defaultConfig: CategoryConfig = {
            categories: {
                '게임': {
                    '플레이·리뷰': ['Let\'s Play', '신작 첫인상', '스피드런'],
                    '가이드·분석': ['공략', '세계관·스토리 해설'],
                    'e스포츠': ['프로 경기', '하이라이트']
                },
                '교육': {
                    '외국어 강의': ['영어', '일본어', '중국어'],
                    '학문·교양': ['역사', '경제', '심리'],
                    '자기계발·학습법': ['자기계발', '학습법']
                },
                '엔터테인먼트': {
                    '예능·밈·챌린지': ['예능', '밈', '챌린지'],
                    '연예 뉴스·K-culture': ['연예뉴스', 'K-culture']
                }
            },
            defaultCategory: { main: '미분류', middle: '기본' },
            version: '1.0.0'
        };

        const configDir = path.dirname(this.categoriesPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(this.categoriesPath, JSON.stringify(defaultConfig, null, 2));
        ServerLogger.info('기본 카테고리 파일 생성 완료', null, 'UNIFIED_CATEGORY');
    }

    /**
     * 기본 V2 카테고리 파일 생성
     */
    private createDefaultCategoriesV2File(): void {
        const defaultV2Config = {
            version: '2.0.0',
            categories: {},
            tags: {},
            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        };

        const configDir = path.dirname(this.categoriesV2Path);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(this.categoriesV2Path, JSON.stringify(defaultV2Config, null, 2));
        ServerLogger.info('기본 V2 카테고리 파일 생성 완료', null, 'UNIFIED_CATEGORY');
    }

    /**
     * 검증된 카테고리 저장
     */
    private async saveVerifiedCategories(): Promise<void> {
        try {
            const verifiedArray = Object.values(this.verifiedCategories);
            const configDir = path.dirname(this.verifiedCategoriesPath);

            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            fs.writeFileSync(this.verifiedCategoriesPath, JSON.stringify(verifiedArray, null, 2));
        } catch (error) {
            ServerLogger.error('검증된 카테고리 저장 실패:', error);
        }
    }

    /**
     * 카테고리 통계 저장
     */
    private async saveCategoryStats(): Promise<void> {
        try {
            const configDir = path.dirname(this.categoryStatsPath);

            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            fs.writeFileSync(this.categoryStatsPath, JSON.stringify(this.categoryStats, null, 2));
        } catch (error) {
            ServerLogger.error('카테고리 통계 저장 실패:', error);
        }
    }

    /**
     * 현재 모드 반환
     */
    getMode(): CategoryMode {
        return this.mode;
    }

    /**
     * 기본 카테고리 반환
     */
    getDefaultCategory(): { main: string; middle: string } {
        return { ...this.defaultCategory };
    }

    /**
     * 모든 카테고리 반환 (모드에 따라)
     */
    getAllCategories(): any {
        switch (this.mode) {
            case 'basic':
                return this.categories;
            case 'flexible':
                return this.categoriesV2;
            case 'dynamic':
            default:
                return this.categories || {};
        }
    }

    /**
     * 통계 정보 반환
     */
    getStats(): {
        mode: CategoryMode;
        verifiedCount: number;
        statsCount: number;
        totalCategories: number;
    } {
        return {
            mode: this.mode,
            verifiedCount: Object.keys(this.verifiedCategories).length,
            statsCount: Object.keys(this.categoryStats).length,
            totalCategories: Object.keys(this.getAllCategories()).length
        };
    }
}

export default UnifiedCategoryManager;