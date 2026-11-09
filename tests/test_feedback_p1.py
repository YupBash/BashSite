"""Phase-1 checkpoint feedback: lock-on brackets on hover, readable menu titles, plain chrome bubbles above the Socials buttons."""
import re
import unittest

from tests.harness import SiteTestCase


def luminance(rgb):
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


# Brand hues (Discord, TikTok, Instagram) used to detect an emblem drawn on the Socials bubbles
# (#5865f2 ≈ 235°, #25f4ee ≈ 178°, #e1306c ≈ 337°). Violet chrome reflections sit near 262° and are rejected.
BRAND_HUES = {"discord": 235, "tiktok": 178, "instagram": 337}


def nearest_brand(rgb):
    import colorsys
    h, s, v = colorsys.rgb_to_hsv(*(c / 255 for c in rgb))
    if s < 0.35 or v < 0.45:
        return None
    hue = h * 360
    best = min(BRAND_HUES, key=lambda k: min(abs(hue - BRAND_HUES[k]), 360 - abs(hue - BRAND_HUES[k])))
    gap = min(abs(hue - BRAND_HUES[best]), 360 - abs(hue - BRAND_HUES[best]))
    return best if gap <= 15 else None


class FeedbackTest(SiteTestCase):
    def test_hover_shows_lock_brackets_with_label(self):
        page = self.open("/")
        page.evaluate("document.querySelector('#gamble a.play-btn').scrollIntoView({ block: 'center', behavior: 'instant' })")
        page.wait_for_timeout(300)
        gel = page.locator("#gamble a.play-btn").bounding_box()
        page.mouse.move(gel["x"] + gel["width"] / 2, gel["y"] + gel["height"] / 2, steps=6)
        page.wait_for_timeout(900)
        lock = page.evaluate("""() => { const l = document.querySelector('.mercure-lock'); if (!l) return null;
            const r = l.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height,
            o: +getComputedStyle(l).opacity, label: l.textContent }; }""")
        self.assertIsNotNone(lock, "no .mercure-lock element")
        self.assertGreater(lock["o"], 0.9)
        self.assertLessEqual(lock["x"], gel["x"] - 4)
        self.assertGreaterEqual(lock["x"] + lock["w"], gel["x"] + gel["width"] + 4)
        self.assertLessEqual(lock["y"], gel["y"] - 4)
        self.assertGreaterEqual(lock["y"] + lock["h"], gel["y"] + gel["height"] + 4)
        self.assertIn("play", lock["label"].lower())
        page.mouse.move(760, 760, steps=6)
        page.wait_for_timeout(900)
        self.assertLess(page.evaluate("+getComputedStyle(document.querySelector('.mercure-lock')).opacity"), 0.1)

    def test_mobile_socials_bubbles_stay_separate(self):
        page = self.open("/", mobile=True, reduced_motion=True)
        page.wait_for_function("() => window.BashHome && BashHome.chrome && BashHome.chrome.stats().frames > 0", timeout=15000)
        page.evaluate("document.getElementById('socials').scrollIntoView({ block: 'center', behavior: 'instant' })")
        page.wait_for_timeout(800)
        t = page.evaluate("BashHome.socialTargets()")
        vw, vh = page.evaluate("[innerWidth, innerHeight]")
        gaps = [[(t[0]["x"] + t[1]["x"]) / 2 / vw, t[0]["y"] / vh], [(t[1]["x"] + t[2]["x"]) / 2 / vw, t[1]["y"] / vh]]
        centres = [[p["x"] / vw, p["y"] / vh] for p in t]
        px = page.evaluate("pts => BashHome.chrome.debugSample(pts)", gaps + centres)
        self.assertLess(px[0][3], 10, "bubbles 1 and 2 merge")
        self.assertLess(px[1][3], 10, "bubbles 2 and 3 merge")
        for c in px[2:]:
            self.assertGreater(c[3], 200)

    def test_lock_label_stays_on_screen_at_the_top(self):
        page = self.open("/")
        btn = page.locator("#menuBtn").bounding_box()
        page.mouse.move(btn["x"] + btn["width"] / 2, btn["y"] + btn["height"] / 2, steps=6)
        page.wait_for_timeout(900)
        top = page.evaluate("document.querySelector('.mercure-lock-label').getBoundingClientRect().top")
        self.assertGreaterEqual(top, 0)

    def test_menu_titles_readable(self):
        page = self.open("/")
        page.click("#menuBtn")
        page.wait_for_timeout(700)
        image = page.eval_on_selector(".menu-name", "el => getComputedStyle(el).backgroundImage")
        stops = [tuple(int(v) for v in m) for m in re.findall(r"rgba?\((\d+),\s*(\d+),\s*(\d+)", image)]
        if not stops:   # plain colour text
            stops = [tuple(int(v) for v in re.findall(r"\d+", page.eval_on_selector(".menu-name", "el => getComputedStyle(el).color"))[:3])]
        darkest = min(stops, key=luminance)
        self.assertGreaterEqual(contrast(darkest, (43, 20, 82)), 4.5, "darkest menu-title colour %s" % (darkest,))

    def test_socials_bubbles_are_plain_chrome_above_their_buttons(self):
        # The brand emblems were tried, then removed at YupBash's request: the bubbles are plain chrome.
        page = self.open("/", reduced_motion=True)
        page.wait_for_function("() => window.BashHome && BashHome.chrome && BashHome.chrome.stats().frames > 0", timeout=15000)
        page.evaluate("document.getElementById('socials').scrollIntoView({ block: 'center', behavior: 'instant' })")
        page.wait_for_timeout(800)
        targets = page.evaluate("BashHome.socialTargets()")
        self.assertEqual(len(targets), 3)
        buttons = page.evaluate("""() => [...document.querySelectorAll('.social-big')].map(b => {
            const r = b.getBoundingClientRect(); return { cx: r.left + r.width / 2, top: r.top, brand: b.dataset.brand }; })""")
        self.assertEqual([b["brand"] for b in buttons], ["discord", "tiktok", "instagram"])
        for t in targets:
            pts = [[(t["x"] + dx) / 1440, (t["y"] + dy) / 900] for dx in range(-40, 41, 8) for dy in range(-40, 41, 8)]
            pixels = page.evaluate("pts => BashHome.chrome.debugSample(pts)", pts)
            chrome = [px for px in pixels if px[3] >= 200]
            self.assertGreater(len(chrome), 20, "no chrome bubble at %s" % t)
            # The chrome palette stays between blue and violet: TikTok cyan or Instagram pink can only come from an emblem.
            emblem = [px for px in chrome if nearest_brand(px[:3]) in ("tiktok", "instagram")]
            self.assertLessEqual(len(emblem), 1, "brand emblem drawn on the bubble at %s: %s" % (t, emblem[:4]))
        # Each bubble floats above its own button, between the title and the button row.
        title_bottom = page.evaluate("document.getElementById('socialsTitle').getBoundingClientRect().bottom")
        for t, b in zip(targets, buttons):
            self.assertAlmostEqual(t["x"], b["cx"], delta=6)
            self.assertLess(t["y"], b["top"])
            self.assertGreater(t["y"], title_bottom)


if __name__ == "__main__":
    unittest.main()
