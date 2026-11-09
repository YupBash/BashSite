"""Task 12: PRESS START gate, sound-designed boot intro, BashAudio and the SFX toggle."""
import unittest

from tests.harness import SiteTestCase

BOOT = ["BASH.SYS v3.0 — booting…", "chrome: liquid ✓", "vibes: questionable ✓",
        "gambling addiction: detected ✓", "welcome.."]
# Records every text the boot console shows (the gate is removed once the intro ends).
RECORD = """
window.__boot = [];
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('bootLines');
  if (el) new MutationObserver(() => window.__boot.push(el.textContent)).observe(el, { childList: true, subtree: true, characterData: true });
});"""
GONE = "() => !document.getElementById('gate')"
LS = "k => { try { return localStorage.getItem(k); } catch (e) { return 'blocked'; } }"


class GateTest(SiteTestCase):
    def test_first_visit_shows_gate(self):
        page = self.open("/", entered=False)
        self.assertTrue(page.is_visible("#gate"))
        page.wait_for_function("() => document.activeElement && document.activeElement.id === 'enterBtn'", timeout=2000)
        self.assertTrue(page.evaluate("document.getElementById('main').hasAttribute('inert')"))

    def test_start_button_is_minimal(self):
        page = self.open("/", entered=False)
        self.assertEqual(" ".join(page.text_content("#enterBtn").split()), "START")
        self.assertEqual(page.locator("#enterBtn svg.gate-play").count(), 1)
        self.assertEqual(page.locator("#enterBtn svg.gate-colons").count(), 1)
        self.assertFalse(page.evaluate("document.getElementById('enterBtn').classList.contains('gel')"))
        self.assertEqual(page.locator("#gate .gate-tab").count(), 0)
        self.assertNotIn("welcome..", page.text_content("#gate"))

    def test_enter_with_sound(self):
        page = self.open("/", entered=False, init_script=RECORD)
        page.click("#enterBtn")
        page.wait_for_function(GONE, timeout=3500)
        self.assertEqual(page.evaluate(LS, "bash_v3_entered"), "1")
        self.assertEqual(page.evaluate(LS, "bash_v3_sfx"), "on")
        self.assertTrue(page.evaluate("BashAudio.enabled"))
        self.assertEqual(page.evaluate("BashAudio.context && BashAudio.context.state"), "running")
        last = page.evaluate("window.__boot[window.__boot.length - 1] || ''")
        self.assertEqual([l.strip() for l in last.strip().split("\n")], BOOT)
        self.assertFalse(page.evaluate("document.getElementById('main').hasAttribute('inert')"))
        self.assert_clean(page)

    def test_enter_silently(self):
        page = self.open("/", entered=False)
        page.click("#enterSilent")
        page.wait_for_function(GONE, timeout=3500)
        self.assertEqual(page.evaluate(LS, "bash_v3_sfx"), "off")
        self.assertFalse(page.evaluate("BashAudio.enabled"))
        self.assertEqual(page.evaluate(LS, "bash_v3_entered"), "1")

    def test_escape_is_silent(self):
        page = self.open("/", entered=False)
        page.wait_for_function("() => document.activeElement && document.activeElement.id === 'enterBtn'", timeout=2000)
        page.keyboard.press("Escape")
        page.wait_for_function(GONE, timeout=3500)
        self.assertEqual(page.evaluate(LS, "bash_v3_sfx"), "off")
        self.assertFalse(page.evaluate("BashAudio.enabled"))

    def test_second_visit_skips_gate(self):
        page = self.open("/", entered=False)
        page.click("#enterBtn")
        page.wait_for_function(GONE, timeout=3500)
        page.reload()
        page.wait_for_timeout(300)
        self.assertFalse(page.is_visible("#gate"))
        self.assertEqual(page.text_content("#sfxBtn").strip(), "SFX ON")

    def test_skip_intro_on_click(self):
        page = self.open("/", entered=False)
        page.click("#enterBtn")
        page.wait_for_timeout(300)
        page.mouse.click(700, 450)
        page.wait_for_function(GONE, timeout=600)

    def test_storage_blocked(self):
        page = self.open("/", storage=False)
        self.assertTrue(page.is_visible("#gate"))
        page.click("#enterSilent")
        page.wait_for_function(GONE, timeout=3500)
        self.assert_clean(page)
        page.reload()
        self.assertTrue(page.is_visible("#gate"))

    def test_sfx_toggle_persists(self):
        page = self.open("/")
        self.assertEqual(page.get_attribute("#sfxBtn", "aria-pressed"), "false")
        page.click("#sfxBtn")
        self.assertEqual(page.get_attribute("#sfxBtn", "aria-pressed"), "true")
        self.assertEqual(page.text_content("#sfxBtn").strip(), "SFX ON")
        self.assertEqual(page.evaluate(LS, "bash_v3_sfx"), "on")
        page.reload()
        self.assertEqual(page.get_attribute("#sfxBtn", "aria-pressed"), "true")

    def test_reduced_motion_gate_static(self):
        page = self.open("/", entered=False, reduced_motion=True)
        self.assertTrue(page.is_visible("#gate"))
        page.click("#enterBtn")
        page.wait_for_function(GONE, timeout=300)

    def test_sounds_play_without_errors(self):
        page = self.open("/", entered=False)
        page.click("#enterBtn")
        page.wait_for_function(GONE, timeout=3500)
        for name in ("tick", "bloop", "whoosh", "boot-tick", "boot-rise", "boot-drop", "boot-bass", "nope"):
            page.evaluate("n => BashAudio.play(n)", name)
        page.wait_for_timeout(300)
        self.assert_clean(page)


if __name__ == "__main__":
    unittest.main()
