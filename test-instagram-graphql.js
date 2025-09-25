const axios = require('axios');

/**
 * Instagram GraphQL API 테스트 파일
 * 2025년 현재 작동하는 Instagram 메타데이터 추출 방법 테스트
 */

class InstagramGraphQLTester {
    constructor() {
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'x-ig-app-id': '936619743392459', // Instagram Web App ID
            'x-instagram-ajax': '1',
            'x-requested-with': 'XMLHttpRequest'
        };
    }

    /**
     * Instagram URL에서 shortcode 추출
     */
    extractShortcode(url) {
        try {
            const patterns = [
                /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
                /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
                /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }

            return null;
        } catch (error) {
            console.error('Shortcode 추출 실패:', error.message);
            return null;
        }
    }

    /**
     * 방법 1: Instagram Web Profile API 사용
     */
    async testWebProfileAPI(username) {
        try {
            console.log(`🔍 방법 1: Web Profile API 테스트 - ${username}`);

            const response = await axios.get(
                `https://i.instagram.com/api/v1/users/web_profile_info/`,
                {
                    params: { username: username },
                    headers: this.headers,
                    timeout: 10000
                }
            );

            console.log('✅ Web Profile API 성공!');
            console.log('📊 응답 구조:', {
                hasData: !!response.data,
                hasUser: !!response.data?.data?.user,
                dataKeys: Object.keys(response.data || {}),
                userKeys: Object.keys(response.data?.data?.user || {})
            });

            const user = response.data?.data?.user;
            if (user) {
                return {
                    method: 'Web Profile API',
                    success: true,
                    metadata: {
                        id: user.id,
                        username: user.username,
                        fullName: user.full_name,
                        biography: user.biography,
                        followers: user.edge_followed_by?.count || 0,
                        following: user.edge_follow?.count || 0,
                        posts: user.edge_owner_to_timeline_media?.count || 0,
                        profilePicUrl: user.profile_pic_url,
                        isPrivate: user.is_private,
                        isVerified: user.is_verified
                    }
                };
            }

            return { method: 'Web Profile API', success: false, error: 'No user data' };

        } catch (error) {
            console.error('❌ Web Profile API 실패:', error.message);
            return { method: 'Web Profile API', success: false, error: error.message };
        }
    }

    /**
     * 방법 2: 공개 포스트 JSON 엔드포인트 테스트
     */
    async testPublicPostAPI(shortcode) {
        try {
            console.log(`🔍 방법 2: 공개 포스트 JSON API 테스트 - ${shortcode}`);

            // 공개 포스트의 JSON 데이터를 가져오는 엔드포인트
            const response = await axios.get(
                `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`,
                {
                    headers: {
                        ...this.headers,
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Site': 'same-origin'
                    },
                    timeout: 10000
                }
            );

            console.log('✅ 공개 포스트 JSON API 성공!');
            console.log('📊 응답 구조:', {
                hasData: !!response.data,
                dataKeys: Object.keys(response.data || {}),
                responseStatus: response.status,
                responseType: typeof response.data
            });

            // 응답 데이터 구조 분석
            const data = response.data;
            let media = null;

            // 가능한 응답 구조들 확인
            if (data?.graphql?.shortcode_media) {
                media = data.graphql.shortcode_media;
            } else if (data?.items?.[0]) {
                media = data.items[0];
            } else if (data?.shortcode_media) {
                media = data.shortcode_media;
            }

            if (media) {
                return {
                    method: 'Public Post JSON API',
                    success: true,
                    metadata: {
                        id: media.id,
                        shortcode: media.shortcode,
                        caption: media.edge_media_to_caption?.edges[0]?.node?.text || media.caption?.text || '',
                        likes: media.edge_media_preview_like?.count || media.like_count || 0,
                        comments: media.edge_media_to_comment?.count || media.comment_count || 0,
                        views: media.video_view_count || media.play_count || null,
                        displayUrl: media.display_url || media.image_versions2?.candidates?.[0]?.url,
                        isVideo: media.is_video || media.media_type === 2,
                        videoUrl: media.video_url || media.video_versions?.[0]?.url,
                        takenAt: new Date((media.taken_at_timestamp || media.taken_at) * 1000),
                        owner: {
                            id: media.owner?.id || media.user?.id,
                            username: media.owner?.username || media.user?.username,
                            fullName: media.owner?.full_name || media.user?.full_name,
                            profilePic: media.owner?.profile_pic_url || media.user?.profile_pic_url
                        }
                    }
                };
            }

            return { method: 'Public Post JSON API', success: false, error: 'No media data found' };

        } catch (error) {
            console.error('❌ 공개 포스트 JSON API 실패:', error.message);
            return { method: 'Public Post JSON API', success: false, error: error.message };
        }
    }

    /**
     * 방법 3: 일반 웹페이지 스크래핑 (__sharedData 추출)
     */
    async testWebScraping(url) {
        try {
            console.log(`🔍 방법 3: Web Scraping 테스트 - ${url}`);

            const response = await axios.get(url, {
                headers: {
                    ...this.headers,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                timeout: 15000
            });

            console.log('✅ Web Scraping 응답 받음');

            // window._sharedData 추출 시도
            const sharedDataMatch = response.data.match(/window\._sharedData\s*=\s*({.+?});/);
            if (sharedDataMatch) {
                const sharedData = JSON.parse(sharedDataMatch[1]);
                console.log('📊 _sharedData 구조:', {
                    hasEntryData: !!sharedData.entry_data,
                    entryDataKeys: Object.keys(sharedData.entry_data || {}),
                    hasPostPage: !!sharedData.entry_data?.PostPage
                });

                const postData = sharedData.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
                if (postData) {
                    return {
                        method: 'Web Scraping',
                        success: true,
                        metadata: {
                            id: postData.id,
                            shortcode: postData.shortcode,
                            caption: postData.edge_media_to_caption?.edges[0]?.node?.text || '',
                            likes: postData.edge_media_preview_like?.count || 0,
                            comments: postData.edge_media_to_comment?.count || 0,
                            displayUrl: postData.display_url,
                            isVideo: postData.is_video,
                            owner: postData.owner?.username
                        }
                    };
                }
            }

            return { method: 'Web Scraping', success: false, error: 'No _sharedData found' };

        } catch (error) {
            console.error('❌ Web Scraping 실패:', error.message);
            return { method: 'Web Scraping', success: false, error: error.message };
        }
    }

    /**
     * 전체 테스트 실행
     */
    async runAllTests(instagramUrl) {
        console.log('🚀 Instagram GraphQL API 테스트 시작\n');
        console.log(`📱 테스트 URL: ${instagramUrl}\n`);

        const results = [];
        const shortcode = this.extractShortcode(instagramUrl);

        if (!shortcode) {
            console.error('❌ 유효하지 않은 Instagram URL');
            return;
        }

        console.log(`🔑 추출된 Shortcode: ${shortcode}\n`);

        // 방법 1: Web Profile API (사용자명 추출 시도)
        const usernameMatch = instagramUrl.match(/instagram\.com\/([^\/\?]+)/);
        if (usernameMatch && usernameMatch[1] !== 'p' && usernameMatch[1] !== 'reel') {
            const result1 = await this.testWebProfileAPI(usernameMatch[1]);
            results.push(result1);
            console.log('');
        }

        // 방법 2: 공개 포스트 JSON API
        const result2 = await this.testPublicPostAPI(shortcode);
        results.push(result2);
        console.log('');

        // 방법 3: Web Scraping
        const result3 = await this.testWebScraping(instagramUrl);
        results.push(result3);
        console.log('');

        // 결과 요약
        console.log('📋 테스트 결과 요약:');
        console.log('='.repeat(50));
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.method}: ${result.success ? '✅ 성공' : '❌ 실패'}`);
            if (result.success && result.metadata) {
                console.log(`   데이터 샘플:`, {
                    id: result.metadata.id,
                    username: result.metadata.username || result.metadata.owner?.username,
                    caption: result.metadata.caption?.substring(0, 50) + '...',
                    likes: result.metadata.likes,
                    comments: result.metadata.comments
                });
            } else {
                console.log(`   에러: ${result.error}`);
            }
            console.log('');
        });

        return results;
    }
}

// 테스트 실행
async function main() {
    const tester = new InstagramGraphQLTester();

    // 테스트할 Instagram URL (실제 공개 포스트들)
    const testUrls = [
        'https://www.instagram.com/p/DCvqpNFykEz/', // Instagram 공식 계정 포스트
        'https://www.instagram.com/reel/DCvcXXryxmq/', // 릴스 테스트
    ];

    for (const url of testUrls) {
        await tester.runAllTests(url);
        console.log('\n' + '='.repeat(80) + '\n');
    }
}

// 스크립트 실행
if (require.main === module) {
    main().catch(console.error);
}

module.exports = InstagramGraphQLTester;