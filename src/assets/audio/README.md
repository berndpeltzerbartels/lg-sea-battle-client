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

# New surface diesel

`Diesel.m4a` supplied 2026-10-25 replaces the earlier mis-exported surface clip.
`surface-diesel-loop.wav`: 8.25 seconds mono 48 kHz PCM, source trimmed to
0.5–9.5 seconds with 0.75-second circular equal-power crossfade and -3.5 dB gain.
Own surfaced submarine and torpedo boat only. Original pitch corresponds to
submarine Ahead Full and torpedo-boat Ahead 3/4; higher boat orders raise pitch.
Fan/electric motor remain separate submerged-only channels. At Stop the surface
diesel runs at a quiet, low-pitched idle; underwater only the fan remains.

# Flak

`Flak.m4a` contains silence followed by a burst. Trim 2.69–4.08 seconds,
mono 48 kHz PCM; make a circular 40 ms equal-power crossfade as above.
`flak-burst-loop.wav` is 1.35 seconds. Sustained fire refreshes a single loop per
ship, then fades/releases it; maximum eight concurrent sources, own ship first.
Distant fire uses cheap stereo panning and a low-pass filter, without HRTF,
reverb or geometry queries. Maximum range 600 world units. Only newly observed
shots trigger sound, independently of visible remote models; own shots play
locally and server echoes are deduplicated by the existing shot-event consumer.
Motor recordings remain own-ship-only. All audio edits stay local for now.

# Cannon

`Kanone.m4a`: remove leading/trailing silence; retain 2.70–6.65 seconds, mono
48 kHz PCM, fade final 200 ms. `cannon-shot.wav` is a 3.95-second one-shot with
its natural decay, never looped. Original level retained (peak approximately
-6 dB). Maximum six overlapping cannon shots, own gun prioritized; duplicate
events ignored. Double the flak hearing range, stereo and distance filtering.
Server echo of the local player's shot stays excluded by WeaponShotEvents.

Deep-dive adjustment: below actual periscope depth (+0.05 units tolerance),
fade the electric motor out regardless of engine order; only the constant fan
remains. Electric drive still applies at periscope depth. Surface diesel is
unchanged. This audio adjustment is local only.

Cannon loudness correction: retain more attack and decay, raise cannon gain
by factor 1.6 (about 4 dB). Own shot is not ducked by the remote voice count.
Initialize the low-pass cutoff before source.start, avoiding the Web Audio
350 Hz default muffling the initial blast while the filter ramps up.

# Explosion variants

Eight one-shot PCM samples, peak aligned to approximately -8 dB (maximum boost
8 dB). `3Explosionen`: split at 3.04–7.50, 7.98–12.80, 13.29–18.00 seconds.
`3ExplosionenWasser`: 4.06–8.90, 9.42–14.50, 14.99–20.00 seconds. Final fade
300 ms. `Explosion1`: 3.01–10.00 seconds, final fade 300 ms. `Explosion2` is a
continuous rumble: retain 3.28–10.28 seconds with a 1.2-second ending fade.

Light ship/flak hits select impact variants, water hits select water variants.
Cannon hits use the heavy explosion at 0.9 rate, torpedo and depth-charge hits
use heavy/rumble at 0.72 rate. Own impacts take priority; automatic-weapon hits
coalesce within 150 ms. Expired projectiles are silent. Eight voices maximum
across all explosion samples. Deduplicate hit/impact snapshots by projectile ID
and reset on session change; old retained events do not play on login.

# Deeper cannon firing variant

Current cannon-shot.wav combines the original Kanone 2.70–6.65 seconds played
at 0.78 rate (gain 0.8), with Explosion1 3.01–6.00 seconds at 0.9 rate, low-pass
500 Hz, gain 0.7, fade from 2.4 over 0.9 seconds. Mix without normalization,
limit peaks to 0.9, fade ending at 4.8 for 0.26 seconds. This gives a heavier
body without allocating an additional runtime source per shot.

Flak sustain correction: use only original 2.80–3.70 seconds, circular 80 ms
crossfade, resulting 0.82-second loop. The original ending after 3.70 seconds
was already a release tail and caused a recurring pause during sustained fire.

Torpedo-boat station mix: lookout/flak retain full exterior diesel. Cannon
uses 0.5 diesel gain, bridge 0.4; both add fixed fan gain 0.3. Exterior stations
have no fan. Source buffers remain shared; station transitions are smoothed.

