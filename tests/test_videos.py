"""Task 8: Latest videos — cards from videos.json (NO SIGNAL placeholders) on a 3D carousel that rides the chrome ring."""
import json
import math
import unittest

from tests.harness import SiteTestCase

VIDEOS = "videos.json"
REAL = json.dumps([
    {"url": "https://www.tiktok.com/@yupbash/video/1", "thumb": "/assets/character.webp", "title": "First"},
    {"url": "https://www.tiktok.com/@yupbash/video/2", "thumb": "/assets/character.webp", "title": "Second"},
    {"placeholder": True, "url": "https://www.tiktok.com/@yupbash", "thumb": "/assets/og-image.jpg", "title": "New video"},
    {"title": "broken"},
])
CARDS = """() => [...document.querySelectorAll('#vidsRing .vid-card')].map(a => ({
    href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'),
    nosignal: a.classList.contains('is-nosignal'),
    img: a.querySelector('img') ? a.querySelector('img').getAttribute('src') : null,
    alt: a.querySelector('img') ? a.querySelector('img').getAttribute('alt') : null,
    lazy: a.querySelector('img') ? a.querySelector('img').getAttribute('loading') : null,
    title: a.querySelector('.vid-title') ? a.querySelector('.vid-title').textContent : null,
    cta: a.querySelector('.vid-cta') ? a.querySelector('.vid-cta').textContent : null }))"""
# Scroll so that card k sits at the front of the ring (the pinned range is split evenly between the cards).
GOTO_CARD = """k => { const s = document.getElementById('videos'), top = s.getBoundingClientRect().top + scrollY;
    const span = s.offsetHeight - innerHeight, n = document.querySelectorAll('#vidsRing .vid-card').length;
    scrollTo({ top: top + span * k / (n - 1), behavior: 'instant' }); }"""
READY = "() => document.querySelectorAll('#vidsRing .vid-card').length >= 6"
READY_3D = ("() => window.BashHome && BashHome.chrome && BashHome.chrome.stats().frames > 3"
            " && document.querySelectorAll('#vidsRing .vid-card').length >= 6")


class VideosDataTest(SiteTestCase):
    def cards(self, page):
        page.wait_for_function(READY, timeout=10000)
        return page.evaluate(CARDS)

    def test_placeholders_render_as_nosignal(self):
        page = self.open("/")
        cards = self.cards(page)
        self.assertEqual(len(cards), 6)
        for c in cards:
            self.assertTrue(c["nosignal"])
            self.assertEqual(c["title"], "NO SIGNAL — first drop soon")
            self.assertEqual(c["cta"], "Follow on TikTok")
            self.assertEqual(c["href"], "https://www.tiktok.com/@yupbash")
            self.assertEqual((c["target"], c["rel"]), ("_blank", "noopener"))
            self.assertIsNone(c["img"])
        self.assert_clean(page)

    def test_real_entries_render_thumbnails(self):
        page = self.open("/", routes={VIDEOS: REAL})
        cards = self.cards(page)
        self.assertEqual(len(cards), 6)
        self.assertEqual([c["title"] for c in cards[:2]], ["First", "Second"])
        for c, n in zip(cards[:2], (1, 2)):
            self.assertFalse(c["nosignal"])
            self.assertEqual(c["href"], "https://www.tiktok.com/@yupbash/video/%d" % n)
            self.assertEqual((c["img"], c["alt"], c["lazy"]), ("/assets/character.webp", "", "lazy"))
            self.assertEqual(c["cta"], "Watch on TikTok →")
        self.assertTrue(all(c["nosignal"] and c["img"] is None for c in cards[2:]))

    def test_titles_are_text(self):
        evil = json.dumps([{"url": "https://www.tiktok.com/@yupbash/video/3", "thumb": "/assets/character.webp",
                            "title": "<img src=x onerror=alert(1)>"}])
        page = self.open("/", routes={VIDEOS: evil})
        cards = self.cards(page)
        self.assertEqual(cards[0]["title"], "<img src=x onerror=alert(1)>")
        self.assertEqual(page.evaluate("document.querySelectorAll('img[src=\"x\"]').length"), 0)

    def test_fetch_failure_keeps_section(self):
        page = self.open("/", block=(VIDEOS,))
        cards = self.cards(page)
        self.assertEqual(len(cards), 6)
        self.assertTrue(all(c["nosignal"] for c in cards))
        self.assertTrue(page.is_visible("#videos"))
        self.assert_clean(page, allow=(VIDEOS,))

    def test_reduced_motion_grid(self):
        page = self.open("/", reduced_motion=True)
        self.cards(page)
        self.assertTrue(page.evaluate("document.querySelector('.vids').classList.contains('is-grid')"))
        self.assertFalse(page.evaluate("document.documentElement.classList.contains('vids-3d')"))

    def test_no_gsap_grid(self):
        page = self.open("/", block=("cdnjs.cloudflare.com",))
        self.cards(page)
        self.assertTrue(page.evaluate("document.querySelector('.vids').classList.contains('is-grid')"))
        self.assert_clean(page, allow=("cdnjs",))


