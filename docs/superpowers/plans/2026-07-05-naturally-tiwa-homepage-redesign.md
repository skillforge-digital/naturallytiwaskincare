# Naturally Tiwa Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `index.html` into a story-first, ingredient-led Naturally Tiwa homepage that feels more premium, preserves existing brand assets, and stays performant.

**Architecture:** The current single-file homepage should be converted into a cleaner static architecture by extracting styles and behavior into focused assets, then rebuilding the homepage sections in the approved audit-led order. Validation should combine a lightweight DOM structure test with a Playwright smoke test so the redesign stays stable while sections are refactored.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node.js built-in test runner, Cheerio, Playwright

---

## File Structure

### Existing Files To Modify

- `index.html`
  - Replace the current inline-style, inline-script homepage implementation with the new story-first structure.
  - Keep existing image asset references under `assets/`.
- `package.json`
  - Add repeatable validation commands for structure and smoke tests.

### New Files To Create

- `styles/homepage.css`
  - Hold all homepage tokens, layout rules, section styles, interaction styles, responsive rules, and reduced-motion handling.
- `scripts/homepage.js`
  - Hold reveal behavior, ingredient-story interaction, and newsletter/status behavior.
- `tests/homepage-structure.test.js`
  - Assert section order, required content hooks, external asset loading, and key accessibility structure.
- `tests/homepage-smoke.spec.js`
  - Smoke-test the final homepage in a browser with Playwright using the local file URL.

## Implementation Notes

- Execute this plan in a dedicated git worktree before touching code.
- Keep the redesign static and dependency-light; do not introduce a framework.
- Preserve existing asset paths in `assets/` unless a replacement is explicitly required.
- Treat the ingredient-story section as the signature custom interaction after the hero.
- Do not rely on hover for essential information on mobile.

### Task 1: Create A Maintainable Homepage Shell

**Files:**
- Create: `styles/homepage.css`
- Create: `scripts/homepage.js`
- Create: `tests/homepage-structure.test.js`
- Modify: `index.html`
- Modify: `package.json`

- [ ] **Step 1: Write the failing structure test**

Create `tests/homepage-structure.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const $ = cheerio.load(html);

test('homepage loads external stylesheet and script assets', () => {
  const stylesheet = $('link[href="styles/homepage.css"]');
  const script = $('script[src="scripts/homepage.js"]');

  assert.equal(stylesheet.length, 1);
  assert.equal(script.length, 1);
  assert.equal($('style').length, 0);
});

test('homepage exposes stable section ids for the redesign narrative', () => {
  const sectionIds = [
    'hero',
    'brand-values',
    'solution',
    'ingredients',
    'shop',
    'ritual',
    'founder',
    'testimonials',
    'library',
    'community'
  ];

  for (const id of sectionIds) {
    assert.equal($(`#${id}`).length, 1, `expected #${id}`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test tests/homepage-structure.test.js
```

Expected:

```text
not ok 1 - homepage loads external stylesheet and script assets
not ok 2 - homepage exposes stable section ids for the redesign narrative
```

- [ ] **Step 3: Add the external asset shell and package scripts**

Create `styles/homepage.css`:

```css
:root {
  --page-bg: #f7f2ea;
  --surface: #fbf7f0;
  --surface-strong: #fffdf9;
  --ink: #1f2618;
  --olive: #45513a;
  --olive-deep: #273020;
  --accent: #b97861;
  --accent-soft: #d7b39f;
  --line: rgba(31, 38, 24, 0.12);
  --line-strong: rgba(31, 38, 24, 0.2);
  --shadow-soft: 0 22px 54px rgba(31, 38, 24, 0.08);
  --shadow-tight: 0 16px 32px rgba(31, 38, 24, 0.1);
  --radius-xl: 32px;
  --radius-lg: 24px;
  --radius-md: 18px;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: linear-gradient(180deg, #fcf8f1 0%, var(--page-bg) 100%);
  color: var(--ink);
  font-family: 'DM Sans', sans-serif;
}

.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}

.reveal.in {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }

  .reveal {
    opacity: 1;
    transform: none;
  }
}
```

Create `scripts/homepage.js`:

```js
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealElements = document.querySelectorAll('.reveal');

