# YHL Architects

https://yhlarchitects.com/

The home page follows Web guide3: a centered YHLA mark near the top, with the contact group near the bottom when opened. All lettering is outlined Univers 55 Roman, with the reference's letter spacing, line spacing and relative sizes retained. Phone typography has a legibility minimum.

Selecting YHLA reveals Yeonho Lee Architects CH/KR, the email link and ALL RIGHTS RESERVED over an 850ms background blur. Selecting the mark, any non-link area, or Escape closes the introduction with a slower 1800ms fade. Email opens a mail draft. When closed, a background click chooses a random film other than the current one. All four arrow keys, Enter and Space also advance the film. A focused email link retains its Enter action. Held keys and inputs during an active change do not skip multiple films. One available film keeps playing without restarting.

Video changes wait for the next film's first playable frame, then dissolve over 2400ms with a subtle 3px blur at the midpoint. An explicit opacity animation runs to completion before the outgoing film is stopped, including cached videos that become ready in the same browser paint. Both films keep moving during the dissolve; only the incoming film is audible. Repeated background clicks during the change are ignored. Reduced-motion preferences remove the animation.

The mark and contact inherit one shared color, so they are identical even during the 1400ms black-to-white or white-to-black transition. The target color is based on the actual cropped video behind the visible lettering, including blended frames. Samples are taken four times a second with hysteresis and a three-sample delay to prevent flicker. Posters supply the color sample when playback is held.

Sound starts immediately where the browser allows it. Otherwise playback starts muted and the first click or touch enables audio. The incoming video is started synchronously within the user's click so mobile browsers can grant audio permission. There is no playback button. A still frame covers paused media, including when mobile autoplay is blocked. The video remains visible beneath the cover so Safari can start inline playback.

## Add films

Add an MP4 with audio to home/videos/ using a lowercase filename with hyphens. A first-frame WebP poster with the same basename is recommended. The existing GitHub Pages build discovers all MP4 files. Refresh and background clicks exclude the previous or current film whenever another is available. Only the selected video loads.

## Build and publication

Install tools/requirements.txt and run tools/build-site.py with --output and an empty destination. Pushing main runs the existing GitHub Pages workflow. Public files include the home page, required assets, CNAME, robots.txt, and the existing thesis and bangyeol pages.

The former collage source, photographs and compatibility assets remain available. Previously published immutable asset URLs are retained for cached pages. Prior home designs remain in Git history.
