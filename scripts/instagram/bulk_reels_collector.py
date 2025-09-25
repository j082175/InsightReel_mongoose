#!/usr/bin/env python3
"""
Instagram 프로필별 릴스 대량 수집 스크립트
특정 프로필의 릴스들을 조건에 따라 대량 수집
"""

import instaloader
import json
import sys
from datetime import datetime, timedelta

def collect_profile_reels(username, days_back, min_views, max_count):
    """프로필별 릴스 대량 수집"""
    try:
        L = instaloader.Instaloader()

        # 로그인 (세션 재사용 시도)
        try:
            L.login('j082175j082172@gmail.com', '!@tkadnjsth3')
            print(json.dumps({'status': 'login_success'}, ensure_ascii=False), file=sys.stderr)
        except Exception as login_error:
            print(json.dumps({'status': 'login_failed', 'error': str(login_error)}, ensure_ascii=False), file=sys.stderr)

        # 프로필 객체 생성
        profile = instaloader.Profile.from_username(L.context, username)

        # 프로필 기본 정보
        profile_info = {
            'username': profile.username,
            'followers': profile.followers,
            'mediacount': profile.mediacount,
            'is_private': profile.is_private
        }

        print(json.dumps({'status': 'profile_loaded', 'profile': profile_info}, ensure_ascii=False), file=sys.stderr)

        # 날짜 필터링용
        cutoff_date = datetime.now() - timedelta(days=days_back)

        collected_reels = []
        total_posts = 0
        video_posts = 0
        collected_count = 0

        print(json.dumps({'status': 'collecting_started'}, ensure_ascii=False), file=sys.stderr)

        # 프로필의 모든 포스트 순회
        for post in profile.get_posts():
            total_posts += 1

            # 진행 상황 로깅 (매 10개마다)
            if total_posts % 10 == 0:
                print(json.dumps({
                    'status': 'progress',
                    'total_posts': total_posts,
                    'collected': collected_count
                }, ensure_ascii=False), file=sys.stderr)

            # 날짜 필터링 (최신부터 오므로 오래된 것 만나면 중단)
            if post.date < cutoff_date:
                print(json.dumps({'status': 'date_cutoff_reached'}, ensure_ascii=False), file=sys.stderr)
                break

            # 비디오인지 확인 (릴스/IGTV)
            if not post.is_video:
                continue

            video_posts += 1

            # 조회수 체크 (조회수 데이터가 없을 수도 있음)
            try:
                views = post.video_view_count or 0
                if views < min_views and views > 0:  # views가 0인 경우는 데이터 없음으로 포함
                    continue
            except:
                views = 0  # 조회수 데이터 없으면 0으로 처리

            # 릴스 데이터 추출
            try:
                reel_data = {
                    'shortcode': post.shortcode,
                    'title': post.caption[:100] if post.caption else f'Instagram Reel by @{username}',
                    'caption': post.caption,
                    'views': views,
                    'likes': post.likes,
                    'comments': post.comments,
                    'date': post.date.isoformat(),
                    'url': post.url,
                    'video_url': post.video_url if hasattr(post, 'video_url') else None,
                    'typename': post.typename,
                    'duration': getattr(post, 'video_duration', None),
                    'thumbnailUrl': post.url,
                    'owner_username': post.owner_username
                }

                collected_reels.append(reel_data)
                collected_count += 1

                # 최대 개수 제한
                if collected_count >= max_count:
                    print(json.dumps({'status': 'max_count_reached'}, ensure_ascii=False), file=sys.stderr)
                    break

            except Exception as post_error:
                print(json.dumps({
                    'status': 'post_error',
                    'shortcode': post.shortcode,
                    'error': str(post_error)
                }, ensure_ascii=False), file=sys.stderr)
                continue

        # 결과 반환
        result = {
            'success': True,
            'username': username,
            'profile_info': profile_info,
            'total_posts_checked': total_posts,
            'video_posts_found': video_posts,
            'collected_count': collected_count,
            'reels': collected_reels,
            'filter_criteria': {
                'days_back': days_back,
                'min_views': min_views,
                'max_count': max_count
            },
            'collection_time': datetime.now().isoformat()
        }

        print(json.dumps(result, ensure_ascii=False))
        return result

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'username': username,
            'error_type': type(e).__name__
        }
        print(json.dumps(error_result, ensure_ascii=False))
        return error_result

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python bulk_reels_collector.py <username> <days_back> <min_views> <max_count>'
        }))
        sys.exit(1)

    username = sys.argv[1]
    days_back = int(sys.argv[2])
    min_views = int(sys.argv[3])
    max_count = int(sys.argv[4])

    collect_profile_reels(username, days_back, min_views, max_count)