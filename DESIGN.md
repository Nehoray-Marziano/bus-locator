---
version: alpha
name: Meitar Bus
description: A quiet countdown in plum, cream and peach for a round watch.
colors:
  background: '#1c1624'
  primary: '#f0baa0'
  text: '#fff5e9'
  muted: '#beb0ca'
  warning: '#f0c783'
  surface: '#34283f'
  panel: '#f4e8dc'
  ink: '#302439'
  panelMuted: '#705e70'
  success: '#bad6c0'
  pressed: '#dba38c'
typography:
  display:
    fontFamily: 'Meitar Sans (DM Sans subset)'
    fontSize: '128px'
  body:
    fontFamily: 'Meitar Sans (DM Sans subset)'
    fontSize: '24px'
  utility:
    fontFamily: 'Meitar Sans (DM Sans subset)'
    fontSize: '20px'
rounded:
  DEFAULT: '25px'
spacing:
  safe-inset: '64px'
components:
  arrival-panel: {}
  refresh-button: {}
  shortcut-card: {}
---

# Meitar Bus design system

## Overview

User-approved palette: “Soft luxury — plum, cream, peach; rounded typography.”
The subsequent correction takes priority: very little text, no station codes,
and a cleaner font. The primary information is the boarding location and minutes
remaining. Line 440, a small freshness caption and Refresh complete the screen.
The condensed display face, split ticket, origin, stop information, duplicate
arrival clock and decorative perimeter have been removed.

English labels follow the existing app. Israel time selects direction every
day. Phone settings retain Zepp's native controls and typography. No Hebrew font
coverage is promised.

`shared/theme.js` owns runtime tokens; this file mirrors them. Native widgets use
that module directly. `tests/design.test.js` checks color drift, contrast, font
assets and the absence of backend stop codes in the visible watch UI.
`shared/presentation.js` owns short state labels shared by app and card.
The DESIGN.md linter's orphan-token warnings are expected for empty component
maps: native component bindings live in JavaScript and are checked by tests.

## Colors

Deep plum provides the canvas. A cream panel holds the countdown in dark plum
ink. Peach marks line 440 and Refresh. Muted lilac carries freshness and recovery
text. A sage green dot accompanies Live only. Amber accompanies the explicit expired state. All text/surface pairings
meet 4.5:1 contrast. Status never depends on color alone.

## Typography

Use one clean, rounded family: DM Sans, weight 500, optical size 22. The static
Latin subset is renamed Meitar Sans and bundled with its OFL license under
assets/trex3/fonts. It occupies 19,692 bytes and requires no runtime download.
The original source is the Google Fonts DM Sans variable font; the optional
preparation script creates this subset from .tooling/fonts/dm-sans.ttf.

Countdown: 128px, reducing to 104px for three characters. Boarding location: 36px.
Recovery heading: 32px. Button: 24px. Caption and unit: 20px. Whole minutes round
up. Due replaces zero. No blinking or animated seconds.

## Layout

The 480×480 screen has a small centered route badge, boarding location, one 336×174
cream countdown panel, one short caption and a fixed 190×48 refresh button.
No secondary journey details, station codes or duplicate clock appear. Loading and failure
states use the same panel with a short heading and recovery caption. All states
reuse existing widgets with stable geometry. Three-digit waits and round-screen
text bounds have explicit render coverage.

The optional shortcut card scales to supplied bounds, showing boarding location,
countdown and one small caption. Tap opens the app. No station code appears.

## Elevation & Depth

Flat color and spacing establish hierarchy. There are no images, shadows,
gradients, blur, decoration, keep-awake behavior or animation. Rendering uses
native text, rounded rectangles and a button.

## Shapes

The panel uses a 38px radius. Refresh is a peach pill with 25px radius. The small
route badge uses an 18px radius. The card follows the firmware-supplied radius.
The original app icon is a simple peach bus on plum.

## Components

Live and Due show a countdown and one freshness caption. Demo always says Demo.
Checking, ready, no live ETA, expired, refresh needed, offline and settings
replace the countdown with short, actionable copy. Expired results lose their
number after 120 seconds. Busy refresh is guarded by the existing controller;
the native button supplies press feedback.

The cache-only card never fetches. A local 15-second countdown timer runs only while focused and is cleared on pause/destroy. Its availability remains
unverified on firmware. Zepp owns settings inputs, toggle, scrolling and focus.
There are no custom popups, forms, tables, search, destructive actions or toasts.

## Do's and Don'ts

- Do prioritize boarding location and remaining minutes above all other information.
- Do keep demo and expired data explicit, with concise recovery instructions.
- Do render native widget commands using the actual bundled font before shipping.
- Don't expose station codes or repeat origin, stop and clock information.
- Don't add GPS, background polling, remote fonts or decorative motion.
