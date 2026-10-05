"""Tigo dashboard: uses existing Tigo sensors; does not control inverter/optimizers."""
from pathlib import Path
import inspect
from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from .const import DOMAIN, STORAGE_VERSION
from . import api

async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    return True

async def async_setup_entry(hass: HomeAssistant, entry) -> bool:
    if DOMAIN in hass.data:
        return True
    store = Store(hass, STORAGE_VERSION, DOMAIN)
    data = await store.async_load() or {"panels": [], "roof": "", "settings": {}}
    hass.data[DOMAIN] = {"store": store, "data": data, "entry_id": entry.entry_id}
    js_path = Path(__file__).parent / "frontend" / "tigo-dashboard.js"
    await hass.http.async_register_static_paths([
        StaticPathConfig("/tigo_solar_dashboard/tigo-dashboard.js", str(js_path), False)
    ])
    api.register(hass)
    panel_result = panel_custom.async_register_panel(
        hass,
        webcomponent_name="tigo-solar-panel-v2-23-17",
        frontend_url_path="tigo-solar",
        module_url="/tigo_solar_dashboard/tigo-dashboard.js?v=2.23.17",
        sidebar_title="Tigo Solar",
        sidebar_icon="mdi:solar-panel-large",
        require_admin=False,
        config={},
    )
    if inspect.isawaitable(panel_result):
        await panel_result
    return True

async def async_unload_entry(hass: HomeAssistant, entry) -> bool:
    if DOMAIN in hass.data:
        frontend.async_remove_panel(hass, "tigo-solar")
        hass.data.pop(DOMAIN)
    return True
