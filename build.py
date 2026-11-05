#!/usr/bin/env python3
"""
Cube.Design by GobbleCube — static site build.

Zero dependencies, stdlib only. Assembles each page from
templates/base.html + content/<slug>.html and writes to dist/.

    python3 build.py            # build
    python3 build.py --serve    # build, then serve dist/ on :8000

To add a page: drop a fragment in content/, add a row to PAGES.
"""

import datetime
import html as html_mod
import json
import re
import hashlib
import http.server
import functools
import pathlib
import shutil
import socketserver
import sys

ROOT = pathlib.Path(__file__).parent.resolve()
DIST = ROOT / "dist"

# Shared passphrase for the front-of-site gate. This is a courtesy lock only:
# it lives in the page source, so treat it as "not for casual visitors",
# never as access control.
#
# LOCKS ARE CURRENTLY OFF. An empty string disables a gate; all the gate
# code (markup, styling, unlock logic) is still in place and untouched.
# To switch the handbook lock back on, put a passphrase back here:
#     SITE_PASSWORD = "12345"
SITE_PASSWORD = ""

# Pages served without the gate. Everything else prompts on arrival, and on a
# public page the Menu itself asks before it will open. Add "team" here if you
# want the careers page reachable by candidates.
PUBLIC = {"index"}

# A SECOND, separate code for the internal page. Deliberately not the same as
# SITE_PASSWORD: knowing the handbook passphrase must not open the internal
# shelf. Unrelated to any GobbleCube product login.
#
# ON. Note what this is and is not: the code is substituted into the page
# source at build time, so anyone who views source can read it. It keeps
# the shelf out of the way of casual visitors; it is not access control.
# Put nothing behind it you would mind a stranger seeing.
INTERNAL_PASSWORD = "Design@123"

