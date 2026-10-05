<p align="center">
  <img src="https://raw.githubusercontent.com/EvgenyKrinets/tigo-solar-dashboard/main/custom_components/tigo_solar_dashboard/brand/logo.png" width="112" alt="Tigo Solar Dashboard">
</p>

<h1 align="center">Tigo Solar Dashboard</h1>

<p align="center">
  A polished Home Assistant dashboard for visualizing Tigo optimizer data by panel and by string.
</p>

<p align="center">
  <img alt="Release" src="https://img.shields.io/github/v/release/EvgenyKrinets/tigo-solar-dashboard?display_name=tag">
  <img alt="Home Assistant" src="https://img.shields.io/badge/Home%20Assistant-2026.1%2B-41BDF5?logo=home-assistant&logoColor=white">
  <img alt="HACS" src="https://img.shields.io/badge/HACS-Custom-41BDF5">
  <img alt="Config Flow" src="https://img.shields.io/badge/Setup-UI%20Config%20Flow-success">
  <img alt="Languages" src="https://img.shields.io/badge/Languages-RU%20%7C%20EN%20%7C%20HE-informational">
</p>

---

## Overview

**Tigo Solar Dashboard** turns existing Tigo optimizer sensor entities in Home Assistant into a visual solar-array dashboard.

It automatically groups optimizer entities into panels and strings, provides live per-panel values, roof layout visualization, string summaries, selectable statistics, and native Home Assistant history access.

> **Important:** this integration is the dashboard and visualization layer. It expects Tigo optimizer sensor entities to already exist in Home Assistant.

## Highlights

| Feature | What it does |
| --- | --- |
| **Automatic panel discovery** | Detects Tigo entities and groups them by panel ID and string |
| **Roof layout** | Upload a roof image and place panels directly on it |
| **Drag & resize** | Move and resize panel markers in edit mode |
| **Live panel data** | Power, temperature, voltage, current, energy, RSSI and more |
| **String overview** | Instant totals and panel counts for every string |
| **Interactive statistics** | Minimum, maximum and average values for selected strings/panels |
| **Home Assistant history** | Click statistics to open the native Home Assistant history/details view |
| **Metric-based coloring** | Color panels by the selected metric using configurable low/high colors |
| **Offline handling** | Offline and unavailable panels are visually distinguished |
| **Desktop + mobile** | Responsive layout, with pinch zoom and panning on mobile |
| **Multilingual UI** | Russian, English and Hebrew, including RTL support |
| **UI-first configuration** | Designed to be configured from Home Assistant without manual YAML setup |

## Dashboard views

### System overview

The header provides a quick live summary of the installation:

- total PV power
- total panel count
- online panel count
- detected string count

Each string has its own compact summary card, and multiple strings can be selected for combined statistics.

### Selected panel statistics

Choose the metrics you want to see and the dashboard calculates:

- **Minimum**
- **Maximum**
- **Average**

for the currently selected panels or strings.

Statistics can be opened directly into Home Assistant's native entity history/details dialog.

### Roof map

Use your own roof image as the background and position each optimizer exactly where the physical module is installed.

Panel markers can display configurable values such as:

- Power
- Temperature
- Voltage In / Out
- Current In / Out
- Energy
- RSSI

Panel colors can follow any supported metric using configurable low/high gradient colors. Offline modules remain clearly visible.

## Installation

### HACS

1. Open **HACS** in Home Assistant.
2. Add this repository as a **Custom repository** with category **Integration**:
   `EvgenyKrinets/tigo-solar-dashboard`
3. Download **Tigo Solar Dashboard**.
4. Restart Home Assistant.
5. Go to **Settings → Devices & services → Add integration**.
6. Search for **Tigo Solar Dashboard**.

Future versions are published as GitHub Releases and can be updated through HACS.

### After an update

After installing a new version:

1. Restart Home Assistant if HACS requests it.
2. Hard-refresh the browser (`Ctrl+F5`) if the dashboard still shows cached frontend content.
3. On mobile, fully close and reopen the Home Assistant app if necessary.

## Entity discovery

The dashboard is designed for entity IDs following a panel/string structure, for example:

```text
sensor.tigotaptap_a01_power
sensor.tigotaptap_a01_temperature
sensor.tigotaptap_a01_voltage_in
sensor.tigotaptap_a01_voltage_out
sensor.tigotaptap_a01_current_in
sensor.tigotaptap_a01_current_out
sensor.tigotaptap_a01_energy
sensor.tigotaptap_a01_rssi
```

In this example:

- `A` = String A
- `01` = Panel 01

The dashboard is not limited to a fixed number of strings or panels.

## Configuration

Configuration is stored by the integration and edited directly from the dashboard.

You can configure:

- discovered/manual panel mappings
- roof image
- panel position and size
- marker orientation and fields
- marker display mode
- statistics metrics
- color-gradient metric
- low/high colors
- language
- per-string and per-panel display overrides

Use **Edit** mode for layout changes, then save the complete dashboard configuration.

## Supported metrics

| Metric | Typical unit |
| --- | --- |
| Power | W |
| Temperature | °C |
| Voltage In | V |
| Voltage Out | V |
| Current In | A |
| Current Out | A |
| Energy | kWh |
| RSSI | dBm |

Additional Tigo entities can remain available in Home Assistant even when they are not displayed on the roof marker.

## Current release

**v2.23.12**

Recent improvements include:

- repaired the frontend loading regression introduced in v2.23.10
- added compatibility panel tags so HACS can replace files safely before Home Assistant restarts
- kept the interactive multi-series 24-hour panel trend from v2.23.11

- added an interactive 24-hour multi-series trend to each selected panel
- toggle Power, Voltage, Current, Temperature, Energy and RSSI directly from the legend below the chart
- multiple sensor curves can be displayed at the same time with hover/touch value inspection

- automatic frontend cache-busting: future updates no longer require Ctrl+F5
- Lovelace resource URL is automatically updated to the installed release

- select multiple numeric sensors on a panel and open them together in Home Assistant History

- fixed selected-panel metric clicks opening Home Assistant history

- every selected-panel metric tile now opens its native Home Assistant entity history/details
- removed the built-in 24-hour power chart from the selected-panel card

- fixed statistics click handlers being lost during live sensor refreshes

- native Home Assistant history/details opening from statistic tiles
- improved desktop roof-image sizing
- mobile-only roof zoom controls
- mobile pinch zoom and panning
- configurable statistics and metric coloring
- Home Assistant / HACS branding assets
- automated versioned GitHub Releases for HACS updates

## Project links

- **Releases:** https://github.com/EvgenyKrinets/tigo-solar-dashboard/releases
- **Issues:** https://github.com/EvgenyKrinets/tigo-solar-dashboard/issues
- **Repository:** https://github.com/EvgenyKrinets/tigo-solar-dashboard

---

<p align="center">
  Built for clear, fast per-module solar monitoring inside Home Assistant.
</p>
