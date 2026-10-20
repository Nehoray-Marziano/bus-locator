# Validation record

Version 0.7.2 next-service fix (2026-10-20): reproduced the exhausted-day lookup
returning empty despite the following day's published departures. The provider
now searches daily calendars through seven days ahead, choosing the first
future departure and caching empty dates as well as timetable rows. It selects
the earliest feed entry, without preferring a later live bus over an earlier
scheduled one. The phone/watch contract stores the actual arrival date, removes
the 36-hour schedule cutoff and allows that future date through cache matching.
Both views use Tomorrow or a later weekday/date beside the arrival clock.

Six new regressions cover exhausted today through the actual provider/service/
controller/cache and both views, skipping empty days across the Israel DST
change, midnight and cache age/direction checks, a later-date network failure,
a fully empty search horizon with cached results, and the shared request budget.
The existing tests keep live expiry, invalid times, route/stop identity and
background-request guards. All 104 deterministic tests pass. Native-command
renders cover 18 watch and 48 card states, including future-day clocks at 320px
card width. Type/syntax, formatting and strict design checks run separately.

The real integration probe now covers phone validation and watch presentation,
which the old HTTP-only probe missed. At 2026-10-20T14:15Z, nine explicit requests
found 2026-10-21 06:18 from Meitar and 07:08 from Jerusalem, both scheduled;
both produced visible Tomorrow models. Direct weekend calendar checks found
empty Saturday arrays in both directions and valid Friday/Sunday schedules.
No live ETA or physical-watch acceptance is claimed by these checks.
Package: dist/Meitar-Bus-0.7.2.zab.

Version 0.7.1 busy-button fix (2026-10-20): the watch showed the C in Checking…
overlapping the refresh arrow even though the widget was marked hidden. The
refresh canvas now clears its drawing when hidden and redraws exactly one
silhouette when Refresh returns. A regression deliberately ignores native Canvas
visibility, runs three busy/idle cycles and verifies the busy button contains no
arrow polygons, the idle drawing is restored, and no widgets are allocated.
The native-command button preview renders that same visibility-ignoring case.
All 98 tests pass; type/syntax, formatting, native-command renders and strict
design checks are run separately. Hardware repaint behavior remains a watch
acceptance check. Package: dist/Meitar-Bus-0.7.1.zab.

Version 0.7.0 physical-watch card overhaul (2026-10-20): the user reported text
too small, a card stuck on Ready and unreliable taps. The card now uses a 264px
height, 136px nearby ETA, 96px clock, 30px units, 34px MTR/JLM route codes,
32px line number and 28px Live/Est. labels. Width no longer scales every label
down. Reverse/Reset is removed from the card; the app retains it with a larger
56px target and 22px label. The app ETA is 144px, clock 88px, units 30px, town
32px and destination 28px. Empty card states say Tap to check with a reason.

Zepp documents that LocalStorage instances retain their loaded data in memory.
The old card kept the instance created before the app fetched an ETA. The new
shared/watch-storage.js reopens storage on each read/write boundary. A regression
uses a fake with native per-instance snapshots, constructs an empty card, lets
the actual page controller fetch/save, then verifies the card shows the ETA on
focus while the old storage instance still reads null. Lifecycle tests now use
the same snapshot semantics instead of a live shared variable.

The card is one native button. All five text overlays explicitly pass input
through. App icons and decorative widgets also disable gesture response. A
z-order hit test checks header, ETA, route and surrounding-space taps reaching
the same button. The renderer checks 16 watch states and 42 card states at three
widths, including empty, Due, scheduled, tomorrow and cached data. Native watch
storage, Bluetooth and touch behavior still require the next device acceptance
pass. The card remains cache-only under Zepp's documented BLE limitation.
Package: dist/Meitar-Bus-0.7.0.zab.

All 97 deterministic tests pass, including the new native-storage regression and
card hit testing. Type/syntax, formatting, strict project audit and DESIGN.md
lint are checked separately; desktop renders are not a substitute for watch QA.

