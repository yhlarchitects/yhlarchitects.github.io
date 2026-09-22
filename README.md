# YHL Architects

https://yhlarchitects.com/

## Add or remove photographs

Upload JPG, PNG, WebP or AVIF photographs to [photos/](https://github.com/yhlarchitects/yhlarchitects.github.io/upload/main/photos) and commit the upload to main. GitHub Actions rebuilds and publishes the site automatically. Removing a photograph from that folder removes it from future arrangements.

The upload folder is public. Upload only images intended for the public website.

The build creates 1440px desktop, 800px mobile, and 480px distant-plane WebP assets. Only the chosen photographs and two chosen objects load on entry. Five transparent petals and keys live separately in home/objects/. Their published derivatives are at most 560px. The originals stay in the repository.

## Build

Install tools/requirements.txt, then run:

    python tools/build-site.py --output site-dist

The output directory must be new or empty. Only the home page, web assets, photo catalog, CNAME, robots.txt and existing thesis pages are published. Sources, documentation and private paths are excluded from the Pages artifact.

## Home page

The scanner collage has five focus depths, 2–3 sharp foreground photographs, increasing blur behind them, near-black glass, a canvas extending 10% past every edge, and five randomly assigned tones. Every composition contains exactly one sharp petal and one sharp key together. Refresh, the shuffle icon or R generates a new composition.

Petals open https://www.instagram.com/yhlpic/ and keys open https://www.instagram.com/reyeonho/ in new tabs. Both links are at depth 1 above the photographs and remain inside the viewport, including at the maximum tilt.

Univers lettering remains SVG outlines; font files are not included. The email uses two identical groups, each wider than the viewport, repeating at 32px per second. Groups adjust to resized and ultra-wide windows.

## Phone interaction

Supported touch devices listen to orientation automatically. iPhone Safari requires sensor permission from a user gesture: the first tap requests it without a separate tilt control. Browser or system permissions cannot be bypassed. Denied or unsupported sensors leave the scene static.

The first sensor reading sets neutral. Motion follows screen orientation and is capped at 32px, less on small screens. YHLA and the email stay fixed relative to the first scene while the photographs move at different rates. Tilt pauses when the ending is visible.

The viewport disables pinch and double-tap page zoom while retaining single-finger vertical scrolling. Browser accessibility overrides and real hardware behavior remain browser-controlled.

## Paper ending

Scrolling down moves the collage up and reveals the approved open-book scan, centered with empty black space below it. Mouse dragging upward also scrolls the page. The logo, shuffle and email leave with the first scene, keeping the ending clear.

home/paper/book.webp is the restored scan with “© YHLA.” and “ALL RIGHTS RESERVED”. Responsive ending assets load only after scrolling starts, keeping the first page light. The 4096px delivery is an interpolated export of the restored image, not a native 4K scan.

## History

The preceding versions remain in Git: neon home bde516e; initial scanner home 6b25be6; single alternating social object and manual tilt 409e13a. Existing thesis pages and their robots rules are preserved.
