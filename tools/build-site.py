"""Build the public site and the shuffled photo catalog from photos/."""
from pathlib import Path
from hashlib import sha256
from io import BytesIO
import argparse
import json
import shutil
from PIL import Image, ImageOps

SUPPORTED = {'.jpg', '.jpeg', '.png', '.webp', '.avif'}
OBJECTS = ['rose-petal', 'white-petal', 'blue-tulip-petal', 'silver-key', 'brass-key']

def writeAsset(data, stem, suffix, output):
    name = stem + '-' + sha256(data).hexdigest()[:16] + suffix
    target = output / 'assets' / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return 'assets/' + name

def build(source, output):
    source, output = Path(source).resolve(), Path(output).resolve()
    if output == source or source in output.parents and output.name != 'site-dist':
        raise ValueError('Use a separate output directory or source/site-dist.')
    if output.exists() and any(output.iterdir()):
        raise ValueError('Output must be empty; use a new directory.')
    output.mkdir(parents=True, exist_ok=True)
    catalog = []
    for path in sorted((source / 'photos').rglob('*')):
        if path.suffix.lower() not in SUPPORTED or not path.is_file():
            continue
        with Image.open(path) as original:
            if getattr(original, 'is_animated', False):
                raise ValueError('Use a still photograph: ' + path.name)
            original.load()
            photo = ImageOps.exif_transpose(original)
            photo.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
            if photo.mode not in ('RGB', 'RGBA'):
                photo = photo.convert('RGBA' if 'transparency' in photo.info else 'RGB')
            if path.suffix.lower() == '.webp' and original.size == photo.size and not original.info.get('exif'):
                data = path.read_bytes()
            else:
                encoded = BytesIO()
                photo.save(encoded, 'WEBP', quality=88, method=6, exif=b'', xmp=b'')
                data = encoded.getvalue()
            src = writeAsset(data, 'photo', '.webp', output)
            catalog.append({'src': src, 'title': path.stem.replace('-', ' '), 'ratio': photo.width / photo.height})
    if not catalog:
        raise ValueError('Add at least one photograph to photos/.')
    script = (source / 'home' / 'motion.js').read_text(encoding='utf-8') + '\n' + (source / 'home' / 'scan.js').read_text(encoding='utf-8')
    script = script.replace('PHOTO-CATALOG', json.dumps(catalog, ensure_ascii=False))
    for name in OBJECTS:
        path = source / 'home' / 'objects' / (name + '.webp')
        with Image.open(path) as im:
            if im.mode != 'RGBA' or im.getchannel('A').getextrema() != (0, 255):
                raise ValueError('Object must retain transparency: ' + name)
        script = script.replace('OBJECT-' + name, writeAsset(path.read_bytes(), name, '.webp', output))
    scriptUrl = writeAsset(script.encode('utf-8'), 'scan', '.js', output)
    styleUrl = writeAsset((source / 'home' / 'scan.css').read_bytes(), 'scan', '.css', output)
    html = (source / 'index.html').read_text(encoding='utf-8')
    html = html.replace('SCAN-STYLESHEET', styleUrl).replace('SCAN-SCRIPT', scriptUrl)
    (output / 'index.html').write_text(html, encoding='utf-8', newline='\n')
    (output / 'photos.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8', newline='\n')
    for name in ('CNAME', 'robots.txt', '.nojekyll'):
        shutil.copy2(source / name, output / name)
    shutil.copytree(source / 'thesis', output / 'thesis')
    print(json.dumps({'photos': len(catalog), 'objects': len(OBJECTS), 'output': str(output)}, ensure_ascii=False))
    return catalog

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    build(args.source, args.output)
