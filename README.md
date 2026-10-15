<p align="center">
  <img src="https://raw.githubusercontent.com/EvgenyKrinets/tigo-solar-dashboard/v2.23.43/custom_components/tigo_solar_dashboard/brand/logo.png" width="120" alt="Tigo Solar Dashboard logo">
</p>

<h1 align="center">Tigo Solar Dashboard for Home Assistant</h1>

<p align="center">
  <strong>Interactive module-level solar monitoring for Tigo optimizers — on your own roof map.</strong><br>
  Live panel metrics, multi-panel comparison, historical charts and visual array editing, all inside Home Assistant.
</p>

<p align="center">
  <a href="https://github.com/EvgenyKrinets/tigo-solar-dashboard/releases"><img alt="Latest release" src="https://img.shields.io/github/v/release/EvgenyKrinets/tigo-solar-dashboard"></a>
  <a href="https://github.com/EvgenyKrinets/tigo-solar-dashboard/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/EvgenyKrinets/tigo-solar-dashboard"></a>
  <img alt="Home Assistant integration" src="https://img.shields.io/badge/Home%20Assistant-custom%20integration-41BDF5">
  <img alt="Languages" src="https://img.shields.io/badge/UI-Russian%20%7C%20English%20%7C%20Hebrew-blue">
</p>

> [!IMPORTANT]
> **This integration visualizes existing Tigo optimizer entities; it does not communicate directly with optimizers or a Tigo gateway.** Add an integration or data source that provides Tigo entities to Home Assistant first.

## What you can do

| Feature | Description |
| --- | --- |
| **Automatic discovery** | Organize existing Tigo entities by panel ID and string, with manual mapping when needed |
| **Photo-based roof layout** | Upload a photo of your installation; drag, resize and rotate individual panel markers |
| **Group editing** | Select panels by dragging a rectangle, highlight the selection, adjust spacing and move the group |
| **Live monitoring** | Show power, temperature, input/output voltage, input/output current, energy and RSSI |
| **Interactive panel statistics** | Compare minimum, maximum and average readings for selected strings/panels |
| **Historical trends** | Display several metrics and several panels on the same chart, with period and date-range selection |
| **Export** | Export loaded trend data as CSV or the rendered chart as PNG |
| **Color visualization** | Apply a configurable metric-based gradient with offline/no-data indication |
| **Home Assistant dashboard** | Open the dedicated Tigo Solar page or add widgets to Lovelace dashboards |
| **Languages** | Russian, English and Hebrew (RTL) |

## Requirements

- Home Assistant **2026.1 or newer**, as currently declared by this project's HACS metadata.
- An existing source of Tigo optimizer sensors in Home Assistant.
- HACS for simple installation and future updates (recommended).

### Supported entity naming

Automatic discovery supports panel/string naming similar to:

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

In this example, `A` identifies the string and `01` the panel. Panel counts and string counts are not fixed. Other source integrations may need manual entity mapping.

## Installation with HACS

Until this project is accepted into HACS's default catalog, add it as a custom integration repository:

1. Open **HACS** in Home Assistant.
2. Open the HACS custom repositories menu.
3. Enter `https://github.com/EvgenyKrinets/tigo-solar-dashboard` and choose **Integration**.
4. Install **Tigo Solar Dashboard** and restart Home Assistant.
5. Open **Settings → Devices & services → Add integration**, then search for **Tigo Solar Dashboard**.
6. Open **Tigo Solar** from Home Assistant's sidebar.

If HACS later accepts the project into its default catalog, the custom-repository step will no longer be needed for new users.

## Getting started

1. Ensure your Tigo sensor entities already update in Home Assistant.
2. Open Tigo Solar and discover available panels.
3. Enter **Edit** mode and upload a roof photo if desired.
4. Drag panels into the correct locations. Configure marker size, rotation, displayed metrics and coloring.
5. For group changes, select **Custom group**, drag a selection rectangle on the roof, then adjust or move the group.
6. Choose **Save** to commit changes or **Cancel** to discard unsaved edits.

### History and comparison

Select a panel and use the Trend section to choose one or more metrics. Add several panels to compare their data on the same timeline. Available period controls include Day, Week, Month, Year and a custom date range. Click a metric card for Home Assistant's native entity history dialog. Use **Export → CSV/PNG** to save the displayed trend.

> Historical availability depends on your Home Assistant Recorder configuration and retained data. For long date ranges, the dashboard reduces displayed sample density; it cannot recover data that Recorder no longer stores.

## Dashboard and integration configuration

The integration stores panel mappings, roof positions and presentation settings through Home Assistant. Configuration includes per-panel and per-string overrides, rotation, marker values, gradient colors, mobile behavior and localized labels.

The integration creates a Tigo Solar sidebar panel and can create a Lovelace dashboard and reusable widget cards. Some features require administrator access.

## Updates

Releases are published on the [GitHub Releases page](https://github.com/EvgenyKrinets/tigo-solar-dashboard/releases). Update from HACS, and restart Home Assistant when requested.

If a frontend change appears stale, restart the Home Assistant mobile application or reload the browser. Report repeated update/cache problems in [Issues](https://github.com/EvgenyKrinets/tigo-solar-dashboard/issues).

## Limitations and notes

- This is an **independent community project**, not an official Tigo Energy or Home Assistant integration.
- Discovery, available metrics and historical data depend on the Tigo entity source already installed.
- CSV and PNG exports describe the loaded, displayed data; long-range points may be downsampled.
- Roof layouts are visual representations, not electrical wiring diagrams.

## Support and development

- [Report a bug or request a feature](https://github.com/EvgenyKrinets/tigo-solar-dashboard/issues)
- [Download a release](https://github.com/EvgenyKrinets/tigo-solar-dashboard/releases)
- [Source code](https://github.com/EvgenyKrinets/tigo-solar-dashboard)

Contributions and reproducible issue reports are welcome. Please include your Home Assistant version, dashboard release version, relevant logs and clear steps to reproduce a problem. Do not post credentials or private gateway data.

---

Made for clear, practical module-level solar monitoring in Home Assistant.