Engine/background rebalance: apply master gain 0.2 (approximately -14 dB) to
all engine and fan channels after station/depth mixing. Weapon and explosion
levels are unchanged.

Aircraft source `Flugzeug.m4a`: select steady post-pass section 15.2–17.8 seconds,
mono 48 kHz PCM, 250 ms circular equal-power crossfade (2.35-second loop),
+10 dB preparation gain. Low playback rate 0.70–0.78 gives a deep base engine.
Own cockpit has no Doppler; remote aircraft use bounded radial relative
velocity including listener motion and altitude. This is a stylized game-world
Doppler, not a claim of physically scaled sound propagation. Spatial attenuation
includes altitude. Maximum four loops; update at 10 Hz, smooth rate changes.

Aircraft level raised from gain 0.16 to 0.65 (about +12 dB) after listening test.

Torpedo launch: Torpesostart.m4a includes several launches. Select clean third
launch 11.02–14.25 seconds, retain original level, final 250 ms fade.
Torpedo propulsion: Torpeso-Vorbei.m4a 7.05–7.85 seconds, circular 100 ms
crossfade yields a 0.7-second engine loop. Actual torpedo position, depth and
relative velocity control distance, pan and Doppler; no canned pass envelope.
Max four nearby torpedo engines and four overlapping launches. Propulsion is
more audible underwater than through the water surface. All changes local.

Further local listening adjustments: remote aircraft gain 2.0 (about +10 dB
from 0.65), cockpit remains 0.65; distance law unchanged. Flak base playback
rate 0.88 gives a slightly deeper gunfire sound without changing fire cadence.

Water entry: FälltInsWasser.m4a, 2.12–5.10 seconds, last 300 ms faded. Trigger
once at actual air-dropped torpedo water-entry transition, not on plane release.

Collision: Kollision.m4a, 3.64–7.10 seconds at rate 0.68, low-pass 1500 Hz,
+5 dB bass at 110 Hz, ending fade, limit to 0.75 peak. Ram events prioritize
both the own attacker and own target and use the existing explosion budget.

Underwater explosion: Explosion1 3.01–8.50 at rate 0.7 low-pass 650 Hz gain
0.8, plus 3ExplosionenWasser 4.06–8.00 low-pass 1400 Hz gain 0.3; limit 0.75,
fade ending. Deep torpedo hits use this variant. It is silent above water,
also if the listener surfaces during the decay. Native underwater audio does
not receive the extra surface-to-underwater gain loss used for exterior shots.

Final approved balance: remote aircraft gain 3.5 (another approximately +5 dB);
cockpit unchanged. Flak gets subtle short early reflections at 47/83/131 ms,
gains 0.10/0.065/0.035 with dry gain 0.92. Reverb is baked into the loop offline:
repeat the 0.82-second loop three times, process reflections, keep the middle
period. This preserves a continuous boundary and adds no runtime audio nodes.

Torpedo-boat launch is a separate prepared one-shot: deterministic filtered
white-noise air release (6 ms attack, 390 ms decay), short 65 Hz pressure thump,
then the supplied water-entry splash delayed 180 ms. Mix with peak limit 0.75.
The original submarine launch recording remains unchanged. Local and remote
launches select their buffer from the firing vessel type; no runtime synthesis.

Torpedo-boat launch shortened after listening: 250 ms air release, 100 ms
pressure thump, water trimmed to 480 ms with fade from 120 ms and delayed
140 ms. Total 620 ms instead of 3.16 seconds; master gain 0.7 (about -3 dB),
with quieter thump and splash. Submarine launch and aircraft water-entry
recording are unchanged.

Torpedo impact correction: both ship and coastline impacts always use the
heavy sample with a defined attack (not the rumble-only variant), gain 2.4
instead of 1.1, gentler distance loss (distance scale 3) and no voice-count
ducking. Maximum hearing range stays 1200 units, eight explosion voices and
the shared peak compressor remain. Underwater-only audibility is unchanged.

