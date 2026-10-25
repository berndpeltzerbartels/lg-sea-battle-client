# Submarine fan

User supplied `Lüfter.m4a` (13.952 seconds), 2026-10-25. This is a ventilation
sound, not an engine. The user restarted the audio setup; previous motor
recordings are retained here but are not imported, downloaded or played.

`submarine-fan-loop.wav`: 11 seconds, mono, 48 kHz, 16-bit PCM. It loops at its
original pitch independently of engine order, including Stop and Slow. Gain
follows actual immersion, with smooth fades; it stops on destruction, hidden
page or mute. Future motor recordings will occupy independent audio channels.

Preparation with FFmpeg: trim source to seconds 1–13, convert to mono,
overlap its last second with its first second using an equal-power crossfade,
then append seconds 1–11 of that trimmed source. This creates a circular loop
without leading codec padding. Decode once, reuse a single looping source.

# Submerged electric motor

User supplied `EMotor.m4a` (9.237 seconds). Used only for the player's own
submerged submarine, never remote vessels or surface boats. Unlike the fan,
this independent loop follows engine power, including Slow and reverse, and
fades out at Stop. Full ahead/reverse uses the original pitch.

`submarine-electric-motor-loop.wav`: mono 48 kHz PCM, 7.25 seconds. Trim original
to 0.5–8.5 seconds, circular equal-power crossfade for 0.75 seconds, as for the
fan. Apply +10.5 dB to match the fan's approximate RMS level; both voices retain
mixing headroom. Actual depth controls audibility, not the selected dive order.
