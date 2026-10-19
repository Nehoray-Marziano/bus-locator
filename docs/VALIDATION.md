# Validation record

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
