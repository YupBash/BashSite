"""Phase 4: quality polish — HUD scrim on phones."""
import unittest

from tests.harness import SiteTestCase

SCRIM = """() => { const s = getComputedStyle(document.getElementById('hud'), '::before');
    return { bg: s.backgroundImage, pos: s.position, h: parseFloat(s.height) || 0, pe: s.pointerEvents, content: s.content }; }"""


class QualityTest(SiteTestCase):
    def test_phone_hud_has_a_scrim(self):
        page = self.open("/", mobile=True)
        s = page.evaluate(SCRIM)
        self.assertIn("gradient", s["bg"])
        self.assertEqual(s["pos"], "fixed")
        self.assertGreaterEqual(s["h"], 80)
        self.assertEqual(s["pe"], "none")
        # The scrim covers the bar the content scrolls under, at the very top of the screen.
        top = page.evaluate("getComputedStyle(document.getElementById('hud'), '::before').top")
        self.assertEqual(top, "0px")

    def test_desktop_has_no_scrim(self):
        page = self.open("/")
        self.assertIn(page.evaluate(SCRIM)["content"], ("none", "normal"))


if __name__ == "__main__":
    unittest.main()
