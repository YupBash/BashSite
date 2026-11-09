"""Task 5: the shared shell (assets/js/site.js) — safe storage, live HUD, HUD menu, 'entered' event."""
import unittest

from tests.harness import SiteTestCase


class ShellTest(SiteTestCase):
    def test_store_never_throws(self):
        page = self.open("/", storage=False)
        result = page.evaluate("""() => { try { BashSite.store.set('a', '1'); return BashSite.store.get('a'); }
                                          catch (e) { return 'threw: ' + e.message; } }""")
        self.assertIsNone(result)

    def test_menu_open_close_escape(self):
        page = self.open("/")
        page.click("#menuBtn")
        self.assertEqual(page.get_attribute("#menuBtn", "aria-expanded"), "true")
        self.assertTrue(page.evaluate("document.documentElement.classList.contains('menu-open')"))
        self.assertTrue(page.evaluate("document.getElementById('menu').contains(document.activeElement)"))
        page.keyboard.press("Escape")
        self.assertEqual(page.get_attribute("#menuBtn", "aria-expanded"), "false")
        self.assertFalse(page.evaluate("document.documentElement.classList.contains('menu-open')"))
        self.assertTrue(page.evaluate("document.activeElement === document.getElementById('menuBtn')"))

    def test_menu_traps_focus(self):
        page = self.open("/")
        page.click("#menuBtn")
        for _ in range(9):
            page.keyboard.press("Tab")
            inside = page.evaluate("""() => document.getElementById('menu').contains(document.activeElement)
                                         || document.activeElement === document.getElementById('menuBtn')""")
            self.assertTrue(inside, "focus escaped the open menu")

    def test_menu_link_scrolls(self):
        page = self.open("/")
        page.click("#menuBtn")
        page.click('#menu .menu-link[href="#about"]')
        page.wait_for_timeout(1500)
        top = page.evaluate("document.getElementById('about').getBoundingClientRect().top")
        self.assertLess(abs(top), 80)
        self.assertFalse(page.evaluate("document.documentElement.classList.contains('menu-open')"))

    def test_hud_clock_shows_local_time(self):
        page = self.open("/")
        page.wait_for_timeout(1200)
        shown, now = page.evaluate("""() => { const d = new Date();
            return [document.getElementById('hudClock').textContent, d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()]; }""")
        self.assertRegex(shown, r"^\d\d:\d\d:\d\d$")
        h, m, s = (int(x) for x in shown.split(":"))
        self.assertLessEqual(abs((h * 3600 + m * 60 + s) - now) % 86400, 2)

    def test_hud_set_section(self):
        page = self.open("/")
        page.evaluate("BashSite.hud.setSection(3, 'ABOUT', 0.5)")
        self.assertEqual(page.text_content("#hudSection"), "03 / 05 — ABOUT")
        self.assertEqual(page.evaluate("getComputedStyle(document.querySelector('#hudProgress > span')).transform"),
                         "matrix(0.5, 0, 0, 1, 0, 0)")

    def test_entered_fires_without_gate(self):
        page = self.open("/")
        detail = page.evaluate("""() => new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('entered never fired')), 500);
            BashSite.on('entered', resolve);
        })""")
        self.assertEqual(detail, {"sound": False})

    def test_mercure_auto_init(self):
        page = self.open("/")
        page.wait_for_timeout(200)
        self.assertTrue(page.evaluate("document.documentElement.classList.contains('has-mercure')"))


if __name__ == "__main__":
    unittest.main()
