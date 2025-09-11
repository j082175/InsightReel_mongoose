import { CONSTANTS } from '../constants.js';
import { Utils, StringUtils, TimeUtils, DOMUtils } from '../utils.js';
import { BasePlatformHandler } from './base-handler.js';
import { ErrorHandler } from '../error-handler.js';

/**
 * Instagram 플랫폼 핸들러
 */
export class InstagramHandler extends BasePlatformHandler {
    constructor(apiClient, uiManager) {
        super(apiClient, uiManager, 'INSTAGRAM');

        // Instagram 특화 기능
        this.currentActiveVideo = null;
        this.videoObserver = null;
        this.setupVideoTracking();
        this.registerCleanupHandlers();
    }

    /**
     * Instagram 저장 버튼 기능 향상
     */
    enhanceSaveButtons() {
        if (this.shouldSkipEnhancement()) {
            return;
        }

        this.startProcessing();
        this.log('info', '저장 버튼 기능 향상 시작');

        // Instagram SPA 네비게이션 시 캐시 초기화
        this.clearProcessedItems('all');
        this.log('info', '🔄 SPA 대응: 처리된 요소 캐시 초기화');

        // 영상 추적 시스템 재시작
        this.observeExistingVideos();

        setTimeout(() => {
            ErrorHandler.safeExecute(async () => {
                this.processExistingSaveButtons();
                this.addAnalysisButtons();
            }, '저장 버튼 향상').finally(() => {
                this.endProcessing();
            });
        }, 1000);
    }

    /**
     * 현재 포스트의 메타데이터 추출
     */
    extractPostMetadata() {
        console.log('🔍 extractPostMetadata 함수 시작!');
        this.log('info', '🔍 extractPostMetadata 함수 시작');
        try {
            // 새 표준을 사용한 메타데이터 구조
            const metadata = {
                channelName: '',
                channelUrl: '', // ✅ 추가: 채널 URL 필드
                description: '',
                likes: '0',
                commentsCount: '0',
                hashtags: [],
                uploadDate: null,
            };

            // 작성자 및 채널 URL 추출
            const authorElements = [
                'header a[role="link"]',
                '[data-testid="user-avatar"] + a',
                'article header a',
            ];

            for (const selector of authorElements) {
                const authorElement = document.querySelector(selector);
                if (authorElement) {
                    // 작성자명 추출
                    const authorName =
                        authorElement.innerText.trim() ||
                        authorElement.href.split('/').filter((x) => x)[2] ||
                        '';
                    metadata.channelName = authorName;

                    // 채널 URL 생성
                    if (authorElement.href) {
                        metadata.channelUrl = authorElement.href;
                    } else if (authorName) {
                        // href가 없으면 작성자명으로 URL 구성
                        metadata.channelUrl = `https://www.instagram.com/${authorName}/`;
                    }

                    this.log('info', '작성자 정보 추출 완료', {
                        channelName: metadata.channelName,
                        channelUrl: metadata.channelUrl,
                    });
                    break;
                }
            }

            // 캡션 추출
            const captionElements = [
                '[data-testid="post-content"] span',
                'article div[data-testid="media-content"] + div span',
                '.x1lliihq span',
            ];

            for (const selector of captionElements) {
                const captionElement = document.querySelector(selector);
                if (captionElement) {
                    metadata.description = captionElement.innerText
                        .trim()
                        .substring(0, 200); // 200자 제한
                    break;
                }
            }

            // 좋아요 수와 댓글 수를 정확히 구분하여 추출
            this.extractEngagementData(metadata);

            // 해시태그 추출
            if (metadata.description) {
                const hashtagMatches =
                    metadata.description.match(/#[\w가-힣]+/g);
                if (hashtagMatches) {
                    metadata.hashtags = hashtagMatches;
                }
            }

            this.log('info', '메타데이터 추출 완료', {
                channelName: metadata.channelName,
                description: metadata.description?.substring(0, 50) + '...',
                likes: metadata.likes,
                commentsCount: metadata.commentsCount,
                hashtags: metadata.hashtags,
                uploadDate: metadata.uploadDate,
            });

            // 🔍 extractPostMetadata 반환 직전 디버깅
            console.log(
                '🔍 extractPostMetadata 반환 직전 metadata 전체:',
                JSON.stringify(metadata, null, 2),
            );
            console.log(
                '🔍 extractPostMetadata metadata 키들:',
                Object.keys(metadata),
            );

            return metadata;
        } catch (error) {
            this.log('error', '메타데이터 추출 실패', error);
            return {
                channelName: '',
                channelUrl: '', // ✅ 추가: 에러 상황에서도 채널 URL 필드 포함
                description: '',
                likes: '0',
                commentsCount: '0',
                hashtags: [],
            };
        }
    }

    /**
     * 좋아요 수와 댓글 수를 정확히 구분하여 추출
     */
    extractEngagementData(metadata) {
        try {
            // Instagram의 액션 섹션 찾기 (좋아요, 댓글, 공유, 저장 버튼이 있는 영역)
            const actionSections = [
                'section',
                'div[role="group"]',
                'article > div > div:last-child > section',
            ];

            let actionSection = null;
            for (const selector of actionSections) {
                actionSection = document.querySelector(selector);
                if (
                    actionSection &&
                    actionSection.querySelector('[aria-label*="좋아요"]')
                ) {
                    this.log('info', `액션 섹션 발견: ${selector}`);
                    break;
                }
            }

            if (!actionSection) {
                this.log(
                    'warn',
                    '액션 섹션을 찾을 수 없음, 전체 문서에서 검색',
                );
                actionSection = document;
            }

            // 업로드 날짜 추출 (좋아요/댓글 수와 함께)
            this.log('info', '📅 업로드 날짜 추출 시작...', {
                channelName: metadata.channelName,
            });
            this.extractUploadDate(metadata);
            this.log('info', '📅 업로드 날짜 추출 완료', {
                uploadDate: metadata.uploadDate,
            });

            // 방법 1: aria-label을 이용한 정확한 좋아요 수 추출
            const likeSelectors = [
                '[aria-label*="좋아요"] span',
                '[aria-label*="like"] span',
                'button[aria-label*="좋아요"] + div span',
                'button[aria-label*="like"] + div span',
            ];

            for (const selector of likeSelectors) {
                const likeElement = actionSection.querySelector(selector);
                if (likeElement) {
                    const likeText = likeElement.innerText.trim();
                    this.log(
                        'info',
                        `좋아요 후보 발견: "${likeText}" (선택자: ${selector})`,
                    );

                    // 숫자만 추출
                    const likeMatch = likeText.match(/[\d,]+/);
                    if (
                        likeMatch &&
                        !likeText.includes('댓글') &&
                        !likeText.includes('comment')
                    ) {
                        metadata.likes = likeMatch[0].replace(/,/g, '');
                        this.log('info', `좋아요 수 설정: ${metadata.likes}`);
                        break;
                    }
                }
            }

            // 방법 2: 댓글 수 추출
            const commentSelectors = [
                '[aria-label*="댓글"] span',
                '[aria-label*="comment"] span',
                'button[aria-label*="댓글"] + div span',
                'button[aria-label*="comment"] + div span',
                'a[href*="/comments/"] span',
            ];

            for (const selector of commentSelectors) {
                const commentElement = actionSection.querySelector(selector);
                if (commentElement) {
                    const commentText = commentElement.innerText.trim();
                    this.log(
                        'info',
                        `댓글 후보 발견: "${commentText}" (선택자: ${selector})`,
                    );

                    // 숫자만 추출
                    const commentMatch = commentText.match(/[\d,]+/);
                    if (
                        commentMatch &&
                        (commentText.includes('댓글') ||
                            commentText.includes('comment'))
                    ) {
                        metadata.commentsCount = commentMatch[0].replace(
                            /,/g,
                            '',
                        );
                        this.log(
                            'info',
                            `댓글 수 설정: ${metadata.commentsCount}`,
                        );
                        break;
                    }
                }
            }

            // 방법 3: 텍스트 패턴으로 구분하기 (fallback)
            if (metadata.likes === '0' || metadata.commentsCount === '0') {
                this.log('info', '대안 방법으로 좋아요/댓글 수 추출 시도');
                this.extractEngagementByText(actionSection, metadata);
            }

            this.log('info', '최종 추출 결과', {
                likes: metadata.likes,
                commentsCount: metadata.commentsCount,
            });
        } catch (error) {
            this.log('error', '좋아요/댓글 수 추출 실패', error);
        }
    }

    /**
     * 업로드 날짜 추출 (IG Sorter 데이터 우선 활용)
     */
    extractUploadDate(metadata) {
        this.log('info', '🔍 extractUploadDate 함수 시작', {
            channelName: metadata.channelName,
        });
        try {
            // 방법 1: IG Sorter 블록 데이터에서 날짜 추출
            const igSorterDate = this.getIGSorterUploadDate(
                metadata.channelName,
            );
            if (igSorterDate) {
                metadata.uploadDate = igSorterDate;
                this.log(
                    'info',
                    `업로드 날짜 추출 성공 (IG Sorter): ${igSorterDate}`,
                );
                return;
            }

            // 방법 2: Instagram 페이지의 time 요소들
            const dateSelectors = [
                'article header time',
                'article time',
                'time[datetime]',
                'time[title]',
                'header + div time',
                'article div time',
            ];

            for (const selector of dateSelectors) {
                const timeElement = document.querySelector(selector);
                if (timeElement) {
                    // datetime 속성 우선
                    if (
                        timeElement.dateTime ||
                        timeElement.getAttribute('datetime')
                    ) {
                        const datetime =
                            timeElement.dateTime ||
                            timeElement.getAttribute('datetime');
                        metadata.uploadDate = new Date(datetime).toISOString();
                        this.log(
                            'info',
                            `업로드 날짜 추출 성공 (datetime): ${datetime} -> ${metadata.uploadDate}`,
                        );
                        return;
                    }

                    // title 속성 확인
                    if (timeElement.title) {
                        try {
                            const parsedDate = new Date(timeElement.title);
                            if (!isNaN(parsedDate.getTime())) {
                                metadata.uploadDate = parsedDate.toISOString();
                                this.log(
                                    'info',
                                    `업로드 날짜 추출 성공 (title): ${timeElement.title} -> ${metadata.uploadDate}`,
                                );
                                return;
                            }
                        } catch (e) {}
                    }

                    // innerText에서 상대적 시간 파싱 ("1일 전", "2주 전" 등)
                    const timeText = timeElement.innerText.trim();
                    const parsedDate = this.parseRelativeDate(timeText);
                    if (parsedDate) {
                        metadata.uploadDate = parsedDate.toISOString();
                        this.log(
                            'info',
                            `업로드 날짜 추출 성공 (상대시간): ${timeText} -> ${metadata.uploadDate}`,
                        );
                        return;
                    }
                }
            }

            // 방법 3: 상대적 시간 텍스트를 전체 문서에서 검색
            const relativeTimeSelectors = ['span', 'div', 'a'];

            for (const selector of relativeTimeSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.innerText.trim();
                    // "1일 전", "2주 전", "3개월 전" 패턴 확인
                    if (this.isRelativeTimePattern(text)) {
                        const parsedDate = this.parseRelativeDate(text);
                        if (parsedDate) {
                            metadata.uploadDate = parsedDate.toISOString();
                            this.log(
                                'info',
                                `업로드 날짜 추출 성공 (패턴매칭): ${text} -> ${metadata.uploadDate}`,
                            );
                            return;
                        }
                    }
                }
            }

            this.log('warn', '업로드 날짜를 찾을 수 없음');
        } catch (error) {
            this.log('error', '업로드 날짜 추출 실패', error);
        }
    }

