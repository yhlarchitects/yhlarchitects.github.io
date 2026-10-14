# Background films

Add each finished video as a lowercase, hyphenated MP4 filename in this folder. Keep its audio track. The existing build automatically includes all MP4 files. An optional first-frame WebP poster can share the same basename.

Every film fills the screen with CSS object-fit: cover, so a portrait phone shows only a narrow column of a landscape film. By default that column is the centre. To show another part, add the film to filmPosition in home/cinema.js with a CSS object-position value, for example '35.9% 50%' for a column centred at 35.9 % of the width. The same value is applied to the poster, and the lettering colour is sampled from the shifted crop. A desktop screen with the film's own proportions still shows the whole frame. amk-library uses 35.9% 50%; the other films stay centred.

The home page always starts playback muted, so phones autoplay without a play button. Where the browser allows sound before a gesture, sound turns on at once; otherwise the first click or touch anywhere turns it on, and also starts playback if the phone held it. The native play button is hidden. YHLA opens the contact text and applies depth-four blur. Selecting YHLA again or pressing Escape closes the text without changing the sound. Each film loops. On refresh, the previous film is excluded when at least two films are available. With one film, the same film repeats.

The lettering is outlined from the existing Univers LT Std 55 Roman font at the same em size for all three lines. The font file is not uploaded.
