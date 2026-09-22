# YHL Architects

https://yhlarchitects.com/

## Add or remove photographs

Upload JPG, PNG, WebP or AVIF photographs to [photos/](https://github.com/yhlarchitects/yhlarchitects.github.io/upload/main/photos) and commit the upload to main. GitHub Actions rebuilds and publishes the site automatically. Removing a photograph from that folder removes it from future arrangements.

The upload folder is public. Upload only images intended for the public website.

The build resizes photographs to at most 1800 pixels and converts them to WebP. The five transparent petals and keys are kept separately in home/objects/ and are not part of the photograph pool.

## Build

Install tools/requirements.txt, then run:

    python tools/build-site.py --output site-dist

Output is site-dist/. The output directory must be new or empty. Only the home page, web assets, photo catalog, CNAME, robots.txt and existing thesis pages are published. Sources, originals and documentation are excluded from the Pages artifact.

## Home page

Approved scanner collage: five focus depths, 2–3 sharp foreground photographs, stronger blur behind them, black scanner glass, a 120% canvas, five randomly assigned tones, and 1–2 separate petals or keys at depths 1–2. Refresh, the shuffle icon or R generates another composition.

Univers lettering remains SVG outlines. Font files are not included.

The preceding neon home is preserved in Git history at bde516e00dd7bd6e80d012eac8f8ddf46216c5c9.
