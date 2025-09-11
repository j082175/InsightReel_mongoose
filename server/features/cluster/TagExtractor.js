const { ServerLogger } = require('../../utils/logger');
const axios = require('axios');

/**
 * 🏷️ 태그 추출기
 * 채널 정보에서 AI로 의미있는 태그 추출
 */
class TagExtractor {
    constructor() {
        this.geminiApiKey = process.env.GOOGLE_API_KEY;
        this.tagCache = new Map(); // 캐싱으로 API 호출 최적화

        ServerLogger.info('🏷️ TagExtractor 초기화');
    }

    /**
     * 📊 채널에서 태그 추출
     */
    async extractFromChannel(channel, contentType = 'longform') {
        try {
            // 캐시 체크
            const cacheKey = `${channel.id}_${channel.name}`;
            if (this.tagCache.has(cacheKey)) {
                ServerLogger.info('📋 캐시된 태그 사용', {
                    channel: channel.name,
                });
                return this.tagCache.get(cacheKey);
            }

            ServerLogger.info('🤖 AI 태그 추출 시작', {
                channel: channel.name,
            });

            // Gemini API로 태그 추출
            const extractedTags = await this.extractWithGemini(
                channel,
                contentType,
            );

            // 추가 태그 추출 방법들
            const descriptiveTag = this.extractFromDescription(
                channel.description,
            );
            const nameTag = this.extractFromChannelName(
                channel.name,
            );

            // 태그 결합 및 정제
            const allTags = [
                ...new Set([...extractedTags, ...descriptiveTag, ...nameTag]),
            ];

            const cleanTags = this.cleanAndFilterTags(allTags);

            // 캐싱 (1시간)
            this.tagCache.set(cacheKey, cleanTags);
            setTimeout(() => this.tagCache.delete(cacheKey), 60 * 60 * 1000);

            ServerLogger.success('✅ 태그 추출 완료', {
                channel: channel.name,
                tagCount: cleanTags.length,
                tags: cleanTags.slice(0, 5).join(', '),
            });

            return cleanTags;
        } catch (error) {
            ServerLogger.error('❌ 태그 추출 실패', error);
            return this.getFallbackTags(channel);
        }
    }

