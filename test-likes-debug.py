#!/usr/bin/env python3

import instaloader
import json

def debug_likes_issue():
    try:
        print("Debugging Instagram likes issue")

        # Create and login
        L = instaloader.Instaloader()
        L.login('j082175j082172@gmail.com', '!@tkadnjsth3')
        print("Login successful!")

        # Test both posts - image and video
        test_cases = [
            ("CXkbh11p7ZH", "Previous image post"),
            ("DOf5jTKjC4t", "Current video reel")
        ]

        for shortcode, description in test_cases:
            print(f"\n=== Testing {shortcode} ({description}) ===")

            try:
                post = instaloader.Post.from_shortcode(L.context, shortcode)
                print(f"Post loaded: {post.typename}")

                # Check likes in different ways
                print("Likes analysis:")
                print(f"  post.likes: {post.likes}")
                print(f"  post.likes type: {type(post.likes)}")

                # Check if there are any other like-related attributes
                like_attrs = [attr for attr in dir(post) if 'like' in attr.lower()]
                print(f"  Like-related attributes: {like_attrs}")

                for attr in like_attrs:
                    try:
                        value = getattr(post, attr)
                        if not callable(value):
                            print(f"    {attr}: {value}")
                    except:
                        print(f"    {attr}: <could not access>")

                # Check edge cases for likes
                try:
                    if hasattr(post, '_node'):
                        print("  Checking _node data for likes...")
                        # Sometimes likes are in the raw node data
                except:
                    pass

                # Try to access raw data if available
                try:
                    print(f"  Raw mediacount: {post.mediacount}")
                    print(f"  Owner profile accessible: {bool(post.owner_profile)}")
                except Exception as e:
                    print(f"  Raw data access error: {e}")

            except Exception as post_error:
                print(f"Error loading post {shortcode}: {post_error}")

        # Test Instagram's like count hiding feature
        print(f"\n=== Instagram Like Count Analysis ===")
        print("Possible reasons for likes = -1:")
        print("1. Instagram hides like counts on some posts")
        print("2. The post owner has disabled like count display")
        print("3. Regional restrictions on like count visibility")
        print("4. API limitation or rate limiting")
        print("5. The account viewing doesn't have permission to see likes")

    except Exception as main_error:
        print(f"Main error: {main_error}")

if __name__ == "__main__":
    debug_likes_issue()