Version 0.6.2 refresh icon fix (2026-10-20): replaced the separate arc and two
rounded arrowhead bars with one closed, filled silhouette on a native Canvas.
The head follows the clockwise tangent and shares the shaft's polygon, so native
rounding cannot open a joint between separate widgets. The Canvas disables its
own touch handling so Refresh still receives taps; it hides during checking.
The existing icon regression now covers closure, bounds, hit passthrough and
visibility. Native-command raster checks assert one connected ink component at
22px and 32px; artifacts/refresh-icon-preview-0.6.2.png shows both actual sizes
and enlarged pixels. All 16 watch and 48 card renders still pass text bounds.
Package: dist/Meitar-Bus-0.6.2.zab. Native Canvas antialiasing remains a watch check.

Version 0.6.1 ETA refinement (2026-10-20): ETA numerals now use green for fresh
Live and amber for Scheduled in both views. Demo/empty numerals remain white;
disconnected cached live values use muted gray. Shared presentation owns this
mapping and the source-color regression exercises live, scheduled, demo, expired,
empty, error and disconnected transitions on both surfaces.

Card nearby arrivals increase from 60px to 92px (53%) and clock times from 48px
to 64px (33%) before card scaling. The arrival region grows and the unit moves
down, preserving header, direction target and route. All 16 watch states and
48 card renders pass text-bound checks with actual fonts, including Due and
tomorrow clocks. They remain desktop approximations; hardware font metrics
still need confirmation. Package: dist/Meitar-Bus-0.6.1.zab.

Version 0.6.0 UI redesign (2026-10-20): both surfaces now use black/graphite,
bold white arrival figures and orange actions, following the user's Sporty choice. Green/amber live/scheduled
meaning is confined to labelled source icons/text. Arrival panels, colored route
badges and the route container are removed. Nearby arrivals shrink from 120px to
112px; long clocks from 82px to 76px. Space Grotesk 700 and DM Sans 500 replace
Fredoka/Nunito, with both OFL licenses preserved. Static Latin subsets total
38,368 bytes. The same token owner feeds both surfaces and DESIGN.md drift tests.

The source-label regression checks now verify neutral numerals across all states,
truthful labelled source colors, and removal of large green/amber panels. Existing
tests still verify contrast, round-display geometry, card margin translation,
48px targets, direction handoff and widget reuse. The renderer checks 16 watch
states and all 16 states at each of three card widths (48 cards), including Due,
loading, empty, settings, offline, cached, tomorrow and manual direction states.
Its expanded matrix caught and fixed a wrapping Cached ETA label. These are
native-command approximations using the actual fonts, not simulator screenshots.

The strict project audit has no findings. DESIGN.md lint has zero errors and
orphan-token warnings caused by native bindings, covered by runtime tests.
The before/after artifact compares the previous 0.5.1 design with this pass using
the same synthetic arrival. New package: dist/Meitar-Bus-0.6.0.zab. Native font
metrics, sunlight legibility and physical touch use remain watch acceptance
checks. No lifecycle or networking changes are introduced by this visual pass.

Version 0.5.2 lifecycle checks (2026-10-20): the real page/card entry points run
against fake native screen, storage and timer APIs. Five regression tests cover
opening/waking, duplicate screen events, short sleeps, sleeping page rebuilds,
sleep destruction without disabling relaunch, destruction cleanup, queued
callbacks, cache reload on card focus/wake, and an unfocused/asleep card staying
idle. Ordinary Pages use the Screen sensor rather than unsupported page
onResume/onPause callbacks. No timer initiates networking. Phone cooldowns are
unchanged. All 96 tests, TypeScript, source syntax and formatting checks pass.
The card remains cache-only under Zepp's documented BLE restriction.

The new package is dist/Meitar-Bus-0.5.2.zab. Physical Back-button exit, both
short/long wrist-wake paths, AOD behavior and measured battery consumption remain
hardware acceptance checks, listed in INSTALL.md. This change enables wake
relaunch and preserves normal display sleep; it does not keep the display lit.

