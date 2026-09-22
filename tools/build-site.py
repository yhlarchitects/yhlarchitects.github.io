"""Build the public site and responsive assets from photos/."""
from pathlib import Path
from hashlib import sha256
from io import BytesIO
import argparse
import json
import re
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

def webImage(image, edge, quality, stem, output):
    image = image.copy()
    image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
    encoded = BytesIO()
    image.save(encoded, 'WEBP', quality=quality, method=6, exif=b'', xmp=b'')
    return writeAsset(encoded.getvalue(), stem, '.webp', output)

def build(source, output):
    source, output = Path(source).resolve(), Path(output).resolve()
    if output == source or source in output.parents and output.name != 'site-dist':
        raise ValueError('Use a separate output directory or source/site-dist.')
    if output.exists() and any(output.iterdir()):
        raise ValueError('Output must be empty; use a new directory.')
    output.mkdir(parents=True, exist_ok=True)
    # Preserve immutable asset URLs referenced by previously cached HTML/JavaScript.
    for asset in sorted((source / 'home' / 'compat-assets').iterdir()):
        if not re.fullmatch(r'[a-z0-9-]+-[0-9a-f]{16}\.(webp|js|css)', asset.name):
            raise ValueError('Unexpected compatibility asset: ' + asset.name)
        target = output / 'assets' / asset.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(asset, target)
    catalog = []
    for path in sorted((source / 'photos').rglob('*')):
        if path.suffix.lower() not in SUPPORTED or not path.is_file():
            continue
        with Image.open(path) as original:
            if getattr(original, 'is_animated', False):
                raise ValueError('Use a still photograph: ' + path.name)
            original.load()
            photo = ImageOps.exif_transpose(original)
            if photo.mode not in ('RGB', 'RGBA'):
                photo = photo.convert('RGBA' if 'transparency' in photo.info else 'RGB')
            catalog.append({
                'src': webImage(photo, 1440, 82, 'photo', output),
                'mobile': webImage(photo, 800, 78, 'photo-mobile', output),
                'preview': webImage(photo, 480, 68, 'photo-rear', output),
                'title': path.stem.replace('-', ' '), 'ratio': photo.width / photo.height
            })
    if not catalog:
        raise ValueError('Add at least one photograph to photos/.')
    objects = []
    for name in OBJECTS:
        with Image.open(source / 'home' / 'objects' / (name + '.webp')) as im:
            if im.mode != 'RGBA' or im.getchannel('A').getextrema() != (0, 255):
                raise ValueError('Object must retain transparency: ' + name)
            hashed = webImage(im, 560, 85, name, output)
            stable = 'assets/' + name + '.webp'
            shutil.copy2(output / hashed, output / stable)
            version = Path(hashed).stem.rsplit('-', 1)[-1]
            objects.append({'id': name, 'kind': 'key' if name.endswith('key') else 'petal',
                            'src': stable + '?v=' + version,
                            'ratio': im.width / im.height})
    script = '\n'.join((source / 'home' / name).read_text(encoding='utf-8') for name in ('motion.js', 'scan.js', 'page.js'))
    script = script.replace('PHOTO-CATALOG', json.dumps(catalog, ensure_ascii=False))
    script = script.replace('OBJECT-CATALOG', json.dumps(objects, ensure_ascii=False))
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
