#!/usr/bin/env python3

import instaloader
import json
import sys

def test_video_posts():
    try:
        print("Testing Instagram video posts for view count")

        # Create Instaloader instance
        L = instaloader.Instaloader()

        print("Attempting Instagram login...")

        # Login
        try:
            L.login('j082175j082172@gmail.com', '!@tkadnjsth3')
            print("Login successful!")
        except Exception as login_error:
            print(f"Login failed: {login_error}")
            print("Continuing without login...")

        # Test different types of shortcodes
        test_shortcodes = [
            'CXkbh11p7ZH',  # Original (image)
            'DCvqpNFykEz'   # Another test
        ]

        for shortcode in test_shortcodes:
            print(f"\n=== Testing shortcode: {shortcode} ===")

            try:
                # Create post object
                post = instaloader.Post.from_shortcode(L.context, shortcode)
                print("Post object created successfully!")

                # Extract comprehensive info
                result = {
                    'shortcode': post.shortcode,
                    'likes': post.likes,
                    'comments': post.comments,
                    'is_video': post.is_video,
                    'typename': post.typename if hasattr(post, 'typename') else 'unknown',
                    'owner_username': post.owner_username,
                    'date': post.date.isoformat(),
                    'caption': post.caption[:50] + '...' if post.caption else None
                }

                # Try to get video view count
                if post.is_video:
                    try:
                        result['video_view_count'] = post.video_view_count
                        print(f"VIDEO FOUND! View count: {post.video_view_count}")
                    except Exception as view_error:
                        result['video_view_count'] = None
                        print(f"Video view count not available: {view_error}")
                else:
                    result['video_view_count'] = None
                    print("This is not a video post (image/carousel)")

                print("Complete post data:")
                print(json.dumps(result, indent=2, default=str))

                # Get profile data
                try:
                    owner_profile = post.owner_profile
                    profile_data = {
                        'username': owner_profile.username,
                        'followers': owner_profile.followers,
                        'mediacount': owner_profile.mediacount,
                        'is_verified': owner_profile.is_verified
                    }
                    print("Profile data:")
                    print(json.dumps(profile_data, indent=2))
                except Exception as profile_error:
                    print(f"Profile extraction failed: {profile_error}")

            except Exception as post_error:
                print(f"Post extraction failed for {shortcode}: {post_error}")
                continue

        print("\n=== Test completed ===")

    except Exception as main_error:
        print(f"Main error: {main_error}")

if __name__ == "__main__":
    test_video_posts()