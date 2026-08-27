#!/usr/bin/env python3
"""Build brand/banner.png (1500x500) + brand/avatar.png (1024x1024) for X.

Source of truth for the social assets (supersedes banner.svg/avatar.svg).
Real frames only: the banner contact sheet uses the same public/demo mug
generations as the site hero, with their true seeds and per-frame costs.

Usage: python3 brand/build-social.py [outdir]
Needs Google Chrome (headless render) + sips (downscale). Repo-relative.
"""
import base64
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "brand"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Photo-studio tokens (src/index.css) — light print + film negative
PAPER, CARD, INK = "#F3EFE6", "#FFFDF6", "#241F18"
MUTED, SHEET_MUTED, SHEET_FAINT = "#5C5344", "#8A7C5E", "#A89C82"
ACCENT, MARK = "#D23B2E", "#E8483A"
NEG_BG, NEG_INK = "#26211A", "#F0EBDD"

# The grease-pencil keeper ellipse (src/components/landing/HeroSheet.tsx)
KEEPER_PATH = "M50 8 C 82 4, 98 24, 94 52 C 90 82, 60 98, 32 92 C 8 86, 0 60, 8 36 C 16 14, 34 6, 62 8"
# The loom mark loop (src/components/Logo.tsx)
LOGO_LOOP = "M21.2 15.2 C 27.5 16.5, 28.5 24.5, 21.5 26.2 C 14.5 27.8, 12.5 21, 16 17.5 C 18 15.5, 20 14.8, 22.5 15.6"


def b64(path: pathlib.Path, mime: str) -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


FONT = b64(ROOT / "public/fonts/newsreader-latin-wght-normal.woff2", "font/woff2")

# Two real rows from the 2026-07-07 mug shoot; seeds/costs are the true
# values pinned in HeroSheet.tsx. Keeper = the flux2 s2 take.
ROWS = [
    ("FLX2 DEV", "$.012", ["mug-flux2-a", "mug-flux2-b", "mug-flux2-c"]),
    ("SCHNELL", "$.003", ["mug-schnell2-a", "mug-schnell2-b", "mug-schnell2-c"]),
]
SEEDS = ["524875", "935381", "760110"]
KEEPER = "mug-flux2-b"
EDGE = {0: ["01", "01A", "01B"], 1: ["02", "02A", "02B"]}


def logo_svg(px: int, ink: str, loop: str, stroke: float, loop_w: float,
             loop_scale: float = 1.0) -> str:
    # loop_scale grows the grease loop about the keeper cell's center so it
    # rings around the filled square instead of covering it (avatar scale).
    xf = (f'transform="translate(20.75 20.75) scale({loop_scale}) translate(-20.75 -20.75)"'
          if loop_scale != 1.0 else "")
    return f'''<svg width="{px}" height="{px}" viewBox="0 0 28 28" style="overflow:visible">
      <rect x="2" y="2" width="10.5" height="10.5" rx="2.5" fill="none" stroke="{ink}" stroke-width="{stroke}"/>
      <rect x="15.5" y="2" width="10.5" height="10.5" rx="2.5" fill="none" stroke="{ink}" stroke-width="{stroke}"/>
      <rect x="2" y="15.5" width="10.5" height="10.5" rx="2.5" fill="none" stroke="{ink}" stroke-width="{stroke}"/>
      <rect x="15.5" y="15.5" width="10.5" height="10.5" rx="2.5" fill="{ink}"/>
      <g {xf}><path d="{LOGO_LOOP}" fill="none" stroke="{loop}" stroke-width="{loop_w}" stroke-linecap="round"/></g>
    </svg>'''


