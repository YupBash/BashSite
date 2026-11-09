"""Task 7: scroll choreography — section indicator, chrome states and the evolving backdrop."""
import unittest

from tests.harness import SiteTestCase

SECTIONS = [("home", "HOME"), ("videos", "VIDEOS"), ("about", "ABOUT"), ("socials", "SOCIALS"), ("gamble", "GAMBLE")]
CENTER = "id => document.getElementById(id).scrollIntoView({ block: 'center', behavior: 'instant' })"
C0 = "getComputedStyle(document.querySelector('.backdrop')).getPropertyValue('--bd-c0').trim()"


class ScrollTest(SiteTestCase):
    def settle(self, page):
        page.wait_for_function("() => window.BashHome && BashHome.chrome && BashHome.chrome.stats().frames > 3", timeout=15000)

    def test_backdrop_follows_sections(self):
        page = self.open("/")
        self.settle(page)
        page.evaluate(CENTER, "about")
        page.wait_for_timeout(800)
        self.assertEqual(page.evaluate(C0), "36 22 66")
        page.evaluate(CENTER, "gamble")
        page.wait_for_timeout(800)
        self.assertEqual(page.evaluate(C0), "74 16 72")

    def test_backdrop_blends_between_sections(self):
        page = self.open("/")
        self.settle(page)
        page.evaluate("""() => {
            const top = el => el.getBoundingClientRect().top + window.scrollY;
            const h = document.getElementById('home'), v = document.getElementById('videos');
            const start = top(h) + 0.6 * h.offsetHeight, end = top(v) + 0.2 * v.offsetHeight;
            window.scrollTo({ top: (start + end) / 2 - innerHeight / 2, behavior: 'instant' });
        }""")
        page.wait_for_timeout(800)
        red = int(page.evaluate(C0).split()[0])
        self.assertGreater(red, 27)
        self.assertLess(red, 43)

    def test_indicator_follows_scroll(self):
        page = self.open("/")
        self.settle(page)
        for i, (sid, name) in enumerate(SECTIONS, start=1):
            page.evaluate(CENTER, sid)
            page.wait_for_timeout(700)
            self.assertEqual(page.text_content("#hudSection"), "0%d / 05 — %s" % (i, name))
            self.assertEqual(page.evaluate("document.documentElement.dataset.section"), sid)
            self.assertEqual(page.evaluate("BashHome.chrome.stats().state"), sid)

    def test_no_gsap_fallback(self):
        page = self.open("/", block=("cdnjs.cloudflare.com",))
        self.assertTrue(page.evaluate("document.documentElement.classList.contains('no-gsap')"))
        page.evaluate(CENTER, "socials")
        page.wait_for_timeout(700)
        self.assertEqual(page.text_content("#hudSection"), "04 / 05 — SOCIALS")
        self.assert_clean(page, allow=("cdnjs",))

    def test_resize_mid_scroll(self):
        page = self.open("/")
        self.settle(page)
        page.evaluate(CENTER, "about")
        page.wait_for_timeout(600)
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(800)
        self.assertEqual(page.text_content("#hudSection"), "03 / 05 — ABOUT")

    def test_deep_link_hash(self):
        page = self.open("/#socials")
        page.wait_for_function("() => document.getElementById('hudSection').textContent === '04 / 05 — SOCIALS'", timeout=1500)


if __name__ == "__main__":
    unittest.main()