class VideosCarouselTest(SiteTestCase):
    def test_carousel_turns_with_scroll(self):
        page = self.open("/")
        page.wait_for_function(READY_3D, timeout=15000)
        self.assertTrue(page.evaluate("document.documentElement.classList.contains('vids-3d')"))
        for k in (0, 2, 5):
            page.evaluate(GOTO_CARD, k)
            page.wait_for_function("k => BashHome.videos.front() === k", arg=k, timeout=8000)
            front = page.evaluate("[...document.querySelectorAll('#vidsRing .vid-card')].findIndex(c => c.classList.contains('is-front'))")
            self.assertEqual(front, k)
            if 0 < k < 5:   # well inside the pinned range: the chrome stays in its "videos" state
                page.wait_for_function("() => BashHome.chrome.stats().state === 'videos'", timeout=5000)
        self.assert_clean(page)

    def test_cards_ride_the_chrome_ring(self):
        page = self.open("/")
        page.wait_for_function(READY_3D, timeout=15000)
        page.evaluate(GOTO_CARD, 2)
        page.wait_for_function("() => BashHome.videos.front() === 2 && BashHome.chrome.stats().state === 'videos'", timeout=8000)
        page.wait_for_timeout(1600)   # let the scrubbed rotation settle exactly on card 2
        geo = page.evaluate("""() => { const f = BashHome.videos.frame(), c = document.querySelector('#vidsRing .vid-card.is-front').getBoundingClientRect();
            return { f: f, bottom: c.bottom, cx: c.left + c.width / 2 }; }""")
        f = geo["f"]
        a, r, d = f["tilt"], f["r"], f["camera"]
        # Front of the ring: one radius towards the viewer, seen by the chrome camera (perspective centred on the screen).
        front_y = 450 + (f["y"] - 450 + r * math.sin(a)) * d / (d - r * math.cos(a))
        self.assertAlmostEqual(geo["cx"], f["x"], delta=6)
        self.assertAlmostEqual(geo["bottom"], front_y, delta=8, msg="the front card does not stand on the ring")
        # The chrome draws its ring on that same frame. Its liquid tube is ~13 px thick and ripples by up to ~9 px.
        # Both ends sit at (x ± r, y) whatever the tilt (they lie on the tilt axis):
        for side in (-1, 1):
            pts = [[(f["x"] + side * r + dx) / 1440, (f["y"] + dy) / 900] for dx in range(-10, 11, 2) for dy in range(-14, 15, 2)]
            alpha = max(p[3] for p in page.evaluate("pts => BashHome.chrome.debugSample(pts)", pts))
            self.assertGreater(alpha, 200, "no chrome ring at the %s end of the carousel" % ("left" if side < 0 else "right"))
        # ...and its front passes under the front card. The tilt wobbles slowly with time and the software renderer used
        # by the tests draws a frame every few hundred ms, so the front is predicted from the wobble of the sampled render.
        top = int(front_y) - 120
        px = page.evaluate("pts => BashHome.chrome.debugSample(pts)", [[f["x"] / 1440, (top + 2 * i) / 900] for i in range(121)])
        a_now = page.evaluate("BashChrome.ringFrame('videos', 1440, 900).tilt + BashHome.chrome.ringWobble()")
        front_now = 450 + (f["y"] - 450 + r * math.sin(a_now)) * d / (d - r * math.cos(a_now))
        hits = [top + 2 * i for i, p in enumerate(px) if p[3] > 200]
        self.assertTrue(any(abs(y - front_now) <= 12 for y in hits),
                        "the chrome ring front is not where the cards stand (expected y≈%.0f, chrome at %s)" % (front_now, hits))

    def test_title_clears_the_ring(self):
        for mobile in (False, True):
            page = self.open("/", mobile=mobile)
            page.wait_for_function(READY_3D, timeout=15000)
            page.evaluate(GOTO_CARD, 1)
            page.wait_for_function("() => BashHome.videos.front() === 1", timeout=8000)
            page.wait_for_timeout(1200)
            res = page.evaluate("""() => { const t = document.getElementById('videosTitle').getBoundingClientRect();
                // Visible cards = the front one and its two neighbours; the others face away (backface hidden).
                const all = [...document.querySelectorAll('#vidsRing .vid-card')], k = BashHome.videos.front(), n = all.length;
                const cards = [k - 1, k, k + 1].map(i => all[(i + n) % n].getBoundingClientRect());
                return { title: t.bottom, top: Math.min(...cards.map(r => r.top)), f: BashHome.videos.frame(), vw: innerWidth, vh: innerHeight }; }""")
            f = res["f"]
            # Back of the ring at its steepest wobble (tilt .28 + .18 rad), perspective centred on the screen.
            mid = res["vh"] / 2
            back = mid + (f["y"] - mid - f["r"] * math.sin(.46)) * f["camera"] / (f["camera"] + f["r"] * math.cos(.46))
            self.assertLess(res["title"], res["top"], "a card covers the title (mobile=%s)" % mobile)
            self.assertLess(res["title"], back - 12, "the chrome ring crosses the title (mobile=%s)" % mobile)
            self.assertLessEqual(f["x"] + f["r"], res["vw"] + 1)
            self.assertGreaterEqual(f["x"] - f["r"], -1)

    def test_keyboard_focus_brings_card_to_front(self):
        page = self.open("/")
        page.wait_for_function(READY_3D, timeout=15000)
        page.evaluate(GOTO_CARD, 0)
        page.wait_for_function("() => BashHome.videos.front() === 0", timeout=8000)
        page.focus("#vidsRing .vid-card:nth-child(4)")
        page.wait_for_function("() => BashHome.videos.front() === 3", timeout=8000)


if __name__ == "__main__":
    unittest.main()
