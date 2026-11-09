"""Render the static images of the site (run by hand, from the repository root):

    python tools/render-assets.py

1. assets/chrome-fallback.webp — the liquid chrome sculpture (state "home") on a transparent 1200x1200 canvas,
   shown instead of the WebGL canvas on browsers without WebGL.
2. assets/og-image.jpg — the 1200x630 share image, composed in tools/og.html (uses the fallback above).
"""
import base64
import functools
import http.server
import pathlib
import threading

from playwright.sync_api import sync_playwright

REPO = pathlib.Path(__file__).resolve().parent.parent
GL_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

FALLBACK_JS = """async () => {
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;left:0;top:0;width:1200px;height:1200px';
  document.body.appendChild(c);
  const ctl = BashChrome.init(c, { mobile: false });
  ctl.pause(true);
  ctl.setState('home');
  ctl.setPointer(0.62, 0.42);
  ctl.debugSample(0.5, 0.5);            // render once, then read the canvas in the same task
  return c.toDataURL('image/webp', 0.9);
}"""


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(_Quiet, directory=str(REPO)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = "http://127.0.0.1:%d" % server.server_address[1]
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=GL_ARGS)
            ctx = browser.new_context(viewport={"width": 1200, "height": 1200}, device_scale_factor=1, reduced_motion="reduce")
            page = ctx.new_page()
            page.goto(base + "/tools/og.html")
            page.add_script_tag(url="/assets/js/chrome.js")
            data = page.evaluate(FALLBACK_JS)
            assert data.startswith("data:image/webp;base64,"), data[:40]
            (REPO / "assets" / "chrome-fallback.webp").write_bytes(base64.b64decode(data.split(",", 1)[1]))
            print("assets/chrome-fallback.webp written")
            ctx.close()

            ctx = browser.new_context(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
            page = ctx.new_page()
            page.goto(base + "/tools/og.html", wait_until="networkidle")
            page.evaluate("document.fonts.ready")
            page.wait_for_timeout(300)
            page.screenshot(path=str(REPO / "assets" / "og-image.jpg"), type="jpeg", quality=88)
            print("assets/og-image.jpg written")
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
