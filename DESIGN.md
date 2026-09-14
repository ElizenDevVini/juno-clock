# DESIGN.md — Frontend Rules for AI Agents

You are building production UI. These rules are mandatory. When a rule conflicts with your default instinct, the rule wins. Your default instinct is what makes output look AI-generated.

> Repo note (ponsdev): this codebase predates these rules and is Vite + React with hand-rolled CSS (client/src/styles.css tokens), not Next.js + Tailwind + shadcn. Section 1 applies to NEW projects; here, follow the existing token system and everything from section 2 onward. Do not convert this repo's stack without being asked.

---

## 1. Stack (do not deviate without asking)

- **Next.js + Tailwind CSS + shadcn/ui.** This is the standard. shadcn components are copied into the repo (`npx shadcn@latest add <component>`), so you own and can edit the source in `components/ui/`.
- shadcn handles the hard interactive components: dialogs, dropdowns, command palettes, data tables, date pickers. Never build these from scratch.
- Tailwind handles all custom styling. No inline `style={{}}` except for truly dynamic values.
- Motion (Framer Motion) only if animation is explicitly needed. Default is no animation library.
- Icons: lucide-react only. One icon set per project, ever.

## 2. Design tokens first, pixels never

Before writing any page, define tokens in one place (Tailwind config / CSS variables) and use ONLY these:

- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48, 64, 96px. No arbitrary values like `p-[13px]` or `mt-[27px]`. Ever.
- **Type scale:** pick a base (16px body) and a ratio (~1.25). Roughly: 12, 14, 16, 18, 20, 24, 30, 36, 48, 60. Use 4 to 5 of these per page, not all of them.
- **Radius:** ONE radius value for interactive elements (buttons, inputs), ONE for containers (cards, modals). Not the same radius on everything, and not a different radius per component.
- **Colors:** define a full neutral ramp (8-10 grays), one primary, one or two accents, plus semantic colors (success/warning/danger). Every color used must come from the ramp. No one-off hex values in components.
- **Shadows:** define 2-3 elevation levels max. Same shadow = same elevation meaning everywhere.

If a component hardcodes a color, font size, or spacing value that is not a token, that is a bug. Fix it.

## 3. Typography rules

- Max TWO typefaces per project. One is fine. If two, they must be clearly distinct (e.g. a characterful display face + a workhorse sans), not two similar sans-serifs.
- **Banned as the only/default font:** Inter, Roboto, Arial, system-ui alone. These are the #1 tell of AI-generated UI. Pick something with a point of view (examples by vibe: Geist, Söhne-alikes, IBM Plex, Space Grotesk for techy; a serif like Newsreader/Source Serif for editorial; Departure Mono accents for terminal-feel). Choose to fit the product, then commit.
- Body text: 16px minimum, line-height ~1.5, line length under 75 characters (`max-w-prose` or ~65ch).
- Headings: tighter line-height (~1.1-1.2), and don't make them huge just because you can. In an app, the page context already tells the user where they are.
- Never use font weights below 400. De-emphasize with a lighter gray or smaller size, not thin weights.
- De-emphasize secondary text with color (gray-500/600 on white), not opacity.
- **Banned typographic tells:** ALL-CAPS tracked-out eyebrow labels above every heading; one word of a headline in a different color/italic; "WORD — fragment" labels; middle-dot separated meta strings (A · B · C); an arrow → appended to every link.

## 4. Layout and composition

- Everything sits on a grid. 12-column grid with consistent gutters for pages. If elements are misaligned by a few pixels, the whole page reads as amateur.
- **Rule of thirds / asymmetry:** perfectly centered everything is the AI default. Use intentional asymmetry: a hero can be 2/3 content, 1/3 visual; a feature section can alternate. Center only when centering is a deliberate choice for that section.
- Start with MORE whitespace than feels necessary, then remove. Cramped is worse than sparse. Space between unrelated groups must be visibly larger than space within a group (e.g. 12px inside a card cluster, 48-64px between sections).
- Content max-width: constrain it. Full-bleed text on a 1440px screen is a bug. ~1200px container for marketing pages, ~1400px for dashboards.
- Don't put a border on everything. To separate elements, prefer (in order): whitespace, background color difference, then borders. Borders are the last resort, not the first.
- Every element must justify its existence. If removing it loses nothing, remove it.

## 5. Hero sections

- The hero's job is one message in 5 seconds: what this is, who it's for, why care. One headline (concrete, benefit-led, no buzzwords), one subline, ONE primary CTA. A secondary CTA is optional and must be visually quieter.
- **Banned default hero:** centered headline + gradient text + two buttons + three floating cards + purple-to-blue gradient on white. If your first draft looks like that, redo it.
- Lead with the most characteristic thing about THIS product: a real screenshot, a live demo, a number that matters, a bold typographic statement. Not an abstract 3D blob or generic illustration.
- Primary CTA is the highest-contrast element on the screen. It says what happens ("Start free scan", not "Get Started" if you can be more specific).
- One hero, one focal point. If the eye doesn't know where to land in 1 second, the hero fails.

