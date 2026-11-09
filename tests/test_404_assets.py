"""Task 14: restyled 404, chrome fallback image (no WebGL), new share image, manifest colours, menu-bg.webp removed."""
import json
import unittest

from tests.harness import REPO, SiteTestCase


class NotFoundAndAssetsTest(SiteTestCase):
    def test_404_page(self):
        page = self.open("/404.html")
        self.assertEqual(page.text_content("h1").strip(), "404")
        self.assertIn("Yeah, this page doesn't exist. Probably my fault, not yours.", page.text_content("body"))
        link = page.get_by_role("link", name="Back home")
        self.assertEqual(link.get_attribute("href"), "/")
        self.assertIn('<meta name="robots" content="noindex">', (REPO / "404.html").read_text(encoding="utf-8"))
        page.wait_for_timeout(300)
        self.assert_clean(page)

    def test_fallback_without_webgl(self):
        page = self.open("/", webgl=False)
        page.wait_for_function("() => { const i = document.querySelector('.chrome-fallback'); return i && i.complete && i.naturalWidth > 0; }", timeout=5000)
        self.assertTrue(page.is_visible(".chrome-fallback"))
        self.assertFalse(page.is_visible("#chrome"))
        self.assertEqual(page.get_attribute(".chrome-fallback", "aria-hidden"), "true")

    def test_fallback_hidden_with_webgl(self):
        page = self.open("/")
        self.assertFalse(page.is_visible(".chrome-fallback"))

    def test_og_image_size(self):
        page = self.open("/")
        size = page.evaluate("""() => new Promise((ok, ko) => { const i = new Image();
            i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.onerror = ko; i.src = '/assets/og-image.jpg'; })""")
        self.assertEqual(size, [1200, 630])

    def test_menu_bg_gone(self):
        self.assertFalse((REPO / "assets" / "menu-bg.webp").exists())
        files = [REPO / "index.html", REPO / "404.html", REPO / "assets" / "videos" / "videos.json"]
        files += list((REPO / "assets" / "css").glob("*.css")) + list((REPO / "assets" / "js").glob("*.js"))
        for f in files:
            self.assertNotIn("menu-bg.webp", f.read_text(encoding="utf-8"), f.name)

    def test_manifest_colors(self):
        m = json.loads((REPO / "site.webmanifest").read_text(encoding="utf-8"))
        self.assertEqual(m["background_color"], "#07050c")
        self.assertEqual(m["theme_color"], "#1a0d3d")
        self.assertIn('<meta name="theme-color" content="#1a0d3d">', (REPO / "index.html").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
