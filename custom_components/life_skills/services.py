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
SERVICE_ADD_UNLOCK = "add_unlock"
SERVICE_REMOVE_UNLOCK = "remove_unlock"
SERVICE_CLEAR_UNLOCKS_FOR_LEVEL = "clear_unlocks_for_level"
SERVICE_IMPORT_UNLOCKS = "import_unlocks"

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

SERVICE_ADD_UNLOCK_SCHEMA = vol.Schema(
    {
        vol.Required("skill_name"): cv.string,
        vol.Required("level"): cv.positive_int,
        vol.Required("unlock_name"): cv.string,
        vol.Required("category"): cv.string,
        vol.Required("xp"): cv.positive_int,
        vol.Required("description"): cv.string,
        vol.Optional("custom_fields"): dict,
    }
)

SERVICE_REMOVE_UNLOCK_SCHEMA = vol.Schema(
    {
        vol.Required("skill_name"): cv.string,
        vol.Required("level"): cv.positive_int,
        vol.Required("unlock_name"): cv.string,
    }
)

SERVICE_CLEAR_UNLOCKS_FOR_LEVEL_SCHEMA = vol.Schema(
    {
        vol.Required("skill_name"): cv.string,
        vol.Required("level"): cv.positive_int,
    }
)

SERVICE_IMPORT_UNLOCKS_SCHEMA = vol.Schema(
    {
        vol.Required("skill_name"): cv.string,
        vol.Required("unlocks_data"): dict,
        vol.Optional("clear_existing", default=False): cv.boolean,
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

    async def add_unlock_service(call: ServiceCall) -> None:
        """Add an unlock to a skill at a specific level."""
        skill_name = call.data["skill_name"]
        level = call.data["level"]
        unlock_name = call.data["unlock_name"]
        category = call.data["category"]
        xp = call.data["xp"]
        description = call.data["description"]
        custom_fields = call.data.get("custom_fields", {})
        
        unlock_data = {
            "name": unlock_name,
            "category": category,
            "xp": xp,
            "description": description,
            **custom_fields
        }
        
        # Trigger an update event
        hass.bus.async_fire("life_skills_unlock_added", {
            "skill_name": skill_name,
            "level": level,
            "unlock_data": unlock_data
        })
        
        _LOGGER.info("Added unlock '%s' to %s at level %d", unlock_name, skill_name, level)

    async def remove_unlock_service(call: ServiceCall) -> None:
        """Remove an unlock from a skill at a specific level."""
        skill_name = call.data["skill_name"]
        level = call.data["level"]
        unlock_name = call.data["unlock_name"]
        
        # Trigger a removal event
        hass.bus.async_fire("life_skills_unlock_removed", {
            "skill_name": skill_name,
            "level": level,
            "unlock_name": unlock_name
        })
        
        _LOGGER.info("Removed unlock '%s' from %s at level %d", unlock_name, skill_name, level)

    async def clear_unlocks_for_level_service(call: ServiceCall) -> None:
        """Clear all unlocks for a skill at a specific level."""
        skill_name = call.data["skill_name"]
        level = call.data["level"]
        
        # Trigger a clear event
        hass.bus.async_fire("life_skills_unlocks_cleared", {
            "skill_name": skill_name,
            "level": level
        })
        
        _LOGGER.info("Cleared all unlocks for %s at level %d", skill_name, level)

    async def import_unlocks_service(call: ServiceCall) -> None:
        """Import bulk unlocks data for a skill."""
        skill_name = call.data["skill_name"]
        unlocks_data = call.data["unlocks_data"]
        clear_existing = call.data.get("clear_existing", False)
        
        # Validate the data structure
        import_count = 0
        error_count = 0
        validated_data = {}
        
        for level_str, unlocks in unlocks_data.items():
            try:
                level = int(level_str)
                validated_unlocks = []
                
                for unlock in unlocks:
                    try:
                        # Validate required fields
                        required_fields = ["name", "category", "xp", "description"]
                        for field in required_fields:
                            if field not in unlock:
                                raise ValueError(f"Missing required field: {field}")
                        
                        validated_unlocks.append(unlock)
                        import_count += 1
                    except Exception as err:
                        _LOGGER.warning("Failed to validate unlock %s at level %d: %s", 
                                      unlock.get("name", "unknown"), level, err)
                        error_count += 1
                
                if validated_unlocks:
                    validated_data[level_str] = validated_unlocks
                    
            except ValueError:
                _LOGGER.warning("Invalid level key: %s", level_str)
                error_count += 1
        
        # Trigger an import event
        hass.bus.async_fire("life_skills_unlocks_imported", {
            "skill_name": skill_name,
            "unlocks_data": validated_data,
            "clear_existing": clear_existing
        })
        
        _LOGGER.info("Imported %d unlocks for %s (%d errors)", 
                   import_count, skill_name, error_count)

    hass.services.async_register(
        "life_skills", SERVICE_ADD_XP, add_xp_service, schema=SERVICE_ADD_XP_SCHEMA
    )
    
    hass.services.async_register(
        "life_skills", SERVICE_SET_LEVEL, set_level_service, schema=SERVICE_SET_LEVEL_SCHEMA
    )
    
    hass.services.async_register(
        "life_skills", SERVICE_ADD_UNLOCK, add_unlock_service, schema=SERVICE_ADD_UNLOCK_SCHEMA
    )
    
    hass.services.async_register(
        "life_skills", SERVICE_REMOVE_UNLOCK, remove_unlock_service, schema=SERVICE_REMOVE_UNLOCK_SCHEMA
    )
    
    hass.services.async_register(
        "life_skills", SERVICE_CLEAR_UNLOCKS_FOR_LEVEL, clear_unlocks_for_level_service, schema=SERVICE_CLEAR_UNLOCKS_FOR_LEVEL_SCHEMA
    )
    
    hass.services.async_register(
        "life_skills", SERVICE_IMPORT_UNLOCKS, import_unlocks_service, schema=SERVICE_IMPORT_UNLOCKS_SCHEMA
    )


async def async_unload_services(hass: HomeAssistant) -> None:
    """Unload services."""
    hass.services.async_remove("life_skills", SERVICE_ADD_XP)
    hass.services.async_remove("life_skills", SERVICE_SET_LEVEL)
    hass.services.async_remove("life_skills", SERVICE_ADD_UNLOCK)
    hass.services.async_remove("life_skills", SERVICE_REMOVE_UNLOCK)
    hass.services.async_remove("life_skills", SERVICE_CLEAR_UNLOCKS_FOR_LEVEL)
    hass.services.async_remove("life_skills", SERVICE_IMPORT_UNLOCKS)
