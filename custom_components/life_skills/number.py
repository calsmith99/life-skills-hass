"""Number platform for Life Skills integration."""
import logging
from typing import Any, Dict, Optional

from homeassistant.components.number import NumberEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Life Skills number platform."""
    skills = config_entry.data.get("skills", [])
    
    entities = []
    
    # Create XP number for each skill
    for skill in skills:
        skill_name = skill.get("name", "Unknown")
        skill_icon = skill.get("icon", "mdi:star")
        initial_xp = skill.get("xp", 0)
        
        entities.append(LifeSkillXpNumber(config_entry.entry_id, skill_name, skill_icon, initial_xp))
    
    async_add_entities(entities)


class LifeSkillXpNumber(NumberEntity, RestoreEntity):
    """Number entity for skill XP."""

    def __init__(self, entry_id: str, skill_name: str, skill_icon: str, initial_xp: int) -> None:
        """Initialize the number entity."""
        self._entry_id = entry_id
        self._skill_name = skill_name
        self._skill_icon = skill_icon
        self._initial_xp = initial_xp
        
        self._attr_name = f"{skill_name} XP"
        self._attr_unique_id = f"{entry_id}_{skill_name}_xp"
        self._attr_icon = skill_icon
        self._attr_native_min_value = 0
        self._attr_native_max_value = 999999
        self._attr_native_step = 1
        self._attr_native_value = initial_xp
        self._attr_native_unit_of_measurement = "XP"
        self._attr_mode = "box"

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return extra attributes."""
        return {
            "skill_name": self._skill_name,
            "entry_id": self._entry_id,
        }

    async def async_added_to_hass(self) -> None:
        """When entity is added to hass."""
        await super().async_added_to_hass()
        
        # Restore previous state
        if (restored := await self.async_get_last_state()) is not None:
            if restored.state and restored.state != "unknown":
                try:
                    self._attr_native_value = float(restored.state)
                except (ValueError, TypeError):
                    self._attr_native_value = self._initial_xp

    async def async_set_native_value(self, value: float) -> None:
        """Set new value."""
        self._attr_native_value = value
        self.async_write_ha_state()