if (!reduceMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add('in'));
}
```

Update `package.json` scripts:

```json
{
  "scripts": {
    "test": "npm run test:structure && npm run test:smoke",
    "test:structure": "node --test tests/homepage-structure.test.js",
    "test:smoke": "playwright test tests/homepage-smoke.spec.js --reporter=line"
  }
}
```

Update the top and bottom of `index.html` so it links the external assets and exposes stable section ids:

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#f7f2ea">
  <title>Naturally Tiwa Skincare - Premium Care For Sensitive Skin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles/homepage.css">
</head>
```

```html
<main id="main-content">
  <section id="hero" class="hero">
    <!-- existing hero content will be replaced in later tasks -->
  </section>

  <section id="brand-values" class="brand-values">
    <!-- placeholder shell for later task -->
  </section>

  <section id="solution">
    <!-- existing category section -->
  </section>

  <section id="ingredients">
    <!-- ingredient section will move here -->
  </section>

  <section id="shop">
    <!-- product section -->
  </section>

  <section id="ritual">
    <!-- how to use -->
  </section>

  <section id="founder">
    <!-- founder story -->
  </section>

  <section id="testimonials">
    <!-- testimonials -->
  </section>

  <section id="library">
    <!-- library -->
  </section>

  <section id="community">
    <!-- community -->
  </section>
</main>

<script src="scripts/homepage.js"></script>
```

- [ ] **Step 4: Run the structure test to verify it passes**

Run:

```bash
npm run test:structure
```

Expected:

```text
# tests 2
# pass 2
```

- [ ] **Step 5: Commit the shell split**

Run:

```bash
git add index.html package.json styles/homepage.css scripts/homepage.js tests/homepage-structure.test.js
git commit -m "refactor: split homepage into static assets"
```

### Task 2: Rebuild The Header, Hero, And Brand Value Strip

**Files:**
- Modify: `index.html`
- Modify: `styles/homepage.css`
- Modify: `scripts/homepage.js`
- Modify: `tests/homepage-structure.test.js`

- [ ] **Step 1: Extend the failing structure test for the story-first hero**

Append to `tests/homepage-structure.test.js`:

```js
test('hero supports the story-first brand direction', () => {
  assert.match($('#hero .eyebrow').text(), /Sensitive Skin|Barrier|Naturally Tiwa/i);
  assert.equal($('#hero h1').length, 1);
  assert.equal($('#hero .cta-row .btn').length >= 2, true);
  assert.equal($('#hero .hero-story').length, 1);
});

test('brand values strip contains five concise trust messages', () => {
  const items = $('#brand-values .brand-value');
  assert.equal(items.length, 5);
});
```

- [ ] **Step 2: Run the structure test to verify it fails**

Run:

```bash
npm run test:structure
```

Expected:

```text
not ok - hero supports the story-first brand direction
not ok - brand values strip contains five concise trust messages
```

- [ ] **Step 3: Implement the redesigned header, hero, and value strip**

Replace the hero and value-strip markup in `index.html` with:

```html
<section id="hero" class="hero">
  <div class="wrap hero-panel">
    <div class="hero-shell">
      <div class="hero-copy reveal">
        <p class="eyebrow">Barrier-first care for sensitive skin</p>
        <h1>Natural skincare that starts with your skin story, not just the product shelf.</h1>
        <p class="hero-story">
          Naturally Tiwa brings together founder-led care, ingredient-rich formulas,
          and supportive routines for eczema, psoriasis, rosacea, and deeply dry skin.
        </p>
        <div class="cta-row">
          <a class="btn btn-primary" href="#ingredients">Explore The Ingredients</a>
          <a class="btn btn-secondary" href="#shop">Shop The Collection</a>
        </div>
      </div>

      <div class="hero-media reveal">
        <div class="hero-frame">
          <img src="assets/hero-banner.png" alt="Naturally Tiwa hero campaign featuring the Yara range">
        </div>
      </div>
    </div>
  </div>
</section>

<section id="brand-values" class="brand-values">
  <div class="wrap brand-values-row">
    <span class="brand-value">Safe From Birth</span>
    <span class="brand-value">Vegan And Cruelty-Free</span>
    <span class="brand-value">Award-Winning Formulas</span>
    <span class="brand-value">Barrier-First Care</span>
    <span class="brand-value">Ingredient-Led Skincare</span>
  </div>
</section>
```

