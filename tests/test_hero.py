"""Task 6: the HOME hero (assets/js/home.js, first version)."""
import re
import unittest

from tests.harness import SiteTestCase

MESSAGES = ["Stop that.", "Bro, stop.", "Alright, Don't do that.", "Hey!"]
TX = "() => { const m = getComputedStyle(document.querySelector('#home .gel')).transform; " \
     "return m === 'none' ? 0 : new DOMMatrix(m).m41; }"


class HeroTest(SiteTestCase):
    def test_wordmark_accessible_name(self):
        page = self.open("/")
        self.assertTrue(page.get_by_role("heading", name="BASH", exact=True).is_visible())

    def test_hero_chrome_running(self):
        page = self.open("/")
        page.wait_for_timeout(1000)
        stats = page.evaluate("BashHome.chrome.stats()")
        self.assertGreater(stats["frames"], 10)
        self.assertEqual(stats["state"], "home")
        self.assertEqual(page.evaluate("BashHome.section()"), "home")

    def test_character_poke_bubble(self):
        page = self.open("/")
        # Let the sculpture compile and render its first frames so the clicks are not delayed.
        page.wait_for_function("() => window.BashHome && BashHome.chrome && BashHome.chrome.stats().frames > 5", timeout=15000)
        # Record bubbles as they appear: a slow test machine can stall longer than the bubble's 1.9 s life.
        page.evaluate("""() => { window.__bubbles = [];
            new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
                if (n.classList && n.classList.contains('character-bubble')) window.__bubbles.push(n.textContent); })))
            .observe(document.querySelector('.character'), { childList: true }); }""")
        box = page.locator(".character").bounding_box()
        x, y = box["x"] + box["width"] * 0.5, box["y"] + box["height"] * 0.45
        for _ in range(5):
            page.mouse.click(x, y)
            page.wait_for_timeout(80)
        page.wait_for_function("() => window.__bubbles.length > 0", timeout=5000)
        self.assertIn(page.evaluate("window.__bubbles[0]"), MESSAGES)

    def test_magnetic_button_moves(self):
        page = self.open("/")
        box = page.locator("#home .gel").bounding_box()
        page.mouse.move(box["x"] - 40, box["y"] + box["height"] / 2, steps=6)
        page.wait_for_timeout(500)
        tx = page.evaluate(TX)
        self.assertGreaterEqual(tx, -6)
        self.assertLessEqual(tx, -1)

    def test_magnetic_off_with_reduced_motion(self):
        page = self.open("/", reduced_motion=True)
        box = page.locator("#home .gel").bounding_box()
        page.mouse.move(box["x"] - 40, box["y"] + box["height"] / 2, steps=6)
        page.wait_for_timeout(500)
        self.assertEqual(page.evaluate(TX), 0)

    def test_specular_follows_pointer(self):
        page = self.open("/")
        read = "getComputedStyle(document.getElementById('word')).getPropertyValue('--mx').trim()"
        page.mouse.move(300, 300)
        first = page.evaluate(read)
        page.mouse.move(900, 420)
        second = page.evaluate(read)
        self.assertTrue(re.match(r"^-?\d+(\.\d+)?%$", second), second)
        self.assertNotEqual(first, second)

    def test_hero_screenshots(self):
        for mobile, name in ((False, "hero-desktop"), (True, "hero-mobile")):
            page = self.open("/", mobile=mobile)
            page.wait_for_timeout(1500)
            self.shot(page, name)
            self.assert_clean(page)


if __name__ == "__main__":
    unittest.main()
