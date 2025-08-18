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

# Load the card as a regular JavaScript file 
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

    # Add the card script
    js_url = f"/{DOMAIN}/life_skills_card.js"
    
    # Register the www directory to serve static files
    import os
    www_path = os.path.join(os.path.dirname(__file__), "www")
    
    # Register static files using the aiohttp router directly
    try:
        from homeassistant.components.http.static import CachingStaticResource
        hass.http.app.router.add_static(f"/{DOMAIN}", www_path, follow_symlinks=True)
        _LOGGER.debug(f"Life Skills: Successfully registered static directory at /{DOMAIN}")
    except Exception as e:
        _LOGGER.error(f"Life Skills: Failed to register static directory: {str(e)}")
        # If static registration fails, the card can still be accessed via manual setup
        pass
    
    # Add the card script to frontend
    try:
        add_extra_js_url(hass, js_url)
        _LOGGER.debug("Life Skills: Registered frontend resource %s", js_url)
    except Exception as e:
        _LOGGER.warning("Life Skills: Could not register frontend resource %s: %s", js_url, e)

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
