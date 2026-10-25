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
