"""Task 11: /socials/ and /faq/ become redirects to their home sections; the sitemap lists only the home page."""
import re
import unittest

from tests.harness import REPO, SiteTestCase

# The CSP these two pages already had (kept as is: no new external resource).
CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
       "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.steamstatic.com; connect-src 'self'; "
       "object-src 'none'; base-uri 'self'; form-action 'self'")
HUD = "t => document.getElementById('hudSection') && document.getElementById('hudSection').textContent === t"


class RedirectTest(SiteTestCase):
    def test_socials_redirects(self):
        page = self.open("/socials/")
        page.wait_for_url("**/#socials", timeout=10000)
        page.wait_for_function(HUD, arg="04 / 05 — SOCIALS", timeout=10000)
        self.assertTrue(page.url.endswith("/#socials"))

    def test_faq_redirects(self):
        page = self.open("/faq/")
        page.wait_for_url("**/#about", timeout=10000)
        page.wait_for_function(HUD, arg="03 / 05 — ABOUT", timeout=10000)
        self.assertTrue(page.url.endswith("/#about"))

    def test_redirect_pages_noindex(self):
        for path, target in (("socials/index.html", "/#socials"), ("faq/index.html", "/#about")):
            html = (REPO / path).read_text(encoding="utf-8")
            self.assertTrue(html.startswith("<!DOCTYPE html>"), path)
            self.assertIn('<html lang="en">', html)
            self.assertIn('<meta name="robots" content="noindex">', html)
            self.assertIn('<link rel="canonical" href="https://yupbash.vip/">', html)
            self.assertIn('<meta http-equiv="refresh" content="0; url=%s">' % target, html)
            self.assertIn('location.replace("%s")' % target, html)
            self.assertIn("<title>BASH</title>", html)
            self.assertIn("Continue to BASH →", html)
            csp = re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', html)
            self.assertIsNotNone(csp, path)
            self.assertEqual(csp.group(1), CSP)

    def test_sitemap_only_home(self):
        xml = (REPO / "sitemap.xml").read_text(encoding="utf-8")
        self.assertEqual(re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml), ["https://yupbash.vip/"])


if __name__ == "__main__":
    unittest.main()
