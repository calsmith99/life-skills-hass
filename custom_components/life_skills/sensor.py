"""Sensor platform for Life Skills integration."""
import logging
import math
from typing import Any, Dict, Optional

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.event import async_track_state_change_event

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Life Skills sensor platform."""
    skills = config_entry.data.get("skills", [])
    
    entities = []
    
    # Create level and xp_to_next sensors for each skill
    for skill in skills:
        skill_name = skill.get("name", "Unknown")
        skill_icon = skill.get("icon", "mdi:star")
        
        entities.append(LifeSkillLevelSensor(config_entry.entry_id, skill_name, skill_icon))
        entities.append(LifeSkillXpToNextSensor(config_entry.entry_id, skill_name, skill_icon))
    
    # Only create total level sensor if it doesn't exist yet
    total_level_entity_id = "sensor.life_skills_total_level"
    if not hass.states.get(total_level_entity_id):
        entities.append(LifeSkillsTotalLevelSensor())
    
    async_add_entities(entities)


def calculate_level_from_xp(xp: int) -> int:
    """Calculate level based on XP using custom formula."""
    if xp <= 0:
        return 1
    
    # Use the custom formula: sum of (n + 300 * (2^(n/7))) / 4
    total_sum = 0
    level = 1
    
    for n in range(1, 1000):  # Reasonable upper limit
        term = n + 300 * (2 ** (n / 7))
        total_sum += term
        xp_required = int(total_sum / 4)
        
        if xp_required <= xp:
            level = n + 1
        else:
            break
    
    return level


def calculate_xp_for_level(level: int) -> int:
    """Calculate XP required for a specific level."""
    if level <= 1:
        return 0
    
    # Calculate cumulative XP needed for the target level
    total_sum = 0
    
    for n in range(1, level):
        term = n + 300 * (2 ** (n / 7))
        total_sum += term
    
    return int(total_sum / 4)


def calculate_xp_to_next_level(current_xp: int) -> int:
    """Calculate XP needed to reach the next level."""
    current_level = calculate_level_from_xp(current_xp)
    next_level_xp = calculate_xp_for_level(current_level + 1)
    return max(0, next_level_xp - current_xp)


class LifeSkillLevelSensor(SensorEntity, RestoreEntity):
    """Sensor for skill level."""

    def __init__(self, entry_id: str, skill_name: str, skill_icon: str) -> None:
        """Initialize the sensor."""
        self._entry_id = entry_id
        self._skill_name = skill_name
        self._skill_icon = skill_icon
        self._attr_name = f"{skill_name} Level"
        self._attr_unique_id = f"{entry_id}_{skill_name}_level"
        self._attr_icon = skill_icon
        self._attr_native_unit_of_measurement = "level"
        self._state = 1

    @property
    def native_value(self) -> int:
        """Return the state of the sensor."""
        return self._state

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
        
        # Listen for XP changes
        self.async_on_remove(
            async_track_state_change_event(
                self.hass,
                f"number.{self._skill_name.lower().replace(' ', '_')}_xp",
                self._handle_xp_change,
            )
        )
        
        # Restore state
        if (restored := await self.async_get_last_state()) is not None:
            if restored.state and restored.state not in ("unknown", "unavailable"):
                try:
                    self._state = int(restored.state)
                except (ValueError, TypeError):
                    self._state = 1
            else:
                self._state = 1

    @callback
    def _handle_xp_change(self, event) -> None:
        """Handle XP changes."""
        new_state = event.data.get("new_state")
        if new_state and new_state.state and new_state.state not in ("unknown", "unavailable"):
            try:
                xp = int(float(new_state.state))
                self._state = calculate_level_from_xp(xp)
                self.async_write_ha_state()
            except (ValueError, TypeError):
                pass


class LifeSkillXpToNextSensor(SensorEntity, RestoreEntity):
    """Sensor for XP needed to reach next level."""

    def __init__(self, entry_id: str, skill_name: str, skill_icon: str) -> None:
        """Initialize the sensor."""
        self._entry_id = entry_id
        self._skill_name = skill_name
        self._skill_icon = skill_icon
        self._attr_name = f"{skill_name} XP to Next"
        self._attr_unique_id = f"{entry_id}_{skill_name}_xp_to_next"
        self._attr_icon = "mdi:arrow-up-bold"
        self._attr_native_unit_of_measurement = "XP"
        self._state = 83  # Default XP needed for level 2

    @property
    def native_value(self) -> int:
        """Return the state of the sensor."""
        return self._state

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
        
        # Listen for XP changes
        self.async_on_remove(
            async_track_state_change_event(
                self.hass,
                f"number.{self._skill_name.lower().replace(' ', '_')}_xp",
                self._handle_xp_change,
            )
        )
        
        # Restore state
        if (restored := await self.async_get_last_state()) is not None:
            if restored.state and restored.state not in ("unknown", "unavailable"):
                try:
                    self._state = int(restored.state)
                except (ValueError, TypeError):
                    self._state = 83  # Default XP needed for level 2
            else:
                self._state = 83  # Default XP needed for level 2

    @callback
    def _handle_xp_change(self, event) -> None:
        """Handle XP changes."""
        new_state = event.data.get("new_state")
        if new_state and new_state.state and new_state.state not in ("unknown", "unavailable"):
            try:
                xp = int(float(new_state.state))
                self._state = calculate_xp_to_next_level(xp)
                self.async_write_ha_state()
            except (ValueError, TypeError):
                pass


class LifeSkillsTotalLevelSensor(SensorEntity):
    """Sensor for total level across all skills globally."""

    def __init__(self) -> None:
        """Initialize the sensor."""
        self._attr_name = "Life Skills Total Level"
        self._attr_unique_id = "life_skills_total_level"
        self._attr_entity_id = "sensor.life_skills_total_level"
        self._attr_icon = "mdi:trophy"
        self._attr_native_unit_of_measurement = "level"
        self._state = 0

    @property
    def native_value(self) -> int:
        """Return the state of the sensor."""
        return self._state

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return extra attributes."""
        skill_levels = {}
        total_skills = 0
        
        # Find all life skill level sensors
        for entity_id, state in self.hass.states.all():
            if entity_id.startswith("sensor.") and entity_id.endswith("_level") and not entity_id.endswith("total_level"):
                # Check if this is a life skill entity by looking for corresponding XP entity
                xp_entity = entity_id.replace("_level", "_xp").replace("sensor.", "number.")
                if self.hass.states.get(xp_entity):
                    skill_name = entity_id.replace("sensor.", "").replace("_level", "").replace("_", " ").title()
                    if state and state.state not in ("unknown", "unavailable"):
                        try:
                            level = int(state.state)
                            skill_levels[skill_name] = level
                            total_skills += 1
                        except (ValueError, TypeError):
                            pass
        
        return {
            "skills_count": total_skills,
            "skill_levels": skill_levels,
        }

    async def async_added_to_hass(self) -> None:
        """When entity is added to hass."""
        await super().async_added_to_hass()
        
        # Calculate initial total
        self._calculate_total()
        
        # Set up a periodic update to check for changes
        # This is simpler than trying to listen to all state changes
        import asyncio
        async def periodic_update():
            while True:
                await asyncio.sleep(10)  # Update every 10 seconds
                if self.hass is not None:
                    self._calculate_total()
        
        # Start the periodic update task
        self.hass.async_create_task(periodic_update())

    def _calculate_total(self) -> None:
        """Calculate total level from all life skills."""
        total = 0
        
        # Find all life skill level sensors
        for entity_id, state in self.hass.states.all():
            if (entity_id.startswith("sensor.") and 
                entity_id.endswith("_level") and 
                not entity_id.endswith("total_level")):
                
                # Check if this is a life skill by looking for corresponding XP entity
                xp_entity = entity_id.replace("_level", "_xp").replace("sensor.", "number.")
                if self.hass.states.get(xp_entity):
                    if state and state.state not in ("unknown", "unavailable"):
                        try:
                            total += int(state.state)
                        except (ValueError, TypeError):
                            total += 1  # Default to level 1
                    else:
                        total += 1  # Default to level 1
        
        if total != self._state:
            self._state = total
            self.async_write_ha_state()
        self.async_write_ha_state()
