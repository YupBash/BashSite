"""Task 13: phone tilt drives the chrome (and a little parallax on the character); iOS asks permission on ENTER."""
import unittest

from tests.harness import SiteTestCase

TILT = "([b, g]) => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: b, gamma: g }))"
ASK = """DeviceOrientationEvent.requestPermission = () => { window.__asked = (window.__asked || 0) + 1; return Promise.resolve('%s'); };"""
LS = "k => localStorage.getItem(k)"
READY = "() => window.BashHome && BashHome.requestTilt && BashHome.chrome"


class TiltTest(SiteTestCase):
    def test_tilt_moves_pointer(self):
        page = self.open("/", mobile=True)
        page.wait_for_function(READY, timeout=15000)
        page.evaluate(TILT, [45, 30])
        t = page.evaluate("BashHome.tilt()")
        self.assertAlmostEqual(t["nx"], 0.833, delta=0.01)
        self.assertAlmostEqual(t["ny"], 0.5, delta=0.01)
        self.assert_clean(page)

    def test_ios_permission_on_enter(self):
        page = self.open("/", mobile=True, entered=False, init_script=ASK % "granted")
        page.tap("#enterBtn")
        page.wait_for_function("() => window.__asked === 1", timeout=3000)
        page.wait_for_function("() => localStorage.getItem('bash_v3_tilt') === 'granted'", timeout=3000)
        page.wait_for_function(READY, timeout=15000)
        page.evaluate(TILT, [45, -30])
        self.assertAlmostEqual(page.evaluate("BashHome.tilt().nx"), 0.167, delta=0.01)

    def test_denied_is_silent(self):
        page = self.open("/", mobile=True, entered=False, init_script=ASK % "denied")
        page.tap("#enterBtn")
        page.wait_for_function("() => localStorage.getItem('bash_v3_tilt') === 'denied'", timeout=3000)
        page.wait_for_function(READY, timeout=15000)
        page.evaluate(TILT, [45, 30])
        self.assertIsNone(page.evaluate("BashHome.tilt()"))
        self.assert_clean(page)

    def test_desktop_ignores_tilt(self):
        page = self.open("/")
        page.wait_for_function(READY, timeout=15000)
        page.evaluate(TILT, [45, 30])
        self.assertIsNone(page.evaluate("BashHome.tilt()"))


if __name__ == "__main__":
    unittest.main()
