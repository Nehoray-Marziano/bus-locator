# Data source validation

Checked on 2026-10-19. Runtime provider: the [official MOT journey planner](https://route.bus.gov.il/), using its public calendar endpoint:

`https://api.bus.gov.il/prod/mot-scheduler-prod/api/en/Calendar/GetRouteCalendarAtStopsByStopCodes`

Query parameters are `stopCodes` and `routeDesc`. The app sends only one fixed pair: morning `14100` / `10440-2-#`; return `222` / `10440-1-#`. The hash is URI-encoded. No authentication, server, GTFS download, location request, map, analytics or provider SDK is used.

The official `Stops/RefreshStopTimesAtStop` response confirmed morning line 440 and descriptor `10440-2-#`. The opposite descriptor follows the route's direction 1 convention; its full stop-discovery response repeatedly timed out locally, so confirming that mapping during service is a remaining device/integration check. Both configured calendar requests returned HTTP 200 with valid null/no-upcoming-service payloads at the time of validation. This checks connectivity and the empty state; it does not prove a live 440 arrival.

A separate live request for line 250 at the same physical stop returned a 1,015-byte response containing both `isRealTime: true` and `false` entries, `arrivalTime`, `minutesToArrival`, and `startTime`. This verified the real response shape without inventing a 440 prediction outside its operating period. Only strict true entries are used; coordinates present in provider responses are ignored and are never sent to the watch or saved by the app.

`startTime` is the provider query time, not a vehicle observation timestamp. The screen says "checked" accordingly. The application cannot measure how recently the operator reported the underlying vehicle. Unzoned provider dates are interpreted as Israel local time, including DST. Responses older than two minutes, future searches and mismatched stop payloads are rejected.

Run `npm run check:provider` to make exactly two explicit integration requests and save `artifacts/provider-probe.json`. Automated tests use synthetic provider fixtures; integration probes run separately. Zepp phone fetch and Bluetooth still need physical-device checks. Public web endpoints are subject to changes and availability; there is no SLA or claimed official SDK contract.

## Open Bus evidence

Open Bus does ingest real-time data. The distinction is the fields its public interfaces expose:

- [Current collector documentation](https://github.com/hasadna/open-bus-siri-requester/blob/main/SIRI.md) describes its `AllActiveTripsFilter` snapshot mode as vehicle positions without predictions.
- [Stride API schema](https://open-bus-stride-api.hasadna.org.il/openapi.json) documents `/stop_arrivals/list` as currently returning planned times.
- [Maintained map-search station service](https://github.com/hasadna/open-bus-map-search/blob/main/src/api/siriService.ts) looks up vehicle observations around a chosen time and finds the location nearest the stop. It does not calculate a future ETA.

These sources are useful for analysis and discovery; this app needs the public planner's explicitly marked stop predictions.