# slug, nav label, <title>, meta description
PAGES = [
    ("index",      "Overview",   "Cube.Design by GobbleCube",
     "How the GobbleCube design team thinks, decides and ships."),
    ("philosophy", "Philosophy", "Philosophy — Cube.Design",
     "What we believe about designing decision-making software."),
    ("principles", "Principles", "Principles — Cube.Design",
     "Eight principles we hold each other to, and when each one bends."),
    ("process",    "Process",    "Process — Cube.Design",
     "Frame, Explore, Decide, Build, Learn — and what closes each gate."),
    ("craft",      "Craft Bar",  "Craft Bar — Cube.Design",
     "The quality bar every screen clears before it ships."),
    ("system",     "Design System", "Design System — Cube.Design",
     "Tokens, type, motion and components — the Cube design system, documented."),
    ("docs",       "Docs",       "Documentation — Cube Design System",
     "Reference documentation for the Cube design system: foundations, components, patterns."),
    ("docs-buttons-specifications", "Button specs", "Button specifications — Cube Design System",
     "Every property, size, state and colour of the Cube Button, with a variant explorer."),
    ("docs-colors", "Color", "Color — Cube Design System",
     "The Cube color system — Semantic, Accent, Brand, Neutral and Platform scales — and when to reach for each one."),
    ("docs-colors-specifications", "Color specs", "Color specifications — Cube Design System",
     "Every color scale's shade steps, hex values and token name, plus the raw tokens."),
    ("docs-typography", "Typography", "Typography — Cube Design System",
     "The Cube type scale — Heading, Body and Small — and when to reach for each one."),
    ("docs-typography-specifications", "Typography specs", "Typography specifications — Cube Design System",
     "Every type style's family, weight, size, line-height and letter-spacing, plus the raw tokens."),
    ("docs-spacing", "Spacing", "Spacing — Cube Design System",
     "The Cube spacing scale — 21 steps from 0 to 72 — and when to reach for each one."),
    ("docs-spacing-specifications", "Spacing specs", "Spacing specifications — Cube Design System",
     "Every spacing step and its pixel value, plus the raw tokens."),
    ("docs-inputs", "Inputs", "Input — Cube Design System",
     "Input field guidelines — sizes, states, chips and content — and when to reach for each one."),
    ("docs-inputs-specifications", "Input specs", "Input specifications — Cube Design System",
     "Every dimension, color token and prop for the Input and its label sub-component."),
    ("docs-icons", "Icons", "Icons — Cube Design System",
     "Icon guidelines — Phosphor Icons, weights, sizes, colour, approved icons and a searchable library."),
    ("docs-icons-specifications", "Icons specs", "Icons specifications — Cube Design System",
     "Icon tokens, the React Icon wrapper, the registry and setup for Phosphor Icons."),
    ("docs-trends", "Trends", "Trends — Cube Design System",
     "Trend guidelines — Trends-composition line chart, metric selection, time steps and the Metric-trends-group KPI row."),
    ("docs-trends-specifications", "Trends specs", "Trends specifications — Cube Design System",
     "Every dimension, colour token and property for Trends-composition, Trends and Metric-trends-group."),
    ("docs-table", "Tables", "Tables — Cube Design System",
     "Table guidelines — Table-template, column types, headers, row states, cell content, toolbar and footer."),
    ("docs-table-specifications", "Tables specs", "Tables specifications — Cube Design System",
     "Every dimension, colour token and property for Table-template, columns, headers, cells and content."),
    ("docs-widget", "Dashboard widget", "Dashboard widget — Cube Design System",
     "Dashboard widget guidelines — the card shell, Widget-header options, slot content, layout and behaviour."),
    ("docs-widget-specifications", "Dashboard widget specs", "Dashboard widget specifications — Cube Design System",
     "Every dimension, colour token and property for Dashboard-widget and Widget-header."),
    ("docs-bottomsheet", "Bottom sheet", "Bottom sheet — Cube Design System",
     "Bottom sheet guidelines — when to use it, anatomy, Divided panels, the context switcher, behaviour and do’s and don’ts."),
    ("docs-bottomsheet-specifications", "Bottom sheet specs", "Bottom sheet specifications — Cube Design System",
     "Every dimension, colour token and property for Bottom-sheet, Bottom-sheet-Header and the divided panel."),
    ("docs-swimlanes", "Swimlanes", "Swimlanes — Cube Design System",
     "Swimlanes guidelines — compare items side by side: anatomy, card types, selection, actions and do’s and don’ts."),
    ("docs-swimlanes-specifications", "Swimlanes specs", "Swimlanes specifications — Cube Design System",
     "Every dimension, colour token and property for Swimlanes-composition, Swimlane-Column, Swimlane-labels and Swim Lane Card."),
    ("docs-empty-states", "Empty states", "Empty states — Cube Design System",
     "Empty state guidelines — when to show one, sizes, illustrations, writing, actions and timing."),
    ("docs-empty-states-specifications", "Empty states specs", "Empty states specifications — Cube Design System",
     "Every dimension, colour token and property for Empty-state and its illustrations."),
    ("docs-filters", "Filters", "Filters — Cube Design System",
     "Filter guidelines — the filter bar, Filter-trigger, Quick and Multiple-filters menus, Selection vs Conditions, and do’s and don’ts."),
    ("docs-filters-specifications", "Filters specs", "Filters specifications — Cube Design System",
     "Every dimension, colour token and property for Header/Page-Filters, Filter-panel, Filter-trigger, Filter-menu and their parts."),
    ("docs-radio", "Radio", "Radio — Cube Design System",
     "Radio guidelines — the control, Radio-inline and Radio-chip, groups, writing and behaviour."),
    ("docs-radio-specifications", "Radio specs", "Radio specifications — Cube Design System",
     "Every dimension, colour token and property for the radio control, Radio-inline and Radio-chip."),
    ("docs-tabs", "Tabs", "Tabs — Cube Design System",
     "Tabs guidelines — primary and secondary tabs, anatomy, options, writing and behaviour."),
    ("docs-tabs-specifications", "Tabs specs", "Tabs specifications — Cube Design System",
     "Every dimension, colour token and property for Primary-tabs, Tab Item and secondary tabs."),
    ("docs-popup", "Popup", "Popup — Cube Design System",
     "Popup guidelines — Task and Message modals, anatomy, options, writing and behaviour."),
    ("docs-popup-specifications", "Popup specs", "Popup specifications — Cube Design System",
     "Every dimension, colour token and property for the Task and Message modals."),
    ("docs-sidenav", "Side Nav", "Side Nav — Cube Design System",
     "Side navigation guidelines — panel parts, states, modules, platform filter and behaviour."),
    ("docs-sidenav-specifications", "Side Nav specs", "Side Nav specifications — Cube Design System",
     "Every dimension, colour token and property for Navbar-V3 and its parts."),
    ("docs-header", "Header", "Header — Cube Design System",
     "Page header guidelines — rows, info pieces, page setups and behaviour — and when to switch each on."),
    ("docs-header-specifications", "Header specs", "Header specifications — Cube Design System",
     "Every dimension, colour token and property for Page header v2."),
    ("docs-dropdown", "Dropdown", "Dropdown — Cube Design System",
     "Dropdown guidelines — field, menu types, selection modes and behaviour — and when to reach for each one."),
    ("docs-dropdown-specifications", "Dropdown specs", "Dropdown specifications — Cube Design System",
     "Every dimension, colour token and property for the Dropdown field, menu and rows."),
    ("docs-messages", "Message", "Message — Cube Design System",
     "Message guidelines — sentiment, type, size, placement and writing — and when to reach for each one."),
    ("docs-messages-specifications", "Message specs", "Message specifications — Cube Design System",
     "Every dimension, colour token and property for the Message."),
    ("docs-banners", "Banner & Toast", "Banner & Toast — Cube Design System",
     "Banner and Toast guidelines — types, anatomy, behaviour and content — and when to reach for each one."),
    ("docs-banners-specifications", "Banner & Toast specs", "Banner & Toast specifications — Cube Design System",
     "Every dimension, color token and prop for the Banner and the Toast."),
    ("docs-chips", "Chips, Tags & Legends", "Chips, Tags & Legends — Cube Design System",
     "Chip, Tag and Legend guidelines — Standard vs Sementic, colour, size and content — and when to reach for each one."),
    ("docs-chips-specifications", "Chips specs", "Chips, Tags & Legends specifications — Cube Design System",
     "Every dimension, colour token and property for Chips, Tags and Legends."),
    ("docs-dates", "Date Selector", "Date Selector & Calendar — Cube Design System",
     "Date Selection modal, Calendar and Date-cell guidelines — range vs single date, presets and states."),
    ("docs-dates-specifications", "Date specs", "Date Selector & Calendar specifications — Cube Design System",
     "Every dimension, colour token and property for the Date Selection modal, Calendar and Date-cell."),
    ("docs-overlays", "Right Overlays", "Right Overlay — Cube Design System",
     "Right overlay guidelines — when to use it, header, body and footer options, and how to add one to a screen."),
    ("docs-overlays-specifications", "Right Overlay specs", "Right Overlay specifications — Cube Design System",
     "Every dimension, colour token and property for the Right overlay, its header, breadcrumb and footer."),
    ("docs-checkbox", "Checkbox", "Checkbox — Cube Design System",
     "Checkbox guidelines — check-box, inline and chip variants, states, add-ons and do’s & don’ts."),
    ("docs-checkbox-specifications", "Checkbox specs", "Checkbox specifications — Cube Design System",
     "Every dimension, colour token and property for the Check-box, Checkbox-inline and Checkbox-chip."),
    ("docs-segmented", "Segmented-controls", "Segmented Control — Cube Design System",
     "Segmented control guidelines — when to use it, types, sizes, accent colours and do’s & don’ts."),
    ("docs-segmented-specifications", "Segmented Control specs", "Segmented Control specifications — Cube Design System",
     "Every dimension, colour token and property for the Segmented control and its elements."),
    ("docs-selection", "Selection-group", "Selection Group — Cube Design System",
     "Selection group guidelines — single vs multi select, chip vs inline, layout and wrap."),
    ("docs-selection-specifications", "Selection specs", "Selection Group specifications — Cube Design System",
     "Every dimension, colour token and property for the Selection group."),
    ("docs-stepper", "Stepper", "Stepper — Cube Design System",
     "Stepper guidelines — horizontal vs vertical, stages, step count and how progress moves."),
    ("docs-stepper-specifications", "Stepper specs", "Stepper specifications — Cube Design System",
     "Every dimension, colour token and property for the Stepper, its steps and indicator."),
    ("docs-toggle", "Toggle", "Toggle — Cube Design System",
     "Toggle-switch guidelines — when to use it, sizes, states, labels and accessibility."),
    ("docs-toggle-specifications", "Toggle specs", "Toggle specifications — Cube Design System",
     "Every dimension, colour token and property for the Toggle-switch."),
    ("docs-tooltips", "Tooltips", "Tooltips — Cube Design System",
     "Tooltip guidelines, anatomy, placement and accessibility for the Cube design system."),
    ("docs-tooltips-specifications", "Tooltip specs", "Tooltip specifications — Cube Design System",
     "Color, state, typography and dimension values for the Tooltip component."),
    ("docs-accordion", "Accordion", "Accordion — Cube Design System",
     "Accordion guidelines — anatomy, options, behaviour and do’s and don’ts."),
    ("docs-accordion-specifications", "Accordion specs", "Accordion specifications — Cube Design System",
     "Every dimension, colour token and property for the Accordion."),
    ("docs-avatar", "Avatar", "Avatar — Cube Design System",
     "Avatar guidelines — types, sizes, groups and do’s and don’ts."),
    ("docs-avatar-specifications", "Avatar specs", "Avatar specifications — Cube Design System",
     "Every dimension, colour token and property for the Avatar."),
    ("docs-divider", "Divider", "Divider — Cube Design System",
     "Divider / Separator guidelines — orientation, styles, spacing and do’s and don’ts."),
    ("docs-divider-specifications", "Divider specs", "Divider specifications — Cube Design System",
     "Every dimension, colour token and property for the Divider."),
    ("docs-file-upload", "File upload", "File upload — Cube Design System",
     "File upload guidelines — the drop zone, file rows, states, validation and do’s and don’ts."),
    ("docs-file-upload-specifications", "File upload specs", "File upload specifications — Cube Design System",
     "Every dimension, colour token and property for File upload and its parts."),
    ("docs-skeleton", "Skeleton", "Skeleton — Cube Design System",
     "Skeleton loader guidelines — shapes, composition, motion and do’s and don’ts."),
    ("docs-skeleton-specifications", "Skeleton specs", "Skeleton specifications — Cube Design System",
     "Every dimension, colour token and property for the Skeleton."),
    ("docs-subscription-card", "Subscription card", "Subscription card — Cube Design System",
     "Subscription card guidelines — plans, anatomy, states and do’s and don’ts."),
    ("docs-subscription-card-specifications", "Subscription card specs", "Subscription card specifications — Cube Design System",
     "Every dimension, colour token and property for the Subscription card."),
    ("docs-card", "Card", "Card — Cube Design System",
     "Card guidelines — anatomy, options, layouts and do’s and don’ts."),
    ("docs-card-specifications", "Card specs", "Card specifications — Cube Design System",
     "Every dimension, colour token and property for the Card."),
    ("team",       "Join the team", "Team & Open Roles — Cube.Design",
     "How the design team is shaped, what we screen for, and what is open."),
    ("internal",   "Internal",   "Internal — Cube.Design",
     "Tools, reading and internal builds. Staff only."),
]

