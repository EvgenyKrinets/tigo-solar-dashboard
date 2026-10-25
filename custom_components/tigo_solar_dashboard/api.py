"""WebSocket API for Tigo dashboard. Requires authenticated HA users."""
import base64
import math
import re
import uuid
import os
from pathlib import Path
from aiohttp import web
import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant
from .const import DOMAIN

FIELDS = ("power", "voltage_in", "voltage_out", "current_in", "current_out", "temperature", "energy", "rssi", "duty_cycle", "timestamp", "node_serial", "gateway_address")
PATTERN = re.compile(r"^sensor\.(?:tigotaptap|tigo)[_\-]([a-z]+[0-9]+)_(.+)$", re.I)

def discover(hass):
    groups = {}
    for state in hass.states.async_all("sensor"):
        m = PATTERN.match(state.entity_id)
        if not m or m.group(2) not in FIELDS:
            continue
        key = m.group(1).upper()
        groups.setdefault(key, {"id": key, "string": re.match(r"[A-Z]+", key).group(0), "entities": {}, "x": None, "y": None})
        groups[key]["entities"][m.group(2)] = state.entity_id
    return sorted(groups.values(), key=lambda x: (x["string"], int(re.search(r"\d+", x["id"]).group())))

def register(hass: HomeAssistant):
    websocket_api.async_register_command(hass, get_config)
    websocket_api.async_register_command(hass, scan)
    websocket_api.async_register_command(hass, save)
    websocket_api.async_register_command(hass, upload_roof)

@websocket_api.websocket_command({vol.Required("type"): "tigo_dashboard/get"})
@websocket_api.async_response
async def get_config(hass, connection, msg):
    connection.send_result(msg["id"], hass.data[DOMAIN]["data"])

@websocket_api.websocket_command({vol.Required("type"): "tigo_dashboard/discover"})
@websocket_api.async_response
async def scan(hass, connection, msg):
    connection.send_result(msg["id"], {"panels": discover(hass)})

