"""Task 4: the Mercure liquid-chrome cursor (assets/js/mercure.js)."""
import unittest

from tests.harness import SiteTestCase

INIT = "() => { window.__m = BashMercure.init(); return window.__m !== null; }"
STATE = "() => { const s = window.__m.state(); return { visible: s.visible, wrap: s.wrap, ripple: s.ripple }; }"


class MercureTest(SiteTestCase):
    def test_activates_on_fine_pointer(self):
        page = self.open("/")
        self.assertTrue(page.evaluate(INIT))
        self.assertTrue(page.evaluate("document.documentElement.classList.contains('has-mercure')"))

    def test_inactive_on_touch_device(self):
        page = self.open("/", mobile=True)
        self.assertFalse(page.evaluate(INIT))
        self.assertFalse(page.evaluate("document.documentElement.classList.contains('has-mercure')"))

    def test_hover_wraps_then_unwraps(self):
        page = self.open("/")
        page.evaluate(INIT)
        page.evaluate("document.querySelector('#gamble a.gel').scrollIntoView({ block: 'center', behavior: 'instant' })")
        page.wait_for_timeout(300)
        box = page.locator("#gamble a.gel").bounding_box()
        page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=8)
        page.wait_for_timeout(700)
        self.assertGreater(page.evaluate(STATE)["wrap"], 0.9)
        self.assertTrue(page.evaluate("window.__m.state().target === document.querySelector('#gamble a.gel')"))
        page.mouse.move(760, 760, steps=8)
        page.wait_for_timeout(900)
        self.assertLess(page.evaluate(STATE)["wrap"], 0.1)

    def test_click_ripple(self):
        page = self.open("/")
        page.evaluate(INIT)
        page.mouse.move(700, 700)
        page.mouse.down()
        self.assertLess(page.evaluate(STATE)["ripple"], 1)
        page.mouse.up()
        page.wait_for_timeout(600)
        self.assertEqual(page.evaluate(STATE)["ripple"], 1)

    def test_keyboard_focus_wraps(self):
        page = self.open("/")
        page.evaluate(INIT)
        for _ in range(12):
            page.keyboard.press("Tab")
            if page.evaluate("document.activeElement === document.getElementById('menuBtn')"):
                break
        self.assertTrue(page.evaluate("document.activeElement === document.getElementById('menuBtn')"))
        self.assertTrue(page.evaluate("window.__m.state().target === document.activeElement"))

    def test_touch_hides_droplet(self):
        page = self.open("/")
        page.evaluate(INIT)
        page.mouse.move(600, 600, steps=4)
        self.assertTrue(page.evaluate(STATE)["visible"])
        page.evaluate("""() => document.body.dispatchEvent(new PointerEvent('pointerdown',
            { pointerType: 'touch', bubbles: true, clientX: 300, clientY: 300 }))""")
        self.assertFalse(page.evaluate(STATE)["visible"])
        page.mouse.move(640, 620, steps=4)
        self.assertTrue(page.evaluate(STATE)["visible"])

    def test_no_webgl_no_mercure(self):
        page = self.open("/", webgl=False)
        self.assertFalse(page.evaluate(INIT))
        self.assertFalse(page.evaluate("document.documentElement.classList.contains('has-mercure')"))

    def test_idempotent(self):
        page = self.open("/")
        page.evaluate(INIT)
        self.assertTrue(page.evaluate("BashMercure.init() === window.__m"))


if __name__ == "__main__":
    unittest.main()