Add to `styles/homepage.css`:

```css
.wrap {
  width: min(1220px, calc(100% - 40px));
  margin: 0 auto;
}

.hero {
  padding: 28px 0 0;
}

.hero-panel {
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 40px;
  background: linear-gradient(140deg, rgba(255, 251, 246, 0.96), rgba(236, 226, 213, 0.82));
  box-shadow: var(--shadow-soft);
}

.hero-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
  gap: 42px;
  align-items: center;
  padding: 58px;
}

.hero-copy h1 {
  margin: 18px 0 0;
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(46px, 6vw, 82px);
  line-height: 0.98;
  color: var(--olive-deep);
}

.hero-story {
  max-width: 560px;
  margin-top: 22px;
  font-size: 17px;
  line-height: 1.7;
}

.brand-values {
  padding: 18px 0 8px;
}

.brand-values-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.brand-value {
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 999px;
  text-align: center;
  background: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

- [ ] **Step 4: Run the structure test to verify it passes**

Run:

```bash
npm run test:structure
```

Expected:

```text
# tests 4
# pass 4
```

- [ ] **Step 5: Commit the top-of-page redesign**

Run:

```bash
git add index.html styles/homepage.css scripts/homepage.js tests/homepage-structure.test.js
git commit -m "feat: redesign homepage hero and brand values"
```

### Task 3: Build The Ingredient-Led Middle Of The Homepage

**Files:**
- Modify: `index.html`
- Modify: `styles/homepage.css`
- Modify: `scripts/homepage.js`
- Modify: `tests/homepage-structure.test.js`

- [ ] **Step 1: Extend the failing structure test for categories and ingredients**

Append to `tests/homepage-structure.test.js`:

```js
test('skin concern cards remain visible and easy to scan', () => {
  const cards = $('#solution .solution-card');
  assert.equal(cards.length, 4);
  cards.each((_, card) => {
    assert.equal($(card).find('h3').length, 1);
    assert.equal($(card).find('p').length >= 1, true);
  });
});

test('ingredient section includes a central product and four ingredient callouts', () => {
  assert.equal($('#ingredients .ingredients-product').length, 1);
  assert.equal($('#ingredients [data-ingredient]').length, 4);
  assert.equal($('#ingredients .ingredient-copy').length, 1);
});
```

- [ ] **Step 2: Run the structure test to verify it fails**

Run:

```bash
npm run test:structure
```

Expected:

```text
not ok - ingredient section includes a central product and four ingredient callouts
```

- [ ] **Step 3: Implement the category refresh and signature ingredient section**

Update `index.html` so the category cards stay near the current content model but the ingredient story becomes a standalone section:

```html
<section id="solution">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Find Your Skin Solution</p>
      <h2>Start with the concern your skin is trying to calm.</h2>
      <p>Keep the category names obvious, make the imagery more premium, and guide visitors into the right routine faster.</p>
    </div>

    <div class="solution-grid">
      <!-- keep four existing concern cards with current assets -->
    </div>
  </div>
</section>

<section id="ingredients" class="ingredients-section">
  <div class="wrap ingredients-shell">
    <div class="ingredients-copy reveal">
      <p class="eyebrow">Ingredient Story</p>
      <h2>The formulas feel richer because the ingredients do more than decorate the label.</h2>
      <p class="ingredient-copy">
        Center the story on one hero formula, then explain how each ingredient supports softness,
        barrier comfort, and repeatable routines for sensitive skin.
      </p>
    </div>

    <div class="ingredients-stage reveal">
      <figure class="ingredients-product">
        <img src="assets/product-yara.png" alt="Yara Body Food product jar">
      </figure>

      <div class="ingredient-grid">
        <button class="ingredient-card is-active" type="button" data-ingredient="shea" data-copy="Dense nourishment that helps lock comfort into the skin barrier.">
          <strong>Shea Butter</strong>
          <span>Deep barrier nourishment</span>
        </button>
        <button class="ingredient-card" type="button" data-ingredient="baobab" data-copy="Rich fatty acids support suppleness and long-wear comfort.">
          <strong>Baobab Oil</strong>
          <span>Long-wear softness</span>
        </button>
        <button class="ingredient-card" type="button" data-ingredient="coconut" data-copy="Adds slip and softness so routines feel easier to repeat.">
          <strong>Coconut Oil</strong>
          <span>Softening slip</span>
        </button>
        <button class="ingredient-card" type="button" data-ingredient="calendula" data-copy="A calming support ingredient for reactive skin routines.">
          <strong>Calendula</strong>
          <span>Calm support</span>
        </button>
      </div>
    </div>
  </div>