# Built, but kept out of the menu. "internal" is reached through the footer
# login; "craft" is referenced from Process; "team" has its own button in the
# top bar, so it does not need a second entry in the drop-down.
HIDDEN = {"internal", "craft", "team", "docs", "docs-tooltips", "docs-tooltips-specifications",
          "docs-buttons-specifications", "docs-typography", "docs-typography-specifications",
          "docs-colors", "docs-colors-specifications", "docs-spacing", "docs-spacing-specifications",
          "docs-inputs", "docs-inputs-specifications",
          "docs-banners", "docs-banners-specifications",
          "docs-messages", "docs-messages-specifications", "docs-dropdown", "docs-dropdown-specifications", "docs-header", "docs-header-specifications", "docs-sidenav", "docs-sidenav-specifications", "docs-popup", "docs-popup-specifications", "docs-tabs", "docs-tabs-specifications", "docs-radio", "docs-radio-specifications", "docs-icons", "docs-icons-specifications", "docs-empty-states", "docs-empty-states-specifications", "docs-filters", "docs-filters-specifications", "docs-widget", "docs-widget-specifications", "docs-table", "docs-table-specifications", "docs-trends", "docs-trends-specifications", "docs-swimlanes", "docs-swimlanes-specifications", "docs-bottomsheet", "docs-bottomsheet-specifications",
          "docs-chips", "docs-chips-specifications",
          "docs-dates", "docs-dates-specifications",
          "docs-toggle", "docs-toggle-specifications",
          "docs-overlays", "docs-overlays-specifications",
          "docs-stepper", "docs-stepper-specifications",
          "docs-selection", "docs-selection-specifications",
          "docs-segmented", "docs-segmented-specifications",
          "docs-checkbox", "docs-checkbox-specifications",
          "docs-accordion", "docs-accordion-specifications", "docs-avatar", "docs-avatar-specifications", "docs-divider", "docs-divider-specifications", "docs-file-upload", "docs-file-upload-specifications", "docs-skeleton", "docs-skeleton-specifications", "docs-subscription-card", "docs-subscription-card-specifications", "docs-card", "docs-card-specifications"}

