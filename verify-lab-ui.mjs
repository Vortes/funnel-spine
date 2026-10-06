import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

function browser(html) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { url: 'http://127.0.0.1:8000/lab/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.XMLSerializer = dom.window.XMLSerializer;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  globalThis.IntersectionObserver = class { observe() {} disconnect() {} };
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  dom.window.ResizeObserver = globalThis.ResizeObserver;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ config: null }) });
  dom.window.HTMLCanvasElement.prototype.getContext = () => null;
  Object.defineProperty(dom.window.document, 'timeline', { value: { currentTime: 0 } });
  dom.window.Element.prototype.animate = () => ({ play() {}, pause() {}, cancel() {}, startTime: 0 });
  return dom;
}

async function waitFor(predicate, label) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.fail(`Timed out waiting for ${label}`);
}

let dom = browser('<div id="lab-root"></div>');
await import('./dist/lab/lab.js');
await waitFor(() => document.querySelectorAll('#canvas [data-key]').length === 5, 'vertical figure');
assert.match(document.querySelector('#figure-title').textContent, /Vertical funnel/);
assert.equal(document.querySelectorAll('#canvas .atlas-vertical-stage [data-stage-face]').length, 10);
await waitFor(() => document.querySelector('[aria-label="Playback Speed"]'), 'DialKit speed control');
assert.equal(document.querySelector('[aria-label="Playback Speed"]').getAttribute('aria-valuenow'), '1');
assert.equal(document.querySelector('#canvas svg')?.parentElement?.style.getPropertyValue('--atlas-crossfade-duration'), '150ms');
const createObjectURL = URL.createObjectURL, revokeObjectURL = URL.revokeObjectURL;
const anchorClick = dom.window.HTMLAnchorElement.prototype.click;
let exported;
URL.createObjectURL = blob => { exported = blob; return 'blob:atlas-export'; };
URL.revokeObjectURL = () => {};
dom.window.HTMLAnchorElement.prototype.click = () => {};
document.querySelector('#canvas [data-key="converted"]').dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true }));
await waitFor(() => document.querySelector('#canvas [data-stage="converted"]')?.getAttribute('data-active') === 'true', 'focused vertical stage');
document.querySelector('#svg-export').click();
const exportedSvg = new JSDOM(await exported.text(), { contentType: 'image/svg+xml' }).window.document;
assert.equal(exportedSvg.querySelectorAll('[data-hit-stage],[data-focus-outline],[data-stage-focus]').length, 0);
assert.equal(exportedSvg.querySelectorAll('[data-pointer-tracking]').length, 0);
assert.equal(exportedSvg.querySelectorAll('[data-proximity-active]').length, 0);
assert([...exportedSvg.querySelectorAll('.atlas-vertical-stage')].every(stage => !stage.style.transform && !stage.style.transformOrigin && !stage.style.opacity));
assert(exportedSvg.querySelector('[data-stage-front="converted"]').getAttribute('fill').startsWith('url(#'));
URL.createObjectURL = createObjectURL;
URL.revokeObjectURL = revokeObjectURL;
dom.window.HTMLAnchorElement.prototype.click = anchorClick;
document.querySelector('[aria-label="Vertical view"] button:last-child').click();
await waitFor(() => document.querySelectorAll('#canvas [data-stage-face]').length === 0, 'flat vertical view');
document.querySelector('[data-variant="continuous"]').click();
await waitFor(() => document.querySelectorAll('#canvas [data-key]').length === 4, 'continuous figure');
const halfPath = document.querySelector('#canvas [data-key]').getAttribute('d');
document.querySelector('[aria-label="Continuous funnel shape"] button:last-child').click();
await waitFor(() => document.querySelector('#canvas [data-key]')?.getAttribute('d') !== halfPath, 'mirrored continuous figure');
assert.match(document.querySelector('#figure-caption').textContent, /Symmetric progression/);
document.querySelector('[data-variant="branching"]').click();
await waitFor(() => document.querySelectorAll('#canvas [data-key]').length === 10, 'branching figure');
assert.equal(document.querySelector('[data-variant="branching"]').getAttribute('aria-pressed'), 'true');
assert.equal(document.querySelectorAll('#canvas [data-key]').length, 10);
assert.match(document.querySelector('#figure-title').textContent, /Branching funnel/);
document.querySelector('#canvas [data-key]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
assert.equal(document.querySelector('#unpin'), null);
assert.equal(document.querySelector('#canvas [data-key]').getAttribute('aria-pressed'), null);
assert.match(document.querySelector('.caption').textContent, /Hover or focus to inspect/);
document.querySelector('[data-view="data"]').click();
await waitFor(() => !document.querySelector('#data-view').hidden, 'data editor');
const textarea = document.querySelector('#data');
Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, '{');
textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
document.querySelector('#apply-data').click();
await waitFor(() => Boolean(document.querySelector('#data-error').textContent), 'data validation error');
assert(document.querySelector('#data-error').textContent);
dom.window.close();

dom = browser('<div id="particle-root"></div>');
await import('./dist/lab/vertical-particles/study.js');
await waitFor(() => Boolean(document.querySelector('#preview svg')), 'particle preview');
assert(document.querySelector('#preview svg'));
assert.equal(document.querySelectorAll('#preview [data-stage-face]').length, 0);
assert.match(document.querySelector('#summary').textContent, /dots/);
document.querySelector('#pause').click();
await waitFor(() => document.querySelector('#preview')?.dataset.paused === 'true', 'paused particles');
assert.equal(document.querySelector('#pause').getAttribute('aria-pressed'), 'true');
assert.equal(document.querySelector('#preview').dataset.paused, 'true');
dom.window.close();

console.log('Verified React lab views, mirrored geometry, branching inspection, data validation, particle rendering, and playback controls.');