Implementation checks: 2026-10-19, version 0.5.1.

- 91 deterministic Node tests cover journey/service-date selection, Israel DST,
  the 10:00/18:00 boundaries, midnight/year rollover, live/scheduled flags,
  canceled and mismatched entries, scheduled fallback, cache ages, errors,
  throttling, timeouts, pause/resume and late responses.
- UI checks cover contrast on actual surfaces, round-screen shapes, font assets,
  hidden station IDs, data source labels and geometry reuse. Mint arrival panels and green source waves are
  excluded for schedules, demos, expired data and phone-timeout overrides.
  Native broadcast/calendar visibility is checked on both surfaces. Repeated
  boarding, clock and check-age labels were removed from the compact layout.
- Ten direction-switch tests cover session reset, card-to-app selection, quick swaps, stale responses, bounded cache migration, per-direction cooldowns and synchronous failure recovery.
- TypeScript and syntax checks cover all 19 application modules.
- Six launcher regression tests run on Windows, including child processes holding
  the legacy and private staging folders as working directories. They verify
  independent concurrent commands, dev synchronization, runtime-only staging,
  retryable cleanup, preservation of linked dependencies and rejection of unsafe
  junction targets. The revised launcher also completes a real Zeus build and
  removes its private staging folder. Authenticated QR preview remains a device
  acceptance check.
- 16 watch states and 18 cards render from native widget commands and the actual
  bundled Fredoka/Nunito fonts. Card cases include widths 320/400/432, margins, rounded
  corners, Jerusalem and tomorrow labels. Text bounds pass. These desktop renders
  approximate native metrics; they are not new simulator screenshots.
- The reported left shift is addressed by translating the card background,
  content and both hit targets together by the native horizontal margin.
  Tests check centering and unchanged content width; margins are not deducted
  twice. The documentation describes card-relative coordinates, while the
  supplied T-Rex 3 simulator photo shows a screen-origin offset. This correction
  follows that observed target behavior and still needs a simulator recheck.
  Refresh-head geometry now meets the clockwise endpoint at 22/32px. The native
  launcher PNG is RGBA; rendering checks transparent corners and opaque content.
  The compiled package's palette TGA also retains transparent corners and opaque
  bus content; Zeus pads its storage width to 128px from the 124px source.
- The strict design project audit and DESIGN.md lint run separately. Native
  JavaScript bindings explain orphan-token warnings; color drift is tested.
- Zeus 1.9.3 builds the watch package with ZML 0.0.43 and device types 4.0.0.
  Runtime staging excludes tests/tools/previews. Archive inspection verifies the
  two fonts and licenses. Package size/hash/platform IDs are in build-report.json.

The official daily calendar returned real line 440 schedules for both configured
boarding stops on 2026-10-20. Morning was 2,180 bytes; return was 3,279 bytes. Both
route descriptors and boarding codes were validated. The explicit integration
probe checks today's two directions and tomorrow's morning; results and request
count are in artifacts/provider-probe.json. No live 440 bus was invented or claimed
outside its service period. Public numeric route IDs can change and then need
revalidation; mismatched schedules are rejected.

No GPS, background networking, remote assets, telemetry or keep-awake behavior
was added. Timetable fallback adds on-demand requests and a bounded 30-minute
phone cache. Battery and wire traffic have not been profiled on hardware.

The user confirmed version 0.2.1 running in their simulator and reported card
clipping. This revision addresses that geometry and expands desktop coverage;
actual simulator/native rendering, separate Reverse/card-body hit targets, router handoff and physical-watch acceptance remain pending.
The shortcut card still reads cache and opens the app for a fresh phone query.

Development dependencies retain the previously reported Zeus upstream audit
findings (45, including two critical); the production-only audit had zero.
No dependency overrides or security remediation are claimed by this UI/data change.

Installable output: dist/Meitar-Bus-0.5.1.zab. Personal-computer and simulator
instructions are in INSTALL.md. Documentation and automated tests cannot establish
physical Bluetooth behavior or an observed live 440 arrival.
