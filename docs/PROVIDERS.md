# Data source validation

Checked on 2026-10-19 against the [official MOT planner](https://route.bus.gov.il/)
and its currently deployed JavaScript clients. No GTFS/SIRI client, authentication
key, relay, location request or provider SDK is used.

## Live and scheduled arrivals

`Calendar/GetRouteCalendarAtStopsByStopCodes` accepts `stopCodes` and `routeDesc`.
The fixed pairs are `14100` / `10440-2-#` and `222` / `10440-1-#`.
Strict `isRealTime: true` means live; strict false means scheduled. Other values,
canceled entries, invalid dates, old query timestamps and mismatched stops are
rejected. The earliest valid arrival wins, including when it is scheduled and a
later bus has a live prediction. `staticArrivalTime`, when present and in
the future, is retained as an honest fallback after live data expires.

`startTime` is query time, not the vehicle's last report. The app uses it for
cache expiry and cannot measure the underlying vehicle report's freshness.
Coordinates are discarded. Real-time 440 service still needs comparison on watch.

## Daily timetable and tomorrow

The official frontend's daily-calendar request is
`Calendar/GetRouteDailyCalendar?routeId=...&startStopId=...&endStopId=...&day=...`.
Unlike the live endpoint, this supports an explicit service date. Supplying
`day`, `dateTime` or `startTime` to the live endpoint was experimentally shown to
be ignored; the implementation therefore uses the daily endpoint for tomorrow.

Verified metadata (not GPS):

| Direction           | Route ID | Boarding stop ID / code | End stop ID |
| ------------------- | -------- | ----------------------- | ----------- |
| Meitar to Jerusalem | 28879    | 26745 / 14100           | 11734       |
| Jerusalem to Meitar | 28878    | 8750 / 222              | 27918       |

Actual 2026-10-20 daily responses returned line 440 at the correct boarding codes
and route descriptors in both directions. The morning response was 2,180 bytes
and included 06:18 and 11:28. Return was 3,279 bytes and included 07:08:59,
10:28:59 and 14:58:59. These are dated observations, not hardcoded departures.
The implementation uses only the boarding rows and validates stop code, route
ID and route descriptor before accepting a time. If MOT changes numeric IDs,
those configured IDs need revalidation; wrong-route data is rejected.

A missing/failed current feed triggers timetable fallback. Tomorrow skips the
live query. When a date has no remaining departures, the next date is queried,
through seven calendar days ahead. Timetable arrays, including empty days, are
cached on the phone for 30 minutes, bounded to eight dates per direction, and
filtered against the current time on reuse. No
continuous downloads occur. Returned scheduled observations retain their original
check timestamp and remain visibly scheduled for up to 24 hours before expiry.
The combined request path has one eight-second budget inside the phone's
nine-second guard. No additional date request starts once that budget expires.
Calendar failures propagate as unavailable; an empty live feed cannot turn an
unknown future timetable into a false no-arrivals result.

Scheduled observations store the actual departure date. Phone validation and
watch/cache matching accept later service days for the same direction through
the search horizon, replacing the old exact-date match and 36-hour cutoff.
Both surfaces show Today, Tomorrow or a weekday/date. Old observations, passed
departures, wrong stops/routes and the opposite direction remain invalid.

Run `npm run check:provider` for today's two directions and tomorrow's morning,
plus phone-service/watch-model checks for both directions. The 2026-10-20 probe
used nine HTTP calls and found tomorrow's 06:18 Meitar departure and 07:08
Jerusalem departure, both scheduled. These are dated observations, not promises
or hardcoded departures. The resulting source, actual arrival date,
clock time and request count are in artifacts/provider-probe.json. Unit tests
use synthetic fixtures. Public endpoints have no SLA and may change. No fresh
time is fabricated when both sources fail or no service is returned.

## Open Bus evidence

Open Bus does ingest real-time data. The distinction is the fields its public interfaces expose:

- [Current collector documentation](https://github.com/hasadna/open-bus-siri-requester/blob/main/SIRI.md) describes its `AllActiveTripsFilter` snapshot mode as vehicle positions without predictions.
- [Stride API schema](https://open-bus-stride-api.hasadna.org.il/openapi.json) documents `/stop_arrivals/list` as currently returning planned times.
- [Maintained map-search station service](https://github.com/hasadna/open-bus-map-search/blob/main/src/api/siriService.ts) looks up vehicle observations around a chosen time and finds the location nearest the stop. It does not calculate a future ETA.

These sources are useful for analysis and discovery; this app uses the public planner's stop predictions and daily timetable, with explicit source labels.
