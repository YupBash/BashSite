"""Baseline: the harness serves the repo and the home page loads without errors."""
import unittest

from tests.harness import SiteTestCase


class HarnessTest(SiteTestCase):
    def test_current_home_loads_clean(self):
        page = self.open("/")
        self.assertIn("BASH", page.title())
        self.assert_clean(page)

    def test_assert_clean_catches_console_errors(self):
        page = self.open("/", init_script="window.addEventListener('load', function () { console.error('boom'); });")
        with self.assertRaises(AssertionError):
            self.assert_clean(page)


if __name__ == "__main__":
    unittest.main()
