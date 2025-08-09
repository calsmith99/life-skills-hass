"""Services for Life Skills integration."""
import logging
from typing import Any, Dict

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv

from .sensor import calculate_level_from_xp, calculate_xp_for_level

_LOGGER = logging.getLogger(__name__)

SERVICE_ADD_XP = "add_xp"
SERVICE_SET_LEVEL = "set_level"

SERVICE_ADD_XP_SCHEMA = vol.Schema(
    {
        vol.Required("name"): cv.string,
        vol.Required("amount"): cv.positive_int,
    }
)

SERVICE_SET_LEVEL_SCHEMA = vol.Schema(
    {
        vol.Required("name"): cv.string,
        vol.Required("level"): cv.positive_int,
    }
)


async def async_setup_services(hass: HomeAssistant) -> None:
    """Set up services for Life Skills."""

    async def add_xp_service(call: ServiceCall) -> None:
        """Add XP to a skill."""
        skill_name = call.data["name"]
        amount = call.data["amount"]
        
        entity_id = f"number.{skill_name.lower().replace(' ', '_')}_xp"
        
        # Get current XP
        current_state = hass.states.get(entity_id)
        if not current_state:
            _LOGGER.error("Skill %s not found", skill_name)
            return
        
        try:
            current_xp = int(float(current_state.state))
            new_xp = current_xp + amount
            
            # Update the number entity
            await hass.services.async_call(
                "number",
                "set_value",
                {"entity_id": entity_id, "value": new_xp},
                blocking=True,
            )
            
            _LOGGER.info("Added %d XP to %s (now at %d XP)", amount, skill_name, new_xp)
        except (ValueError, TypeError) as err:
            _LOGGER.error("Error adding XP to %s: %s", skill_name, err)

    async def set_level_service(call: ServiceCall) -> None:
        """Set a skill to a specific level."""
        skill_name = call.data["name"]
        target_level = call.data["level"]
        
        entity_id = f"number.{skill_name.lower().replace(' ', '_')}_xp"
        
        # Calculate XP needed for target level
        required_xp = calculate_xp_for_level(target_level)
        
        # Update the number entity
        await hass.services.async_call(
            "number",
            "set_value",
            {"entity_id": entity_id, "value": required_xp},
            blocking=True,
        )
        
        _LOGGER.info("Set %s to level %d (%d XP)", skill_name, target_level, required_xp)

    hass.services.async_register(
        "life_skills", SERVICE_ADD_XP, add_xp_service, schema=SERVICE_ADD_XP_SCHEMA
    )
    
    hass.services.async_register(
        "life_skills", SERVICE_SET_LEVEL, set_level_service, schema=SERVICE_SET_LEVEL_SCHEMA
    )


async def async_unload_services(hass: HomeAssistant) -> None:
    """Unload services."""
    hass.services.async_remove("life_skills", SERVICE_ADD_XP)
    hass.services.async_remove("life_skills", SERVICE_SET_LEVEL)
