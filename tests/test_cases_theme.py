"""Gamble page (/cases/) restyled in the Nocturne Chrome identity; the simulator keeps working."""
import unittest

from tests.harness import SiteTestCase

TABS = [("tabCases", "view-cases"), ("tabBattle", "view-battle"), ("tabTradeup", "view-tradeup"),
        ("tabMines", "view-mines"), ("tabInventory", "view-inventory")]


class CasesThemeTest(SiteTestCase):
    def test_theme_matches_the_site(self):
        page = self.open("/cases/")
        self.assertTrue(page.evaluate("[...document.styleSheets].some(s => (s.href || '').endsWith('/assets/css/cases.css'))"))
        self.assertIn("Anybody", page.evaluate("getComputedStyle(document.querySelector('#view-cases h1')).fontFamily"))
        self.assertEqual(page.evaluate("getComputedStyle(document.body).backgroundColor"), "rgb(7, 5, 12)")
        self.assertIn("Martian Mono", page.evaluate("getComputedStyle(document.getElementById('tabBattle')).fontFamily"))
        page.wait_for_timeout(300)
        self.assertTrue(page.evaluate("document.documentElement.classList.contains('has-mercure')"))
        self.assert_clean(page)

    def test_every_view_still_opens(self):
        page = self.open("/cases/")
        page.wait_for_function("() => document.querySelectorAll('#caseGrid .case-card').length > 0", timeout=15000)
        for tab, view in TABS[1:] + TABS[:1]:
            page.click("#" + tab)
            self.assertTrue(page.evaluate("v => document.getElementById(v).classList.contains('active')", view), view)
        page.click("#caseGrid .case-card >> nth=0")
        page.wait_for_selector("#view-open.active")
        self.assertTrue(page.is_visible("#openBtn"))
        page.click("#walletBtn")
        page.wait_for_selector("#walletModal:not(.hidden)")
        self.assert_clean(page)

    def test_phone_layout_has_no_horizontal_scroll(self):
        page = self.open("/cases/", mobile=True)
        page.wait_for_function("() => document.querySelectorAll('#caseGrid .case-card').length > 0", timeout=15000)
        self.assertLessEqual(page.evaluate("document.documentElement.scrollWidth"), 390)
        page.wait_for_function("() => document.querySelector('#bigCaseGrid .case-card .kind-tag')", timeout=15000)
        gap = page.evaluate("""() => [...document.querySelectorAll('#bigCaseGrid .case-card, #caseGrid .case-card')].slice(0, 6).map(c => {
            const k = c.querySelector('.kind-tag'), p = c.querySelector('.price-tag');
            return k && p ? p.getBoundingClientRect().left - k.getBoundingClientRect().right : 99; })""")
        self.assertGreaterEqual(min(gap), 2, "kind tag and price tag overlap on a phone: %s" % gap)


if __name__ == "__main__":
    unittest.main()
