#!/usr/bin/env python3
"""
직접 Python으로 Instaloader 테스트
더 상세한 에러 정보와 로그인 상태 확인
"""

import instaloader
import json
import sys
from datetime import datetime

def test_instaloader_login():
    try:
        print("🚀 Instaloader 직접 테스트 시작")
        print(f"📅 현재 시간: {datetime.now()}")

        # Instaloader 인스턴스 생성
        L = instaloader.Instaloader()

        print("🔑 Instagram 로그인 시도...")

        # 로그인 시도
        try:
            L.login('j082175j082172@gmail.com', '!@tkadnjsth3')
            print("✅ 로그인 성공!")
        except Exception as login_error:
            print(f"❌ 로그인 실패: {login_error}")
            print("⚠️ 로그인 없이 공개 포스트 접근 시도...")

        # 테스트할 shortcode들
        test_shortcodes = ['CXkbh11p7ZH', 'DCvqpNFykEz']

        for shortcode in test_shortcodes:
            print(f"\n📸 테스트 중: {shortcode}")

            try:
                # 포스트 객체 생성
                post = instaloader.Post.from_shortcode(L.context, shortcode)

                print("✅ 포스트 객체 생성 성공!")

                # 기본 정보 추출
                post_info = {
                    'shortcode': post.shortcode,
                    'caption': post.caption[:100] if post.caption else None,
                    'likes': post.likes,
                    'comments': post.comments,
                    'is_video': post.is_video,
                    'date': post.date.isoformat(),
                }

                if post.is_video:
                    post_info['video_view_count'] = post.video_view_count

                print("📊 포스트 데이터:")
                print(json.dumps(post_info, ensure_ascii=False, indent=2))

                # 작성자 정보 추출
                try:
                    owner_profile = post.owner_profile
                    profile_info = {
                        'username': owner_profile.username,
                        'followers': owner_profile.followers,
                        'followees': owner_profile.followees,
                        'mediacount': owner_profile.mediacount,
                        'is_verified': owner_profile.is_verified
                    }

                    print("👤 프로필 데이터:")
                    print(json.dumps(profile_info, ensure_ascii=False, indent=2))

                except Exception as profile_error:
                    print(f"❌ 프로필 데이터 추출 실패: {profile_error}")

            except Exception as post_error:
                print(f"❌ 포스트 추출 실패: {post_error}")
                print(f"에러 타입: {type(post_error).__name__}")

        print("\n🎉 테스트 완료!")

    except Exception as main_error:
        print(f"💥 메인 에러: {main_error}")
        print(f"에러 타입: {type(main_error).__name__}")

if __name__ == "__main__":
    test_instaloader_login()