# Guarded by INTERNAL_PASSWORD rather than SITE_PASSWORD.
INTERNAL_PAGES = {"internal"}

# The handbook pages, in the editorial treatment: dark ground, a sans/mono
# pairing, numbered sections, a restrained 12-64px scale. They load
# edition.css / edition.js on top of the usual pair and default to the dark
# theme; a stored theme preference still wins. Everything else is untouched.
EDITION = {"index", "philosophy", "principles", "process"}

# Of those, the ones that default to the dark ground. The landing page
# stays light so its first fold is untouched.
DARK = {"philosophy", "principles", "process"}

# The landing page also gets the design-tool furniture: column grids,
# frame labels, selection boxes, comment pins, stamps.
STUDIO = {"index"}

# The design-system reference. Its own shell — header, side nav, content,
# on-this-page rail, footer — in the manner of a documentation site. The
# handbook chrome (pill, rulers, footer) is hidden by docs.css.
DOCS = {"docs", "docs-tooltips", "docs-tooltips-specifications", "docs-buttons-specifications",
        "docs-typography", "docs-typography-specifications",
        "docs-colors", "docs-colors-specifications",
        "docs-spacing", "docs-spacing-specifications",
        "docs-inputs", "docs-inputs-specifications",
          "docs-banners", "docs-banners-specifications",
        "docs-messages", "docs-messages-specifications", "docs-dropdown", "docs-dropdown-specifications", "docs-header", "docs-header-specifications", "docs-sidenav", "docs-sidenav-specifications", "docs-popup", "docs-popup-specifications", "docs-tabs", "docs-tabs-specifications", "docs-radio", "docs-radio-specifications", "docs-icons", "docs-icons-specifications", "docs-empty-states", "docs-empty-states-specifications", "docs-filters", "docs-filters-specifications", "docs-widget", "docs-widget-specifications", "docs-table", "docs-table-specifications", "docs-trends", "docs-trends-specifications", "docs-swimlanes", "docs-swimlanes-specifications", "docs-bottomsheet", "docs-bottomsheet-specifications",
        "docs-chips", "docs-chips-specifications",
        "docs-dates", "docs-dates-specifications",
          "docs-toggle", "docs-toggle-specifications",
          "docs-overlays", "docs-overlays-specifications",
          "docs-stepper", "docs-stepper-specifications",
          "docs-selection", "docs-selection-specifications",
          "docs-segmented", "docs-segmented-specifications",
          "docs-checkbox", "docs-checkbox-specifications",
          "docs-accordion", "docs-accordion-specifications", "docs-avatar", "docs-avatar-specifications", "docs-divider", "docs-divider-specifications", "docs-file-upload", "docs-file-upload-specifications", "docs-skeleton", "docs-skeleton-specifications", "docs-subscription-card", "docs-subscription-card-specifications", "docs-card", "docs-card-specifications"}


