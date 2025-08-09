"""Life Skills integration for Home Assistant."""
import asyncio
import logging
from typing import Any, Dict

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from homeassistant.components.frontend import add_extra_js_url

from .services import async_setup_services, async_unload_services

_LOGGER = logging.getLogger(__name__)

DOMAIN = "life_skills"
PLATFORMS: list[Platform] = [Platform.SENSOR, Platform.NUMBER]

CONFIG_SCHEMA = vol.Schema(
    {
        DOMAIN: vol.Schema({})
    },
    extra=vol.ALLOW_EXTRA,
)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Life Skills component."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Life Skills from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = entry.data

    # Add the card script with debugging
    _LOGGER.error("LIFE SKILLS DEBUG: About to register frontend resources")
    
    www_path = hass.config.path("custom_components", DOMAIN, "www")
    _LOGGER.error(f"LIFE SKILLS DEBUG: www_path = {www_path}")
    
    # Check if file exists
    import os
    js_file = os.path.join(www_path, "life_skills_card.js")
    _LOGGER.error(f"LIFE SKILLS DEBUG: js_file = {js_file}")
    _LOGGER.error(f"LIFE SKILLS DEBUG: file exists = {os.path.exists(js_file)}")
    
    # Register static path
    await hass.http.async_register_static_paths([
        {"path": "/life_skills", "file_path": www_path}
    ])
    _LOGGER.error("LIFE SKILLS DEBUG: Static path registered")
    
    # Add the card script
    add_extra_js_url(hass, "/life_skills/life_skills_card.js")
    _LOGGER.error("LIFE SKILLS DEBUG: JS URL added")

    # Set up services
    await async_setup_services(hass)

    # Set up platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id)
        # Unload services
        await async_unload_services(hass)

    return unload_ok
