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
# Also OFF. To switch it back on, put a code back here:
#     INTERNAL_PASSWORD = "gc-internal-2026"
INTERNAL_PASSWORD = ""

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
    ("team",       "Join the team", "Team & Open Roles — Cube.Design",
     "How the design team is shaped, what we screen for, and what is open."),
    ("internal",   "Internal",   "Internal — Cube.Design",
     "Tools, reading and internal builds. Staff only."),
]

# Built, but kept out of the menu. "internal" is reached through the footer
# login; "craft" still lives at craft.html and is referenced from Process.
HIDDEN = {"internal", "craft"}

# Guarded by INTERNAL_PASSWORD rather than SITE_PASSWORD.
INTERNAL_PAGES = {"internal"}

# Pages that scroll sideways. A rail page is one viewport tall and many wide:
# <main> becomes a flex row of full-height panels and a vertical wheel is mapped
# onto the x-axis. These pages load rail.css / rail.js on top of the usual pair;
# everything else is untouched and still scrolls normally.
RAIL = {"philosophy", "principles", "process"}


RAIL_CSS = '<link rel="stylesheet" href="assets/css/rail.css?v={v}">'
RAIL_JS = '<script src="assets/js/rail.js?v={v}"></script>'


def nav_html(current):
    """The pill drop-down. Single source of truth for site navigation."""
    rows = []
    visible = [p for p in PAGES if p[0] not in HIDDEN]
    for i, (slug, label, _, _) in enumerate(visible):
        cur = ' aria-current="page"' if slug == current else ""
        rows.append(
            f'  <a href="{slug}.html"{cur}>{label} <small>{i:02d}</small></a>'
        )
    return "\n".join(rows)


def asset_version():
    """Short hash of the CSS+JS, appended to their URLs so a rebuild always
    busts the browser cache. Without this an edited stylesheet can sit
    invisible behind a cached copy."""
    h = hashlib.sha256()
    for rel in ("css/site.css", "js/site.js",
                "css/rail.css", "js/rail.js"):
        h.update((ROOT / "assets" / rel).read_bytes())
    return h.hexdigest()[:8]


def lock_mode(slug):
    """Which gate guards a page: the internal code, nothing (menu asks), or
    the site passphrase on arrival."""
    if slug in INTERNAL_PAGES:
        return "internal"
    return "menu" if slug in PUBLIC else "auto"


def page_mode(slug):
    """Scroll axis for a page: "rail" (sideways) or "page" (the normal way)."""
    return "rail" if slug in RAIL else "page"


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
                .replace("{{RAIL_CSS}}", RAIL_CSS.format(v=version) if slug in RAIL else "")
                .replace("{{RAIL_JS}}", RAIL_JS.format(v=version) if slug in RAIL else "")
                .replace("{{ASSET_V}}", version)
                .replace("{{YEAR}}", str(year)))
        (DIST / f"{slug}.html").write_text(html, encoding="utf-8")
        print(f"  +  dist/{slug}.html")

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