EDITION_HEAD = (
    '<link href="https://fonts.googleapis.com/css2'
    '?family=Fragment+Mono:ital@0;1&display=swap" rel="stylesheet">\n'
    '<link rel="stylesheet" href="assets/css/edition.css?v={v}">'
)
STUDIO_HEAD = '<link rel="stylesheet" href="assets/css/studio.css?v={v}">'
# The product's own typeface (DM Sans) — the button demos and the type-scale
# samples on the Typography page both render in it, rather than silently
# falling back to the docs shell's own General Sans.
DOCS_HEAD = (
    '<link href="https://fonts.googleapis.com/css2'
    '?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400;1,9..40,500;1,9..40,600&display=swap"'
    ' rel="stylesheet">\n'
    '<link rel="stylesheet" href="assets/css/docs.css?v={v}">\n'
    '<script src="assets/js/docs-search-index.js?v={v}" defer></script>\n'
    '<script src="assets/js/docs-search.js?v={v}" defer></script>'
)
EDITION_JS = '<script src="assets/js/edition.js?v={v}"></script>'
# Inline, right after the docs side nav: put the nav back where it was
# scrolled before the click (each nav link is a full page load, which
# would otherwise snap the list to the top), and if the current page's
# link still isn't visible — arriving from search or a deep link — bring it
# into view. Runs before first paint, so the nav never visibly jumps.
DOCS_NAV_JS = (
    "<script>(function(){var n=document.getElementById('docs-nav');if(!n)return;"
    "try{var y=sessionStorage.getItem('docs-nav-y');if(y!==null)n.scrollTop=+y;}catch(e){}"
    "var a=n.querySelector('a[aria-current=\"page\"]');if(a){var r=a.getBoundingClientRect(),b=n.getBoundingClientRect();"
    "if(r.top<b.top||r.bottom>b.bottom)n.scrollTop+=r.top-b.top-(b.height-r.height)/2;}"
    "addEventListener('pagehide',function(){try{sessionStorage.setItem('docs-nav-y',n.scrollTop);}catch(e){}});})();</script>"
)


