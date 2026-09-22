# YHL Architects

https://yhlarchitects.com/

## Add or remove photographs

Upload JPG, PNG, WebP or AVIF photographs to [photos/](https://github.com/yhlarchitects/yhlarchitects.github.io/upload/main/photos) and commit to main. GitHub Actions rebuilds and publishes automatically. Removing a photograph removes it from future arrangements.

The folder is public. Upload only images intended for this website.

The build creates 1440px desktop, 800px mobile, and 480px distant-plane WebP assets. Only selected photographs and the two selected objects load on entry. Five transparent originals remain in home/objects/; published derivatives are at most 560px.

## Build

Install tools/requirements.txt and run:

    python tools/build-site.py --output site-dist

Use a new or empty output directory. Only the home page, public web assets, photo catalog, CNAME, robots.txt and existing thesis pages are published.

## Home page

One fixed viewport contains the scanner collage: five focus depths, 2–3 sharp front photographs, stronger blur behind, near-black glass, a canvas extending 10% beyond each edge, and five optical scan profiles (contact, lifted edge, soft focus, fine mesh, diffuse edge). Photographs retain their original colors, without grayscale, sepia, saturation, hue, contrast or brightness filters. There is no second page or vertical scrolling.

Every composition has one sharp petal and one sharp key together. Both remain visible above the photos and link to https://www.instagram.com/yhlpic/ and https://www.instagram.com/reyeonho/. Refresh, the shuffle icon or R reshuffles.

The YHLA mark is transparent SVG outline lettering without a filter, shadow, box or font download. Email loops with two identical groups wider than the viewport.

## Mobile layout

On narrow screens, and touch devices up to 1000px wide, YHLA and the email are 61.8% of their preceding mobile dimensions: YHLA 95.172px; email cell 352.26px by 27.81px. The visible shuffle icon is 16px wide instead of 34px (52.9% smaller), retaining a transparent 44px touch area. Desktop logo, email and shuffle dimensions remain unchanged.

Pinch, double-tap zoom and page panning remain disabled.

## Motion without prompts

There are no permission buttons or gesture-triggered permission requests. Permissionless supported devices subscribe immediately.

For an API that requires permission, a single startup check runs only without transient user activation. An existing grant enables motion; a prompt/denied state rejects or resolves denied without prompting and leaves the collage still. A check is never retried on click or touch. Unsupported APIs, exceptions and missing sensor data leave the scene static.

The first sensor reading establishes neutral. Parallax follows screen orientation and is capped at 32px, less on small screens. YHLA and the email stay fixed.

## History

Previous designs remain in Git: 409e13a (manual tilt), 38cbbf5 (paper ending). The archived book asset is retained in source history but excluded from the built and published site. Existing thesis pages and robots rules are preserved.

## Stable object URLs and cached tabs

Object images use stable paths such as assets/rose-petal.webp with a content-version query. Resizing or re-encoding an object does not remove its old path.

home/compat-assets/ retains the already-published scanner assets used by old HTML and running tabs. Copy the current public scanner assets there before changing build formats or URLs. The builder includes these compatibility files in every deployment; they are not preloaded by the current page. Deleted paper-ending images are excluded.
