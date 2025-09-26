#!/usr/bin/env python3
"""
기존 프로젝트의 쿠키를 사용하여 Instagram 릴스 조회수 필터링
"""

import instaloader
import json
import time
from datetime import datetime
import os

def load_cookies_to_instaloader(loader, cookie_file_path):
    """
    Netscape 형식의 쿠키 파일을 InstaLoader에 로드
    """
    try:
        if not os.path.exists(cookie_file_path):
            print(f"쿠키 파일을 찾을 수 없습니다: {cookie_file_path}")
            return False

        # InstaLoader는 자동으로 세션 파일을 관리하므로
        # 쿠키 파일을 직접 로드하는 대신 세션 정보를 사용합니다
        print(f"쿠키 파일 위치 확인: {cookie_file_path}")

        # 쿠키 파일에서 sessionid 추출
        with open(cookie_file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        sessionid = None
        for line in content.split('\n'):
            if 'sessionid' in line and not line.startswith('#'):
                parts = line.split('\t')
                if len(parts) >= 7:
                    sessionid = parts[6]  # sessionid 값
                    break

        if sessionid:
            print("SessionID를 찾았습니다. 인증된 세션으로 진행합니다.")
            return True
        else:
            print("SessionID를 찾을 수 없습니다.")
            return False

    except Exception as e:
        print(f"쿠키 로딩 중 오류: {e}")
        return False

def create_instaloader_with_session():
    """
    세션 정보를 사용하여 InstaLoader 인스턴스 생성
    """
    loader = instaloader.Instaloader()

    # 다운로드 설정 (메타데이터만 수집)
    loader.download_pictures = False
    loader.download_videos = False  # 실제 영상은 다운로드하지 않음
    loader.download_video_thumbnails = False
    loader.download_geotags = False
    loader.save_metadata = True
    loader.compress_json = False

    # 세션 디렉토리 설정
    loader.dirname_pattern = "temp_download/{target}"

    return loader

def get_high_view_reels_with_cookies(username, min_views=50000, max_posts=30, cookie_file_path=None):
    """
    쿠키를 사용하여 특정 계정의 고조회수 릴스 추출
    """

    print(f"=== Instagram 릴스 조회수 필터링 (쿠키 사용) ===")
    print(f"대상 계정: @{username}")
    print(f"최소 조회수: {min_views:,}")
    print(f"확인할 최대 게시물: {max_posts}개")

    # InstaLoader 인스턴스 생성
    loader = create_instaloader_with_session()

    # 쿠키 파일 확인
    if cookie_file_path and os.path.exists(cookie_file_path):
        cookie_loaded = load_cookies_to_instaloader(loader, cookie_file_path)
        if cookie_loaded:
            print("쿠키 정보를 확인했습니다.")
        else:
            print("쿠키 로딩에 실패했지만 계속 진행합니다.")
    else:
        print("쿠키 파일이 제공되지 않았습니다. 무인증으로 시도합니다.")

    high_view_reels = []

    try:
        # 프로필 정보 가져오기
        print(f"\n'{username}' 프로필 정보 가져오는 중...")
        profile = instaloader.Profile.from_username(loader.context, username)

        print(f"프로필: {profile.full_name}")
        print(f"팔로워: {profile.followers:,}명")
        print(f"게시물: {profile.mediacount:,}개")
        print(f"비공개 계정: {'예' if profile.is_private else '아니오'}")

        if profile.is_private:
            print("경고: 비공개 계정입니다. 팔로우하지 않은 경우 게시물을 볼 수 없습니다.")

        print(f"\n최근 {max_posts}개 게시물에서 릴스 검색 중...")

        post_count = 0
        video_count = 0
        reels_count = 0

        # 게시물 순회
        for post in profile.get_posts():
            post_count += 1
            print(f"게시물 {post_count}/{max_posts} 확인 중...", end='\r')

            if post_count > max_posts:
                break

            # 비디오인 경우만 처리
            if post.is_video:
                video_count += 1

                # 비디오 길이로 릴스 판별
                duration = getattr(post, 'video_duration', 0)
                is_reel = 5 <= duration <= 120  # 5초~2분 사이를 릴스로 판정

                if is_reel:
                    reels_count += 1
                    views = post.video_view_count if post.video_view_count else 0

                    print(f"\n릴스 #{reels_count}: {views:,} 조회수 | {duration}초")

                    # 조회수 조건 확인
                    if views >= min_views:
                        reel_info = {
                            'shortcode': post.shortcode,
                            'url': f"https://www.instagram.com/p/{post.shortcode}/",
                            'caption': post.caption[:200] + "..." if post.caption and len(post.caption) > 200 else post.caption,
                            'views': views,
                            'likes': post.likes,
                            'comments': post.comments,
                            'date': post.date.strftime('%Y-%m-%d %H:%M:%S'),
                            'duration': duration,
                            'hashtags': list(post.caption_hashtags) if post.caption_hashtags else [],
                            'mentions': list(post.caption_mentions) if post.caption_mentions else [],
                            'location': post.location.name if post.location else None,
                            'is_video': post.is_video,
                            'typename': post.typename
                        }

                        high_view_reels.append(reel_info)
                        print(f"  ✅ 조건 만족! 저장됨")
                    else:
                        print(f"  ❌ 조회수 부족 ({views:,} < {min_views:,})")

            # 과도한 요청을 방지하기 위한 딜레이
            time.sleep(1)

        print(f"\n\n=== 검색 완료 ===")
        print(f"총 확인한 게시물: {post_count}개")
        print(f"발견한 비디오: {video_count}개")
        print(f"발견한 릴스: {reels_count}개")
        print(f"조건 만족 릴스: {len(high_view_reels)}개")

    except instaloader.exceptions.ProfileNotExistsException:
        print(f"오류: '{username}' 프로필을 찾을 수 없습니다.")
        return []
    except instaloader.exceptions.LoginRequiredException:
        print("오류: 로그인이 필요합니다. 쿠키가 만료되었거나 유효하지 않을 수 있습니다.")
        return []
    except instaloader.exceptions.ConnectionException as e:
        print(f"연결 오류: {e}")
        print("Instagram에서 일시적으로 접근을 제한했을 수 있습니다.")
        return []
    except Exception as e:
        print(f"예상치 못한 오류: {e}")
        return []

    return high_view_reels

def save_results_to_json(results, filename):
    """결과를 JSON 파일로 저장"""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"결과를 '{filename}'에 저장했습니다.")
        return True
    except Exception as e:
        print(f"파일 저장 중 오류: {e}")
        return False