# The landing page carries the whole handbook, so the menu is a table of
# contents for one page rather than a site map. A slug listed here points at
# its band on index; anything absent still links to its own page.
ANCHORS = {
    "index":      "top",
    "philosophy": "philosophy",
    "principles": "principles",
    "process":    "process",
}


def nav_html(current):
    """The pill drop-down. Single source of truth for site navigation."""
    rows = []
    visible = [p for p in PAGES if p[0] not in HIDDEN]
    for i, (slug, label, _, _) in enumerate(visible):
        anchor = ANCHORS.get(slug)
        if anchor:
            # Same-document fragment on the landing page itself, so the
            # browser jumps instead of reloading; a full path from anywhere else.
            href = f"#{anchor}" if current == "index" else f"index.html#{anchor}"
            cur = ""
        else:
            href = f"{slug}.html"
            cur = ' aria-current="page"' if slug == current else ""
        rows.append(f'  <a href="{href}"{cur}>{label} <small>{i:02d}</small></a>')
    return "\n".join(rows)


def asset_version():
    """Short hash of the CSS+JS, appended to their URLs so a rebuild always
    busts the browser cache. Without this an edited stylesheet can sit
    invisible behind a cached copy."""
    h = hashlib.sha256()
    for rel in ("css/site.css", "js/site.js",
                "css/edition.css", "js/edition.js",
                "css/studio.css", "css/docs.css", "js/docs-search.js"):
        h.update((ROOT / "assets" / rel).read_bytes())
    return h.hexdigest()[:8]


def lock_mode(slug):
    """Which gate guards a page: the internal code, nothing (menu asks), or
    the site passphrase on arrival."""
    if slug in INTERNAL_PAGES:
        return "internal"
    return "menu" if slug in PUBLIC else "auto"


def page_mode(slug):
    """Which treatment a page gets: "edition" or the original "page"."""
    return "edition" if slug in EDITION else "page"


def page_theme(slug):
    """Default theme. Only a default — the head script still lets a stored
    preference override it, so the toggle keeps working everywhere."""
    return "dark" if slug in DARK else "light"


# Pages kept out of the nav and search for now (still built, reachable by URL).
SEARCH_HIDDEN = set()


