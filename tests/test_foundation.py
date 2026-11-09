"""Task 2: tokens, fonts, base styles and the home skeleton."""
import unittest

from tests.harness import SiteTestCase

CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
       "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; "
       "img-src 'self' data: https://*.steamstatic.com; connect-src 'self'; object-src 'none'; "
       "base-uri 'self'; form-action 'self'")


class FoundationTest(SiteTestCase):
    def test_tokens_keep_legacy_variables(self):
        # The case simulator loads tokens.css too: its variables must still resolve.
        cases = self.open("/cases/")
        legacy = cases.evaluate("""() => { const s = getComputedStyle(document.documentElement);
            return ['--purple', '--neon', '--brand-discord'].map(v => s.getPropertyValue(v).trim()); }""")
        self.assertEqual(legacy, ["#6b21a8", "#c98bff", "#5865f2"])
        home = self.open("/")
        accent = home.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--nc-accent').trim()")
        self.assertEqual(accent, "#cfe2ff")

    def test_sections_in_order(self):
        page = self.open("/")
        ids = page.evaluate("[...document.querySelectorAll('#home, #videos, #about, #socials, #gamble, #outro')].map(s => s.id)")
        self.assertEqual(ids, ["home", "videos", "about", "socials", "gamble", "outro"])

    def test_copy_is_exact(self):
        page = self.open("/")
        text = lambda sel: page.eval_on_selector(sel, "el => el.textContent.trim()")
        self.assertEqual(text("#outro .outro-title"), "Don't miss the next one.")
        self.assertEqual(text("#outro .signature"), "BASH · 2024–2026")
        gamble = text("#gamble")
        self.assertIn("BASH ADDICTION", gamble)
        self.assertIn("fake money, real addiction.", gamble)
        self.assertEqual(page.get_attribute('#gamble a[href="/cases/"]', "aria-label"), "Open a case")

    def test_csp_meta_unchanged(self):
        page = self.open("/")
        self.assertEqual(page.get_attribute('meta[http-equiv="Content-Security-Policy"]', "content"), CSP)

    def test_fonts_loaded(self):
        page = self.open("/")
        families = page.evaluate("""async () => {
            document.body.offsetHeight;
            await document.fonts.ready;
            await new Promise(r => setTimeout(r, 400));
            await document.fonts.ready;
            return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, ''));
        }""")
        for family in ["Anybody", "Martian Mono", "Chakra Petch", "Permanent Marker"]:
            self.assertIn(family, families)

    def test_clean_desktop_and_mobile(self):
        self.assert_clean(self.open("/"))
        self.assert_clean(self.open("/", mobile=True))

    def test_cases_page_still_clean(self):
        self.assert_clean(self.open("/cases/"))


if __name__ == "__main__":
    unittest.main()
