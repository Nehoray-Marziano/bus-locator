# Meitar Bus behavior contract

The watch interface shows boarding location, countdown, one freshness/recovery caption
and Refresh. Stop codes belong to configuration/provider logic and never appear
in the watch or card. Full stop names and the duplicate arrival clock are omitted. The heading is Meitar in the morning and Jerusalem from the configured switch time, identifying where the user boards.
`shared/presentation.js` owns concise labels; native views consume that vocabulary.

Business evidence: the user's commute brief and follow-up specify public line 440, morning stop 14100 (Metar Junction), return stop 222 (Teddy Stadium / Beitar), and time-of-day selection every day. No location permission is needed. Visual intent and runtime token ownership are in DESIGN.md.

The noon switch is a configurable initial assumption, not a claimed departure time. The settings value defaults to 12:00 Israel time. Before that time select 14100; at and after it select 222. Midnight switches back to the morning direction. There is no weekday filtering.

| Capability                          | Canonical owner                  | Source of truth                      | Allowed variants         | Verification              |
| ----------------------------------- | -------------------------------- | ------------------------------------ | ------------------------ | ------------------------- |
| Watch and card display states       | shared/model.js                  | User brief; freshness rules          | full app / cache card    | tests/model.test.js       |
| Refresh, busy state, timeout, pause | page/controller.js               | User battery/data constraint         | active / paused          | tests/controller.test.js  |
| Configuration and clock field       | shared/config.js; Zepp TextInput | User follow-up; Zepp settings API    | platform field           | tests/model.test.js       |
| Settings controls and scrolling     | Zepp platform components         | Official Zepp settings UI            | platform native          | Device validation pending |
| Phone request cache                 | app-side/service.js              | On-demand data constraint            | per direction and date   | tests/service.test.js     |
| Shortcut card focus and countdown   | app-widget/controller.js         | Zepp card lifecycle; freshness rules | build / focused / paused | tests/card.test.js        |

The provider's query `startTime` records when the result was checked. It does not expose the last vehicle report time, and the displayed age measures time since the query was checked. Results expire after 120 seconds. Only strict `isRealTime: true` entries qualify. A passed ETA stays Due for at most 30 seconds, then asks for refresh. Empty predictions mean no usable live prediction, not cancellation or proof that the bus has passed. Schedules are excluded from live results.

Opening/resuming the full app and explicitly tapping Refresh are the only request triggers. Local redraw happens every 15 seconds only while the page is active. There is no alarm, background watch service, GPS, telemetry, map or automatic network retry. The phone throttles to one HTTP request every 30 seconds for the current direction and date, with a temporary nine-second deadline. Late responses after a pause, timeout or newer generation cannot redraw the page.

The AppWidget shortcut card reads cache on build/resume, updates locally every 15 seconds while focused, and opens the app on tap. It clears its timer on pause/destroy and cannot initiate a phone fetch. Empty cache still selects the correct boarding location from defaults. Its availability must be tested on the user's firmware. Zepp lists T-Rex 3 SecondaryWidget support as NO; no SecondaryWidget is registered. The optional shortcut card is a distinct AppWidget surface and is not claimed as tested.

The provider is the public MOT journey-planner calendar API. It accepts the configured stop code and route descriptor, with no key or relay. See docs/PROVIDERS.md for primary source checks, observed responses and limitations. Public API access was checked locally; Bluetooth, Zepp phone fetch and firmware rendering still require device validation.
