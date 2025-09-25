#!/usr/bin/env python3
"""
Instagram 개별 릴스 데이터 추출 스크립트
단일 릴스 URL에서 완전한 데이터 추출
"""

import instaloader
import json
import sys
from datetime import datetime

def extract_single_reel(shortcode):
    """개별 릴스 데이터 추출"""
    try:
        # Instaloader 인스턴스 생성 (조용히)
        L = instaloader.Instaloader(
            quiet=True,
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False
        )

        # Instagram 세션 로드 (쿠키 기반)
        try:
            # 쿠키 파일에서 세션 로드 시도
            import os
            session_file = os.path.join(os.path.dirname(__file__), 'instagram_session')

            if os.path.exists(session_file):
                L.load_session_from_file('j082175j082172', session_file)
                print(json.dumps({'status': 'session_loaded'}, ensure_ascii=False), file=sys.stderr)
            else:
                # 세션 파일이 없으면 로그인 후 저장
                L.login('j082175j082172@gmail.com', '!@tkadnjsth3')
                L.save_session_to_file(session_file)
                print(json.dumps({'status': 'login_and_save_session'}, ensure_ascii=False), file=sys.stderr)
        except Exception as login_error:
            print(json.dumps({'status': 'login_failed', 'error': str(login_error)}, ensure_ascii=False), file=sys.stderr)

        # 개별 포스트 객체 생성
        post = instaloader.Post.from_shortcode(L.context, shortcode)

        # 릴스 데이터 추출 (인코딩 안전)
        caption = post.caption or 'Instagram Reel'
        # 특수 문자 제거하여 인코딩 문제 방지
        import re
        caption_safe = re.sub(r'[^\x00-\x7F]+', ' ', caption).strip()

        post_data = {
            'shortcode': post.shortcode,
            'title': caption_safe[:100] if caption_safe else 'Instagram Reel',
            'caption': caption_safe,
            'likes': post.likes,
            'comments': post.comments,
            'views': post.video_view_count if post.is_video else 0,
            'video_view_count': post.video_view_count if post.is_video else None,
            'is_video': post.is_video,
            'date': post.date.isoformat(),
            'url': post.url,
            'video_url': post.video_url if post.is_video else None,
            'typename': post.typename,
            'duration': getattr(post, 'video_duration', None) if post.is_video else None,
            'thumbnailUrl': getattr(post, 'url', None),
            'owner_username': post.owner_username
        }

        # 작성자 프로필 데이터 추출 (인코딩 안전)
        try:
            owner_profile = post.owner_profile

            # 프로필 biography 안전 처리
            bio = owner_profile.biography or ''
            bio_safe = re.sub(r'[^\x00-\x7F]+', ' ', bio).strip()

            profile_data = {
                'username': owner_profile.username,
                'channelName': owner_profile.username,
                'full_name': owner_profile.full_name,
                'subscribers': owner_profile.followers,
                'followers': owner_profile.followers,
                'followees': owner_profile.followees,
                'mediacount': owner_profile.mediacount,
                'channelVideos': owner_profile.mediacount,
                'biography': bio_safe,
                'is_private': owner_profile.is_private,
                'is_verified': owner_profile.is_verified,
                'profile_pic_url': owner_profile.profile_pic_url
            }
        except Exception as profile_error:
            profile_data = {
                'username': post.owner_username,
                'channelName': post.owner_username,
                'error': str(profile_error)
            }

        # 통합 결과
        result = {
            'success': True,
            'post': post_data,
            'profile': profile_data,
            'platform': 'INSTAGRAM',
            'extractor': 'instaloader',
            'extracted_at': datetime.now().isoformat()
        }

        print(json.dumps(result, ensure_ascii=False))
        return result

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'shortcode': shortcode,
            'platform': 'INSTAGRAM',
            'extractor': 'instaloader'
        }
        print(json.dumps(error_result, ensure_ascii=False))
        return error_result

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python single_reel_extractor.py <shortcode>'
        }))
        sys.exit(1)

    shortcode = sys.argv[1]
    extract_single_reel(shortcode)