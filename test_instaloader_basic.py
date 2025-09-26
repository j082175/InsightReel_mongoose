#!/usr/bin/env python3
"""
InstaLoader 기본 테스트 - 더 간단한 접근 방식
"""

import instaloader
import time
import json

def test_basic_functionality():
    """InstaLoader의 기본 기능 테스트"""

    loader = instaloader.Instaloader()

    # 메타데이터만 다운로드, 실제 미디어는 다운로드하지 않음
    loader.download_pictures = False
    loader.download_videos = False
    loader.download_video_thumbnails = False
    loader.download_geotags = False
    loader.download_comments = False
    loader.save_metadata = True

    print("InstaLoader 기본 테스트 시작")
    print("=" * 50)

    # 테스트할 계정들 (공개 계정 중 접근이 용이한 계정들)
    test_usernames = [
        "instagram",        # Instagram 공식 계정
        "google",          # Google 공식 계정
        "microsoft"        # Microsoft 공식 계정
    ]

    for username in test_usernames:
        print(f"\n테스트 계정: @{username}")
        try:
            # 프로필 정보만 가져오기
            profile = instaloader.Profile.from_username(loader.context, username)

            print(f"  프로필명: {profile.full_name}")
            print(f"  팔로워: {profile.followers:,}명")
            print(f"  게시물: {profile.mediacount:,}개")
            print(f"  비공개 계정: {'예' if profile.is_private else '아니오'}")

            # 최근 몇 개 게시물 정보만 가져오기 (실제 다운로드는 하지 않음)
            post_count = 0
            video_count = 0

            print(f"  최근 게시물 분석 중...")

            for post in profile.get_posts():
                post_count += 1
                if post_count > 10:  # 최근 10개만 확인
                    break

                if post.is_video:
                    video_count += 1
                    duration = getattr(post, 'video_duration', 0)
                    views = post.video_view_count if post.video_view_count else 0

                    # 릴스 판별 (짧은 영상)
                    is_reel = 5 <= duration <= 120

                    print(f"    비디오 {video_count}: {views:,} 조회수, {duration}초 {'(릴스)' if is_reel else ''}")

                # API 제한 방지를 위한 딜레이
                time.sleep(0.5)

            print(f"  분석 완료: 총 {post_count}개 게시물 중 {video_count}개 비디오")

        except instaloader.exceptions.ProfileNotExistsException:
            print(f"  오류: 프로필을 찾을 수 없습니다.")
        except instaloader.exceptions.LoginRequiredException:
            print(f"  오류: 로그인이 필요합니다.")
        except Exception as e:
            print(f"  오류: {e}")

        print("-" * 50)
        time.sleep(2)  # 계정 간 전환 시 딜레이

def test_specific_post():
    """특정 게시물 정보 가져오기 테스트"""

    print("\n특정 게시물 테스트")
    print("=" * 30)

    loader = instaloader.Instaloader()

    # 공개 게시물의 shortcode 예시
    test_shortcodes = [
        "C12345678901",  # 실제 존재하는 shortcode로 교체 필요
        "B98765432109"   # 실제 존재하는 shortcode로 교체 필요
    ]

    print("참고: 실제 테스트를 위해서는 유효한 Instagram 게시물 shortcode가 필요합니다.")
    print("shortcode는 Instagram URL에서 /p/ 뒤의 문자열입니다.")
    print("예: https://www.instagram.com/p/C12345678901/ -> C12345678901")

def main():
    """메인 함수"""
    print("InstaLoader 테스트 프로그램")
    print("Instagram API 제한으로 인해 제한적인 테스트만 가능합니다.")
    print()

    try:
        test_basic_functionality()
        test_specific_post()

        print("\n테스트 완료!")
        print("\n주요 발견사항:")
        print("- Instagram은 무인증 접근에 대해 강한 제한을 두고 있습니다.")
        print("- 공개 계정이라도 API 호출 제한이 있습니다.")
        print("- 실제 사용을 위해서는 Instagram 로그인이 필요할 수 있습니다.")
        print("- 대용량 수집을 위해서는 공식 Instagram Basic Display API 사용을 권장합니다.")

    except KeyboardInterrupt:
        print("\n테스트가 중단되었습니다.")
    except Exception as e:
        print(f"\n예상치 못한 오류: {e}")

if __name__ == "__main__":
    main()