    /**
     * IG Sorter 데이터에서 업로드 날짜 추출
     * @param {string} username 계정명
     * @returns {string|null} ISO 날짜 문자열 또는 null
     */
    getIGSorterUploadDate(username) {
        try {
            this.log(
                'info',
                `🔍 IG Sorter에서 "${username}" 계정의 업로드 날짜 검색`,
            );

            if (!username) {
                this.log('warn', '계정명이 제공되지 않음');
                return null;
            }

            // IG Sorter가 생성한 요소들에서 해당 계정의 블록 찾기
            const allElements = document.querySelectorAll('*');

            for (const element of allElements) {
                const text = element.innerText || element.textContent || '';

                // IG Sorter 블록이고 해당 계정명을 포함하는 경우
                if (text.includes('IG Sorter') && text.includes(username)) {
                    this.log(
                        'info',
                        `📋 IG Sorter 블록 발견: ${text.substring(0, 200)}...`,
                    );

                    // 날짜 패턴 찾기 (YYYY-MM-DD 형식)
                    const dateMatches = text.match(/(\d{4}-\d{2}-\d{2})/g);
                    if (dateMatches && dateMatches.length > 0) {
                        const uploadDate = new Date(
                            dateMatches[0],
                        ).toISOString();
                        this.log(
                            'info',
                            `✅ IG Sorter에서 업로드 날짜 발견: ${dateMatches[0]} -> ${uploadDate}`,
                        );
                        return uploadDate;
                    }
                }

                // 계정명이 포함된 요소에서 날짜 패턴 찾기 (더 넓은 검색)
                if (text.includes(username)) {
                    const lines = text.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        // YYYY-MM-DD 패턴 찾기
                        if (line.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            const uploadDate = new Date(line).toISOString();
                            this.log(
                                'info',
                                `✅ 계정명 주변에서 업로드 날짜 발견: ${line} -> ${uploadDate}`,
                            );
                            return uploadDate;
                        }
                    }
                }
            }

            this.log(
                'info',
                `❌ IG Sorter에서 "${username}"의 업로드 날짜를 찾을 수 없음`,
            );
            return null;
        } catch (error) {
            this.log('error', 'IG Sorter 업로드 날짜 추출 실패', error);
            return null;
        }
    }

    /**
     * 상대적 시간 패턴 확인
     */
    isRelativeTimePattern(text) {
        const patterns = [
            /^\d+분\s*전$/,
            /^\d+시간\s*전$/,
            /^\d+일\s*전$/,
            /^\d+주\s*전$/,
            /^\d+개월\s*전$/,
            /^\d+년\s*전$/,
            /^\d+\s*minutes?\s*ago$/i,
            /^\d+\s*hours?\s*ago$/i,
            /^\d+\s*days?\s*ago$/i,
            /^\d+\s*weeks?\s*ago$/i,
            /^\d+\s*months?\s*ago$/i,
            /^\d+\s*years?\s*ago$/i,
        ];
        return patterns.some((pattern) => pattern.test(text));
    }

    /**
     * 상대적 시간 텍스트를 Date 객체로 변환
     */
    parseRelativeDate(timeText) {
        try {
            const now = new Date();

            // 한국어 패턴
            const koreanPatterns = [
                { pattern: /(\d+)분\s*전/, unit: 'minutes' },
                { pattern: /(\d+)시간\s*전/, unit: 'hours' },
                { pattern: /(\d+)일\s*전/, unit: 'days' },
                { pattern: /(\d+)주\s*전/, unit: 'weeks' },
                { pattern: /(\d+)개월\s*전/, unit: 'months' },
                { pattern: /(\d+)년\s*전/, unit: 'years' },
            ];

            // 영어 패턴
            const englishPatterns = [
                { pattern: /(\d+)\s*minutes?\s*ago/i, unit: 'minutes' },
                { pattern: /(\d+)\s*hours?\s*ago/i, unit: 'hours' },
                { pattern: /(\d+)\s*days?\s*ago/i, unit: 'days' },
                { pattern: /(\d+)\s*weeks?\s*ago/i, unit: 'weeks' },
                { pattern: /(\d+)\s*months?\s*ago/i, unit: 'months' },
                { pattern: /(\d+)\s*years?\s*ago/i, unit: 'years' },
            ];

            const allPatterns = [...koreanPatterns, ...englishPatterns];

            for (const { pattern, unit } of allPatterns) {
                const match = timeText.match(pattern);
                if (match) {
                    const amount = parseInt(match[1]);
                    const date = new Date(now);

                    switch (unit) {
                        case 'minutes':
                            date.setMinutes(date.getMinutes() - amount);
                            break;
                        case 'hours':
                            date.setHours(date.getHours() - amount);
                            break;
                        case 'days':
                            date.setDate(date.getDate() - amount);
                            break;
                        case 'weeks':
                            date.setDate(date.getDate() - amount * 7);
                            break;
                        case 'months':
                            date.setMonth(date.getMonth() - amount);
                            break;
                        case 'years':
                            date.setFullYear(date.getFullYear() - amount);
                            break;
                    }

                    return date;
                }
            }

            return null;
        } catch (error) {
            this.log('error', '상대적 시간 파싱 실패', { timeText, error });
            return null;
        }
    }

    /**
     * 텍스트 패턴을 이용한 좋아요/댓글 수 추출 (fallback 방법)
     */
    extractEngagementByText(container, metadata) {
        try {
            // 모든 span 요소에서 숫자가 포함된 텍스트 찾기
            const spans = container.querySelectorAll('span');

            for (const span of spans) {
                const text = span.innerText.trim();
                const numberMatch = text.match(/[\d,]+/);

                if (numberMatch) {
                    const number = numberMatch[0].replace(/,/g, '');

                    // 좋아요 관련 키워드 체크
                    if (
                        (text.includes('좋아요') || text.includes('like')) &&
                        !text.includes('댓글') &&
                        !text.includes('comment') &&
                        metadata.likes === '0'
                    ) {
                        metadata.likes = number;
                        this.log(
                            'info',
                            `텍스트 패턴으로 좋아요 수 발견: ${number} ("${text}")`,
                        );
                    }

                    // 댓글 관련 키워드 체크
                    if (
                        (text.includes('댓글') || text.includes('comment')) &&
                        !text.includes('좋아요') &&
                        !text.includes('like') &&
                        metadata.commentsCount === '0'
                    ) {
                        metadata.commentsCount = number;
                        this.log(
                            'info',
                            `텍스트 패턴으로 댓글 수 발견: ${number} ("${text}")`,
                        );
                    }
                }
            }
        } catch (error) {
            this.log('error', '텍스트 패턴 추출 실패', error);
        }
    }

    /**
     * 향상 작업을 건너뛸지 확인
     * @returns {boolean} 건너뛸지 여부
     */
    shouldSkipEnhancement() {
        if (this.isProcessing) {
            this.log('info', '이미 처리 중이므로 스킵');
            return true;
        }

        const now = Date.now();
        if (
            now - this.lastEnhancementTime <
            CONSTANTS.TIMEOUTS.ENHANCEMENT_THROTTLE
        ) {
            this.log('info', '쓰로틀링으로 인해 스킵');
            return true;
        }

        return false;
    }

    /**
     * 기존 저장 버튼들 처리
     */
    processExistingSaveButtons() {
        const saveButtons = Utils.safeQuerySelectorAll(
            document,
            CONSTANTS.SELECTORS.INSTAGRAM.SAVE_BUTTONS,
        );
        this.log('info', `발견된 저장 버튼 수: ${saveButtons.length}`);

        let newButtonsEnhanced = 0;

        saveButtons.forEach((svg, index) => {
            try {
                if (this.enhanceSingleButton(svg, index)) {
                    newButtonsEnhanced++;
                }
            } catch (error) {
                this.log('error', `버튼 ${index + 1} 향상 실패`, error);
            }
        });

        this.log('info', `새로 향상된 저장 버튼: ${newButtonsEnhanced}개`);
    }

    /**
     * 단일 저장 버튼 향상
     * @param {Element} svg SVG 요소
     * @param {number} index 버튼 인덱스
     * @returns {boolean} 성공 여부
     */
    enhanceSingleButton(svg, index) {
        const button = this.findButtonElement(svg);
        if (!button) {
            this.log('warn', `버튼 ${index + 1}: 버튼 요소를 찾을 수 없음`);
            return false;
        }

        const buttonId = this.generateUniqueId(button, 'instagram_btn');
        if (this.isProcessed(buttonId, 'button')) {
            this.log('info', `버튼 ${index + 1}: 이미 처리된 버튼`);
            return false;
        }

        const { post, video } = this.findPostAndVideo(button);
        if (!video) {
            this.log('warn', `버튼 ${index + 1}: 연결된 비디오를 찾을 수 없음`);
            return false;
        }

        this.enhanceButtonWithVideoAnalysis(button, post, video, index);
        this.markAsProcessed(buttonId, 'button');
        return true;
    }

    /**
     * 버튼 요소 찾기
     * @param {Element} svg SVG 요소
     * @returns {Element|null} 버튼 요소
     */
    findButtonElement(svg) {
        return (
            svg.closest('button') ||
            svg.closest('div[role="button"]') ||
            svg.parentElement ||
            svg.parentElement?.parentElement
        );
    }

    /**
     * 게시물과 비디오 찾기
     * @param {Element} button 버튼 요소
     * @returns {Object} {post, video} 객체
     */
    findPostAndVideo(button) {
        let post = this.findPostContainer(button);
        let video = post?.querySelector(CONSTANTS.SELECTORS.INSTAGRAM.VIDEOS);

        // 게시물에서 비디오를 찾지 못하면 다른 방법 시도
        if (!video) {
            video = this.findVideoByVisibility();
        }

        return { post, video };
    }

    /**
     * 게시물 컨테이너 찾기
     * @param {Element} button 버튼 요소
     * @returns {Element|null} 게시물 컨테이너
     */
    findPostContainer(button) {
        // 여러 방법으로 게시물 컨테이너 찾기
        let post = button.closest('article');

        if (!post) {
            post = button.closest('div[role="presentation"]');
        }

        if (!post) {
            // 상위 10개 요소까지 탐색
            let current = button;
            for (let i = 0; i < 10; i++) {
                current = current.parentElement;
                if (!current) break;
                if (
                    current.tagName === 'ARTICLE' ||
                    current.hasAttribute('role')
                ) {
                    post = current;
                    break;
                }
            }
        }

        return post;
    }

    /**
     * 현재 활성 비디오 추적 시스템 설정 (개선된 버전)
     */
    setupVideoTracking() {
        // 네트워크 요청 감지 설정
        this.setupNetworkInterception();

        // IntersectionObserver로 화면 중앙 영상 감지
        this.videoObserver = new IntersectionObserver(
            (entries) => {
                let mostVisibleVideo = null;
                let maxVisibility = 0;

                entries.forEach((entry) => {
                    if (
                        entry.isIntersecting &&
                        entry.target.tagName === 'VIDEO'
                    ) {
                        const visibilityRatio = entry.intersectionRatio;

                        // 가장 많이 보이는 영상을 현재 활성 영상으로 설정
                        if (visibilityRatio > maxVisibility) {
                            maxVisibility = visibilityRatio;
                            mostVisibleVideo = entry.target;
                        }
                    }
                });

                if (
                    mostVisibleVideo &&
                    this.currentActiveVideo !== mostVisibleVideo
                ) {
                    this.currentActiveVideo = mostVisibleVideo;

                    // Instagram downloader 방식으로 미디어 정보 조회
                    const mediaInfo =
                        this.getMediaInfoForVideo(mostVisibleVideo);

                    this.log('info', '활성 영상 변경됨', {
                        videoSrc:
                            mostVisibleVideo.src?.substring(0, 50) + '...',
                        mediaCode: mediaInfo?.code,
                        realVideoUrl:
                            mediaInfo?.video_url?.substring(0, 50) + '...',
                        visibility: maxVisibility,
                    });
                }
            },
            {
                threshold: [0.1, 0.3, 0.5, 0.7, 0.9], // 다양한 가시성 임계값
                rootMargin: '0px',
            },
        );

        // 기존 영상들 관찰 시작
        this.observeExistingVideos();

        // 새로운 영상이 동적으로 추가될 때를 대비한 MutationObserver
        this.setupVideoMutationObserver();
    }

    /**
     * 네트워크 요청 감지 설정 (Instagram downloader 방식 개선)
     */
    setupNetworkInterception() {
        // 3중 매핑 시스템 (Instagram downloader 방식)
        this.mediaData = {}; // shortcode -> 완전한 미디어 정보
        this.mediaIdMap = {}; // media ID -> shortcode
        this.fbIdMap = {}; // FB ID -> shortcode

        // XMLHttpRequest 후킹 (Instagram downloader의 핵심 방식)
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        const instagramHandler = this; // Instagram 핸들러 인스턴스 참조

        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            this._url = url;
            return originalXHROpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (data) {
            this.addEventListener('load', function () {
                if (this.status >= 200 && this.status < 300) {
                    try {
                        // Instagram API 응답 감지 및 처리
                        if (this.responseURL.includes('/graphql/query')) {
                            const responseData = JSON.parse(this.responseText);
                            instagramHandler.processGraphQLResponse(
                                responseData,
                            );
                        } else if (
                            this.responseURL.includes('/api/v1/media/') &&
                            this.responseURL.includes('/info/')
                        ) {
                            const responseData = JSON.parse(this.responseText);
                            instagramHandler.processMediaInfoResponse(
                                responseData,
                            );
                        } else if (this.responseURL.includes('/api/v1/feed/')) {
                            const responseData = JSON.parse(this.responseText);
                            instagramHandler.processFeedResponse(responseData);
                        }
                    } catch (error) {
                        // JSON 파싱 실패는 무시
                    }
                }
            });

            return originalXHRSend.apply(this, arguments);
        };

        // JSON Script 태그에서 초기 데이터 추출
        this.extractFromPageData();
    }

    /**
     * GraphQL 응답 처리
     */
    processGraphQLResponse(data) {
        this.extractMediaFromAnyLevel(data);
    }

    /**
     * 미디어 정보 API 응답 처리
     */
    processMediaInfoResponse(data) {
        if (data.items) {
            data.items.forEach((item) => this.storeMediaInfo(item));
        }
    }

    /**
     * 피드 API 응답 처리
     */
    processFeedResponse(data) {
        if (data.items) {
            data.items.forEach((item) => {
                if (item.media) this.storeMediaInfo(item.media);
                else this.storeMediaInfo(item);
            });
        }
    }

    /**
     * 미디어 정보 저장 (Instagram downloader 방식)
     */
    storeMediaInfo(mediaItem) {
        if (!mediaItem?.code || !mediaItem?.like_count) return;

        const shortcode = mediaItem.code;

        // 이미 저장된 경우 업데이트만
        if (this.mediaData[shortcode]) {
            this.updateExistingMedia(this.mediaData[shortcode], mediaItem);
            return;
        }

        // 새 미디어 정보 생성
        const mediaInfo = {
            code: shortcode,
            created_at: mediaItem?.caption?.created_at || mediaItem?.taken_at,
            like_count: mediaItem.like_count,
            comment_count: mediaItem.comment_count,
            play_count:
                mediaItem?.ig_play_count ||
                mediaItem?.play_count ||
                mediaItem?.view_count,
            username:
                mediaItem?.caption?.user?.username ||
                mediaItem?.owner?.username ||
                mediaItem?.user?.username,
            video_url: mediaItem?.video_versions?.[0]?.url,
            img_origin: mediaItem?.image_versions2?.candidates?.[0]?.url,
        };

        // 캐러셀 미디어 처리
        if (mediaItem?.carousel_media) {
            mediaInfo.carousel_media = mediaItem.carousel_media
                .map((item) => [
                    item?.video_versions?.[0]?.url,
                    item?.image_versions2?.candidates?.[0]?.url,
                ])
                .flat()
                .filter((url) => url)
                .join('\n');
        }

        this.mediaData[shortcode] = mediaInfo;

        // ID 매핑 생성
        if (mediaItem.id) this.mediaIdMap[mediaItem.id] = shortcode;
        if (mediaItem.pk) this.fbIdMap[mediaItem.pk] = shortcode;

        this.log('info', '미디어 정보 저장됨', {
            shortcode,
            url: mediaInfo.video_url?.substring(0, 50) + '...',
            hasCarousel: !!mediaInfo.carousel_media,
        });
    }

    /**
     * 기존 미디어 정보 업데이트
     */
    updateExistingMedia(existing, newData) {
        if (!existing.video_url && newData?.video_versions?.[0]?.url) {
            existing.video_url = newData.video_versions[0].url;
        }
        if (
            !existing.created_at &&
            (newData?.caption?.created_at || newData?.taken_at)
        ) {
            existing.created_at =
                newData.caption?.created_at || newData.taken_at;
        }
        if (
            !existing.username &&
            (newData?.caption?.user?.username || newData?.owner?.username)
        ) {
            existing.username =
                newData.caption?.user?.username || newData.owner?.username;
        }
    }

    /**
     * 재귀적으로 모든 레벨에서 미디어 추출 (Instagram downloader 방식)
     */
    extractMediaFromAnyLevel(obj, depth = 0) {
        if (depth > 15 || !obj || typeof obj !== 'object') return;

        // 미디어 객체 직접 감지
        if (obj.code && obj.like_count) {
            this.storeMediaInfo(obj);
        }

        // 다양한 Instagram API 구조 처리
        if (obj.data) {
            // GraphQL 응답의 data 섹션
            this.processDataSection(obj.data);
        }

        // 재귀적으로 모든 속성 탐색
        for (const key in obj) {
            if (
                obj.hasOwnProperty(key) &&
                obj[key] &&
                typeof obj[key] === 'object'
            ) {
                this.extractMediaFromAnyLevel(obj[key], depth + 1);
            }
        }
    }

    /**
     * GraphQL data 섹션 처리
     */
    processDataSection(data) {
        // 피드 타임라인 처리
        if (data.xdt_api__v1__feed__timeline__connection?.edges) {
            data.xdt_api__v1__feed__timeline__connection.edges.forEach(
                (edge) => {
                    if (edge.node?.media) {
                        this.storeMediaInfo(edge.node.media);
                    }
                },
            );
        }

        // 릴스 피드 처리
        if (data.xdt_api__v1__clips__home__connection_v2?.edges) {
            data.xdt_api__v1__clips__home__connection_v2.edges.forEach(
                (edge) => {
                    if (edge.node?.media) {
                        this.storeMediaInfo(edge.node.media);
                    } else if (edge.node) {
                        this.storeMediaInfo(edge.node);
                    }
                },
            );
        }

        // 단일 포스트 정보
        if (data.xdt_api__v1__media__shortcode__web_info?.items) {
            data.xdt_api__v1__media__shortcode__web_info.items.forEach(
                (item) => {
                    this.storeMediaInfo(item);
                },
            );
        }

        // 사용자 타임라인
        if (data.xdt_api__v1__feed__user_timeline_graphql_connection?.edges) {
            data.xdt_api__v1__feed__user_timeline_graphql_connection.edges.forEach(
                (edge) => {
                    this.storeMediaInfo(edge.node);
                },
            );
        }
    }

    /**
     * 페이지 데이터에서 초기 미디어 정보 추출
     */
    extractFromPageData() {
        // Instagram이 페이지에 포함하는 JSON 스크립트 태그 파싱
        const scriptTags = document.querySelectorAll(
            'script[type="application/json"]',
        );

        for (const script of scriptTags) {
            try {
                const data = JSON.parse(script.textContent);
                this.extractMediaFromAnyLevel(data);
            } catch (error) {
                // JSON 파싱 실패는 무시
            }
        }
    }

    /**
     * React Props에서 미디어 정보 추출 (Instagram downloader 방식)
     */
    getReactPropsFromElement(element) {
        for (const key in element) {
            if (key.startsWith('__reactProps$')) {
                return element[key];
            }
        }
        return null;
    }

    /**
     * React Props를 통한 미디어 정보 찾기
     */
    findMediaFromReactProps(element, maxDepth = 15) {
        let current = element;

        for (let depth = 0; depth <= maxDepth && current; depth++) {
            const reactProps = this.getReactPropsFromElement(current);

            if (reactProps?.children?.props) {
                const props = reactProps.children.props;

                // 다양한 ID로 미디어 정보 찾기
                if (props.videoFBID && this.fbIdMap[props.videoFBID]) {
                    return this.mediaData[this.fbIdMap[props.videoFBID]];
                }
                if (
                    props.media$key?.id &&
                    this.mediaIdMap[props.media$key.id]
                ) {
                    return this.mediaData[this.mediaIdMap[props.media$key.id]];
                }
                if (props.post?.id && this.fbIdMap[props.post.id]) {
                    return this.mediaData[this.fbIdMap[props.post.id]];
                }
                if (props.post?.code) {
                    return this.mediaData[props.post.code];
                }
                if (props.href) {
                    const shortcode = this.extractShortcodeFromUrl(props.href);
                    return this.mediaData[shortcode];
                }
            }

            current = current.parentElement;
        }

        return null;
    }

    /**
     * URL에서 shortcode 추출
     */
    extractShortcodeFromUrl(url) {
        const match = url.match(/\/p\/([A-Za-z0-9_-]+)/);
        return match ? match[1] : null;
    }

    /**
     * 비디오 요소에서 포스트 ID 추출
     */
    extractPostId(videoElement) {
        // 여러 방법으로 포스트 ID 추출 시도
        let postId = null;

        // 방법 1: URL에서 추출
        const currentUrl = window.location.href;
        const urlMatch = currentUrl.match(/\/p\/([A-Za-z0-9_-]+)/);
        if (urlMatch) {
            postId = urlMatch[1];
        }

        // 방법 2: article 요소의 data 속성에서 추출
        if (!postId) {
            const article = videoElement.closest('article');
            if (article) {
                // 다양한 data 속성 확인
                const dataKeys = ['data-testid', 'data-id', 'data-shortcode'];
                for (const key of dataKeys) {
                    const value = article.getAttribute(key);
                    if (value && value.length > 5) {
                        postId = value;
                        break;
                    }
                }
            }
        }

        // 방법 3: href 링크에서 추출
        if (!postId) {
            const article = videoElement.closest('article');
            const links = article?.querySelectorAll('a[href*="/p/"]');
            if (links && links.length > 0) {
                const href = links[0].href;
                const hrefMatch = href.match(/\/p\/([A-Za-z0-9_-]+)/);
                if (hrefMatch) {
                    postId = hrefMatch[1];
                }
            }
        }

        return postId;
    }

    /**
     * 다중 방법으로 미디어 정보 조회 (Instagram downloader 방식)
     */
    getMediaInfoForVideo(videoElement) {
        // 방법 1: React Props에서 찾기
        const mediaFromProps = this.findMediaFromReactProps(videoElement);
        if (mediaFromProps) {
            this.log('info', 'React Props에서 미디어 발견', {
                code: mediaFromProps.code,
            });
            return mediaFromProps;
        }

        // 방법 2: URL에서 shortcode 추출해서 찾기
        const shortcode = this.extractPostId(videoElement);
        if (shortcode && this.mediaData[shortcode]) {
            this.log('info', 'shortcode로 미디어 발견', { shortcode });
            return this.mediaData[shortcode];
        }

        // 방법 3: 현재 페이지 URL에서 찾기
        const urlShortcode = this.extractShortcodeFromUrl(window.location.href);
        if (urlShortcode && this.mediaData[urlShortcode]) {
            this.log('info', '페이지 URL에서 미디어 발견', {
                shortcode: urlShortcode,
            });
            return this.mediaData[urlShortcode];
        }

        // 방법 4: 가장 최근에 로드된 미디어 중 비디오가 있는 것 찾기
        const recentMediaWithVideo = Object.values(this.mediaData)
            .filter((media) => media.video_url)
            .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))[0];

        if (recentMediaWithVideo) {
            this.log('info', '최근 비디오 미디어 사용', {
                code: recentMediaWithVideo.code,
            });
            return recentMediaWithVideo;
        }

        return null;
    }

    /**
     * 실제 미디어 URL 조회 (우선순위 기반)
     */
    getMediaUrlForPost(postId) {
        const mediaInfo = this.getMediaInfoForVideo({ closest: () => null }); // 임시 객체
        return mediaInfo?.video_url || null;
    }

    /**
     * 기존 영상들에 대한 관찰 시작
     */
    observeExistingVideos() {
        const videos = Utils.safeQuerySelectorAll(
            document,
            CONSTANTS.SELECTORS.INSTAGRAM.VIDEOS,
        );
        videos.forEach((video) => {
            this.videoObserver.observe(video);
        });
        this.log('info', `${videos.length}개의 기존 영상 관찰 시작`);
    }

    /**
     * 새로운 영상 추가 감지를 위한 MutationObserver 설정
     */
    setupVideoMutationObserver() {
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 새로 추가된 영상 요소 찾기
                        const newVideos =
                            node.tagName === 'VIDEO'
                                ? [node]
                                : node.querySelectorAll
                                ? Array.from(node.querySelectorAll('video'))
                                : [];

                        newVideos.forEach((video) => {
                            this.videoObserver.observe(video);
                            this.log('info', '새로운 영상 감지 및 관찰 시작', {
                                src: video.src?.substring(0, 50) + '...',
                            });
                        });
                    }
                });
            });
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    /**
     * 가시성으로 비디오 찾기 (개선된 버전)
     * @returns {Element|null} 비디오 요소
     */
    findVideoByVisibility() {
        // 현재 추적 중인 활성 영상이 있으면 우선 반환
        if (
            this.currentActiveVideo &&
            Utils.isElementVisible(this.currentActiveVideo)
        ) {
            this.log('info', '현재 활성 영상 사용');
            return this.currentActiveVideo;
        }

        // 활성 영상이 없거나 보이지 않으면 기존 로직 사용
        const allVideos = Utils.safeQuerySelectorAll(
            document,
            CONSTANTS.SELECTORS.INSTAGRAM.VIDEOS,
        );

        // 현재 뷰포트에 보이는 비디오 중 가장 많이 보이는 것 찾기
        let bestVideo = null;
        let maxVisibility = 0;

        for (const video of allVideos) {
            if (Utils.isElementVisible(video)) {
                const rect = video.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;

                // 화면 중앙에 얼마나 가까운지 계산
                const centerX = viewportWidth / 2;
                const centerY = viewportHeight / 2;
                const videoCenterX = rect.left + rect.width / 2;
                const videoCenterY = rect.top + rect.height / 2;

                const distanceFromCenter = Math.sqrt(
                    Math.pow(centerX - videoCenterX, 2) +
                        Math.pow(centerY - videoCenterY, 2),
                );

                // 거리가 가까울수록 높은 점수 (역수 사용)
                const visibility = 1 / (distanceFromCenter + 1);

                if (visibility > maxVisibility) {
                    maxVisibility = visibility;
                    bestVideo = video;
                }
            }
        }

        return bestVideo || allVideos[0] || null;
    }

    /**
     * 버튼에 비디오 분석 기능 추가
     * @param {Element} button 버튼 요소
     * @param {Element} post 게시물 요소
     * @param {Element} video 비디오 요소
     * @param {number} index 버튼 인덱스
     */
    enhanceButtonWithVideoAnalysis(button, post, video, index) {
        this.log('info', `저장 버튼 ${index + 1}에 영상 분석 기능 추가`);

        const clickHandler = this.createClickHandler(post, video);
        button.addEventListener('click', clickHandler, false);

        this.uiManager.addEnhancementIndicator(button);

        // 글로벌 테스트 함수 (개발 중에만)
        if (typeof window !== 'undefined') {
            window.testVideoAnalysis = () => {
                this.log('info', '수동 테스트 실행');
                clickHandler({ type: 'manual_test' });
            };
        }
    }

    /**
     * 클릭 핸들러 생성
     * @param {Element} post 게시물 요소
     * @param {Element} video 비디오 요소
     * @returns {Function} 클릭 핸들러
     */
    createClickHandler(post, video) {
        let isProcessing = false;

        return async (event) => {
            if (isProcessing) {
                this.log('info', '이미 처리 중이므로 스킵');
                return;
            }

            isProcessing = true;
            this.log('info', 'Instagram 저장 버튼 클릭 이벤트 감지');

            // 자동 분석 설정 확인
            const isAutoAnalysisEnabled =
                await this.settingsManager.isAutoAnalysisEnabled();
            this.log('info', `자동 분석 설정: ${isAutoAnalysisEnabled}`);

            if (isAutoAnalysisEnabled) {
                this.log('info', '자동 분석 실행됨');
                try {
                    await Utils.delay(CONSTANTS.TIMEOUTS.PROCESSING_DELAY);
                    await this.processVideoFromSaveAction(post, video);
                } catch (error) {
                    this.log('error', '자동 분석 실패', error);
                    this.uiManager.showNotification(
                        `Instagram 저장은 완료되었지만 AI 분석에 실패했습니다: ${error.message}`,
                        CONSTANTS.NOTIFICATION_TYPES.WARNING,
                    );
                }
            } else {
                // 자동 분석이 비활성화된 경우 저장만 완료 알림
                this.log('info', '자동 분석 비활성화됨 - 저장만 완료');
                this.uiManager.showNotification(
                    '✅ 영상이 Instagram에 저장되었습니다!',
                    CONSTANTS.NOTIFICATION_TYPES.SUCCESS,
                );
            }

            // 5초 후 처리 플래그 해제
            setTimeout(() => {
                isProcessing = false;
            }, 5000);
        };
    }

    /**
     * 저장 액션에서 비디오 처리 (개선된 버전)
     * @param {Element} post 게시물 요소
     * @param {Element} video 비디오 요소
     */
    async processVideoFromSaveAction(post, video) {
        // 1. 기본 정보 수집
        let url = video.src || video.currentSrc;
        const postUrl = window.location.href;
        const metadata = this.extractMetadata(post);

        // 2. Instagram downloader 방식으로 실제 미디어 정보 조회
        const mediaInfo = this.getMediaInfoForVideo(video);

        // 3. 실제 미디어 URL이 있으면 우선 사용
        if (mediaInfo?.video_url && !mediaInfo.video_url.startsWith('blob:')) {
            this.log('info', '실제 미디어 URL 사용', {
                code: mediaInfo.code,
                originalUrl: url?.substring(0, 50) + '...',
                realUrl: mediaInfo.video_url.substring(0, 50) + '...',
            });
            url = mediaInfo.video_url;
        }

        this.log('info', '저장된 영상 분석 시작', {
            code: mediaInfo?.code,
            url: url?.substring(0, 50) + '...',
            postUrl,
        });

        if (!url) {
            throw new Error('비디오 URL을 찾을 수 없습니다.');
        }

        // 4. URL 타입에 따른 처리
        if (url.startsWith('blob:')) {
            await this.processBlobVideo(url, postUrl, metadata, video);
        } else {
            await this.processRegularVideo(url, postUrl, metadata);
        }

        this.uiManager.showNotification(
            '✅ 영상이 Instagram에 저장되고 AI 분석도 완료되었습니다!',
            CONSTANTS.NOTIFICATION_TYPES.SUCCESS,
        );
    }

    /**
     * Blob 비디오 처리 (Video Element 방식)
     * @param {string} url Blob URL (참조용)
     * @param {string} postUrl 게시물 URL
     * @param {Object} metadata 메타데이터
     * @param {HTMLVideoElement} videoElement 비디오 요소
     */
    async processBlobVideo(url, postUrl, metadata, videoElement = null) {
        this.log('info', 'blob URL 감지 - Video Element에서 직접 캡처 시도');

        let videoBlob;

        try {
            // 먼저 blob URL로 다운로드 시도
            videoBlob = await this.apiClient.downloadBlobVideo(url);
        } catch (blobError) {
            this.log(
                'warn',
                'Blob URL 다운로드 실패, Video Element 방식으로 대체',
                blobError,
            );

            // 실패 시 Video Element에서 프레임 캡처
            if (videoElement) {
                videoBlob = await this.apiClient.captureVideoFrame(
                    videoElement,
                );
                this.log('info', 'Video Element에서 프레임 캡처 성공');
            } else {
                throw new Error(
                    'Video Element를 찾을 수 없어 프레임 캡처 불가',
                );
            }
        }

        const result = await this.callApiWithDuplicateCheck(
            this.apiClient.processVideoBlob,
            {
                platform: CONSTANTS.PLATFORMS.INSTAGRAM,
                videoBlob,
                postUrl,
                metadata,
            },
        );

        if (result === null) {
            // 중복 URL로 인한 처리 중단
            this.log('info', '중복 URL로 인해 Blob 처리 중단됨');
            return;
        }

        this.log('success', '영상 Blob 처리 완료', result);
    }

    /**
     * 일반 비디오 처리
     * @param {string} url 비디오 URL
     * @param {string} postUrl 게시물 URL
     * @param {Object} metadata 메타데이터
     */
    async processRegularVideo(url, postUrl, metadata) {
        const result = await this.callApiWithDuplicateCheck(
            this.apiClient.processVideo,
            {
                platform: CONSTANTS.PLATFORMS.INSTAGRAM,
                url,
                postUrl,
                metadata,
            },
        );

        if (result === null) {
            // 중복 URL로 인한 처리 중단
            this.log('info', '중복 URL로 인해 처리 중단됨');
            return;
        }

        this.log('success', '영상 처리 완료', result);
    }

    /**
     * Instagram 메타데이터 추출
     * @param {Element} post 게시물 요소
     * @returns {Object} 메타데이터
     */
    extractMetadata(post) {
        console.log('🔍 extractMetadata 함수 시작!', post);
        this.log('info', '🔍 extractMetadata 함수 시작', { post: !!post });
        if (!post) {
            return { timestamp: new Date().toISOString() };
        }

        try {
            // 현재 활성 포스트의 메타데이터 추출 (개선된 방법 사용)
            const currentMetadata = this.extractPostMetadata();

            this.log('info', '추출된 메타데이터 (extractMetadata)', {
                channelName: currentMetadata.channelName,
                channelUrl: currentMetadata.channelUrl, // channelUrl 로깅 추가
                description:
                    currentMetadata.description?.substring(0, 50) + '...',
                likes: currentMetadata.likes,
                commentsCount: currentMetadata.commentsCount,
                hashtags: currentMetadata.hashtags,
                uploadDate: currentMetadata.uploadDate,
            });

            const finalMetadata = {
                channelName: currentMetadata.channelName,
                channelUrl: currentMetadata.channelUrl, // 누락된 channelUrl 추가!
                description: currentMetadata.description,
                likes: currentMetadata.likes,
                commentsCount: currentMetadata.commentsCount,
                hashtags: currentMetadata.hashtags,
                uploadDate: currentMetadata.uploadDate,
                timestamp: new Date().toISOString(),
            };

            // 🔍 추가 필드들 디버깅
            console.log(
                '🔍 extractMetadata 최종 반환 전 finalMetadata:',
                JSON.stringify(finalMetadata, null, 2),
            );
            console.log(
                '🔍 extractMetadata 최종 반환 전 currentMetadata 전체:',
                JSON.stringify(currentMetadata, null, 2),
            );

            return finalMetadata;
        } catch (error) {
            this.log('error', '인스타그램 메타데이터 추출 실패', error);
            return { timestamp: new Date().toISOString() };
        }
    }

    /**
     * 수동으로 저장 버튼 추가 (대안 방법)
     */
    addCustomSaveButtons() {
        this.log('info', 'Instagram 커스텀 저장 버튼 추가 시도');

        const videos = Utils.safeQuerySelectorAll(
            document,
            CONSTANTS.SELECTORS.INSTAGRAM.VIDEOS,
        );
        this.log('info', `전체 비디오 요소 수: ${videos.length}`);

        videos.forEach((video, index) => {
            try {
                this.addCustomButtonToVideo(video, index);
            } catch (error) {
                this.log(
                    'error',
                    `비디오 ${index + 1} 커스텀 버튼 추가 실패`,
                    error,
                );
            }
        });
    }

    /**
     * 비디오에 커스텀 버튼 추가
     * @param {Element} video 비디오 요소
     * @param {number} index 인덱스
     */
    addCustomButtonToVideo(video, index) {
        // 이미 버튼이 있는지 확인
        const existingButton = video
            .closest('div')
            .querySelector('.video-save-button');
        if (existingButton) {
            this.log('info', `비디오 ${index + 1}: 이미 버튼이 있음`);
            return;
        }

        const container = video.closest('article') || video.parentElement;
        if (!container) {
            this.log(
                'warn',
                `비디오 ${index + 1}: 적절한 컨테이너를 찾을 수 없음`,
            );
            return;
        }

        // 액션 영역 찾기 또는 생성
        let actionArea =
            container.querySelector('section') ||
            container.querySelector('[role="toolbar"]');

        if (!actionArea) {
            actionArea = this.uiManager.createActionArea(video);
        }

        // 저장 버튼 생성 및 추가
        const saveButton = this.uiManager.createSaveButton();
        saveButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleCustomButtonClick(container, video);
        };

        try {
            actionArea.appendChild(saveButton);
            this.log(
                'success',
                `비디오 ${index + 1}: 커스텀 저장 버튼 추가 완료`,
            );

            // 가시성 확인
            setTimeout(() => {
                if (!Utils.isElementVisible(saveButton)) {
                    this.log(
                        'info',
                        `버튼 ${index + 1}이 보이지 않음. 플로팅 버튼으로 변경`,
                    );
                    this.uiManager.createFloatingButton(video, saveButton);
                }
            }, 500);
        } catch (error) {
            this.log('error', `버튼 ${index + 1} 추가 실패`, error);
            this.uiManager.createFloatingButton(video, saveButton);
        }
    }

    /**
     * 커스텀 버튼 클릭 처리
     * @param {Element} container 컨테이너
     * @param {Element} video 비디오 요소
     */
    async handleCustomButtonClick(container, video) {
        try {
            const url = video.src || video.currentSrc;
            const postUrl = window.location.href;
            const metadata = this.extractMetadata(container);

            if (url?.startsWith('blob:')) {
                const videoBlob = await this.apiClient.downloadBlobVideo(url);
                await this.apiClient.processVideoBlob({
                    platform: CONSTANTS.PLATFORMS.INSTAGRAM,
                    videoBlob,
                    postUrl,
                    metadata,
                });
            } else {
                await this.apiClient.processVideo({
                    platform: CONSTANTS.PLATFORMS.INSTAGRAM,
                    url,
                    postUrl,
                    metadata,
                });
            }

            this.uiManager.showNotification(
                '✅ 영상이 저장되고 분석되었습니다!',
                CONSTANTS.NOTIFICATION_TYPES.SUCCESS,
            );
        } catch (error) {
            this.log('error', '커스텀 버튼 처리 실패', error);
            this.uiManager.showNotification(
                '영상 처리에 실패했습니다. 서버 연결을 확인해주세요.',
                CONSTANTS.NOTIFICATION_TYPES.ERROR,
            );
        }
    }

    /**
     * 분석 전용 버튼 추가
     */
    addAnalysisButtons() {
        this.log('info', 'Instagram 분석 버튼 추가 시작');

        const posts = Utils.safeQuerySelectorAll(
            document,
            CONSTANTS.SELECTORS.INSTAGRAM.POSTS,
        );
        this.log('info', `발견된 게시물: ${posts.length}개`);

        posts.forEach((post, index) => {
            try {
                this.addAnalysisButtonToPost(post, index);
            } catch (error) {
                this.log(
                    'error',
                    `게시물 ${index + 1} 분석 버튼 추가 실패`,
                    error,
                );
            }
        });
    }

    /**
     * 게시물에 분석 버튼 추가
     * @param {Element} post 게시물 요소
     * @param {number} index 인덱스
     */
    addAnalysisButtonToPost(post, index) {
        const video = Utils.safeQuerySelector(
            post,
            CONSTANTS.SELECTORS.INSTAGRAM.VIDEOS,
        );
        if (!video) {
            this.log('info', `게시물 ${index + 1}: 비디오 없음, 스킵`);
            return; // 비디오가 없는 게시물은 스킵
        }

        // 기존 분석 버튼이 있는지 확인
        if (post.querySelector('.analysis-button')) {
            this.log('info', `게시물 ${index + 1}: 이미 분석 버튼 존재`);
            return;
        }

        // 다양한 방법으로 저장 버튼 찾기
        let saveButton = null;
        let buttonContainer = null;

        // 방법 1: 일반적인 저장 버튼 선택자
        for (const selector of CONSTANTS.SELECTORS.INSTAGRAM.SAVE_BUTTONS) {
            saveButton = Utils.safeQuerySelector(post, selector);
            if (saveButton) {
                this.log(
                    'info',
                    `게시물 ${index + 1}: 저장 버튼 발견 (선택자: ${selector})`,
                );
                break;
            }
        }

        // 방법 2: 액션 버튼들이 있는 영역 찾기
        if (!saveButton) {
            const actionArea = Utils.safeQuerySelector(post, 'section');
            if (actionArea) {
                // 좋아요, 댓글, 공유, 저장 버튼들이 있는 영역
                const buttons = actionArea.querySelectorAll('[role="button"]');
                if (buttons.length >= 4) {
                    saveButton = buttons[buttons.length - 1]; // 보통 마지막이 저장 버튼
                    this.log(
                        'info',
                        `게시물 ${index + 1}: 액션 영역에서 저장 버튼 추정`,
                    );
                }
            }
        }

        if (!saveButton) {
            this.log('warn', `게시물 ${index + 1}: 저장 버튼을 찾을 수 없음`);
            // 저장 버튼이 없어도 비디오가 있으면 플로팅 버튼으로 추가
            this.addFloatingAnalysisButton(post, video, index);
            return;
        }

        // 버튼 컨테이너 찾기
        buttonContainer =
            saveButton.closest('[role="button"]') || saveButton.parentElement;

        // 분석 버튼 생성
        const analysisButton = this.createAnalysisButton();

        // 클릭 이벤트 추가
        analysisButton.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this.handleAnalysisButtonClick(post, video, analysisButton);
        };

        try {
            // 저장 버튼과 같은 레벨에 분석 버튼 추가
            const parentContainer = buttonContainer.parentElement;
            if (parentContainer) {
                // 저장 버튼 바로 다음에 삽입
                if (buttonContainer.nextSibling) {
                    parentContainer.insertBefore(
                        analysisButton,
                        buttonContainer.nextSibling,
                    );
                } else {
                    parentContainer.appendChild(analysisButton);
                }
                this.log('success', `게시물 ${index + 1}: 분석 버튼 추가 완료`);
            } else {
                // 플로팅 버튼으로 폴백
                this.addFloatingAnalysisButton(post, video, index);
            }
        } catch (error) {
            this.log(
                'error',
                `게시물 ${index + 1}: 분석 버튼 배치 실패`,
                error,
            );
            // 플로팅 버튼으로 폴백
            this.addFloatingAnalysisButton(post, video, index);
        }
    }

    /**
     * 플로팅 분석 버튼 추가 (폴백 방법)
     * @param {Element} post 게시물 요소
     * @param {Element} video 비디오 요소
     * @param {number} index 인덱스
     */
    addFloatingAnalysisButton(post, video, index) {
        const analysisButton = this.createFloatingAnalysisButton();

        // 클릭 이벤트 추가
        analysisButton.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this.handleAnalysisButtonClick(post, video, analysisButton);
        };

        try {
            // 비디오 위에 플로팅 버튼 추가
            const videoContainer = video.parentElement;
            videoContainer.style.position = 'relative';
            videoContainer.appendChild(analysisButton);
            this.log(
                'success',
                `게시물 ${index + 1}: 플로팅 분석 버튼 추가 완료`,
            );
        } catch (error) {
            this.log(
                'error',
                `게시물 ${index + 1}: 플로팅 분석 버튼 추가 실패`,
                error,
            );
        }
    }

    /**
     * 플로팅 분석 버튼 생성
     * @returns {HTMLButtonElement} 플로팅 분석 버튼
     */
    createFloatingAnalysisButton() {
        const button = document.createElement('button');
        button.className = 'analysis-button floating-analysis-button';
        button.style.cssText = `
      all: unset !important;
      position: absolute !important;
      top: 10px !important;
      right: 10px !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 36px !important;
      height: 36px !important;
      background: linear-gradient(45deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      font-size: 14px !important;
      font-weight: bold !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      transition: all 0.2s ease !important;
    `;

        button.textContent = '🔍';
        button.title = '영상 AI 분석하기';

        // 호버 효과
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1) !important';
            button.style.background =
                'linear-gradient(45deg, #5a67d8 0%, #6b46c1 100%) !important';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1) !important';
            button.style.background =
                'linear-gradient(45deg, #667eea 0%, #764ba2 100%) !important';
        });

        return button;
    }

    /**
     * 분석 전용 버튼 생성
     * @returns {HTMLButtonElement} 분석 버튼
     */
    createAnalysisButton() {
        const button = document.createElement('button');
        button.className = 'analysis-button';
        button.style.cssText = `
      all: unset !important;
      position: relative !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 24px !important;
      height: 24px !important;
      margin-left: 12px !important;
      background: linear-gradient(45deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      font-size: 12px !important;
      font-weight: bold !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
      transition: all 0.2s ease !important;
    `;

        button.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="font-size: 10px;">🔍</div>
      </div>
    `;

        button.title = '영상 AI 분석하기';

        // 호버 효과
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1) !important';
            button.style.background =
                'linear-gradient(45deg, #5a67d8 0%, #6b46c1 100%) !important';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1) !important';
            button.style.background =
                'linear-gradient(45deg, #667eea 0%, #764ba2 100%) !important';
        });

        return button;
    }

    /**
     * 분석 버튼 클릭 처리
     * @param {Element} post 게시물 요소
     * @param {Element} video 비디오 요소
     * @param {Element} button 클릭된 버튼
     */
    async handleAnalysisButtonClick(post, video, button) {
        this.log('info', '수동 분석 버튼 클릭됨');

        // 🎯 새로운 안전한 버튼 처리 사용
        const success = await this.safeButtonProcessing(
            button,
            this.processVideoFromSaveActionSafe,
            { post, video },
        );

        if (success) {
            this.log('info', '수동 분석 완료');
        }
    }

    /**
     * 안전한 비디오 분석 처리 (에러 처리 포함)
     * @param {Object} params - { post, video }
     * @returns {Promise<boolean>} 성공 여부
     */
    async processVideoFromSaveActionSafe({ post, video }) {
        try {
            await this.processVideoFromSaveAction(post, video);
            return true;
        } catch (error) {
            this.log('error', '비디오 분석 실패', error);

            // 중복 URL인 경우 특별 처리
            if (
                error.message &&
                (error.message.includes('중복') ||
                    error.message.includes('처리 중'))
            ) {
                this.uiManager.showNotification(
                    `⚠️ ${error.message}`,
                    CONSTANTS.NOTIFICATION_TYPES.WARNING,
                );
            } else {
                this.uiManager.showNotification(
                    `영상 분석에 실패했습니다: ${error.message}`,
                    CONSTANTS.NOTIFICATION_TYPES.ERROR,
                );
            }

            return false;
        }
    }

    /**
     * Observer들과 이벤트 리스너 정리 (메모리 누수 방지)
     */
    cleanup() {
        this.log('info', 'Instagram handler 정리 시작');

        // IntersectionObserver 정리
        if (this.videoObserver) {
            this.videoObserver.disconnect();
            this.videoObserver = null;
            this.log('info', 'VideoObserver 정리 완료');
        }

        // 현재 활성 영상 참조 해제
        this.currentActiveVideo = null;

        // 캐시 정리
        this.cleanup();

        this.log('info', 'Instagram handler 정리 완료');
    }

    /**
     * 페이지 언로드 시 정리 작업 등록
     */
    registerCleanupHandlers() {
        // 페이지 언로드 시 정리
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // SPA 네비게이션 감지 및 정리
        let currentUrl = window.location.href;
        const checkUrlChange = () => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                this.log('info', 'SPA 네비게이션 감지 - Observer 재설정');
                this.cleanup();
                // 짧은 지연 후 재설정
                setTimeout(() => {
                    this.setupVideoTracking();
                }, 500);
            }
        };

        // URL 변경 감지 (SPA 대응)
        setInterval(checkUrlChange, 1000);
    }
}
