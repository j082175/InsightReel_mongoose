#!/usr/bin/env python3
"""
InstaLoader를 사용하여 특정 계정의 릴스에서 조회수 5만 이상인 영상을 추출하는 테스트 스크립트
"""

import instaloader
from datetime import datetime, timedelta
import json
import time

def get_high_view_reels(username, min_views=50000, max_posts=50):
    """
    특정 Instagram 계정에서 조회수가 min_views 이상인 릴스를 추출

    Args:
        username (str): Instagram 사용자명
        min_views (int): 최소 조회수 (기본값: 50000)
        max_posts (int): 확인할 최대 포스트 수 (기본값: 50)

    Returns:
        list: 조건을 만족하는 릴스 정보 리스트
    """

    # InstaLoader 인스턴스 생성
    loader = instaloader.Instaloader()

    # 세션 이름 설정 (선택사항)
    loader.dirname_pattern = "downloads/{target}"

    high_view_reels = []

    try:
        # 프로필 가져오기
        print(f"'{username}' 프로필 정보를 가져오는 중...")
        profile = instaloader.Profile.from_username(loader.context, username)

        print(f"프로필 찾음: {profile.full_name}")
        print(f"   팔로워: {profile.followers:,}명")
        print(f"   팔로잉: {profile.followees:,}명")
        print(f"   게시물: {profile.mediacount:,}개")
        print(f"\n최근 {max_posts}개 게시물을 확인하여 릴스를 찾는 중...")

        post_count = 0
        reels_found = 0

        # 최근 게시물들을 순회
        for post in profile.get_posts():
            post_count += 1

            # 최대 포스트 수 제한
            if post_count > max_posts:
                break

            # 릴스인지 확인 (is_video가 True이고 짧은 영상)
            if post.is_video:
                duration = getattr(post, 'video_duration', 0)

                # 릴스는 보통 15초~90초 사이
                if 5 <= duration <= 120:
                    reels_found += 1
                    views = post.video_view_count if post.video_view_count else 0

                    print(f"   릴스 #{reels_found}: {views:,} 조회수")

                    # 조회수 조건 확인
                    if views >= min_views:
                        reel_info = {
                            'shortcode': post.shortcode,
                            'url': f"https://www.instagram.com/p/{post.shortcode}/",
                            'caption': post.caption[:100] + "..." if post.caption and len(post.caption) > 100 else post.caption,
                            'views': views,
                            'likes': post.likes,
                            'comments': post.comments,
                            'date': post.date.strftime('%Y-%m-%d %H:%M:%S'),
                            'duration': duration,
                            'video_url': post.video_url if hasattr(post, 'video_url') else None
                        }

                        high_view_reels.append(reel_info)
                        print(f"      조건 만족! (조회수: {views:,})")
                    else:
                        print(f"      조회수 부족 ({views:,} < {min_views:,})")

            # API 제한을 피하기 위한 딜레이
            time.sleep(0.5)

        print(f"\n검색 결과:")
        print(f"   총 확인한 게시물: {post_count}개")
        print(f"   발견한 릴스: {reels_found}개")
        print(f"   조건 만족 릴스: {len(high_view_reels)}개")

    except instaloader.exceptions.ProfileNotExistsException:
        print(f"오류: '{username}' 프로필을 찾을 수 없습니다.")
        return []
    except instaloader.exceptions.ConnectionException as e:
        print(f"연결 오류: {e}")
        return []
    except Exception as e:
        print(f"예상치 못한 오류: {e}")
        return []

    return high_view_reels

def save_results_to_json(results, filename="high_view_reels.json"):
    """결과를 JSON 파일로 저장"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"결과를 '{filename}'에 저장했습니다.")

def main():
    """메인 함수"""
    print("InstaLoader 릴스 조회수 필터링 테스트")
    print("=" * 50)

    # 테스트할 계정명 (예시: 인기 있는 한국 계정들)
    test_accounts = [
        "lalalalisa_m",  # BLACKPINK 리사
        "roses_are_rosie",  # BLACKPINK 로제
        "sooyaaa__",     # BLACKPINK 지수
    ]

    # 사용자가 직접 계정명을 입력할 수도 있음
    print("테스트할 Instagram 계정명을 입력하세요 (엔터 시 기본값 사용):")
    user_input = input("계정명: ").strip()

    if user_input:
        username = user_input
    else:
        # 기본값으로 첫 번째 계정 사용
        username = test_accounts[0]
        print(f"기본값 사용: {username}")

    print(f"\n대상 계정: @{username}")

    # 조회수 필터링 실행
    min_views = 50000  # 5만 조회수
    results = get_high_view_reels(username, min_views=min_views, max_posts=30)

    if results:
        print(f"\n{min_views:,} 조회수 이상인 릴스 {len(results)}개를 발견했습니다!")
        print("\n결과 목록:")
        print("-" * 80)

        for i, reel in enumerate(results, 1):
            print(f"{i}. 조회수: {reel['views']:,} | 좋아요: {reel['likes']:,} | 댓글: {reel['comments']:,}")
            print(f"   날짜: {reel['date']} | 길이: {reel['duration']}초")
            print(f"   URL: {reel['url']}")
            if reel['caption']:
                print(f"   캡션: {reel['caption']}")
            print("-" * 80)

        # 결과를 JSON 파일로 저장
        save_results_to_json(results, f"{username}_high_view_reels.json")

    else:
        print(f"\n조건을 만족하는 릴스를 찾지 못했습니다.")
        print(f"   조회수 {min_views:,} 이상인 릴스가 최근 게시물에 없거나")
        print("   계정이 비공개이거나 접근할 수 없을 수 있습니다.")

if __name__ == "__main__":
    main()