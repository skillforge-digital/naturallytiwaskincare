# Naturally Tiwa Homepage Redesign Design

## Overview

This design defines a homepage redesign for `index.html` that follows the audit direction more strongly than the current `clone-baseline` reference.

The redesign should preserve:
- existing brand assets where available
- most of the current homepage content structure and subject matter
- performance-conscious implementation choices

The redesign should shift the homepage from a mostly product-led landing page toward a story-first ecommerce homepage that gives more weight to:
- brand story
- ingredient storytelling
- skin-concern clarity
- premium visual presentation

The recommended direction is `story-first commerce`.

## Goals

- Make the homepage feel clearly more premium than the current concept.
- Follow the audit-led design direction rather than reproducing the current cloned baseline.
- Preserve brand assets and recognizable Naturally Tiwa identity.
- Keep the homepage commercially useful without making products dominate the first half of the page.
- Give ingredients a meaningful storytelling role.
- Maintain good mobile usability and restrained performance-safe motion.

## Non-Goals

- Rebuilding the homepage as an exact visual clone of `clone-baseline`
- Creating a motion-heavy luxury campaign site where shopping becomes secondary
- Changing the brand into a cold editorial or generic Shopify aesthetic
- Expanding scope into all inner pages during this spec

## Constraints

- Preserve current brand assets such as logo, product imagery, and core brand cues where practical.
- Keep most of the existing homepage subject matter and section intent, even if section order and layouts change.
- Favor performant animation patterns over heavy media or decorative motion.
- Keep essential content visible without hover-only disclosure.
- Respect reduced-motion preferences.

## Recommended Approach

Three directions were considered:

1. `Story-first commerce` - recommended
2. `Balanced editorial shop`
3. `Luxury campaign homepage`

`Story-first commerce` is recommended because it best matches the audit, the owner's desire for stronger brand and ingredient storytelling, and the need to preserve the homepage's ecommerce role.

## Experience Principles

- Premium but warm, not sterile
- Natural but disciplined, not rustic or messy
- Story-led but still easy to shop
- Ingredient-led with clear educational value
- Motion used as polish, not spectacle
- Mobile-first readability and accessibility

## Visual System

### Typography

Use a premium editorial hybrid:

- Headings: refined serif with optional italic emphasis for selected words or phrases
- Body copy: clean sans-serif such as `DM Sans`, `General Sans`, or `Poppins`
- Utility labels: restrained mono or tightly tracked sans only where needed

Typography should:
- elevate hero and section headlines
- improve readability compared with the older type feel
- strengthen hierarchy for ingredients, products, and trust content
- avoid signature/script-like styles that reduce clarity

### Color System

Replace the looser multi-gradient feel with a more disciplined palette:

- 1 primary accent color for CTAs and primary actions
- 2-3 neutrals for surfaces, text, borders, and backgrounds
- 1-2 soft supporting tones for ingredient and story moments

Color use should favor:
- cream, warm stone, soft olive, and controlled earth tones
- fewer competing gradients
- subtle gradients only where they add depth to hero or media surfaces
- consistent CTA styling across the page

### Brand Feel

The target visual character is:

- premium
- natural
- trustworthy
- feminine without being overly delicate
- modern without looking generic

## Motion Strategy

Motion should feel calm, premium, and purposeful.

Recommended motion patterns:
- soft section reveal animations
- slow marquee or value-strip movement
- subtle hover lift on cards
- restrained layered motion in hero and ingredient storytelling

Motion should avoid:
- aggressive looping effects
- heavy autoplay video by default
- animation that blocks reading or distracts from primary actions

Performance rules:
- prefer `opacity` and `transform` animation
- keep motion lightweight and GPU-friendly
- support `prefers-reduced-motion`

## Homepage Architecture

Recommended order:

1. Hero
2. Brand value strip / marquee
3. Skin concern categories
4. Ingredient-led story section
5. Featured products
6. How it works / how to use
7. Founder / brand story
8. Testimonials
9. Articles / skin library
10. Instagram / community
11. Footer

This preserves the homepage's commercial role while reordering emphasis toward trust, story, and ingredient education.

### 1. Hero

Purpose:
- establish premium brand feel immediately
- communicate what Naturally Tiwa is for
- introduce the brand story before dense selling

Design requirements:
- cleaner header hierarchy
- stronger brand- and skin-led headline
- one primary CTA and one softer secondary CTA
- more refined supporting media
- subtle layered motion only

### 2. Brand Value Strip / Marquee

Purpose:
- reinforce trust and value propositions quickly
- add movement without clutter

Content can include:
- safe from birth
- vegan and cruelty-free
- award-winning formulas
- barrier-first care
- ingredient-led skincare

### 3. Skin Concern Categories

Purpose:
- preserve the useful navigation logic of the current homepage
- help users self-identify quickly

Design requirements:
- category names always visible
- stronger text hierarchy
- short benefit-led descriptions
- editorial, premium card presentation

