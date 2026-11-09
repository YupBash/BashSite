"""Task 10: Socials & contact (links, brand hover, copy e-mail, chrome bubbles above the buttons), Click to gamble, outro."""
import unittest

from tests.harness import SiteTestCase

LINKS = [("discord", "https://discordapp.com/users/852685497108267019"),
         ("tiktok", "https://www.tiktok.com/@yupbash"),
         ("instagram", "https://www.instagram.com/yupbash")]
TO_SOCIALS = "document.getElementById('socials').scrollIntoView({ block: 'center', behavior: 'instant' })"
DENY = """Object.defineProperty(navigator, 'clipboard', { configurable: true,
    value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) } });"""
TOAST = "() => document.getElementById('toast').textContent"


class SocialsTest(SiteTestCase):
    def test_social_links_exact(self):
        page = self.open("/")
        got = page.evaluate("""[...document.querySelectorAll('#socials .social-big')].map(a =>
            [a.dataset.brand, a.getAttribute('href'), a.getAttribute('target'), a.getAttribute('rel') || '', a.hasAttribute('data-magnet')])""")
        self.assertEqual([(g[0], g[1]) for g in got], LINKS)
        for brand, href, target, rel, magnet in got:
            self.assertEqual(target, "_blank")
            self.assertIn("noopener", rel)
            self.assertTrue(magnet)

    def test_brand_reflection_on_hover(self):
        page = self.open("/")
        page.evaluate(TO_SOCIALS)
        page.hover('.social-big[data-brand="discord"]')
        page.wait_for_timeout(500)
        border = page.evaluate("getComputedStyle(document.querySelector('.social-big[data-brand=\"discord\"]')).borderTopColor")
        self.assertEqual(border, "rgb(88, 101, 242)")   # --brand-discord

    def test_copy_email(self):
        page = self.open("/")
        page.context.grant_permissions(["clipboard-read", "clipboard-write"], origin=self.base)
        page.evaluate(TO_SOCIALS)
        page.click("#copyEmail")
        page.wait_for_function(TOAST + ".includes('COPIED ✓')", timeout=3000)
        self.assertTrue(page.evaluate("document.getElementById('toast').classList.contains('show')"))
        self.assertEqual(page.evaluate("navigator.clipboard.readText()"), "yupbash@gmail.com")
        page.wait_for_function("() => !document.getElementById('toast').classList.contains('show')", timeout=4000)
        self.assert_clean(page)

    def test_copy_email_denied(self):
        page = self.open("/", init_script=DENY)
        page.evaluate(TO_SOCIALS)
        page.click("#copyEmail")
        page.wait_for_function(TOAST + ".includes('yupbash@gmail.com')", timeout=3000)
        self.assertEqual(page.evaluate("String(getSelection())"), "yupbash@gmail.com")   # ready for a manual copy
        self.assert_clean(page)

    def test_chrome_follows_social_buttons(self):
        page = self.open("/")
        page.wait_for_function("() => window.BashHome && BashHome.chrome && BashHome.chrome.stats().frames > 3", timeout=15000)
        for width in (1440, 1100):
            page.set_viewport_size({"width": width, "height": 900})
            page.evaluate(TO_SOCIALS)
            page.wait_for_function("() => BashHome.chrome.stats().state === 'socials'", timeout=5000)
            page.wait_for_timeout(1200)
            targets = page.evaluate("BashHome.socialTargets()")
            centres = page.evaluate("[...document.querySelectorAll('.social-big')].map(b => { const r = b.getBoundingClientRect(); return r.left + r.width / 2; })")
            for t, cx in zip(targets, centres):
                self.assertAlmostEqual(t["x"], cx, delta=6)   # one bubble above each button
            px = page.evaluate("pts => BashHome.chrome.debugSample(pts)", [[t["x"] / width, t["y"] / 900] for t in targets])
            self.assertTrue(all(p[3] > 200 for p in px), "a bubble is missing at width %d: %s" % (width, px))


class GambleOutroTest(SiteTestCase):
    def test_gamble_teaser(self):
        page = self.open("/")
        self.assertEqual(page.text_content("#gambleTitle").strip(), "BASH ADDICTION")
        self.assertEqual(page.text_content("#gamble .gamble-sub").strip(), "fake money, real addiction.")
        link = page.locator("#gamble a.gel")
        self.assertEqual(link.get_attribute("href"), "/cases/")
        text = " ".join(link.text_content().split())
        self.assertIn("Open a case", text)
        self.assertIn(">>>", text)

    def test_outro_drop_stays_off_the_title(self):
        for mobile in (False, True):
            page = self.open("/", mobile=mobile, reduced_motion=True)
            page.wait_for_function("() => window.BashHome && BashHome.chrome && BashHome.chrome.stats().frames > 0", timeout=15000)
            page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
            page.wait_for_function("() => BashHome.chrome.stats().state === 'outro'", timeout=5000)
            vw, vh = page.evaluate("[innerWidth, innerHeight]")
            r = page.evaluate("(() => { const b = document.querySelector('#outro .outro-title').getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; })()")
            pts = [[x / vw, y / vh] for x in range(int(max(0, r[0])), int(min(vw, r[2])), 12) for y in range(int(r[1]), int(r[3]), 6)]
            alpha = max(p[3] for p in page.evaluate("pts => BashHome.chrome.debugSample(pts)", pts))
            self.assertLess(alpha, 10, "the outro drop sits behind the title (mobile=%s)" % mobile)

    def test_outro_signature(self):
        page = self.open("/")
        self.assertEqual(page.text_content("#outro .outro-title").strip(), "Don't miss the next one.")
        hrefs = sorted(page.evaluate("[...document.querySelectorAll('#outro .outro-links a')].map(a => a.getAttribute('href'))"))
        self.assertEqual(hrefs, sorted(h for _, h in LINKS))
        self.assertEqual(page.text_content("#outro .signature").strip(), "BASH · 2024–2026")
        self.assertIn("Permanent Marker", page.evaluate("getComputedStyle(document.querySelector('#outro .signature')).fontFamily"))


if __name__ == "__main__":
    unittest.main()
