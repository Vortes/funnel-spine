import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';
import { act, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';

const source = await readFile(new URL('./src/react/ScreenDefs.tsx', import.meta.url), 'utf8');
const compiled = await transform(source, { loader: 'tsx', format: 'cjs', jsx: 'automatic', target: 'es2022' });
const loaded = { exports: {} };
let shaderCalls = 0;
let shaderResult = null;
const require = createRequire(import.meta.url);
const load = specifier => specifier.endsWith('/stipple-shader.js')
  ? { stippleImage: () => { shaderCalls++; return shaderResult; } }
  : require(specifier);
new Function('require', 'module', 'exports', compiled.code)(load, loaded, loaded.exports);
const { ScreenDefs } = loaded.exports;

assert.equal(typeof globalThis.document, 'undefined');
assert.equal(typeof globalThis.window, 'undefined');

const options = { idPrefix: 'test-screens', width: 72, height: 48, seed: 8675309, includeSparse: true };
const render = props => renderToStaticMarkup(createElement('svg', null, createElement(ScreenDefs, props)));
const markup = render(options);
assert.equal(markup, render(options), 'the same seed should produce the same SVG');
assert(markup.startsWith('<svg><defs>'));
assert(markup.endsWith('</defs></svg>'));

const patternTypes = ['dense', 'am', 'hatch', 'cross', 'coarse', 'solid', 'grain', 'sparse'];
const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(ids, [...patternTypes.map(type => `test-screens-${type}`), 'test-screens-edge']);
assert.match(markup, /id="test-screens-dense"[^>]*data-dot-count="\d+"[^>]*data-stipple-renderer="vector"/);
assert.match(markup, /id="test-screens-sparse"[^>]*data-dot-count="\d+"[^>]*data-stipple-renderer="vector"/);
assert.match(markup, /id="test-screens-hatch"[^>]*patternTransform="rotate\(-45\)"/);
assert.match(markup, /id="test-screens-cross"[^>]*patternTransform="rotate\(-45\)"/);
assert.match(markup, /<feTurbulence[^>]*seed="\d+"/);

function firstStipplePath(svg) {
  const start = svg.indexOf('id="test-screens-dense"');
  const end = svg.indexOf('</pattern>', start);
  assert(start >= 0 && end > start);
  const match = svg.slice(start, end).match(/<path d="([^"]+)"/);
  assert(match);
  return match[1];
}

assert.notEqual(firstStipplePath(markup), firstStipplePath(render({ ...options, seed: 8675310 })));
assert.equal(firstStipplePath(markup), firstStipplePath(render({ ...options, dotGain: .1 })));
assert(!render({ ...options, includeSparse: false, roughness: 0 }).includes('id="test-screens-sparse"'));
assert(!render({ ...options, includeSparse: false, roughness: 0 }).includes('id="test-screens-edge"'));

const started = performance.now();
const defaultMarkup = render({ idPrefix: 'default-screens', width: 900, height: 460 });
const duration = Math.round(performance.now() - started);
assert(defaultMarkup.length < 150_000, `default screen defs exceed 150 KB: ${defaultMarkup.length} characters`);
assert.equal(defaultMarkup, render({ idPrefix: 'default-screens', width: 900, height: 460 }));
assert.match(defaultMarkup, /id="default-screens-dense" width="128" height="128"/);
assert.equal(shaderCalls, 0, 'server rendering must not invoke the WebGL shader');

const dom = new JSDOM(`<main id="app">${markup}</main>`, { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
shaderResult = { url: 'data:image/png;base64,iVBORw0KGgo=', count: 123 };
const recoverableErrors = [];
const { hydrateRoot } = await import('react-dom/client');
let root;
await act(async () => {
  root = hydrateRoot(document.querySelector('#app'), createElement('svg', null, createElement(ScreenDefs, options)), {
    onRecoverableError: error => recoverableErrors.push(error),
  });
});
assert.deepEqual(recoverableErrors, [], 'the vector SSR output should hydrate unchanged');
assert(shaderCalls > 0, 'the shader should run after hydration');
assert.equal(document.querySelector('#test-screens-dense').getAttribute('data-stipple-renderer'), 'shader');
assert(document.querySelector('#test-screens-dense image'));
await act(async () => root.unmount());
dom.window.close();
delete globalThis.window;
delete globalThis.document;
delete globalThis.IS_REACT_ACT_ENVIRONMENT;

console.log(`Verified React screen SSR, IDs, pattern coverage, and seeded stipple. Default defs: ${defaultMarkup.length.toLocaleString()} characters, ${duration} ms cold render.`);