def banner_html() -> str:
    cells = []
    for r, (label, price, frames) in enumerate(ROWS):
        row_cells = []
        for c, name in enumerate(frames):
            img = b64(ROOT / f"public/demo/{name}.webp", "image/webp")
            keeper_overlay = (
                f'<svg viewBox="0 0 100 100" style="position:absolute;inset:-7px;width:calc(100% + 14px);height:calc(100% + 14px);transform:rotate(-3deg)">'
                f'<path d="{KEEPER_PATH}" fill="none" stroke="{MARK}" stroke-width="6.5" stroke-linecap="round" opacity=".92"/></svg>'
                if name == KEEPER else ""
            )
            code = EDGE[r][c]
            tag = (
                f'<span style="color:{ACCENT};font-weight:700;letter-spacing:.14em">KEEPER</span>'
                if name == KEEPER else code
            )
            row_cells.append(
                f'<td style="padding:0 5px 0 0;vertical-align:top">'
                f'<div style="position:relative;width:132px;height:132px">'
                f'<img src="{img}" style="width:132px;height:132px;object-fit:cover;border:1px solid rgba(50,42,32,.28);border-radius:3px;display:block"/>'
                f'{keeper_overlay}</div>'
                f'<div style="display:flex;justify-content:space-between;width:132px;font-size:10.5px;color:{SHEET_FAINT};padding-top:4px">'
                f'<span>{tag}</span><span>{price}</span></div></td>'
            )
        cells.append(
            f'<tr><td style="width:70px;vertical-align:top;padding-top:52px">'
            f'<div style="font-size:11px;letter-spacing:.1em;color:{SHEET_MUTED}">{label}</div>'
            f'<div style="font-size:10px;color:{SHEET_FAINT};padding-top:3px">{price}/img</div></td>'
            + "".join(row_cells) + "</tr>"
        )
    seed_head = "".join(
        f'<td style="font-size:10.5px;letter-spacing:.08em;color:{SHEET_FAINT};padding:0 5px 6px 0">SEED {s}</td>'
        for s in SEEDS
    )
    return f'''<!doctype html><meta charset="utf-8"><style>
    @font-face {{ font-family: Newsreader; font-weight: 200 800; font-display: block;
      src: url({FONT}) format("woff2-variations"); }}
    * {{ margin: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }}
    body {{ width: 1500px; height: 500px; background: {PAPER}; overflow: hidden;
      font-family: "JetBrains Mono", Menlo, monospace; position: relative; }}
    </style><body>
    <div style="position:absolute;left:110px;top:104px;display:flex;align-items:center;gap:26px">
      {logo_svg(74, INK, ACCENT, 2, 2.2)}
      <div style="font-family:Newsreader,serif;font-weight:560;font-size:96px;letter-spacing:-.015em;color:{INK};line-height:1">Gridloom</div>
    </div>
    <div style="position:absolute;left:112px;top:248px;font-size:23px;color:{MUTED}">shoot the whole roll. circle the keeper.</div>
    <div style="position:absolute;left:112px;top:292px;font-size:23px;color:{ACCENT}">gridloom.app</div>
    <div style="position:absolute;right:60px;top:40px;width:544px;height:420px;background:{CARD};
      border:1px solid rgba(50,42,32,.18);border-radius:6px;transform:rotate(-1.1deg);
      box-shadow:0 18px 40px -22px rgba(60,48,24,.4);padding:16px 20px">
      <div style="display:flex;justify-content:space-between;font-size:12.5px;letter-spacing:.14em;color:{SHEET_MUTED};padding-bottom:12px">
        <span>GRIDLOOM · CONTACT SHEET 001</span><span>6 FRAMES · $0.045</span>
      </div>
      <table style="border-collapse:collapse"><tr><td></td>{seed_head}</tr>{"".join(cells)}</table>
    </div>
    </body>'''


