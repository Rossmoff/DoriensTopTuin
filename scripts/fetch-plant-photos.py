#!/usr/bin/env python3
"""
Fetch a small, freely licensed photo for every builtin plant from Wikimedia Commons.

  python3 -I scripts/fetch-plant-photos.py [--only id1,id2] [--force]

For each plant it looks up the Wikipedia article (Latin name for ornamentals, English name for
edibles, then fallbacks), takes the article's lead image (free licences only), and stores:
  public/plants/<id>.webp     160×160 centre-cropped thumbnail
  src/data/plantPhotos.json   credits: author, licence, source page (shown in the app)

Re-running skips plants that already have a photo unless --force is given. Raw downloads are
decoded with Pillow and re-encoded; nothing downloaded is executed.
"""
import html
import io
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PLANTS = ROOT / 'src/data/plants.json'
CREDITS = ROOT / 'src/data/plantPhotos.json'
OUT_DIR = ROOT / 'public/plants'
SIZE = 160
UA = 'garden-planner-thumbnail-script/1.0'
EDIBLE_CATS = {'vegetable', 'herb', 'fruit'}

# Article titles that work better than the plant's names.
OVERRIDES = {
    'rhododendron-hybrid': ['Rhododendron'],
    'hosta': ['Hosta'],
    'narcissus': ['Narcissus (plant)'],
    'apple': ['Apple'],
    'pear': ['Pear'],
    'blackberry': ['Blackberry'],
    'rosa-new-dawn': ['Rosa \'New Dawn\'', 'Climbing rose', 'Rose'],
    'geranium-rozanne': ['Geranium \'Rozanne\'', 'Geranium wallichianum', 'Geranium'],
    'allium-purple-sensation': ['Allium hollandicum', 'Allium'],
    'calamagrostis-acutiflora': ['Calamagrostis × acutiflora', 'Calamagrostis'],
    'hypericum-hidcote': ['Hypericum \'Hidcote\'', 'Hypericum'],
    'malus-evereste': ['Malus \'Evereste\'', 'Malus'],
    'cornus-alba': ['Cornus alba'],
    'epimedium-versicolor': ['Epimedium × versicolor', 'Epimedium'],
    'helleborus-orientalis': ['Helleborus orientalis', 'Helleborus × hybridus'],
    'sweet-pepper': ['Bell pepper', 'Capsicum annuum'],
    'french-bean': ['Phaseolus vulgaris', 'Green bean'],
    'broad-bean': ['Vicia faba'],
    'runner-bean': ['Phaseolus coccineus'],
    'pak-choi': ['Bok choy'],
    'lambs-lettuce': ['Valerianella locusta'],
    'chard': ['Chard'],
    'beetroot': ['Beetroot'],
    'fennel': ['Florence fennel', 'Fennel'],
    'endive': ['Endive'],
    'thyme': ['Thymus vulgaris'],
    'sage': ['Salvia officinalis'],
    'mint': ['Mentha spicata'],
    'rosemary': ['Salvia rosmarinus', 'Rosemary'],
    'hazelnut': ['Corylus avellana'],
    'strawberry': ['Garden strawberry'],
    'raspberry': ['Rubus idaeus'],
    'blueberry': ['Vaccinium corymbosum'],
    'asparagus': ['Asparagus', 'White asparagus', 'Asparagus officinalis'],
}

CACHE = ROOT / 'node_modules/.cache/plant-photos-api.json'


def clean(name: str) -> str:
    name = re.sub(r"'[^']*'", '', name)
    name = re.sub(r'\([^)]*\)', '', name)
    return re.sub(r'\s+', ' ', name).strip()


def candidates(p: dict) -> list[str]:
    en, latin = clean(p['names']['en']), clean(p['names']['latin'])
    en = re.sub(r'^(Thornless|Highbush|Garden|Common) ', '', en) if p['category'] in EDIBLE_CATS else en
    order = [en, latin] if p['category'] in EDIBLE_CATS else [latin, en]
    genus = latin.split(' ')[0] if latin else ''
    out = OVERRIDES.get(p['id'], []) + order + [genus]
    seen, res = set(), []
    for t in out:
        if t and t not in seen:
            seen.add(t)
            res.append(t)
    return res


def get(url: str, params: dict | None = None, binary=False):
    if params:
        url = f'{url}?{urllib.parse.urlencode(params)}'
    delay = 20
    for attempt in range(8):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                data = r.read()
                return data if binary else json.loads(data)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504):
                wait = int(e.headers.get('Retry-After') or delay)
                print(f'  HTTP {e.code}, waiting {wait}s (attempt {attempt + 1})', flush=True)
                time.sleep(wait)
                delay = min(delay * 2, 300)
                continue
            raise
        except urllib.error.URLError as e:
            print(f'  network error {e}, waiting {delay}s', flush=True)
            time.sleep(delay)
            delay = min(delay * 2, 300)
    raise RuntimeError(f'giving up on {url}')


