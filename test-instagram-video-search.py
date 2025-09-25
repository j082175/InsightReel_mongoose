#!/usr/bin/env python3

import instaloader
import json

def find_video_posts():
    try:
        print("Searching for Instagram video posts with view counts")

        # Create Instaloader instance
        L = instaloader.Instaloader()

        # Login
        L.login('j082175j082172@gmail.com', '!@tkadnjsth3')
        print("Login successful!")

        # Get a profile that likely has videos
        username = "instagram"  # Instagram official account
        print(f"Getting profile: {username}")

        profile = instaloader.Profile.from_username(L.context, username)
        print(f"Profile loaded: {profile.username} ({profile.mediacount} posts)")

        # Look through recent posts to find videos
        video_found = False
        post_count = 0
        max_posts = 10  # Limit search to avoid rate limiting

        for post in profile.get_posts():
            post_count += 1
            print(f"\nChecking post {post_count}: {post.shortcode}")

            try:
                print(f"  Type: {post.typename}")
                print(f"  Is video: {post.is_video}")

                if post.is_video:
                    print("  VIDEO FOUND!")

                    # Extract video data
                    video_data = {
                        'shortcode': post.shortcode,
                        'url': f"https://www.instagram.com/p/{post.shortcode}/",
                        'likes': post.likes,
                        'comments': post.comments,
                        'is_video': post.is_video,
                        'typename': post.typename,
                        'owner_username': post.owner_username,
                        'date': post.date.isoformat(),
                        'caption': post.caption[:100] + '...' if post.caption else None
                    }

                    # Try to get view count
                    try:
                        video_data['video_view_count'] = post.video_view_count
                        print(f"  VIEW COUNT: {post.video_view_count}")
                    except Exception as view_error:
                        video_data['video_view_count'] = None
                        print(f"  View count error: {view_error}")

                    print("  Video data:")
                    print(json.dumps(video_data, indent=4, default=str))

                    video_found = True
                    break  # Found a video, stop searching

                else:
                    print(f"  Skipping (not video): likes={post.likes}")

            except Exception as post_error:
                print(f"  Error processing post: {post_error}")
                continue

            if post_count >= max_posts:
                print(f"\nReached maximum posts limit ({max_posts})")
                break

        if not video_found:
            print("\nNo video posts found in the searched posts")

        print(f"\nSearch completed. Checked {post_count} posts.")

    except Exception as main_error:
        print(f"Main error: {main_error}")

if __name__ == "__main__":
    find_video_posts()