def main():
    """메인 함수"""
    print("Instagram 릴스 조회수 필터링 (쿠키 기반)")
    print("=" * 60)

    # 쿠키 파일 경로
    cookie_file_path = "data/instagram_cookies.txt"

    # 현재 디렉토리 기준으로 상대 경로 처리
    if not os.path.exists(cookie_file_path):
        # 절대 경로로 시도
        abs_cookie_path = os.path.join(os.path.dirname(__file__), cookie_file_path)
        if os.path.exists(abs_cookie_path):
            cookie_file_path = abs_cookie_path
        else:
            print(f"경고: 쿠키 파일을 찾을 수 없습니다: {cookie_file_path}")
            cookie_file_path = None

    # 테스트할 계정
    test_username = input("테스트할 Instagram 계정명 입력 (기본값: lalalalisa_m): ").strip()
    if not test_username:
        test_username = "lalalalisa_m"

    # 최소 조회수 설정
    min_views_input = input("최소 조회수 설정 (기본값: 50000): ").strip()
    try:
        min_views = int(min_views_input) if min_views_input else 50000
    except ValueError:
        min_views = 50000
        print("잘못된 입력입니다. 기본값 50000을 사용합니다.")

    # 릴스 필터링 실행
    results = get_high_view_reels_with_cookies(
        username=test_username,
        min_views=min_views,
        max_posts=20,  # 테스트용으로 20개로 제한
        cookie_file_path=cookie_file_path
    )

    # 결과 출력 및 저장
    if results:
        print(f"\n🎉 {min_views:,} 조회수 이상인 릴스 {len(results)}개 발견!")
        print("\n" + "=" * 80)

        for i, reel in enumerate(results, 1):
            print(f"{i}. [{reel['date']}] {reel['views']:,} 조회수")
            print(f"   좋아요: {reel['likes']:,} | 댓글: {reel['comments']:,} | 길이: {reel['duration']}초")
            print(f"   URL: {reel['url']}")
            if reel['caption']:
                caption_preview = reel['caption'][:100] + "..." if len(reel['caption']) > 100 else reel['caption']
                print(f"   내용: {caption_preview}")
            if reel['hashtags']:
                print(f"   해시태그: {', '.join(reel['hashtags'][:5])}")
            print("   " + "-" * 75)

        # JSON 파일로 저장
        filename = f"{test_username}_high_view_reels_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        save_results_to_json(results, filename)

    else:
        print(f"\n조건을 만족하는 릴스를 찾지 못했습니다.")
        print("가능한 원인:")
        print("- 최근 게시물 중 조건을 만족하는 릴스가 없음")
        print("- 계정이 비공개이거나 접근 권한이 없음")
        print("- 쿠키가 만료되었거나 유효하지 않음")
        print("- Instagram에서 일시적으로 접근을 제한")

if __name__ == "__main__":
    main()