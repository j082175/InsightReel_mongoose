#!/usr/bin/env python3
"""
InstaLoader 공식 API 사용법에 따른 릴스 조회수 필터링
문서: https://instaloader.github.io/as-module.html
"""

import instaloader
import json
import time
import os
from datetime import datetime

def create_authenticated_loader(username=None, password=None):
    """
    공식 문서에 따른 InstaLoader 인증 방법들
    """
    L = instaloader.Instaloader()

    # 1. 기존 세션 파일이 있는지 확인
    session_file = f".session-{username}" if username else None

    if username and session_file and os.path.exists(session_file):
        try:
            print(f"기존 세션 파일 로드 시도: {session_file}")
            L.load_session_from_file(username)
            print("세션 파일 로드 성공!")
            return L, True
        except Exception as e:
            print(f"세션 로드 실패: {e}")

    # 2. 사용자명/비밀번호 로그인
    if username and password:
        try:
            print("사용자명/비밀번호로 로그인 시도...")
            L.login(username, password)
            print("로그인 성공!")
            return L, True
        except Exception as e:
            print(f"로그인 실패: {e}")

    # 3. 대화형 로그인
    if username:
        try:
            print("대화형 로그인 시도...")
            L.interactive_login(username)
            print("대화형 로그인 성공!")
            return L, True
        except Exception as e:
            print(f"대화형 로그인 실패: {e}")

    # 4. 무인증 모드
    print("무인증 모드로 진행 (제한된 기능)")
    return L, False

def analyze_posts_with_official_api(L, username, min_views=50000, max_posts=20):
    """
    공식 API를 사용한 게시물 분석
    """
    print(f"\n=== {username} 계정 분석 시작 ===")

    try:
        # Profile 객체 생성
        profile = instaloader.Profile.from_username(L.context, username)

        print(f"프로필: {profile.full_name}")
        print(f"팔로워: {profile.followers:,}명")
        print(f"게시물: {profile.mediacount:,}개")
        print(f"비공개: {'예' if profile.is_private else '아니오'}")

        if profile.is_private:
            print("비공개 계정입니다. 팔로우가 필요합니다.")
            return []

        print(f"\n최근 {max_posts}개 게시물 분석 중...")

        high_view_reels = []
        post_count = 0
        video_count = 0
        reel_count = 0

        # 게시물 순회
        for post in profile.get_posts():
            post_count += 1
            print(f"게시물 {post_count}/{max_posts} 분석 중...", end='\r')

            if post_count > max_posts:
                break

            # 비디오 게시물만 처리
            if post.is_video:
                video_count += 1

                # 릴스 판별 (짧은 영상)
                duration = getattr(post, 'video_duration', 0)
                is_reel = 5 <= duration <= 120

                if is_reel:
                    reel_count += 1

                    # 조회수 확인 (핵심 부분!)
                    views = getattr(post, 'video_view_count', 0)
                    likes = getattr(post, 'likes', 0)
                    comments = getattr(post, 'comments', 0)

                    print(f"\n릴스 #{reel_count}: {views:,} 조회수, {likes:,} 좋아요")

                    # 조회수 조건 확인
                    if views >= min_views:
                        reel_data = {
                            'shortcode': post.shortcode,
                            'url': f"https://www.instagram.com/p/{post.shortcode}/",
                            'caption': post.caption[:200] + "..." if post.caption and len(post.caption) > 200 else post.caption,
                            'views': views,
                            'likes': likes,
                            'comments': comments,
                            'date': post.date.strftime('%Y-%m-%d %H:%M:%S'),
                            'duration': duration,
                            'hashtags': list(post.caption_hashtags) if hasattr(post, 'caption_hashtags') else [],
                            'mentions': list(post.caption_mentions) if hasattr(post, 'caption_mentions') else [],
                            'location': post.location.name if post.location else None,
                            'typename': getattr(post, 'typename', 'Unknown')
                        }

                        high_view_reels.append(reel_data)
                        print(f"  조건 만족! ({views:,} >= {min_views:,})")
                    else:
                        print(f"  조회수 부족 ({views:,} < {min_views:,})")

            # API 제한 방지
            time.sleep(2)

        print(f"\n\n분석 결과:")
        print(f"  총 게시물: {post_count}개")
        print(f"  비디오: {video_count}개")
        print(f"  릴스: {reel_count}개")
        print(f"  조건 만족: {len(high_view_reels)}개")

        return high_view_reels

    except instaloader.exceptions.ProfileNotExistsException:
        print(f"프로필 '{username}'을 찾을 수 없습니다.")
        return []
    except instaloader.exceptions.LoginRequiredException:
        print("로그인이 필요합니다.")
        return []
    except instaloader.exceptions.PrivateProfileNotFollowedException:
        print("비공개 프로필입니다. 팔로우가 필요합니다.")
        return []
    except Exception as e:
        print(f"오류 발생: {e}")
        return []

def test_specific_post_data(L, shortcode):
    """
    특정 게시물의 상세 데이터 확인
    """
    try:
        print(f"\n특정 게시물 테스트: {shortcode}")
        post = instaloader.Post.from_shortcode(L.context, shortcode)

        print(f"게시물 타입: {getattr(post, 'typename', 'Unknown')}")
        print(f"비디오 여부: {post.is_video}")

        if post.is_video:
            print(f"조회수: {getattr(post, 'video_view_count', 'N/A')}")
            print(f"길이: {getattr(post, 'video_duration', 'N/A')}초")

        print(f"좋아요: {getattr(post, 'likes', 'N/A')}")
        print(f"댓글: {getattr(post, 'comments', 'N/A')}")

        return True

    except Exception as e:
        print(f"게시물 테스트 실패: {e}")
        return False

def main():
    """메인 함수"""
    print("InstaLoader 공식 API 테스트")
    print("=" * 50)

    # 로그인 정보 (선택사항)
    username = input("Instagram 사용자명 (선택사항, 엔터로 무인증): ").strip()
    password = None

    if username:
        password = input("비밀번호 (선택사항, 엔터로 세션 파일 사용): ").strip()
        if not password:
            password = None

    # InstaLoader 인스턴스 생성 및 인증
    L, authenticated = create_authenticated_loader(username, password)

    if authenticated:
        print("인증된 세션으로 진행합니다.")
    else:
        print("무인증 모드로 진행합니다. (제한된 기능)")

    # 테스트할 계정
    target_username = input("\n분석할 계정명 (기본값: instagram): ").strip()
    if not target_username:
        target_username = "instagram"

    # 최소 조회수
    min_views_input = input("최소 조회수 (기본값: 10000): ").strip()
    try:
        min_views = int(min_views_input) if min_views_input else 10000
    except ValueError:
        min_views = 10000

    # 릴스 분석 실행
    results = analyze_posts_with_official_api(L, target_username, min_views, max_posts=15)

    # 결과 출력
    if results:
        print(f"\n조건을 만족하는 릴스 {len(results)}개 발견!")

        for i, reel in enumerate(results, 1):
            print(f"\n{i}. {reel['date']} | {reel['views']:,} 조회수")
            print(f"   URL: {reel['url']}")
            if reel['caption']:
                print(f"   내용: {reel['caption'][:100]}...")

        # JSON 저장
        filename = f"{target_username}_reels_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\n결과를 {filename}에 저장했습니다.")

    else:
        print("\n조건을 만족하는 릴스를 찾지 못했습니다.")

    # 특정 게시물 테스트 (선택사항)
    test_shortcode = input("\n테스트할 게시물 shortcode (선택사항): ").strip()
    if test_shortcode:
        test_specific_post_data(L, test_shortcode)

if __name__ == "__main__":
    main()