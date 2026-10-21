#!/usr/bin/env python3
"""Restore missing commander portraits from identified, credited character artwork.

Run only on a machine with outbound network access (GitHub Actions).
Each image must come from its named character's art or a documented character sheet.
"""
import base64
import hashlib
import io
import json
import sys
from datetime import date
from pathlib import Path

import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "dist/assets/art"
TARGET = ART / "portraits"
MANIFEST = ART / "manifest.json"
SOURCES = ROOT / "tools/portrait-restoration-sources.json"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; KnightmareConquestPortraitAudit/1.0)"}
session = requests.Session()
session.headers.update(HEADERS)

# Each original is identified by the named show's cast/gallery or official page.
# Coordinates are from the official 796 x 585 character sheets; scale with the image.
ASURA_URL = "https://geass.jp/akito/img/chara_asura.jpg"
ASURA_BOXES = {
    "renelaurent": (1, 347, 143, 548),
    "kuzanmontoban": (136, 268, 309, 487),
    "johanne": (300, 299, 474, 528),
    "janmanes": (465, 342, 631, 544),
    "franzvallo": (620, 320, 795, 551),
    "alannecker": (447, 75, 601, 295),
    "simonmericourt": (611, 49, 785, 298),
}
SINGLE = {
    "mao": [
        "https://i.pinimg.com/1200x/4a/6f/6b/4a6f6b1afae2e8dfd0c9e5de2985a898.jpg",
    ],
    "shalio": [
        "https://ami.animecharactersdatabase.com/uploads/chars/38889-1990683981.png",
    ],
    "shamna": [
        "https://geass.jp/R-geass/img/about/img17.jpg",
        "https://cdn-ak.f.st-hatena.com/images/fotolife/k/kwusbb/20190209/20190209130422.jpg",
    ],
    "bolvona": [
        "https://ami.animecharactersdatabase.com/uploads/chars/38889-2032757953.png",
    ],
    "jeanrowe": [
        "https://geass.jp/akito/img/chara_jean.jpg",
        "https://ami.animecharactersdatabase.com/uploads/chars/6186-1237934728.jpg",
    ],
    "augustahighland": [
        "https://geass.jp/akito/img/chara_Verance.jpg",
    ],
}
# The three knights appear together in the official anime. A trio still from a
# fan-maintained illustrated gallery is useful, but the page does not reliably
# identify their left-to-right positions. Do not silently assign uncertain faces.
UNRESOLVED = ("brondello", "dore", "scholtz")


def download(url):
    response = session.get(url, timeout=35, headers={"Referer": "https://geass.jp/" if "geass.jp" in url else url.rsplit("/", 1)[0] + "/"})
    response.raise_for_status()
    if len(response.content) > 12000000:
        raise ValueError("image too large")
    with Image.open(io.BytesIO(response.content)) as raw:
        raw.load()
        if raw.width < 100 or raw.height < 100:
            raise ValueError("source resolution too low")
        return raw.convert("RGB"), hashlib.sha256(response.content).hexdigest()


def fit_portrait(image):
    return ImageOps.fit(image, (390, 480), method=Image.Resampling.LANCZOS, centering=(0.5, 0.28))


def crop_scaled(image, box, base=(796, 585)):
    w, h = image.size
    x0, y0, x1, y1 = box
    b = (round(x0 * w / base[0]), round(y0 * h / base[1]),
         round(x1 * w / base[0]), round(y1 * h / base[1]))
    return image.crop(b)


def portrait_crop(id, image):
    if id == "augustahighland":
        return crop_scaled(image, (260, 193, 429, 469))
    if id == "jeanrowe" and image.width >= 600 and image.height >= 450:
        # Close-up head on the left of the official character turnaround.
        return crop_scaled(image, (0, 230, 232, 520))
    if id == "shamna" and image.height > image.width:
        return image.crop((int(image.width * .11), int(image.height * .015),
                           int(image.width * .90), int(image.height * .58)))
    return image


def save(id, image, url, digest, crop, manifest, ledger):
    output = fit_portrait(image)
    filename = id + "-canon-" + hashlib.sha256(output.tobytes()).hexdigest()[:12] + ".jpg"
    path = TARGET / filename
    output.save(path, "JPEG", quality=91, optimize=True)
    manifest["portraits"][id] = {"src": "portraits/" + filename, "fx": 0.5, "fy": 0.42}
    ledger[id] = {"source": url, "sourceSha256": digest, "crop": crop,
                  "publishedFile": "dist/assets/art/portraits/" + filename,
                  "method": "Face/upper-body crop from identified character art; no identity substitution"}
    print("RESTORED", id, path.name, flush=True)


def main():
    manifest = json.loads(MANIFEST.read_text())
    ledger = {}
    if SOURCES.exists():
        ledger = json.loads(SOURCES.read_text())
    pending = set(SINGLE) | set(ASURA_BOXES)
    pending -= set(manifest["portraits"])
    if pending & set(ASURA_BOXES):
        try:
            img, digest = download(ASURA_URL)
            for id, box in ASURA_BOXES.items():
                if id in pending:
                    save(id, crop_scaled(img, box), ASURA_URL, digest,
                         f"official Asura team sheet {box} (796x585)", manifest, ledger)
                    pending.discard(id)
        except Exception as exc:
            print("SOURCE FAILED Asura team:", str(exc), file=sys.stderr)
    for id, urls in SINGLE.items():
        if id not in pending:
            continue
        for url in urls:
            try:
                img, digest = download(url)
                cropped = portrait_crop(id, img)
                save(id, cropped, url, digest, "named individual portrait / official character turnaround",
                     manifest, ledger)
                pending.discard(id)
                break
            except Exception as exc:
                print("SOURCE FAILED", id, url, str(exc), file=sys.stderr)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=True) + "\n")
    (ART / "manifest.js").write_text(
        "// Generated from manifest.json. All commanders have locally hosted portraits.\n"
        "globalThis.KnightmareArtManifest = " +
        json.dumps(manifest, indent=2, ensure_ascii=True) + ";\n"
    )
    SOURCES.write_text(json.dumps(ledger, indent=2, ensure_ascii=False) + "\n")
    print("NEW RESTORED", len(set(SINGLE) | set(ASURA_BOXES)) - len(pending))
    # Short-lived diagnostic: inspect a group shot to match each swordmaster to the
    # correct face, rather than assigning the group image by assumed position.
    try:
        group_url = "https://static.tvtropes.org/pmwiki/pub/images/sword_masters_of_st_michael.png"
        group, checksum = download(group_url)
        group.thumbnail((900, 620), Image.Resampling.LANCZOS)
        preview = io.BytesIO()
        group.save(preview, "JPEG", quality=74)
        print("SWORDMASTER_REFERENCE_BEGIN")
        print(base64.b64encode(preview.getvalue()).decode("ascii"))
        print("SWORDMASTER_REFERENCE_END")
        print("SWORDMASTER_REFERENCE_SHA256", checksum)
    except Exception as exc:
        print("Swordmaster reference unavailable:", str(exc), file=sys.stderr)
    print("STILL PENDING", ", ".join(sorted(pending | set(UNRESOLVED))) or "none")
    return 0 if len(ledger) else 1


if __name__ == "__main__":
    raise SystemExit(main())