def page_images(titles: list[str]) -> dict[str, str]:
    """Article title → lead image file name (free licences only)."""
    found: dict[str, str] = {}
    for i in range(0, len(titles), 50):
        batch = titles[i:i + 50]
        data = get('https://en.wikipedia.org/w/api.php', {
            'action': 'query', 'format': 'json', 'formatversion': 2, 'redirects': 1,
            'prop': 'pageimages', 'piprop': 'name', 'pilicense': 'free', 'titles': '|'.join(batch),
        })
        q = data.get('query', {})
        back = {}
        for n in q.get('normalized', []):
            back[n['to']] = n['from']
        for r in q.get('redirects', []):
            back[r['to']] = back.get(r['from'], r['from'])
        for page in q.get('pages', []):
            if page.get('pageimage'):
                t = page['title']
                found[back.get(t, t)] = page['pageimage']
        time.sleep(1.5)
    return found


def strip_html(s: str) -> str:
    s = re.sub(r'<[^>]+>', '', s or '')
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def file_info(files: list[str]) -> dict[str, dict]:
    info: dict[str, dict] = {}
    for i in range(0, len(files), 50):
        batch = files[i:i + 50]
        data = get('https://commons.wikimedia.org/w/api.php', {
            'action': 'query', 'format': 'json', 'formatversion': 2,
            'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': 400,
            'titles': '|'.join(f'File:{f}' for f in batch),
        })
        q = data.get('query', {})
        back = {n['to']: n['from'] for n in q.get('normalized', [])}
        for page in q.get('pages', []):
            ii = (page.get('imageinfo') or [None])[0]
            if not ii:
                continue
            meta = ii.get('extmetadata', {})
            title = back.get(page['title'], page['title'])
            info[title.removeprefix('File:')] = {
                'thumb': ii.get('thumburl') or ii.get('url'),
                'source': ii.get('descriptionurl'),
                'author': strip_html(meta.get('Artist', {}).get('value', ''))[:100] or 'unknown',
                'license': strip_html(meta.get('LicenseShortName', {}).get('value', '')) or 'see source',
                'licenseUrl': meta.get('LicenseUrl', {}).get('value', ''),
            }
        time.sleep(1.5)
    return info


def image_url(thumb: str) -> str:
    """Commons may hand out thumb.wikimedia.org URLs with tracking parameters; the same file is
    served from upload.wikimedia.org under the same path."""
    u = urllib.parse.urlsplit(html.unescape(thumb))
    return urllib.parse.urlunsplit(('https', 'upload.wikimedia.org', u.path, '', ''))


def load_cache() -> dict:
    return json.loads(CACHE.read_text()) if CACHE.exists() else {'pages': {}, 'files': {}}


def save_cache(c: dict) -> None:
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(c))


def make_thumb(raw: bytes, dest: Path) -> None:
    im = Image.open(io.BytesIO(raw))
    im.load()
    im = im.convert('RGB')
    w, h = im.size
    s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((SIZE, SIZE), Image.LANCZOS)
    im.save(dest, 'WEBP', quality=72, method=6)


def main() -> None:
    force = '--force' in sys.argv
    only = None
    if '--only' in sys.argv:
        only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
    plants = json.loads(PLANTS.read_text())['plants']
    credits = json.loads(CREDITS.read_text()) if CREDITS.exists() else {}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    todo = [p for p in plants if (only is None or p['id'] in only) and (force or p['id'] not in credits or not (OUT_DIR / f"{p['id']}.webp").exists())]
    print(f'{len(todo)} plants to fetch', flush=True)

    cache = load_cache()
    chosen: dict[str, str] = {}
    pending = {p['id']: candidates(p) for p in todo}
    level = 0
    while pending and level < 6:
        titles = sorted({c[level] for c in pending.values() if len(c) > level})
        if not titles:
            break
        new = [t for t in titles if t not in cache['pages']]
        if new:
            got = page_images(new)
            for t in new:
                cache['pages'][t] = got.get(t)
            save_cache(cache)
        imgs = {t: cache['pages'][t] for t in titles if cache['pages'].get(t)}
        for pid in list(pending):
            c = pending[pid]
            if len(c) > level and c[level] in imgs:
                chosen[pid] = imgs[c[level]]
                del pending[pid]
        level += 1
    print(f'images found for {len(chosen)}; none for: {sorted(pending)}', flush=True)

    need = sorted(f for f in set(chosen.values()) if f not in cache['files'])
    if need:
        cache['files'].update(file_info(need))
        save_cache(cache)
    infos = cache['files']
    for n, (pid, fname) in enumerate(sorted(chosen.items())):
        info = infos.get(fname)
        if not info or not info['thumb']:
            print(f'  {pid}: no Commons info for {fname}', flush=True)
            continue
        try:
            raw = get(image_url(info['thumb']), binary=True)
            make_thumb(raw, OUT_DIR / f'{pid}.webp')
        except Exception as e:  # noqa: BLE001
            print(f'  {pid}: failed ({e})', flush=True)
            continue
        credits[pid] = {
            'file': f'{pid}.webp',
            'title': fname,
            'author': info['author'],
            'license': info['license'],
            'licenseUrl': info['licenseUrl'],
            'source': info['source'],
        }
        CREDITS.write_text(json.dumps(dict(sorted(credits.items())), ensure_ascii=False, indent=1) + '\n')
        print(f'  [{n + 1}/{len(chosen)}] {pid} ← {fname} ({info["license"]})', flush=True)
        time.sleep(1.0)
    missing = [p['id'] for p in plants if p['id'] not in credits]
    print(f'DONE. {len(credits)} plants have photos; missing: {missing}', flush=True)


if __name__ == '__main__':
    main()
