const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function getIds(markup) {
  const ids = new Set();
  const matches = markup.matchAll(/\sid="([^"]+)"/g);

  for (const [, id] of matches) {
    ids.add(id);
  }

  return ids;
}

test('homepage uses external stylesheet and script assets', () => {
  assert.equal(/<style[\s>]/i.test(html), false, 'expected homepage styles to be extracted');
  assert.match(
    html,
    /<link[^>]+rel="stylesheet"[^>]+href="styles\/homepage\.css"[^>]*>/i,
    'expected homepage stylesheet link'
  );

  assert.match(
    html,
    /<script[^>]+src="scripts\/homepage\.js"[^>]*><\/script>/i,
    'expected homepage script tag'
  );
  assert.equal(/<script(?![^>]+src=)[^>]*>/i.test(html), false, 'expected homepage behavior to be extracted');
});

test('homepage provides stable section ids from the implementation plan', () => {
  const ids = getIds(html);
  const requiredIds = [
    'hero',
    'brand-values',
    'skin-concerns',
    'featured-products',
    'how-it-works',
    'ingredients',
    'founder',
    'testimonials',
    'journal',
    'community',
    'footer-cta',
  ];

  for (const id of requiredIds) {
    assert.equal(ids.has(id), true, `expected #${id} to exist`);
  }
});

test('homepage no longer relies on inline style attributes', () => {
  assert.equal(/\sstyle="/i.test(html), false, 'expected inline style attributes to be removed');
});