    /**
     * 🤖 Gemini API로 태그 추출
     */
    async extractWithGemini(channel, contentType = 'longform') {
        try {
            // 콘텐츠 유형별 컨텍스트 추가
            const contentTypeContext = {
                longform: {
                    description: '롱폼 콘텐츠 (10분+ 영상)',
                    focus: '심화 분석, 완전 정복, 상세 설명, 강의, 튜토리얼',
                    keywords: [
                        '심화',
                        '완전정복',
                        '상세분석',
                        '강의',
                        '깊이있는',
                        '전문',
                    ],
                },
                shortform: {
                    description: '숏폼 콘텐츠 (1분 이하 짧은 영상)',
                    focus: '빠른 팁, 하이라이트, 요약, 트렌드, 간단 정보',
                    keywords: [
                        '팁',
                        '요약',
                        '하이라이트',
                        '트렌드',
                        '빠른',
                        '간단',
                    ],
                },
                mixed: {
                    description: '혼합형 콘텐츠 (롱폼 + 숏폼 병행)',
                    focus: '다양한 형태의 콘텐츠, 유연한 접근',
                    keywords: ['다양한', '유연한', '멀티', '종합'],
                },
            };

            const context =
                contentTypeContext[contentType] || contentTypeContext.longform;

            const prompt = `
다음 YouTube 채널의 특성을 분석해서 핵심 태그 5-8개를 추출해주세요.

채널명: ${channel.name}
설명: ${channel.description || '없음'}
구독자 수: ${channel.subscribers || 0}
사용자 정의 URL: ${channel.customUrl || '없음'}
콘텐츠 유형: ${context.description}

요구사항:
- 채널의 주요 콘텐츠 카테고리
- 대상 청중
- 콘텐츠 스타일 (특히 ${context.focus})
- 전문 분야
- ${contentType} 형태에 맞는 특성 반영

추천 키워드 유형: ${context.keywords.join(', ')}

응답 형식: ["태그1", "태그2", "태그3", ...]
한글 태그 우선, 간단명료하게.
`;

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiApiKey}`,
                {
                    contents: [
                        {
                            parts: [{ text: prompt }],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        topK: 10,
                        topP: 0.8,
                        maxOutputTokens: 200,
                    },
                },
            );

            const text = response.data.candidates[0].content.parts[0].text;

            // JSON 배열 추출
            const match = text.match(/\[([^\]]+)\]/);
            if (match) {
                const tagsString = match[1];
                const tags = tagsString
                    .split(',')
                    .map((tag) => tag.replace(/['"]/g, '').trim())
                    .filter((tag) => tag.length > 0);

                return tags;
            }

            return [];
        } catch (error) {
            ServerLogger.error('❌ Gemini API 태그 추출 실패', error);
            return [];
        }
    }

    /**
     * 📝 설명에서 태그 추출 (규칙 기반)
     */
    extractFromDescription(description) {
        if (!description) return [];

        const tags = [];

        // 해시태그 추출
        const hashtags = description.match(/#[\w가-힣]+/g) || [];
        tags.push(...hashtags.map((tag) => tag.replace('#', '')));

        // 키워드 패턴 매칭
        const keywordPatterns = {
            게임: ['게임', '게이밍', 'gaming', '플레이'],
            요리: ['요리', '레시피', 'cooking', '음식'],
            교육: ['교육', '강의', '학습', '튜토리얼'],
            리뷰: ['리뷰', 'review', '후기', '추천'],
            브이로그: ['브이로그', 'vlog', '일상', 'daily'],
            음악: ['음악', 'music', '노래', '커버'],
            스포츠: ['스포츠', 'sports', '운동', '헬스'],
            기술: ['기술', 'tech', 'IT', '프로그래밍'],
        };

        Object.entries(keywordPatterns).forEach(([category, patterns]) => {
            if (
                patterns.some((pattern) =>
                    description.toLowerCase().includes(pattern.toLowerCase()),
                )
            ) {
                tags.push(category);
            }
        });

        return [...new Set(tags)];
    }

    /**
     * 🏷️ 채널명에서 태그 추출
     */
    extractFromChannelName(channelName) {
        if (!channelName) return [];

        const tags = [];

        // 채널명 패턴 분석
        const namePatterns = {
            TV: ['방송', '미디어'],
            튜브: ['유튜브', '개인방송'],
            채널: ['방송', '콘텐츠'],
            리뷰: ['리뷰', '평가'],
            게임: ['게임', '게이밍'],
            요리: ['요리', '쿠킹'],
            키즈: ['어린이', '키즈'],
            Kids: ['어린이', '키즈'],
            뷰티: ['뷰티', '화장품'],
            피트니스: ['운동', '헬스'],
        };

        Object.entries(namePatterns).forEach(([pattern, resultTags]) => {
            if (channelName.includes(pattern)) {
                tags.push(...resultTags);
            }
        });

        return [...new Set(tags)];
    }

    /**
     * 🧹 태그 정제 및 필터링
     */
    cleanAndFilterTags(tags) {
        return tags
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
            .filter((tag) => tag.length <= 10) // 너무 긴 태그 제외
            .filter((tag) => !/^\d+$/.test(tag)) // 순수 숫자 제외
            .filter((tag) => !tag.includes('http')) // URL 제외
            .slice(0, 10); // 최대 10개
    }

    /**
     * 🆘 fallback 태그 (AI 실패시)
     */
    getFallbackTags(channel) {
        const fallbackTags = [];

        // 플랫폼 기본 태그
        fallbackTags.push(channel.platform || 'youtube');

        // 구독자 수 기반 태그
        if ((channel.subscribers || 0) > 1000000) {
            fallbackTags.push('대형채널');
        } else if ((channel.subscribers || 0) > 100000) {
            fallbackTags.push('중견채널');
        } else {
            fallbackTags.push('소형채널');
        }

        // 기본 카테고리
        fallbackTags.push('일반');

        return fallbackTags;
    }

    /**
     * 📊 태그 통계
     */
    getTagStatistics() {
        return {
            cacheSize: this.tagCache.size,
            cacheHitRate:
                this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
        };
    }
}

module.exports = TagExtractor;
