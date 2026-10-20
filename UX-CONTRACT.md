# Meitar Bus behavior contract

The user boards line 440 at Meitar Junction (14100) in the morning and Teddy
Stadium / Beitar (222) on return. The route shows the boarding town first and destination second. Station IDs are backend metadata and never appear in watch UI.

The user's explicit defaults are Meitar before 10:00, Jerusalem 10:00–18:00,
and tomorrow's Meitar from 18:00. Both times are editable, with evening required
to follow the return switch. Rules apply daily using Israel time, including DST.
Evening's target service date is tomorrow; after midnight it is today, preserving
the same morning schedule. Opposite-direction/date cache must never leak through.

The user's 2026-10-20 card overhaul removes direction switching from the card.
The app retains Reverse, which picks
the opposite boarding town for the current view; Reset restores the clock choice.
Refresh preserves that temporary selection. Pause/destroy clears it, and no
direction preference is saved. Both directions retain the automatic service date
(tomorrow after 18:00). The card always follows the time rule and opens the app
without an override. The card remains cache-only; missing data says Tap to check
and No saved ETA, never Ready or an invented prediction.

| Capability                        | Canonical owner                                                 | Source of truth                                     | Allowed variants                  | Verification                                         |
| --------------------------------- | --------------------------------------------------------------- | --------------------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| Journey and service date          | shared/config.js; shared/model.js; shared/time.js               | User's 10:00/18:00 instructions                     | morning / return / tomorrow       | tests/model.test.js; tests/schedule.test.js          |
| Temporary direction switch        | shared/model.js; shared/direction-button.js; page/controller.js | User's 2026-10-20 app-only direction control        | app only; Reverse / Reset         | tests/direction.test.js                              |
| Bounded watch cache               | shared/cache.js                                                 | Cache both directions without persisting selection  | legacy / two observations         | tests/direction.test.js                              |
| Native cache sharing              | shared/watch-storage.js                                         | Zepp LocalStorage instances retain loaded snapshots | fresh instance per read/write     | tests/watch-storage.test.js; tests/lifecycle.test.js |
| Arrival freshness and source      | shared/model.js                                                 | User's scheduled-fallback requirement               | live / scheduled / demo / empty   | tests/schedule.test.js                               |
| Shared UI vocabulary              | shared/presentation.js; shared/theme.js                         | User's 2026-10-20 palette/size redesign; DESIGN.md  | full watch / card                 | tests/design.test.js                                 |
| Refresh and page lifecycle        | page/controller.js                                              | No background network work                          | active / paused                   | tests/controller.test.js                             |
| Shortcut card focus and countdown | app-widget/controller.js                                        | Zepp card lifecycle                                 | build / focused / paused          | tests/card.test.js                                   |
| Card clipping-safe geometry       | app-widget/view.js                                              | User's observed card clipping and left shift        | margins / radii / narrow cards    | tests/design.test.js; scripts/render-preview.py      |
| Settings inputs and scrolling     | Zepp TextInput/Toggle                                           | Platform native UI                                  | two clock fields / demo           | tests/model.test.js; device validation               |
| Phone request and timetable cache | app-side/service.js; app-side/provider.js                       | On-demand data constraint                           | shared request / cached timetable | tests/service.test.js; tests/schedule.test.js        |

Green Live labels and ETA numerals require a fresh, explicitly live provider
entry. Scheduled ETA numerals and labels are amber. Demo/empty states use neutral
white; disconnected cached live values are muted. Strict false
entries are usable schedules, labelled amber Scheduled. Missing/failed current
feed falls back to the official daily timetable; tomorrow goes directly to that
calendar. Unknown flags, canceled entries and wrong stop/route data are rejected.
The app does not invent a departure when neither source has one.

Live predictions expire after 120 seconds. An actual stored future scheduled
time may replace an expired live prediction, switching its label and color.
Scheduled observations last up to 24 hours, limited by the selected service date
and arrival passing by more than 30 seconds. Both source labels show truthful
meaning; query check age does not claim to be the vehicle's last report age.
The compact UI omits the age line; freshness remains enforced by the shared model.
The app shows a bus icon, Live broadcast waves or Scheduled calendar, with labels.
The card uses larger text labels Live/Est. and abbreviates towns to MTR/JLM.
Nearby arrivals use minutes. An hour or more uses a clock; tomorrow is explicit.
Demo remains labelled and never uses green Live ETA.

Only opening/resuming the full app, swapping there, or tapping Refresh requests phone data. The
phone shares concurrent requests and throttles checks to 30 seconds per journey
and service date. Its daily timetable cache retains one date per direction for
30 minutes, without resetting original check age on reuse. A missing live result
can require a second request. Per-source 3.5/4.5-second guards fit inside the
phone's nine-second deadline and watch's 12-second response guard. Late page
responses cannot redraw after pause, timeout or a newer generation.

Both surfaces redraw locally every 15 seconds only while active/focused. The card
reads cache through a newly opened LocalStorage instance on build/resume, with no
storage reads on countdown ticks. A retained instance must not hide the app's
later writes. Its height is 264px and native margin/radius are respected. The
entire card is one open-app button; all higher text/decorative widgets disable
their gesture response. It has no direction control. Tap-to-open works on header,
ETA, route and surrounding space; it always fetches via the full app's lifecycle.
On the reported T-Rex 3 simulator, the native horizontal origin includes the
system margin. Apply that offset once to the whole card, including its hit targets;
the reported card width is not reduced again. The launcher icon uses transparency,
and the refresh head joins its arc without changing the action's target or label.
Timers clear on pause/destroy. Tap opens the app for a fresh phone check. Zepp's
documented card Bluetooth limitation still applies; no full-screen SecondaryWidget,
background service, GPS, alarms, polling, keep-awake, maps or telemetry are added.

Provider evidence and the remaining numeric-ID maintenance limitation are in
docs/PROVIDERS.md. Actual line 440 daily calendars in both directions were checked.
The user has run the previous app/card in the simulator; this revision's new card
geometry, native fonts and live Bluetooth flow still require simulator/watch QA.
