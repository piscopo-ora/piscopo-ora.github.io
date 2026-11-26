#!/usr/bin/env python3
"""Legge i feed pubblici di YouTube e Substack e scrive dati/feed.json.

Gira ogni ora su GitHub Actions (.github/workflows/feed.yml). Solo libreria
standard. Se un feed non risponde, tiene gli ultimi contenuti già salvati
per quella piattaforma invece di svuotare la sezione.
"""
import html, json, re, sys, urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone
from pathlib import Path

FEEDS = {
    "youtube": "https://www.youtube.com/feeds/videos.xml?channel_id=UCVyjGPBtp_o-oMNBOOORtew",
    "substack": "https://vincenzoclaudiopiscopo.substack.com/feed",
}
PER_SOURCE = 6
OUT = Path(__file__).resolve().parent.parent / "dati" / "feed.json"
NS = {
    "a": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
    "content": "http://purl.org/rss/1.0/modules/content/",
}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (piscopo-ora feed)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def clean(text, n=220):
    text = re.sub(r"<[^>]+>", " ", html.unescape(text or ""))
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= n else text[: n - 1].rsplit(" ", 1)[0] + "…"


def iso(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_youtube(raw):
    root = ET.fromstring(raw)
    items = []
    for e in root.findall("a:entry", NS):
        vid = e.findtext("yt:videoId", "", NS)
        link = e.find("a:link[@rel='alternate']", NS)
        url = link.get("href") if link is not None else f"https://www.youtube.com/watch?v={vid}"
        group = e.find("media:group", NS)
        desc = group.findtext("media:description", "", NS) if group is not None else ""
        items.append({
            "src": "youtube",
            "kind": "Short" if "/shorts/" in url else "Video",
            "title": clean(e.findtext("a:title", "", NS), 140),
            "url": url,
            "date": iso(datetime.fromisoformat(e.findtext("a:published", "", NS).replace("Z", "+00:00"))),
            "thumb": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg" if vid else "",
            "text": clean(desc),
        })
    return items


def parse_substack(raw):
    root = ET.fromstring(raw)
    items = []
    for it in root.findall("./channel/item"):
        enc = it.find("enclosure")
        thumb = enc.get("url") if enc is not None and (enc.get("type") or "").startswith("image") else ""
        if not thumb:
            m = re.search(r'<img[^>]+src="([^"]+)"', it.findtext("content:encoded", "", NS))
            thumb = m.group(1) if m else ""
        items.append({
            "src": "substack",
            "kind": "Articolo",
            "title": clean(it.findtext("title", ""), 140),
            "url": it.findtext("link", "").strip(),
            "date": iso(parsedate_to_datetime(it.findtext("pubDate", ""))),
            "thumb": thumb,
            "text": clean(it.findtext("description", "")),
        })
    return items


PARSERS = {"youtube": parse_youtube, "substack": parse_substack}


def main(local=None):
    try:
        old = json.loads(OUT.read_text(encoding="utf-8")).get("items", [])
    except Exception:
        old = []
    items, errors = [], []
    for src, url in FEEDS.items():
        try:
            raw = Path(local[src]).read_bytes() if local else fetch(url)
            got = PARSERS[src](raw)
        except Exception as ex:  # feed giù o cambiato: tengo il vecchio
            errors.append(f"{src}: {ex}")
            got = [i for i in old if i.get("src") == src]
        got.sort(key=lambda i: i["date"], reverse=True)
        items += got[:PER_SOURCE]
    items.sort(key=lambda i: i["date"], reverse=True)
    if items == old:
        print("Nessun contenuto nuovo.")
    else:
        OUT.write_text(json.dumps({"updated": iso(datetime.now(timezone.utc)), "items": items},
                                  ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"Scritti {len(items)} contenuti in {OUT}.")
    for e in errors:
        print("ATTENZIONE", e, file=sys.stderr)
    if errors and len(errors) == len(FEEDS) and not items:
        sys.exit(1)


if __name__ == "__main__":
    # Test locale: python3 scripts/feed.py youtube=yt.xml substack=ss.xml
    args = dict(a.split("=", 1) for a in sys.argv[1:])
    main(args or None)
