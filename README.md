# YHL Architects

https://yhlarchitects.com/

The home page fills the viewport with a looping film and attempts playback with the original audio immediately. If the browser blocks sound, the video continues muted until the first click or touch anywhere on the page. Selecting YHLA shows these two lines directly below the mark:

Yeonho Lee Architects, CH, KR
hello@yhlarchitects.com

All three lines use the same size of outlined Univers LT Std 55 Roman lettering. The backdrop uses the existing depth-four blur: 15px at 1920px, with a 10px minimum. YHLA again, the background, or Escape closes the contact text without changing playback or sound. The email opens a mail draft.

## Add films

Add an MP4 with audio to home/videos/ using a lowercase filename with hyphens. An optional first-frame WebP poster can share its basename. The existing GitHub Pages build discovers all MP4 files. Every refresh chooses a film other than the previous one when there is more than one. One film simply repeats. Only the selected video loads.

## Build and publication

Install tools/requirements.txt and run tools/build-site.py with --output and an empty destination. Pushing main runs the existing GitHub Pages workflow. Public files include the home page, required assets, CNAME, robots.txt, and the existing thesis and bangyeol pages.

The former collage source, photographs and compatibility assets remain available. Previously published immutable asset URLs are retained for cached pages. The previous home design remains in Git history.