## 6. Dashboards

- A dashboard answers questions; it does not display data. Before building, write down the 3 questions the user opens this screen to answer. Everything on screen serves one of them or gets cut.
- **Hierarchy:** most important metric top-left (F-pattern scanning). Primary KPIs get large numbers and prominent placement; supporting detail gets smaller type lower on the page. If everything is the same size, nothing is important.
- **The 5-second test:** a user must grasp the critical state of things within 5 seconds of landing. If not, the hierarchy is broken.
- **Do not cram.** Information overload is the #1 dashboard failure. Rules:
  - Max ~6-8 widgets/cards visible above the fold. More belongs on a second view, a tab, or behind drill-down.
  - Overview first, detail on demand. Summary numbers up top, click through for the breakdown. Never show a wall of 20 charts.
  - One chart = one insight. If a chart needs a paragraph to explain, replace it.
- Chart choice: line for trends over time, bar for comparisons, avoid pie charts (max one, max 4 slices), no 3D, no decorative gridlines, no chart junk.
- Color in dashboards is a signal, not decoration. Neutral by default; color means something (status, category, alert). Red/green reserved for bad/good only.
- Group related metrics with whitespace and shared background, not nine identical bordered cards in a uniform grid. Vary card size by importance.
- Legends next to their charts, filters above the content, labels in plain language.
- Empty states and loading states are part of the design. An empty dashboard must tell the user what to do next, not show a blank grid.

## 7. Color

- Build the UI in grayscale FIRST. Get hierarchy working with size, weight, and spacing alone. Add color last. If the design only works because of color, the hierarchy is broken.
- One dominant neutral background, one primary, restrained accents. A page with 5+ competing hues is broken.
- Never pure black (#000) text on pure white; use a very dark gray on white, or near-white on dark. But also avoid the tinted "#0B0B0B on cream" combo that reads as AI default.
- Contrast: all text meets WCAG AA (4.5:1 body, 3:1 large text). Non-negotiable.
- **Banned:** purple-to-blue gradients as the default brand, gradient washes as decoration, glassmorphism everywhere, the cream + terracotta + serif combo.

## 8. Components and interaction

- Buttons: primary (solid, high contrast, ONE per view), secondary (outline or muted), tertiary (link style). Never two solid primary buttons side by side.
- Every interactive element has visible hover, focus, active, and disabled states. Keyboard focus must be visible.
- Forms: labels above inputs, real validation messages that say what to fix ("Enter a valid email", not "Invalid input"), errors never vague, no placeholder-as-label.
- CTAs and actions use active, specific verbs, and the name stays consistent through the flow ("Publish" button → "Published" toast).
- Motion: at most ONE orchestrated moment per page (e.g. hero load). Fade-up-on-scroll on every section and hover-lift on every card is the AI default. Cut it. Respect `prefers-reduced-motion`.
- Responsive to 375px width minimum. Test the mobile layout, don't just let it reflow.

## 9. Copy is design

- Write real copy, never lorem ipsum and never generic filler ("Empower your workflow with seamless solutions"). If you don't know the product, ask.
- Name things by what users understand, not how the system works.
- Sentence case everywhere. Plain verbs. Every string does one job.
- Numbers beat adjectives: "Checks 400 citations in 90 seconds" beats "Lightning-fast verification".

## 10. Mandatory self-review before declaring done

Run this checklist. Fix anything that fails, then re-check:

1. Could this exact page exist for a completely different product? If yes, it's generic. Rework the hero/visual identity around this product's actual subject matter.
2. Squint test: does the hierarchy survive blur? Is there one clear focal point per screen?
3. Are ALL spacing/size/color values from the token scales? Grep for arbitrary values.
4. Does it contain any banned pattern from this doc (Inter-only, purple gradient, eyebrow labels, uniform card grid, scroll animations everywhere)?
5. Dashboard only: can a new user answer the screen's #1 question in 5 seconds? Is anything on screen not serving one of the 3 questions?
6. Mobile at 375px: usable, nothing overflowing, tap targets ≥ 44px?
7. Accessibility: contrast passes, focus visible, alt text present, reduced motion respected?
8. Take a screenshot (if tooling allows) and critique it: what would you remove? Remove one thing (Chanel rule: look in the mirror, remove one accessory).

## 11. Process (in order, do not skip)

1. Read this file and any PLAN.md / brand notes in the repo.
2. Write a short design plan BEFORE coding: palette (4-6 named hex values), typefaces, layout concept in one sentence + rough ASCII wireframe, and the one signature element that makes this page memorable.
3. Sanity-check the plan: would you produce roughly this same plan for any similar prompt? If yes, it's a default, not a decision. Change it.
4. Build in small pieces. Tokens → layout skeleton in grayscale → one component styled fully as the reference → the rest to match → color → the single motion moment.
5. Run the self-review checklist (section 10).
6. Log what you changed and why in one short paragraph so the next session has memory.

Spend boldness in ONE place per page. One signature element, everything else quiet and disciplined. That restraint is the difference between designed and generated.
