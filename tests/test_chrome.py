"""Task 3: the liquid chrome sculpture (assets/js/chrome.js)."""
import unittest

from tests.harness import SiteTestCase

# Each test gets its own full-viewport canvas and controller.
SETUP = """() => {
  const c = document.createElement('canvas');
  c.id = 'testChrome';
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:99';
  document.body.appendChild(c);
  window.__ctl = BashChrome.init(c);
  return window.__ctl !== null;
}"""


class ChromeTest(SiteTestCase):
    def ctl(self, page):
        self.assertTrue(page.evaluate(SETUP), "BashChrome.init returned null")

    def sample(self, page, nx, ny):
        return page.evaluate("([x, y]) => window.__ctl.debugSample(x, y)", [nx, ny])

    def test_home_draws_behind_character(self):
        page = self.open("/")
        self.ctl(page)
        page.evaluate("window.__ctl.setState('home'); window.__ctl.setPointer(0.66, 0.40)")
        page.wait_for_timeout(1200)
        self.assertGreater(self.sample(page, 0.66, 0.40)[3], 200)
        self.assertLess(self.sample(page, 0.05, 0.95)[3], 10)

    def test_about_keeps_reading_column_clear(self):
        page = self.open("/")
        self.ctl(page)
        page.evaluate("window.__ctl.setState('about')")
        self.assertLess(self.sample(page, 0.5, 0.5)[3], 10)

    def test_socials_follows_targets(self):
        page = self.open("/")
        self.ctl(page)
        page.evaluate("window.__ctl.setTargets([{x:360,y:450},{x:720,y:450},{x:1080,y:450}]); window.__ctl.setState('socials')")
        for nx in (360 / 1440, 720 / 1440, 1080 / 1440):
            self.assertGreater(self.sample(page, nx, 0.5)[3], 200, "no chrome at x=%.3f" % nx)

    def test_gamble_shows_chip(self):
        page = self.open("/")
        self.ctl(page)
        page.evaluate("window.__ctl.setState('gamble')")
        self.assertGreater(self.sample(page, 0.675, 0.45)[3], 200)

    def test_blend_midpoint_differs(self):
        # Reduced motion freezes time, so only the geometry can change the samples.
        page = self.open("/", reduced_motion=True)
        self.ctl(page)
        page.evaluate("window.__ctl.setState('home')")
        home = self.sample(page, 0.66, 0.40)
        page.evaluate("window.__ctl.setState('gamble')")
        gamble = self.sample(page, 0.66, 0.40)
        page.evaluate("window.__ctl.blend('home', 'gamble', 0.5)")
        mid = self.sample(page, 0.66, 0.40)
        self.assertEqual(page.evaluate("window.__ctl.stats().state"), "home>gamble")
        self.assertNotEqual(mid, home)
        self.assertNotEqual(mid, gamble)

    def test_no_webgl_returns_null(self):
        page = self.open("/", webgl=False)
        self.assertFalse(page.evaluate(SETUP))
        self.assertTrue(page.evaluate("document.documentElement.classList.contains('no-gl')"))

    def test_reduced_motion_is_frozen(self):
        page = self.open("/", reduced_motion=True)
        self.ctl(page)
        page.evaluate("window.__ctl.setState('home')")
        first = self.sample(page, 0.66, 0.40)
        page.wait_for_timeout(500)
        self.assertEqual(self.sample(page, 0.66, 0.40), first)

    def test_resize_updates_canvas(self):
        page = self.open("/")
        self.ctl(page)
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(300)
        width, scale, dpr = page.evaluate("""() => { window.__ctl.debugSample(0.5, 0.5);
            return [document.getElementById('testChrome').width, window.__ctl.stats().scale, devicePixelRatio]; }""")
        self.assertAlmostEqual(width, round(390 * min(dpr, 1.5) * scale), delta=2)

    def test_scale_within_bounds(self):
        page = self.open("/")
        self.ctl(page)
        page.wait_for_timeout(1500)
        scale = page.evaluate("window.__ctl.stats().scale")
        self.assertGreaterEqual(scale, 0.34)
        self.assertLessEqual(scale, 0.95)

    def test_idempotent_per_canvas(self):
        page = self.open("/")
        self.ctl(page)
        self.assertTrue(page.evaluate("BashChrome.init(document.getElementById('testChrome')) === window.__ctl"))


if __name__ == "__main__":
    unittest.main()
