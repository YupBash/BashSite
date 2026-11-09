"""Phase 4: quality pass — keyboard journey, contrast, weight, links, fallbacks, HUD scrim on phones."""
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


def luminance(rgb):
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(rgb[0]) + 0.7152 * ch(rgb[1]) + 0.0722 * ch(rgb[2])


def contrast(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


SECTIONS = ["home", "videos", "about", "socials", "gamble"]


class SiteQualityTest(SiteTestCase):
    def test_keyboard_journey(self):
        page = self.open("/")
        page.evaluate("document.querySelectorAll('#about .faq-item').forEach(d => d.open = false)")
        wanted = ["#menuBtn", "#about .faq-item summary", ".social-big", "#copyEmail", '#gamble a[href="/cases/"]']
        seen = set()
        for _ in range(80):
            page.keyboard.press("Tab")
            hit = page.evaluate("""sels => { const a = document.activeElement;
                return sels.find(x => a && a.matches(x)) || null; }""", wanted)
            if hit:
                seen.add(hit)
                ok = page.evaluate("""() => { const a = document.activeElement, st = getComputedStyle(a);
                    const lock = document.querySelector('.mercure-lock');
                    return (lock && +getComputedStyle(lock).opacity > 0) || parseFloat(st.outlineWidth) > 0 || st.boxShadow !== 'none'; }""")
                page.wait_for_timeout(120)
                ok = ok or page.evaluate("() => { const l = document.querySelector('.mercure-lock'); return !!l && +getComputedStyle(l).opacity > 0; }")
                self.assertTrue(ok, "no visible focus on %s" % hit)
            if len(seen) == len(wanted):
                break
        self.assertEqual(seen, set(wanted))

    def test_text_contrast(self):
        page = self.open("/")
        for sel in ("body", "#hudSection", ".faq-answer", ".vid-cta", ".contact-label", "#gamble .kicker"):
            page.wait_for_selector(sel, state="attached", timeout=10000)
            rgb = page.evaluate("s => getComputedStyle(document.querySelector(s)).color.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number)", sel)
            self.assertGreaterEqual(contrast(rgb, (43, 20, 82)), 4.5, "%s %s" % (sel, rgb))

    def test_first_load_weight(self):
        page = self.open("/", entered=True)   # fresh context: nothing cached
        page.wait_for_load_state("networkidle")
        total = page.evaluate("performance.getEntriesByType('resource').reduce((t, r) => t + (r.transferSize || r.encodedBodySize || 0), 0)")
        total += page.evaluate("(performance.getEntriesByType('navigation')[0] || {}).transferSize || 0")
        self.assertLess(total, 700 * 1024, "first load is %d KB" % (total // 1024))

    def test_internal_links_ok(self):
        for path in ("/", "/404.html"):
            page = self.open(path)
            urls = page.evaluate("""() => [...new Set([
                ...[...document.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href').split('#')[0] || '/'),
                ...[...document.querySelectorAll('img[src^="/"], script[src^="/"]')].map(e => e.getAttribute('src')),
                ...[...document.querySelectorAll('link[href^="/"]')].map(l => l.getAttribute('href'))])]""")
            for u in urls:
                self.assertEqual(page.request.get(self.base + u).status, 200, u)

    def test_reduced_motion_all_visible(self):
        page = self.open("/", reduced_motion=True)
        for sid in SECTIONS:
            page.evaluate("id => document.getElementById(id).scrollIntoView({ block: 'center', behavior: 'instant' })", sid)
            page.wait_for_timeout(250)
            self.assertEqual(page.evaluate("id => +getComputedStyle(document.getElementById(id)).opacity", sid), 1, sid)

    def test_no_webgl_full_site(self):
        page = self.open("/", webgl=False)
        for sid in SECTIONS:
            page.evaluate("id => document.getElementById(id).scrollIntoView({ block: 'center', behavior: 'instant' })", sid)
            self.assertTrue(page.is_visible("#" + sid))
        self.assert_clean(page)

    def test_no_gsap_full_site(self):
        page = self.open("/", block=("cdnjs.cloudflare.com",))
        page.wait_for_function("() => document.querySelectorAll('#vidsRing .vid-card').length >= 6", timeout=10000)
        for sel in ("#word", "#vidsRing .vid-card", ".spec-sheet", ".social-big", "#gambleTitle", ".outro-title"):
            page.locator(sel).first.scroll_into_view_if_needed()
            self.assertTrue(page.locator(sel).first.is_visible(), sel)

    def test_cases_simulator_unaffected(self):
        page = self.open("/cases/")
        self.assertIn("Case Simulator", page.title())
        page.wait_for_function("() => document.querySelectorAll('#caseGrid .case-card').length > 0", timeout=15000)
        self.assert_clean(page)


if __name__ == "__main__":
    unittest.main()
