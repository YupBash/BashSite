#!/usr/bin/env python3
"""Add a TikTok video to the home page "Latest videos" section.

Usage (from the repo root):
    python3 tools/add-video.py https://www.tiktok.com/@yupbash/video/1234567890
    python3 tools/add-video.py <url> --title "Custom title"

Fetches the title and thumbnail through TikTok's public oEmbed endpoint, saves the
thumbnail to assets/videos/<id>.jpg (TikTok thumbnail URLs expire, so we keep a copy),
and puts the video first in assets/videos/videos.json. Placeholders are removed and
only the 8 most recent videos are kept. Then commit + push to publish.
"""
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "assets" / "videos" / "videos.json"
THUMBS = ROOT / "assets" / "videos"
MAX_VIDEOS = 8
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"}


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
        return r.read()


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        return 1
    url = args[0].split("?")[0]
    title = args[args.index("--title") + 1] if "--title" in args else None

    m = re.search(r"/video/(\d+)", url)
    if not m:
        print("Expected a video link like https://www.tiktok.com/@yupbash/video/123... "
              "(on the phone: Share > Copy link, then open it once in a browser to get the full URL).")
        return 1
    vid = m.group(1)

    try:
        meta = json.loads(fetch("https://www.tiktok.com/oembed?url=" + urllib.parse.quote(url, safe="")))
    except Exception as e:
        print(f"TikTok oEmbed failed ({e}). Try again in a minute (TikTok rate-limits).")
        return 1
    thumb_url = meta.get("thumbnail_url")
    if not thumb_url:
        print("TikTok returned no thumbnail for this video.")
        return 1
    thumb_path = THUMBS / f"{vid}.jpg"
    thumb_path.write_bytes(fetch(thumb_url))

    videos = json.loads(DATA.read_text()) if DATA.exists() else []
    videos = [v for v in videos if not v.get("placeholder") and vid not in v.get("url", "")]
    clean_title = (title or meta.get("title") or "New video").strip()
    clean_title = re.sub(r"\s*#\S+", "", clean_title).strip() or "New video"  # drop hashtags
    videos.insert(0, {"url": url, "thumb": f"/assets/videos/{vid}.jpg", "title": clean_title[:80]})
    for old in videos[MAX_VIDEOS:]:
        p = ROOT / old["thumb"].lstrip("/")
        if p.parent == THUMBS and p.exists():
            p.unlink()
    videos = videos[:MAX_VIDEOS]
    DATA.write_text(json.dumps(videos, ensure_ascii=False, indent=2) + "\n")
    print(f"Added: {clean_title}  ({len(videos)} videos in the list)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