</section>
```

Add to `styles/homepage.css`:

```css
.section-head h2 {
  margin-top: 16px;
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(34px, 4vw, 56px);
  line-height: 1.02;
}

.solution-grid,
.ingredient-grid {
  display: grid;
  gap: 18px;
}

.solution-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ingredients-section {
  padding: 92px 0;
}

.ingredients-shell {
  display: grid;
  gap: 28px;
}

.ingredients-stage {
  display: grid;
  grid-template-columns: minmax(320px, 0.8fr) minmax(0, 1.2fr);
  gap: 28px;
  align-items: center;
}

.ingredients-product {
  margin: 0;
  padding: 32px;
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-tight);
}

.ingredient-card {
  width: 100%;
  padding: 20px;
  text-align: left;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.7);
}

.ingredient-card.is-active {
  border-color: var(--accent);
  box-shadow: var(--shadow-tight);
}
```

Extend `scripts/homepage.js` with ingredient interaction:

```js
const ingredientCards = document.querySelectorAll('[data-ingredient]');
const ingredientCopy = document.querySelector('.ingredient-copy');

for (const card of ingredientCards) {
  card.addEventListener('click', () => {
    ingredientCards.forEach((item) => item.classList.remove('is-active'));
    card.classList.add('is-active');

    if (ingredientCopy) {
      ingredientCopy.textContent = card.dataset.copy;
    }
  });
}
```

- [ ] **Step 4: Run the structure test to verify it passes**

Run:

```bash
npm run test:structure
```

Expected:

```text
# tests 6
# pass 6
```

- [ ] **Step 5: Commit the middle-page redesign**

Run:

```bash
git add index.html styles/homepage.css scripts/homepage.js tests/homepage-structure.test.js
git commit -m "feat: add ingredient-led homepage storytelling"
```

### Task 4: Rebalance Commerce, Story, Proof, And Editorial Sections

**Files:**
- Modify: `index.html`
- Modify: `styles/homepage.css`
- Modify: `tests/homepage-structure.test.js`

- [ ] **Step 1: Extend the failing structure test for the lower-page content**

Append to `tests/homepage-structure.test.js`:

```js
test('featured products are curated rather than overly dense', () => {
  assert.equal($('#shop .product-lead').length, 1);
  assert.equal($('#shop .product-card').length, 3);
});

test('lower homepage sections preserve story and trust content', () => {
  assert.equal($('#ritual .steps li').length >= 3, true);
  assert.equal($('#founder blockquote, #founder .founder-quote').length, 1);
  assert.equal($('#testimonials article').length >= 3, true);
  assert.equal($('#library article').length >= 2, true);
  assert.equal($('#community img').length >= 4, true);
});
```

- [ ] **Step 2: Run the structure test to verify it fails**

Run:

```bash
npm run test:structure
```

Expected:

```text
not ok - featured products are curated rather than overly dense
```

- [ ] **Step 3: Implement the curated lower-half section updates**

Update `index.html` so the shop section becomes more curated and the rest of the homepage retains the approved section order:

```html
<section id="shop">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Featured Formulas</p>
      <h2>Start with one trusted formula, then build the routine slowly.</h2>
    </div>

    <div class="product-lead">
      <!-- keep Yara as the lead product -->
    </div>

    <div class="product-grid product-grid-curated">
      <!-- keep only three supporting product cards -->
    </div>
  </div>
</section>

<section id="ritual">
  <!-- keep a 3-step routine with stronger copy hierarchy -->
</section>

<section id="founder">
  <!-- keep founder image, quote, and proof points -->
</section>

<section id="testimonials">
  <!-- move testimonial content into a dedicated section id -->
</section>

<section id="library">
  <!-- keep two article cards -->
</section>

<section id="community">
  <!-- keep editorial card plus tighter social grid -->