def search_index():
    """Every docs page and section, for the header search. Written as a
    script (not JSON) so it also works when a page is opened from disk."""
    def text(h):
        h = re.sub(r"(?is)<(script|style|svg)\b.*?</\1>", " ", h)
        h = re.sub(r"(?s)<[^>]+>", " ", h)
        return re.sub(r"\s+", " ", html_mod.unescape(h)).strip()
    entries = []
    for slug, _label, _title, desc in PAGES:
        f = ROOT / "content" / f"{slug}.html"
        if slug not in DOCS or slug in SEARCH_HIDDEN or not f.exists():
            continue
        body = f.read_text(encoding="utf-8")
        m = re.search(r"(?s)<h1[^>]*>(.*?)</h1>", body)
        page = text(m.group(1)) if m else _label
        kind = "Specifications" if slug.endswith("-specifications") else "Guidelines"
        entries.append({"u": f"{slug}.html", "p": page, "k": kind, "s": "", "h": "", "t": desc})
        for sm in re.finditer(r'(?s)<section id="([^"]+)"[^>]*>(.*?)</section>', body):
            sid, inner = sm.groups()
            h2 = re.search(r"(?s)<h2[^>]*>(.*?)</h2>", inner)
            if not h2:
                continue
            subs = [text(x) for x in re.findall(r"(?s)<h3[^>]*>(.*?)</h3>", inner)]
            entries.append({"u": f"{slug}.html#{sid}", "p": page, "k": kind, "s": text(h2.group(1)),
                            "h": " · ".join(x for x in subs if x)[:300], "t": text(inner)[:700]})
    return "window.CUBE_SEARCH=" + json.dumps(entries, ensure_ascii=False, separators=(",", ":")) + ";\n"


def build():
    template = (ROOT / "templates" / "base.html").read_text(encoding="utf-8")
    version = asset_version()
    year = datetime.date.today().year

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    shutil.copytree(ROOT / "assets", DIST / "assets")
    if (ROOT / "files").exists():
        shutil.copytree(ROOT / "files", DIST / "files")

    for slug, _label, title, desc in PAGES:
        fragment = ROOT / "content" / f"{slug}.html"
        if not fragment.exists():
            print(f"  !  missing content/{slug}.html — skipped")
            continue
        html = (template
                .replace("{{SLUG}}", slug)
                .replace("{{TITLE}}", title)
                .replace("{{DESC}}", desc)
                .replace("{{NAV}}", nav_html(slug))
                .replace("{{BODY}}", fragment.read_text(encoding="utf-8"))
                .replace("{{PASSWORD}}", SITE_PASSWORD)
                .replace("{{LOCK_MODE}}", lock_mode(slug))
                .replace("{{INTERNAL_PASSWORD}}", INTERNAL_PASSWORD)
                .replace("{{MODE}}", page_mode(slug))
                .replace("{{THEME}}", page_theme(slug))
                .replace("{{EDITION_HEAD}}",
                         (EDITION_HEAD.format(v=version) if slug in EDITION else "")
                         + ("\n" + STUDIO_HEAD.format(v=version) if slug in STUDIO else "")
                         + ("\n" + DOCS_HEAD.format(v=version) if slug in DOCS else ""))
                .replace("{{EDITION_JS}}",
                         EDITION_JS.format(v=version) if slug in EDITION else "")
                .replace("{{ASSET_V}}", version)
                .replace("{{YEAR}}", str(year)))
        if slug in DOCS:
            html = html.replace("  </nav>\n  <div class=\"docs-scrim\"",
                                "  </nav>\n" + DOCS_NAV_JS + "\n  <div class=\"docs-scrim\"", 1)
        (DIST / f"{slug}.html").write_text(html, encoding="utf-8")
        print(f"  +  dist/{slug}.html")

    (DIST / "assets" / "js" / "docs-search-index.js").write_text(search_index(), encoding="utf-8")
    print(f"\nBuilt {len(PAGES)} pages into {DIST}  (assets v{version})")


def serve(port=8000):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler,
                                directory=str(DIST))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"Serving http://localhost:{port}  (ctrl-c to stop)")
        httpd.serve_forever()


if __name__ == "__main__":
    build()
    if "--serve" in sys.argv:
        serve()
