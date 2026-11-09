"""Playwright test harness for yupbash.vip: a local static server + Chromium.

Run from the repo root:  python -m unittest discover -s tests -v
"""
import functools
import http.server
import pathlib
import threading
import unittest

from playwright.sync_api import sync_playwright

REPO = pathlib.Path(__file__).resolve().parent.parent
SHOTS = REPO / "tests" / "_shots"

GL_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
NO_GL_ARGS = ["--disable-3d-apis", "--disable-webgl"]
DESKTOP = {"viewport": {"width": 1440, "height": 900}}
MOBILE = {"viewport": {"width": 390, "height": 844}, "has_touch": True, "is_mobile": True, "device_scale_factor": 3}

# Collects CSP violations so tests can assert there are none.
CSP_JS = """
window.__csp = [];
document.addEventListener('securitypolicyviolation', function (e) {
  window.__csp.push(e.violatedDirective + ' ' + e.blockedURI);
});
"""
# A returning visitor who already passed the ENTER gate with sound off.
# Only seeds when empty, so a test can change the values and reload.
ENTERED_JS = """
try {
  if (localStorage.getItem('bash_v3_entered') === null) {
    localStorage.setItem('bash_v3_entered', '1');
    localStorage.setItem('bash_v3_sfx', 'off');
  }
} catch (e) {}
"""
# Private-mode style storage: every method throws.
NO_STORAGE_JS = """
(function () {
  function boom() { throw new DOMException('storage blocked', 'SecurityError'); }
  var fake = { getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom };
  Object.defineProperty(fake, 'length', { get: boom });
  Object.defineProperty(window, 'localStorage', { configurable: true, get: function () { return fake; } });
})();
"""


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".webp": "image/webp",
        ".json": "application/json",
        ".css": "text/css",
    }

    def log_message(self, *args):
        pass


class _Server(http.server.ThreadingHTTPServer):
    # The default listen backlog (5) makes Windows refuse some of Chromium's parallel connections.
    request_queue_size = 128
    daemon_threads = True


def _fulfill_json(body):
    # Playwright passes (route, request) to two-argument handlers, so the body is bound by a closure.
    def handler(route):
        route.fulfill(status=200, content_type="application/json", body=body)
    return handler


class SiteTestCase(unittest.TestCase):
    """Base class: one server + browser per test class, one context per page."""

    @classmethod
    def setUpClass(cls):
        handler = functools.partial(_QuietHandler, directory=str(REPO))
        cls._server = _Server(("127.0.0.1", 0), handler)
        threading.Thread(target=cls._server.serve_forever, daemon=True).start()
        cls.base = "http://127.0.0.1:%d" % cls._server.server_address[1]
        cls._pw = sync_playwright().start()
        cls.browser = cls._pw.chromium.launch(args=GL_ARGS)
        cls._browser_nogl = None

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        if cls._browser_nogl is not None:
            cls._browser_nogl.close()
        cls._pw.stop()
        cls._server.shutdown()
        cls._server.server_close()

    @classmethod
    def _nogl(cls):
        if cls._browser_nogl is None:
            cls._browser_nogl = cls._pw.chromium.launch(args=NO_GL_ARGS)
        return cls._browser_nogl

    def open(self, path="/", *, mobile=False, reduced_motion=False, entered=True, webgl=True,
             block=(), storage=True, init_script=None, routes=None):
        browser = self.browser if webgl else self._nogl()
        options = dict(MOBILE if mobile else DESKTOP)
        if reduced_motion:
            options["reduced_motion"] = "reduce"
        context = browser.new_context(**options)
        self.addCleanup(context.close)
        context.add_init_script(CSP_JS)
        if not storage:
            context.add_init_script(NO_STORAGE_JS)
        elif entered:
            context.add_init_script(ENTERED_JS)
        if init_script:
            context.add_init_script(init_script)
        for pattern in block:
            context.route(lambda url, p=pattern: p in url, lambda route: route.abort())
        for pattern, body in (routes or {}).items():   # serve a JSON body instead of the real file
            context.route(lambda url, p=pattern: p in url, _fulfill_json(body))
        page = context.new_page()
        errors = []
        page.on("console", lambda m: errors.append("%s @ %s" % (m.text, m.location.get("url", "")))
                if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append("pageerror: %s" % e))
        if not hasattr(self, "_errors"):
            self._errors = {}
        self._errors[id(page)] = errors
        page.goto(self.base + path, wait_until="load")
        return page

    def assert_clean(self, page, allow=()):
        errors = [e for e in self._errors.get(id(page), []) if not any(a in e for a in allow)]
        csp = [c for c in page.evaluate("window.__csp || []") if not any(a in c for a in allow)]
        self.assertEqual(errors, [], "console/page errors on %s" % page.url)
        self.assertEqual(csp, [], "CSP violations on %s" % page.url)

    def shot(self, page, name):
        SHOTS.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(SHOTS / ("%s.png" % name)))