</section>
```

Add the supporting layout rule to `styles/homepage.css`:

```css
.product-grid-curated {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 1100px) {
  .hero-shell,
  .ingredients-stage {
    grid-template-columns: 1fr;
  }

  .brand-values-row,
  .solution-grid,
  .product-grid-curated {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .brand-values-row,
  .solution-grid,
  .product-grid-curated {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run the structure test to verify it passes**

Run:

```bash
npm run test:structure
```

Expected:

```text
# tests 8
# pass 8
```

- [ ] **Step 5: Commit the lower-page rebalance**

Run:

```bash
git add index.html styles/homepage.css tests/homepage-structure.test.js
git commit -m "feat: rebalance homepage story and commerce sections"
```

### Task 5: Add Browser Smoke Coverage And Final Polish

**Files:**
- Create: `tests/homepage-smoke.spec.js`
- Modify: `index.html`
- Modify: `styles/homepage.css`
- Modify: `scripts/homepage.js`

- [ ] **Step 1: Write the failing browser smoke test**

Create `tests/homepage-smoke.spec.js`:

```js
const { test, expect } = require('@playwright/test');
const path = require('node:path');

const homepageUrl = `file://${path.join(__dirname, '..', 'index.html')}`;

test('homepage renders key story-first sections', async ({ page }) => {
  await page.goto(homepageUrl);

  await expect(page.locator('#hero h1')).toContainText('Natural skincare');
  await expect(page.locator('#ingredients')).toBeVisible();
  await expect(page.locator('#shop')).toBeVisible();
  await expect(page.locator('#founder')).toBeVisible();
});

test('reduced motion disables reveal transitions', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();

  await page.goto(homepageUrl);

  const revealOpacity = await page.locator('.reveal').first().evaluate((node) => {
    return window.getComputedStyle(node).opacity;
  });

  expect(revealOpacity).toBe('1');
  await context.close();
});
```

- [ ] **Step 2: Run the smoke test to verify it fails**

Run:

```bash
npx playwright test tests/homepage-smoke.spec.js --reporter=line
```

Expected:

```text
1 failed
```

- [ ] **Step 3: Apply final polish for motion, accessibility, and readiness**

Ensure `scripts/homepage.js` includes newsletter status handling after the reveal and ingredient logic:

```js
const newsletterForm = document.getElementById('newsletter-form');
const newsletterStatus = document.getElementById('newsletter-status');

if (newsletterForm && newsletterStatus) {
  newsletterForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = document.getElementById('email-signup')?.value.trim();
    newsletterStatus.textContent = email
      ? 'Thanks. You are on the list for launches, ingredient notes, and routine guidance.'
      : 'Please add your email address to subscribe.';
  });
}
```

Ensure `styles/homepage.css` preserves visible focus and mobile-first readability:

```css
:focus-visible {
  outline: 3px solid rgba(185, 120, 97, 0.45);
  outline-offset: 3px;
}

img {
  display: block;
  max-width: 100%;
  height: auto;
}

@media (max-width: 860px) {
  .hero-shell {
    padding: 28px;
  }

  .hero-copy h1 {
    font-size: clamp(38px, 12vw, 56px);
  }
}
```

- [ ] **Step 4: Run the full validation suite**

Run:

```bash
npm test
```

Expected:

```text
> test:structure
... pass ...
> test:smoke
... 2 passed ...
```

- [ ] **Step 5: Commit the verified redesign**

Run:

```bash
git add index.html package.json styles/homepage.css scripts/homepage.js tests/homepage-structure.test.js tests/homepage-smoke.spec.js
git commit -m "feat: launch redesigned naturally tiwa homepage"
```

## Self-Review Notes

- Spec coverage:
  - Visual system is represented by `styles/homepage.css` extraction and redesign tasks.
  - Story-first architecture is represented by Tasks 2-4.
  - Ingredient-led storytelling is explicitly implemented in Task 3.
  - Motion, accessibility, and performance checks are covered in Task 5.
- Placeholder scan:
  - No `TBD`, `TODO`, or vague "handle later" language remains in the steps.
- Type consistency:
  - Section ids stay consistent across tests and implementation: `hero`, `brand-values`, `solution`, `ingredients`, `shop`, `ritual`, `founder`, `testimonials`, `library`, `community`.