Water-rich torpedo impacts: three prepared variants combine heavy explosion
at rate 0.72, low-pass 1800 Hz, gain 0.65 with the corresponding supplied
water-explosion sample at rate 0.85, delayed 80 ms, gain 1.0. Limit the mix
then align peak to -9.5 dB to preserve the strengthened impact level. Play at
rate 1 (pitch changes already baked in). Ship/coast torpedo impacts select
variants 11–13. Native underwater-only variant remains unchanged. One source
per impact, same eight-voice budget, no extra runtime layers or filters.

Torpedo/depth-charge balance: torpedo gain reduced 2.4 -> 1.45 (about -4.4 dB).
Depth charges now use three related wet variants (14–16), gain 1.25 instead
of 1.1, rate 0.88 for a slightly lower pitch, same distance profile as torpedoes.
Prepared depth-charge variants mix 0.9 of the corresponding torpedo explosion
with an extra 0.45 water-explosion layer at rate 0.85 delayed 150 ms, peak
aligned to -9.5 dB. Thus depth charges stay a little quieter than torpedoes,
with more splash, while keeping one runtime source per event.

Underwater listening: water explosions retain their distance gain and use a 1400 Hz low-pass at actual periscope depth, 450 Hz below it. Gunfire and aircraft are silent underwater. Submerged projectile hits use the depth-charge sample family; an active-to-sunk submarine transition adds a distinct wet destruction explosion, including for the shooter above water. Existing wrecks do not replay this effect on joining.

Torpedo explosions additionally cap the existing low-pass filter at 1000 Hz to soften the sharp, gunshot-like high end. Playback rate and gain stay unchanged; deep-water filtering can lower the cutoff further. Applies to surface and submerged torpedo impacts, without changing depth charges or adding audio nodes.

Depth charges now gain +6 dB (2x amplitude) for underwater listeners, +9.5 dB (3x) when the server reports damage to the own ship. Surface gain, distance falloff and depth filtering stay unchanged. Boost is applied at playback and on listener updates; mute still wins and the shared output limiter remains active.

Torpedo-boat bridge engine raised from 0.4 to 0.7 of exterior gain; bridge fan from 0.3 to 0.5. Cannon, lookout, flak and submarine mixes remain unchanged.

All torpedo-boat stations: diesel and interior fan gains multiplied by 1.4 (about +3 dB) relative to the latest bridge adjustment. Station proportions, pitch, weapons, explosions and submarine audio remain unchanged.

Aircraft air-explosion visuals now trigger a matching heavy explosion one-shot at the exact animation callback (both delayed hit explosion and final disintegration). Initial projectile impacts retain their short hit sound. Torpedo ship impacts keep the wet, 1000 Hz filtered family; coastal impacts use the drier heavy explosion at rate 0.8, gain 1.1, cutoff 1800 Hz. Coast blasts still propagate underwater. Existing actual-depth filters remain 1400 Hz at periscope depth and 450 Hz deeper, without added reverb.

Surface diesel idle: “Large Ship Engine Idle” by Suhuy, https://freesound.org/people/Suhuy/sounds/715171/ (CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/). Downloaded the publisher's HQ MP3 preview https://cdn.freesound.org/previews/715/715171_11084783-hq.mp3 on 2026-10-26. Crop 2–18 s, mono 48 kHz, low-pass 2200 Hz, circular 1 s crossfade (body 1–16 s plus head 0–1 s), -2 dB gain, 15 s PCM16 WAV. Reused looping source at original pitch; Stop idle gain .55 times station gain, equal-power crossfade to the existing diesel over 0–20% propulsion load. Surface-only actual-depth fade; underwater propulsion/fan and full-load diesel unchanged. One extra decoded buffer/source, no per-frame creation or fetching.

Replacement idle (2026-10-26): “Marine diesel engine” by AugustSandberg, https://freesound.org/people/AugustSandberg/sounds/264864/ (CC0 1.0), publisher HQ preview https://cdn.freesound.org/previews/264/264864_1934171-hq.mp3. Volvo Penta MD22 recorded in engine compartment. Replaces Suhuy recording above. Crop 20–30 s; mono, baked playback 0.65x, resample 48 kHz, high-pass 30 Hz, low-pass 1400 Hz, circular 1 s crossfade, +2 dB. Runtime idle accelerates only 1–1.25x as it fades out. Smoothstep equal-power fade across 0–20% load; matching 0.9 s gain/rate smoothing for both diesel layers avoids their previous differing ramps. Underwater motor/fan smoothing unchanged.