### 4. Ingredient-Led Story Section

Purpose:
- turn ingredient storytelling into a signature differentiator
- explain why ingredients matter, not just that they exist

Recommended layout:
- one hero product or formula at the center
- key ingredients visually associated with the product
- short explanations for what each ingredient contributes

Desktop behavior:
- interactive highlighting of ingredient callouts on hover or focus

Mobile behavior:
- stacked vertical flow with no dependence on hover

### 5. Featured Products

Purpose:
- keep shopping clear and useful after trust has been built

Design requirements:
- fewer products shown at once
- stronger curation
- one featured product may receive expanded treatment
- supporting products remain easy to scan

### 6. How It Works / How To Use

Purpose:
- simplify routines
- reduce friction for first-time customers
- connect use guidance back to concerns and ingredients

Recommended format:
- simple 3-step or 4-step structure
- icons or supporting visuals if helpful
- copy focused on reassurance and clarity

### 7. Founder / Brand Story

Purpose:
- deepen emotional trust
- explain why the brand exists

Design requirements:
- stronger founder quote
- editorial composition
- clean integration of awards, certifications, or milestones

### 8. Testimonials

Purpose:
- provide social proof
- support conversion without breaking the premium tone

Recommended treatments:
- slow slider
- auto-advancing quote rail
- or staggered card layout

Any motion here must remain slow and readable.

### 9. Articles / Skin Library

Purpose:
- support SEO
- extend authority
- deepen ingredient and concern education

Design requirements:
- fewer, more intentional featured entries
- magazine-like layout
- tighter tie to skincare concerns and ingredient learning

### 10. Instagram / Community

Purpose:
- keep the brand human and current
- reinforce premium lifestyle credibility

Design requirements:
- tighter, cleaner feed treatment
- more editorial composition
- fewer noisy tiles

### 11. Footer

Purpose:
- end with clarity, confidence, and polish

Design requirements:
- cleaner structure
- stronger spacing and hierarchy
- premium newsletter block
- consistent CTA and link treatment

## Interaction Design

### Header Behavior

- Keep the header sticky.
- Tighten the header slightly on scroll.
- Use a light blur and clearer contrast as the page moves.
- Keep the logo left-aligned.
- Keep navigation simple and center-weighted.

### Hero Motion

- Stagger hero entrance gently.
- Headline and CTA should lead.
- Media should follow with subtle delay.
- Avoid dramatic loops or distracting effects.

### Category Cards

- Use light hover lift or depth increase.
- Keep titles visible at all times.
- Ensure mobile tap interaction is fully clear without hover.

### Ingredient Story Interaction

- Treat this as the signature custom section after the hero.
- Highlight ingredient callouts one at a time on hover, focus, or scroll.
- Reveal a short benefit statement for the active ingredient.
- On mobile, stack content cleanly in a readable sequence.

### Product Interaction

- Allow subtle hover polish for supporting product blocks.
- Do not rely on hover to reveal essential information.
- Keep one featured product visually richer than the rest if needed.

### Testimonial Interaction

- Use slow, readable movement if a slider or rail is chosen.
- Provide clear controls if manual navigation is included.

## Accessibility And Performance

The homepage must:
- support `prefers-reduced-motion`
- maintain visible focus states
- preserve strong text contrast
- avoid hover-only disclosure of required content
- load efficiently on mobile
- avoid heavy media unless clearly justified and optimized

## Content Dependencies

The following inputs are preferred for a strong final result:

- final logo assets
- best available product packshots
- founder image
- approved founder / brand story copy
- approved ingredient descriptions
- real testimonials
- article titles or links for the skin library
- social/community imagery worth featuring

If some assets are missing, the design can still proceed, but the founder and ingredient sections may be less effective.

## Content Rules

The homepage should avoid:
- vague luxury language without substance
- cluttered claims
- too many gradients or decorative shapes
- long paragraphs in key sections
- ingredient mentions without explanation

The homepage should emphasize:
- what the brand stands for
- who the products are for
- why the ingredients matter
- how to start simply
- why customers should trust the brand

## Edge Cases

The design must still work when:
- there are only 2-3 products in a section
- testimonials are limited
- article content is sparse
- image crops are inconsistent
- motion is disabled
- the screen is narrow

Layouts must degrade gracefully and remain readable without perfect content density.

## Acceptance Criteria

The redesign is successful if:
- it feels clearly more premium than the current homepage
- it follows the audit direction more than the cloned baseline
- brand assets and most homepage content are preserved
- the page gives more space to brand story and ingredients
- the category and product paths remain easy to understand
- motion adds polish without hurting performance
- the homepage feels like a custom brand experience rather than a lightly edited template

## Implementation Notes For Planning

The later implementation plan should account for:
- font loading strategy
- color token cleanup
- section reordering
- ingredient-story section design and interaction
- responsive behavior for every major section
- reduced-motion fallbacks
- lightweight interaction patterns
- final content and imagery integration
