# Validation record

Implementation checks: 2026-10-19, version 0.2.1.

- 61 deterministic Node tests cover direction selection, Israel DST, live-only
  predictions, expiry, errors, throttling, transport timeouts and late responses.
  UI checks cover contrast, round-screen shapes, stable widget allocation,
  bundled font assets, hidden station codes and the live-only green dot.
- Boarding location is Meitar before noon and Jerusalem from noon in app/card;
  underlying provider stop/direction selection is unchanged. Shortcut-card tests
  verify focused-only countdown/expiry, timer cleanup, first-install cache
  fallback, no storage reads during timer ticks, and the noon boundary.
- TypeScript and syntax checks cover all 16 application modules.
- Eleven states render from the actual native widget commands and the bundled
  DM Sans font: morning, return, Due, three-digit wait, loading, first opening,
  expired, no prediction, settings, disconnected and demo. Text bounds pass.
  A separate card preview covers the cache-only surface. These desktop renders
  approximate Zepp font metrics; they are not simulator screenshots.
- The strict design project audit has zero findings. DESIGN.md lint has zero
  errors; orphan-token warnings reflect JavaScript-owned native bindings rather
  than frontmatter component definitions. Color drift is tested separately.
- Zeus 1.9.3 builds the installable package with ZML 0.0.43 and device types 4.0.0.
  Runtime-only staging excludes development scripts, tests and previews. Archive
  inspection checks the packaged font and license. See artifacts/build-report.json
  for archive entries, byte size, hash and target platform IDs.

Provider checks from the preceding implementation remain unchanged by this
visual revision. Both configured line 440 calendar requests returned HTTP 200
with valid null payloads. A separate line 250 response at stop 14100 confirmed
the live/scheduled response schema. This does not claim a successful live 440
prediction. See artifacts/provider-probe.json and docs/PROVIDERS.md.

No GPS, background service, network polling, remote font or keep-awake behavior
was added. Foreground countdown redraw remains local. The age beside Live is
the time since the provider query was checked, not the last vehicle report.

Physical installation, Bluetooth requests from Zepp, font rendering on the
watch, battery consumption and the final line 440 comparison remain pending.
The optional AppWidget card needs firmware confirmation; T-Rex 3 has no documented
third-party SecondaryWidget support. No simulator or physical-watch test is claimed.

The installable output is dist/Meitar-Bus-0.2.1.zab. Installation and device
acceptance steps are in INSTALL.md.