def og_html() -> str:
    """1200x630 link-card image (og:image + twitter:image, index.html).
    Unfurls under every gridloom.app link, so: real frames, big type."""
    rows = [
        ("FLX2 DEV", "$.012", ["mug-flux2-a", "mug-flux2-b"]),
        ("SCHNELL", "$.003", ["mug-schnell2-a", "mug-schnell2-b"]),
    ]
    edge = {0: ["01", "01A"], 1: ["02", "02A"]}
    cells = []
    for r, (label, price, frames) in enumerate(rows):
        row_cells = []
        for c, name in enumerate(frames):
            img = b64(ROOT / f"public/demo/{name}.webp", "image/webp")
            keeper_overlay = (
                f'<svg viewBox="0 0 100 100" style="position:absolute;inset:-10px;width:calc(100% + 20px);height:calc(100% + 20px);transform:rotate(-3deg)">'
                f'<path d="{KEEPER_PATH}" fill="none" stroke="{MARK}" stroke-width="6.5" stroke-linecap="round" opacity=".92"/></svg>'
                if name == KEEPER else ""
            )
            tag = (
                f'<span style="color:{ACCENT};font-weight:700;letter-spacing:.14em">KEEPER</span>'
                if name == KEEPER else edge[r][c]
            )
            row_cells.append(
                f'<td style="padding:0 7px 0 0;vertical-align:top">'
                f'<div style="position:relative;width:196px;height:196px">'
                f'<img src="{img}" style="width:196px;height:196px;object-fit:cover;border:1px solid rgba(50,42,32,.28);border-radius:3px;display:block"/>'
                f'{keeper_overlay}</div>'
                f'<div style="display:flex;justify-content:space-between;width:196px;font-size:13px;color:{SHEET_FAINT};padding-top:5px">'
                f'<span>{tag}</span><span>{price}</span></div></td>'
            )
        cells.append(
            f'<tr><td style="width:78px;vertical-align:top;padding-top:80px">'
            f'<div style="font-size:13px;letter-spacing:.1em;color:{SHEET_MUTED}">{label}</div>'
            f'<div style="font-size:12px;color:{SHEET_FAINT};padding-top:3px">{price}/img</div></td>'
            + "".join(row_cells) + "</tr>"
        )
    seed_head = "".join(
        f'<td style="font-size:12.5px;letter-spacing:.08em;color:{SHEET_FAINT};padding:0 7px 8px 0">SEED {s}</td>'
        for s in SEEDS[:2]
    )
    return f'''<!doctype html><meta charset="utf-8"><style>
    @font-face {{ font-family: Newsreader; font-weight: 200 800; font-display: block;
      src: url({FONT}) format("woff2-variations"); }}
    * {{ margin: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }}
    body {{ width: 1200px; height: 630px; background: {PAPER}; overflow: hidden;
      font-family: "JetBrains Mono", Menlo, monospace; position: relative; }}
    </style><body>
    <div style="position:absolute;left:84px;top:104px;display:flex;align-items:center;gap:24px">
      {logo_svg(64, INK, ACCENT, 2, 2.2)}
      <div style="font-family:Newsreader,serif;font-weight:560;font-size:92px;letter-spacing:-.015em;color:{INK};line-height:1">Gridloom</div>
    </div>
    <div style="position:absolute;left:86px;top:262px;font-size:31px;line-height:1.55;color:{MUTED}">shoot the whole roll.<br/><span style="color:{ACCENT}">circle the keeper.</span></div>
    <div style="position:absolute;left:86px;top:412px;font-size:20px;line-height:1.7;color:{SHEET_MUTED}">a photo studio for ai images<br/>your keys, provider prices, no subscription</div>
    <div style="position:absolute;left:86px;top:520px;font-size:25px;color:{INK};font-weight:700">gridloom.app</div>
    <div style="position:absolute;right:52px;top:38px;width:518px;height:554px;background:{CARD};
      border:1px solid rgba(50,42,32,.18);border-radius:6px;transform:rotate(-1.2deg);
      box-shadow:0 18px 40px -22px rgba(60,48,24,.4);padding:20px 22px">
      <div style="display:flex;justify-content:space-between;font-size:14px;letter-spacing:.14em;color:{SHEET_MUTED};padding-bottom:14px">
        <span>GRIDLOOM · CONTACT SHEET 001</span><span>$0.03</span>
      </div>
      <table style="border-collapse:collapse"><tr><td></td>{seed_head}</tr>{"".join(cells)}</table>
    </div>
    </body>'''


def avatar_html() -> str:
    return f'''<!doctype html><meta charset="utf-8"><style>
    * {{ margin: 0; }}
    body {{ width: 1024px; height: 1024px; background: {NEG_BG};
      display: flex; align-items: center; justify-content: center; overflow: hidden; }}
    </style><body>{logo_svg(640, NEG_INK, MARK, 2.7, 2.4, loop_scale=1.25)}</body>'''


def render(html: str, w: int, h: int, out: pathlib.Path, downscale: int | None = None) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
        f.write(html)
        src = f.name
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         "--force-device-scale-factor=2", f"--window-size={w},{h}",
         "--virtual-time-budget=4000", "--run-all-compositor-stages-before-draw",
         f"--screenshot={out}", f"file://{src}"],
        check=True, capture_output=True,
    )
    if downscale:
        subprocess.run(["sips", "--resampleWidth", str(downscale), str(out)],
                       check=True, capture_output=True)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    render(banner_html(), 1500, 500, OUT / "banner.png", downscale=1500)
    render(avatar_html(), 1024, 1024, OUT / "avatar.png", downscale=1024)
    render(og_html(), 1200, 630, ROOT / "public/og.png", downscale=1200)
    print(f"built {OUT}/banner.png (1500x500) + {OUT}/avatar.png (1024x1024) + public/og.png (1200x630)")
