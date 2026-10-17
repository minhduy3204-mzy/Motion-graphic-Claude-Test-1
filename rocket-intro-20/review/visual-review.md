# Independent geometric motion review

Reviewed the current `render-project.json` configuration and the completed `renders/rocket-group-introduction-20s.mp4`. No material geometric motion or clipping issue was found in the review below.

## Evidence

- Independently captured current browser frames at 3.0, 3.2, 3.4, 7.1, 7.4, 7.7, 11.5, 11.8, 12.1, 15.5, 15.8, 16.0, 16.2, 16.4, 17.8 and 19.98 seconds. Browser reported no page errors.
- Checked the launch-to-sphere, sphere-to-grid, grid-to-fan and fan-to-lockup boundary frames at full resolution and as an ordered contact sheet.
- Fan mesh seams were absent. The current fan scene text fades away before the expanding fan reaches its former text area. Fan planes and shadows remain inside the frame during the enlargement; the camera and fade continue smoothly into the lockup.
- Sphere and grid use the same indexed particles, count and absolute timeline time. Their positions, colors and alpha change continuously. Particle alpha reaches zero before the conditional end of the geometry layer.
- Decoded all 1,200 exported video frames for temporal comparison of the right-hand geometry area (source crop x=1020, y=170, width=850, height=750, reduced to 340×300 gray samples). Consecutive-frame mean absolute difference, in 0–255 gray units:

| Stable interval | Mean | Maximum |
|---|---:|---:|
| Sphere, 4.3–6.7 s | 0.7495 | 0.7650 |
| Grid, 8.4–11.0 s | 0.0739 | 0.0850 |
| Fan, 13.4–14.8 s | 0.0941 | 0.1335 |
| Final lockup, 18.0–19.98 s | 0.0001 | 0.0004 |

The stable-window differences have no isolated particle or texture flicker spike. The largest differences occur during the intentional full-height background wipes around 3.2 and 7.4 seconds.

- FFprobe confirms H.264, 1920×1080, 60/1 fps, 1,200 video frames and container duration 20.000000 seconds. Audio is AAC.
- Previously verified deterministic geometry seeking: rendering time 3, then 12.4, then 3 again produces an identical sampled canvas checksum.

## Scope

This is visual and temporal geometry review. It does not replace the separate soundtrack mix review or editorial/source verification.

The packaged final contact sheet and layout evidence complement this independent boundary review.
