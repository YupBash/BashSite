"""Task 9: About & Setup — profile card, spec sheet, FAQ (+ FAQPage JSON-LD) and the hidden minesweeper."""
import json
import unittest

from tests.harness import SiteTestCase

QUESTIONS = ["Who are you?", "Where can I follow you?", "How often do you post?", "About me",
             "How can I contact you?", "What gear do you use?"]
SPECS = [("Processor", "Ryzen 7 5800X"), ("Memory", "32 GB RAM"), ("Graphics Card", "RX 9070 XT"),
         ("Mouse", "WLMOUSE Beast X"), ("Keyboard", "Gravastar Mercury V60 Pro")]
ANSWERS = ["Some random dude, idk. 💣",
           "Discord, TikTok and Instagram are up in the top right, and in the Socials section below.",
           "Im too lazy to start :p",
           "I'm 21 and I'm from Belgium.",
           "yupbash@gmail.com",
           " ".join("%s %s" % pair for pair in SPECS)]
# Answer text with whitespace collapsed; list items are joined with a space.
ANSWER_TEXT = """() => [...document.querySelectorAll('#about .faq-item .faq-answer')].map(a => {
    const lis = [...a.querySelectorAll('li')];
    const raw = lis.length ? lis.map(li => li.textContent).join(' ') : a.textContent;
    return raw.replace(/\\s+/g, ' ').trim(); })"""
OPEN_FIRST = "document.querySelector('#about .faq-item').open = true"


class AboutTest(SiteTestCase):
    def test_faq_questions_exact(self):
        page = self.open("/")
        got = page.evaluate("[...document.querySelectorAll('#about .faq-item summary')].map(s => s.textContent.trim())")
        self.assertEqual(got, QUESTIONS)

    def test_faq_answers_exact(self):
        page = self.open("/")
        self.assertEqual(page.evaluate(ANSWER_TEXT), ANSWERS)
        self.assertEqual(page.evaluate("document.querySelectorAll('#about .faq-item')[4].querySelector('a').getAttribute('href')"),
                         "mailto:yupbash@gmail.com")

    def test_faq_jsonld(self):
        page = self.open("/")
        blocks = page.evaluate("[...document.querySelectorAll('script[type=\"application/ld+json\"]')].map(s => s.textContent)")
        faq = [d for d in map(json.loads, blocks) if d.get("@type") == "FAQPage"]
        self.assertEqual(len(faq), 1)
        entities = faq[0]["mainEntity"]
        self.assertEqual([e["name"] for e in entities], QUESTIONS)
        for e in entities:
            self.assertEqual(e["@type"], "Question")
            self.assertTrue(e["acceptedAnswer"]["text"].strip())

    def test_spec_sheet_values(self):
        page = self.open("/")
        got = page.evaluate("""[...document.querySelectorAll('.spec-sheet .spec-row')].map(r =>
            [r.querySelector('.spec-label').textContent.trim(), r.querySelector('.spec-value').textContent.trim()])""")
        self.assertEqual([tuple(x) for x in got], SPECS)

    def test_profile_card_copy(self):
        page = self.open("/")
        text = page.text_content(".profile-card")
        self.assertIn("BASH · 21 · Belgium", text)
        self.assertIn("Some random dude, idk.", text)

    def test_spec_values_decode_on_entry_without_changing_text(self):
        page = self.open("/")
        page.evaluate("document.querySelector('.spec-sheet').scrollIntoView({ block: 'center', behavior: 'instant' })")
        page.wait_for_function("() => document.querySelector('.spec-sheet .spec-value.is-decoding')", timeout=5000)
        during = page.evaluate("[...document.querySelectorAll('.spec-sheet .spec-value')].map(v => v.textContent.trim())")
        self.assertEqual(during, [v for _, v in SPECS])   # screen readers and copy-paste always get the real values
        page.wait_for_function("() => !document.querySelector('.spec-sheet .spec-value.is-decoding')", timeout=5000)
        self.assert_clean(page)

    def test_mobile_blobs_stay_clear_of_the_hud(self):
        page = self.open("/", mobile=True, reduced_motion=True)
        page.wait_for_function("() => window.BashHome && BashHome.chrome && BashHome.chrome.stats().frames > 0", timeout=15000)
        page.evaluate("document.getElementById('about').scrollIntoView({ block: 'center', behavior: 'instant' })")
        page.wait_for_function("() => BashHome.chrome.stats().state === 'about'", timeout=5000)
        bottom = page.evaluate("document.getElementById('menuBtn').getBoundingClientRect().bottom") + 8
        pts = [[x / 390, y / 844] for x in range(0, 391, 10) for y in range(0, int(bottom), 6)]
        alpha = max(p[3] for p in page.evaluate("pts => BashHome.chrome.debugSample(pts)", pts))
        self.assertLess(alpha, 10, "chrome drawn behind the HUD bar")

    def test_minesweeper_opens_and_plays(self):
        page = self.open("/")
        page.evaluate(OPEN_FIRST)
        page.click("#bombTrigger")
        page.wait_for_selector("#msOverlay.open")
        page.click("#msGrid .ms-cell >> nth=27")
        self.assertGreater(page.locator("#msGrid .ms-cell.revealed").count(), 0)
        page.keyboard.press("Escape")
        page.wait_for_function("() => !document.getElementById('msOverlay').classList.contains('open')", timeout=3000)
        self.assert_clean(page)

    def test_bomb_keyboard(self):
        page = self.open("/")
        page.evaluate(OPEN_FIRST)
        page.focus("#bombTrigger")
        page.keyboard.press("Enter")
        page.wait_for_selector("#msOverlay.open")
        # Focus moves into the dialog, and comes back to the 💣 when it closes.
        self.assertTrue(page.evaluate("document.getElementById('msOverlay').contains(document.activeElement)"))
        page.keyboard.press("Escape")
        page.wait_for_function("() => document.activeElement && document.activeElement.id === 'bombTrigger'", timeout=3000)

    def test_minesweeper_size_and_flags(self):
        page = self.open("/")
        page.evaluate(OPEN_FIRST)
        page.click("#bombTrigger")
        page.wait_for_selector("#msOverlay.open")
        self.assertEqual(page.locator("#msGrid .ms-cell").count(), 64)
        self.assertEqual(page.text_content("#msStatus"), "10 💣")
        page.select_option("#msSize", "6:6")
        self.assertEqual(page.locator("#msGrid .ms-cell").count(), 36)
        self.assertEqual(page.text_content("#msStatus"), "6 💣")
        page.click("#msFlagToggle")
        page.click("#msGrid .ms-cell >> nth=0")
        self.assertEqual(page.text_content("#msGrid .ms-cell >> nth=0"), "🚩")
        self.assertEqual(page.text_content("#msStatus"), "5 💣")
        page.click("#msReset")
        self.assertEqual(page.locator("#msGrid .ms-cell.flagged").count(), 0)
        self.assertEqual(page.text_content("#msStatus"), "6 💣")


if __name__ == "__main__":
    unittest.main()