@websocket_api.websocket_command({vol.Required("type"): "tigo_dashboard/save", vol.Required("panels"): list, vol.Optional("settings"): dict})
@websocket_api.async_response
async def save(hass, connection, msg):
    if not connection.user.is_admin:
        connection.send_error(msg["id"], "unauthorized", "Administrator required")
        return
    panels = msg["panels"]
    if len(panels) > 1000:
        connection.send_error(msg["id"], "invalid", "Too many panels")
        return
    clean = []
    ids = set()
    for panel in panels:
        if not isinstance(panel, dict):
            connection.send_error(msg["id"], "invalid", "Invalid panel")
            return
        panel_id = str(panel.get("id", ""))[:64]
        if not re.fullmatch(r"[A-Za-z0-9_-]+", panel_id) or panel_id in ids:
            connection.send_error(msg["id"], "invalid", "Invalid or duplicate panel ID")
            return
        ids.add(panel_id)
        entities = panel.get("entities", {})
        if not isinstance(entities, dict) or any(k not in FIELDS or not isinstance(v, str) or not v.startswith("sensor.") or len(v) > 255 for k,v in entities.items()):
            connection.send_error(msg["id"], "invalid", "Invalid entity mapping")
            return
        x, y = panel.get("x"), panel.get("y")
        if x is not None and (not isinstance(x, (int,float)) or not 0 <= x <= 100):
            connection.send_error(msg["id"], "invalid", "Invalid X")
            return
        if y is not None and (not isinstance(y, (int,float)) or not 0 <= y <= 100):
            connection.send_error(msg["id"], "invalid", "Invalid Y")
            return
        bar_entity = panel.get("barEntity", "")
        if not isinstance(bar_entity, str) or (bar_entity and (not re.fullmatch(r"sensor\.[a-z0-9_]+", bar_entity) or len(bar_entity)>255)):
            connection.send_error(msg["id"], "invalid", "Invalid bar sensor")
            return
        bar_min, bar_max = panel.get("barMin", 0), panel.get("barMax", 500)
        if any(isinstance(n, bool) or not isinstance(n, (int,float)) or not math.isfinite(n) or abs(n)>1_000_000_000 for n in (bar_min,bar_max)) or bar_min >= bar_max:
            connection.send_error(msg["id"], "invalid", "Invalid bar range")
            return
        clean.append({"id":panel_id, "string":str(panel.get("string", "Other"))[:32], "entities":entities, "x":x, "y":y, "barEntity":bar_entity, "barMin":bar_min, "barMax":bar_max})
    current = hass.data[DOMAIN]["data"]
    if "settings" in msg:
        settings = msg["settings"]
        fields = settings.get("markerFields", ["power"])
        if not isinstance(fields, list) or len(fields) > 9 or any(f not in FIELDS[:9] for f in fields):
            connection.send_error(msg["id"], "invalid", "Invalid marker fields")
            return
        size = settings.get("markerSize", 64)
        if isinstance(size, bool) or not isinstance(size, (int, float)) or not 36 <= size <= 150:
            connection.send_error(msg["id"], "invalid", "Invalid marker size")
            return
        marker_width = settings.get("markerWidth", size)
        marker_height = settings.get("markerHeight", size)
        if any(isinstance(n, bool) or not isinstance(n, (int, float)) or not low <= n <= high for n, low, high in ((marker_width, 32, 220), (marker_height, 28, 180))):
            connection.send_error(msg["id"], "invalid", "Invalid marker dimensions")
            return
        marker_rotation = settings.get("markerRotation", 0)
        if isinstance(marker_rotation, bool) or not isinstance(marker_rotation, (int, float)) or not math.isfinite(marker_rotation) or not -180 <= marker_rotation <= 180:
            connection.send_error(msg["id"], "invalid", "Invalid marker rotation")
            return
        layout = settings.get("markerLayout", "vertical")
        if layout not in ("vertical", "horizontal"):
            connection.send_error(msg["id"], "invalid", "Invalid marker layout")
            return
        def validate_styles(value, allowed):
            if not isinstance(value, dict) or len(value) > 1000:
                return None
            output = {}
            for key, style in value.items():
                if not isinstance(key, str) or key not in allowed or not isinstance(style, dict):
                    return None
                if set(style) - {"size", "width", "height", "layout", "rotation"}:
                    return None
                entry = {}
                if "size" in style:
                    n = style["size"]
                    if isinstance(n, bool) or not isinstance(n, (int, float)) or not 36 <= n <= 150:
                        return None
                    entry["size"] = int(n)
                for dimension, lower, upper in (("width", 32, 220), ("height", 28, 180)):
                    if dimension in style:
                        n = style[dimension]
                        if isinstance(n, bool) or not isinstance(n, (int, float)) or not lower <= n <= upper:
                            return None
                        entry[dimension] = int(n)
                if "rotation" in style:
                    rotation = style["rotation"]
                    if isinstance(rotation, bool) or not isinstance(rotation, (int, float)) or not math.isfinite(rotation) or not -180 <= rotation <= 180:
                        return None
                    entry["rotation"] = rotation
                if "layout" in style:
                    if style["layout"] not in ("vertical", "horizontal"):
                        return None
                    entry["layout"] = style["layout"]
                output[key] = entry
            return output
        strings = {p["string"] for p in clean}
        panel_ids = {p["id"] for p in clean}
        string_styles = validate_styles(settings.get("stringStyles", {}), strings)
        panel_styles = validate_styles(settings.get("panelStyles", {}), panel_ids)
        if string_styles is None or panel_styles is None:
            connection.send_error(msg["id"], "invalid", "Invalid per-string or per-panel styles")
            return
        bar_field = settings.get("barField", "none")
        if bar_field not in ("none", *FIELDS[:9]):
            connection.send_error(msg["id"], "invalid", "Invalid bar graph field")
            return
        bar_min, bar_max = settings.get("barMin", 0), settings.get("barMax", 500)
        if any(isinstance(n, bool) or not isinstance(n, (int, float)) or not math.isfinite(n) or abs(n) > 1_000_000_000 for n in (bar_min, bar_max)) or bar_min >= bar_max:
            connection.send_error(msg["id"], "invalid", "Invalid bar graph range")
            return
        rotate_seconds = settings.get("rotateSeconds", 4)
        if isinstance(rotate_seconds, bool) or not isinstance(rotate_seconds, (int, float)) or not math.isfinite(rotate_seconds) or not 1 <= rotate_seconds <= 120:
            connection.send_error(msg["id"], "invalid", "Rotation interval must be 1–120 seconds")
            return
        rotate_threshold = settings.get("rotateThreshold", 3)
        if isinstance(rotate_threshold, bool) or rotate_threshold not in (2, 3, 4):
            connection.send_error(msg["id"], "invalid", "Rotation threshold must be 2, 3 or 4")
            return
        summary_metrics = settings.get("summaryMetrics", ["power", "temperature"])
        allowed_summary = {"power", "temperature", "voltage_in", "voltage_out", "current_in", "current_out", "energy", "rssi"}
        if not isinstance(summary_metrics, list) or len(summary_metrics) > 8 or any(not isinstance(f, str) or f not in allowed_summary for f in summary_metrics):
            connection.send_error(msg["id"], "invalid", "Invalid statistics metrics")
            return
        gradient_field = settings.get("gradientField", "power")
        if gradient_field not in allowed_summary:
            connection.send_error(msg["id"], "invalid", "Invalid gradient metric")
            return
        gradient_color = settings.get("gradientColor", "#10b981")
        if not isinstance(gradient_color, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", gradient_color):
            connection.send_error(msg["id"], "invalid", "Invalid gradient color")
            return
        gradient_color_low = settings.get("gradientColorLow", "#1e3a8a")
        if not isinstance(gradient_color_low, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", gradient_color_low):
            connection.send_error(msg["id"], "invalid", "Invalid low-end gradient color")
            return
        current["settings"] = {"language": str(settings.get("language", "ru"))[:8] if settings.get("language") in ("ru", "en", "he") else "ru", "markerSize": int(size), "markerWidth": int(marker_width), "markerHeight": int(marker_height), "markerRotation": marker_rotation, "markerFields": fields, "gradient": settings.get("gradient", True) is True, "gradientField": gradient_field, "gradientColor": gradient_color, "gradientColorLow": gradient_color_low, "markerLayout": layout, "stringStyles": string_styles, "panelStyles": panel_styles, "mobileCompact": settings.get("mobileCompact", True) is True, "barField": bar_field, "barMin": bar_min, "barMax": bar_max, "rotateFields": settings.get("rotateFields", False) is True, "rotateSeconds": int(rotate_seconds), "rotateThreshold": rotate_threshold, "summaryMetrics": summary_metrics, "showPanelNames": settings.get("showPanelNames", True) is True}
    current["panels"] = clean
    await hass.data[DOMAIN]["store"].async_save(current)
    connection.send_result(msg["id"], current)

def _private_roof_folder(hass):
    return Path(hass.config.path(".storage", "tigo_solar_dashboard_roofs"))

def _private_roof_name(value):
    match = re.fullmatch(r"roof_([0-9a-f]{32})\.(jpg|png|webp)", value or "")
    return match.group(0) if match else None

def _load_private_roof(hass, name):
    folder = _private_roof_folder(hass)
    path = folder / name
    try:
        return path.read_bytes()
    except FileNotFoundError:
        return None

class RoofImageView(HomeAssistantView):
    """Serve the active roof image only to authenticated Home Assistant users."""

    url = "/api/tigo_solar_dashboard/roof/{filename}"
    name = "api:tigo_solar_dashboard:roof"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, filename: str) -> web.Response:
        if DOMAIN not in self.hass.data:
            raise web.HTTPNotFound()
        current = self.hass.data[DOMAIN]["data"].get("roof", "")
        safe_filename = _private_roof_name(filename)
        if safe_filename is None or _private_roof_name(current) != safe_filename:
            raise web.HTTPNotFound()
        blob = await self.hass.async_add_executor_job(
            _load_private_roof, self.hass, safe_filename
        )
        if blob is None:
            raise web.HTTPNotFound()
        extension = safe_filename.rsplit(".", 1)[-1]
        mime = {"jpg": "jpeg", "png": "png", "webp": "webp"}[extension]
        return web.Response(
            body=blob,
            content_type=f"image/{mime}",
            headers={"Cache-Control": "private, no-store"},
        )


def _migrate_legacy_roof(hass, name):
    """Move a legacy publicly exposed roof photo to private storage."""
    filename = _private_roof_name(name)
    if not filename:
        return False
    source = Path(hass.config.path("www", "tigo_solar_dashboard")) / filename
    target_folder = _private_roof_folder(hass)
    target_folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    target = target_folder / filename
    try:
        if target.exists():
            source.unlink(missing_ok=True)
            return True
        os.replace(source, target)
        return True
    except FileNotFoundError:
        return target.exists()

async def migrate_roof(hass):
    """Migrate old public images on startup before the dashboard is served."""
    data = hass.data[DOMAIN]["data"]
    roof = data.get("roof", "")
    prefix = "/local/tigo_solar_dashboard/"
    if not isinstance(roof, str) or not roof.startswith(prefix):
        return
    filename = _private_roof_name(roof[len(prefix):])
    if not filename:
        return
    success = await hass.async_add_executor_job(_migrate_legacy_roof, hass, filename)
    if success:
        data["roof"] = filename
        await hass.data[DOMAIN]["store"].async_save(data)

@websocket_api.websocket_command({vol.Required("type"): "tigo_dashboard/upload_roof", vol.Required("image"): str})
@websocket_api.async_response
async def upload_roof(hass, connection, msg):
    if not connection.user.is_admin:
        connection.send_error(msg["id"], "unauthorized", "Administrator required")
        return
    raw = msg["image"]
    match = re.fullmatch(r"data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)", raw)
    if not match or len(raw) > 11_000_000:
        connection.send_error(msg["id"], "invalid", "Use JPG, PNG or WebP, maximum 8 MB")
        return
    try:
        blob = base64.b64decode(match.group(2), validate=True)
    except ValueError:
        connection.send_error(msg["id"], "invalid", "Invalid image")
        return
    if len(blob) > 8_000_000 or not (blob.startswith(b"\xff\xd8\xff") or blob.startswith(b"\x89PNG\r\n\x1a\n") or (blob.startswith(b"RIFF") and blob[8:12] == b"WEBP")):
        connection.send_error(msg["id"], "invalid", "Invalid image type or size")
        return
    ext = {"jpeg":"jpg", "png":"png", "webp":"webp"}[match.group(1)]
    folder = _private_roof_folder(hass)
    await hass.async_add_executor_job(folder.mkdir, 0o700, True, True)
    filename = f"roof_{uuid.uuid4().hex}.{ext}"
    await hass.async_add_executor_job((folder / filename).write_bytes, blob)
    data = hass.data[DOMAIN]["data"]
    old = data.get("roof", "")
    data["roof"] = filename
    await hass.data[DOMAIN]["store"].async_save(data)
    old_private_name = _private_roof_name(old)
    if old_private_name and old_private_name != filename:
        await hass.async_add_executor_job((folder / old_private_name).unlink, True)
    elif isinstance(old, str) and old.startswith("/local/tigo_solar_dashboard/"):
        old_public_name = _private_roof_name(old[len("/local/tigo_solar_dashboard/"):])
        if old_public_name:
            old_public_path = Path(hass.config.path("www", "tigo_solar_dashboard")) / old_public_name
            await hass.async_add_executor_job(old_public_path.unlink, True)
    connection.send_result(msg["id"], {"roof": data["roof"]})
