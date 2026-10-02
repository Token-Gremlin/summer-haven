# Landmark audio contract

`src/sound/landmarks.ts` exports `LandmarksAudio(context, destination)` and
`update(listener: Vector3, yaw, clockSeconds, inside, ambienceVolume, effectsVolume)`.
Call once per frame using the same simulation clock as `Ferry.update`.
The destination is `SoundEngine.output`, downstream of its master gain: callers
must pass master × ambience and master × effects respectively. Pass both as zero
while paused or muted. Do not pass the category slider alone.

The waterfall has three fixed noise loops at x=359/366/373, z=-708,
y=18/30/42. Its body carries farther than its upper spray. Each source has
3D attenuation (silent at 240 m), yaw-relative stereo placement, and a darker
distant filter. Slow modulation adds variation without an abrupt repeating seam.
Ferry sound derives position and dock/rowing state from `ferryRoute`, with a
wet pull at .7 + N × 2.8 seconds and a quiet wooden groan every third pull.
Ferry range is 48 m, and stationary berths produce no rowing sound.

Indoor multipliers are .07 for the waterfall and .1 for the ferry.
Volume inputs are finite-clamped to [0,1]; invalid listener/yaw/clock silences
both buses. Muting ends at exact zero after a 30 ms ramp, including active
one-shots, without rescheduling the ramp each frame. Initial updates, repeated
clock values, backwards time, and advances over .5 s do not replay missed events.
`dispose()` is idempotent and stops/disconnects all owned nodes.

Resource limits: five reusable mono buffers at 24 kHz (about 2.46 MB), three
continuous waterfall sources, and a maximum of four concurrent ferry sources.
Ended shots disconnect their source and gain; no downloaded assets or timers.

Validation: `npx tsx --test tests/landmarks-audio.test.ts` passes all three focused
tests for finite spatial/volume parameters, synthesis bounds, event phase,
stationary silence, discontinuous time, mute ramp scheduling, indoor attenuation,
bounded concurrency, and disposal. TypeScript checking passed on implementation.
These mock graph tests do not establish audible quality. Actual browser output,
head-turn stereo behavior, mix balance, pause/resume and live listening remain
integration checks for the parent task.
