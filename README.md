# Cube.Design by GobbleCube

The internal design handbook — philosophy, principles, process and the craft bar.

Built to the design language in `DESIGN-SPEC.md`: General Sans at −6% tracking, the
floating black nav pill, ruler-tick chrome, and the 3D cube hero.

## Run it

No Node, no npm, no dependencies — this machine has `python3` and that is all it needs.

```bash
python3 build.py            # build into dist/
python3 build.py --serve    # build, then serve http://localhost:8000
```

## Layout

```
build.py              the whole build — ~120 lines of stdlib Python
templates/base.html   page shell: chrome, nav pill, ruler, footer
content/*.html        one fragment per page — this is what you edit
assets/css/site.css   tokens + components
assets/js/site.js     cube motion, rulers, theme, scroll chip
dist/                 generated output — do not edit, do not commit
```

## Editing

**Change copy** — edit the fragment in `content/`, run `python3 build.py`.

**Add a page** — drop `content/<slug>.html`, add a row to `PAGES` in `build.py`. The nav
menu, the chapter numbers and the prev/next links all derive from that list, so there is
nothing else to update.

**Change the design** — tokens live at the top of `assets/css/site.css` and mirror the
spec exactly. The three things that carry the identity, per the spec: the −6% tracking,
the nav pill with inset chips, and the ruler ticks. Change those last.

## Things left as placeholders

- **Cube imagery** — currently Lorem Picsum. Swap the `tile()` function at the top of
  `assets/js/site.js` for real paths. Use high-contrast, high-saturation images; muted
  photography turns to grey mush at 140px.
- **The "Open Figma" button** — points at `figma.com`. Set the real URL in
  `templates/base.html`.
- **All written content is a strawman.** It is deliberately opinionated so the team has
  something to argue with, but none of it has been ratified. Treat every page as a draft
  until it has been through critique.

## Deploying

`dist/` is fully static — no build step on the host. Drop it on Netlify, Vercel, GitHub
Pages, S3 or any internal static host. Nothing server-side is required.

## Porting to Astro or Next later

If Node gets installed, this maps over cleanly: `content/*.html` become MDX pages,
`templates/base.html` becomes the layout, and the tokens go into `tailwind.config`
under `theme.extend`. The one thing Tailwind has no scale for is −0.06em, so add
`letterSpacing: { tight6: '-0.06em' }` and use it everywhere. The cube has to be a client
component — it needs `requestAnimationFrame` and `pointermove`.
