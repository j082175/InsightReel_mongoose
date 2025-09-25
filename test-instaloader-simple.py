#!/usr/bin/env python3

import instaloader
import json
import sys

def test_instaloader():
    try:
        print("Instaloader test start")

        # Create Instaloader instance
        L = instaloader.Instaloader()

        print("Attempting Instagram login...")

        # Login attempt
        try:
            L.login('j082175j082172@gmail.com', '!@tkadnjsth3')
            print("Login successful!")
        except Exception as login_error:
            print(f"Login failed: {login_error}")
            print("Trying without login...")

        # Test multiple shortcodes (including video posts)
        test_shortcodes = [
            'CXkbh11p7ZH',  # Original test
            'C_8-qsOpM5p',  # Try a video post
            'C-8tJZYOQaM'   # Another potential video
        ]

        for shortcode in test_shortcodes:
            print(f"\nTesting shortcode: {shortcode}")

            try:
                # Create post object
                post = instaloader.Post.from_shortcode(L.context, shortcode)
                print("Post object created successfully!")

                # Extract basic info
                result = {
                    'shortcode': post.shortcode,
                    'likes': post.likes,
                    'comments': post.comments,
                    'is_video': post.is_video,
                    'typename': post.typename,
                    'owner_username': post.owner_username
                }

                # Always try to get video_view_count
                try:
                    result['video_view_count'] = post.video_view_count
                    print(f"Video view count: {post.video_view_count}")
                except:
                    result['video_view_count'] = None
                    print("No video view count available")

                print("Post data extracted:")
                print(json.dumps(result, indent=2))

                # Break after first successful extraction
                if result['video_view_count'] is not None:
                    print("Found video with view count!")
                    break

            except Exception as post_error:
                print(f"Post extraction failed for {shortcode}: {post_error}")
                continue

            # Try to get profile data
            try:
                owner_profile = post.owner_profile
                profile_data = {
                    'username': owner_profile.username,
                    'followers': owner_profile.followers,
                    'mediacount': owner_profile.mediacount
                }
                print("Profile data extracted:")
                print(json.dumps(profile_data, indent=2))

            except Exception as profile_error:
                print(f"Profile extraction failed: {profile_error}")

        except Exception as post_error:
            print(f"Post extraction failed: {post_error}")

    except Exception as main_error:
        print(f"Main error: {main_error}")

if __name__ == "__main__":
    test_instaloader()