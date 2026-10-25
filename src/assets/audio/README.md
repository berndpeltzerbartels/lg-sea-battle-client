# Submerged submarine engine

Source supplied by the user: `SUbmarine-Engine-Drawn.m4a` (13.952 seconds).
The original is retained in the project parent directory, outside this repository.

`submarine-underwater-loop.wav` is 11 seconds, mono, 48 kHz, 16-bit PCM.
PCM avoids codec padding at loop boundaries and decodes to about 2.1 MB once.
At full power playback rate is 1.0; smaller engine orders lower the rate.

Preparation with FFmpeg: trim source to seconds 1–13, convert to mono,
overlap its last second with its first second using an equal-power crossfade,
then append seconds 1–11 of that trimmed source. This makes a circular loop:
the crossfade leads into the middle, which ends at the start of the tail.
No silence or leading encoder padding is included in the deployed WAV.

# Surface diesel

`Ship-Diesel.m4a` is supplied by the user for surfaced submarines and torpedo
boats. `ship-diesel-loop.wav` uses the same trim/circular crossfade procedure
and PCM format as above. Stop and Ahead Slow are silent pending a separate
sample. Submarines crossfade between these two recordings by actual depth;
torpedo boats load only the diesel. Only the player's own engine is sounded.

Input check on 2026-10-25: the two supplied M4A files currently contain virtually
identical audio (decoded mono correlation 0.9999999884). They retain separate
asset slots so a corrected surface recording can be substituted independently.
