"""Sensor platform for Life Skills integration."""
import logging
import math
import json
from typing import Any, Dict, Optional

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.storage import Store

_LOGGER = logging.getLogger(__name__)
STORAGE_VERSION = 1
STORAGE_KEY = "life_skills_unlocks"


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Life Skills sensor platform."""
    skills = config_entry.data.get("skills", [])
    
    entities = []
    
    # Create level, xp_to_next, and unlocks sensors for each skill
    for skill in skills:
        skill_name = skill.get("name", "Unknown")
        skill_icon = skill.get("icon", "mdi:star")
        
        entities.append(LifeSkillLevelSensor(config_entry.entry_id, skill_name, skill_icon))
        entities.append(LifeSkillXpToNextSensor(config_entry.entry_id, skill_name, skill_icon))
        entities.append(LifeSkillUnlocksSensor(config_entry.entry_id, skill_name, skill_icon))
    
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


class LifeSkillUnlocksSensor(SensorEntity, RestoreEntity):
    """Sensor for skill unlocks at current level."""

    def __init__(self, entry_id: str, skill_name: str, skill_icon: str) -> None:
        """Initialize the sensor."""
        self._entry_id = entry_id
        self._skill_name = skill_name
        self._skill_icon = skill_icon
        self._attr_name = f"{skill_name} Unlocks"
        self._attr_unique_id = f"{entry_id}_{skill_name}_unlocks"
        self._attr_icon = "mdi:lock-open"
        self._state = "loaded"
        self._unlocks_data = {}

    @property
    def native_value(self) -> str:
        """Return the state of the sensor."""
        return self._state

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return extra attributes."""
        return {
            "skill_name": self._skill_name,
            "entry_id": self._entry_id,
            "unlocks": json.dumps(self._unlocks_data),
        }

    async def async_added_to_hass(self) -> None:
        """When entity is added to hass."""
        await super().async_added_to_hass()
        
        # Load unlocks data from storage
        await self._load_unlocks_data()
        
        # Listen for level changes
        self.async_on_remove(
            async_track_state_change_event(
                self.hass,
                f"sensor.{self._skill_name.lower().replace(' ', '_')}_level",
                self._handle_level_change,
            )
        )
        
        # Listen for unlock management events
        self.async_on_remove(
            self.hass.bus.async_listen("life_skills_unlock_added", self._handle_unlock_added)
        )
        self.async_on_remove(
            self.hass.bus.async_listen("life_skills_unlock_removed", self._handle_unlock_removed)
        )
        self.async_on_remove(
            self.hass.bus.async_listen("life_skills_unlocks_cleared", self._handle_unlocks_cleared)
        )
        self.async_on_remove(
            self.hass.bus.async_listen("life_skills_unlocks_imported", self._handle_unlocks_imported)
        )

    async def _load_unlocks_data(self) -> None:
        """Load unlocks data from storage."""
        store = Store(self.hass, STORAGE_VERSION, f"{STORAGE_KEY}_{self._entry_id}_{self._skill_name.lower().replace(' ', '_')}")
        data = await store.async_load()
        if data:
            self._unlocks_data = data.get("unlocks", {})
        else:
            self._unlocks_data = {}

    async def _save_unlocks_data(self) -> None:
        """Save unlocks data to storage."""
        store = Store(self.hass, STORAGE_VERSION, f"{STORAGE_KEY}_{self._entry_id}_{self._skill_name.lower().replace(' ', '_')}")
        await store.async_save({"unlocks": self._unlocks_data})

    @callback
    def _handle_level_change(self, event) -> None:
        """Handle level changes."""
        # For now, just trigger a state update
        # The actual unlock filtering will be done by services/frontend
        self.async_write_ha_state()

    @callback
    def _handle_unlock_added(self, event) -> None:
        """Handle unlock added event."""
        if event.data.get("skill_name") == self._skill_name:
            level = event.data.get("level")
            unlock_data = event.data.get("unlock_data")
            
            level_str = str(level)
            if level_str not in self._unlocks_data:
                self._unlocks_data[level_str] = []
            
            self._unlocks_data[level_str].append(unlock_data)
            self.hass.async_create_task(self._save_unlocks_data())
            self.async_write_ha_state()

    @callback
    def _handle_unlock_removed(self, event) -> None:
        """Handle unlock removed event."""
        if event.data.get("skill_name") == self._skill_name:
            level = event.data.get("level")
            unlock_name = event.data.get("unlock_name")
            
            level_str = str(level)
            if level_str in self._unlocks_data:
                original_count = len(self._unlocks_data[level_str])
                self._unlocks_data[level_str] = [
                    unlock for unlock in self._unlocks_data[level_str]
                    if unlock.get("name") != unlock_name
                ]
                
                if len(self._unlocks_data[level_str]) < original_count:
                    if not self._unlocks_data[level_str]:
                        del self._unlocks_data[level_str]
                    
                    self.hass.async_create_task(self._save_unlocks_data())
                    self.async_write_ha_state()

    @callback
    def _handle_unlocks_cleared(self, event) -> None:
        """Handle unlocks cleared event."""
        if event.data.get("skill_name") == self._skill_name:
            level = event.data.get("level")
            level_str = str(level)
            
            if level_str in self._unlocks_data:
                del self._unlocks_data[level_str]
                self.hass.async_create_task(self._save_unlocks_data())
                self.async_write_ha_state()

    @callback
    def _handle_unlocks_imported(self, event) -> None:
        """Handle unlocks imported event."""
        if event.data.get("skill_name") == self._skill_name:
            clear_existing = event.data.get("clear_existing", False)
            unlocks_data = event.data.get("unlocks_data", {})
            
            if clear_existing:
                self._unlocks_data = {}
            
            # Merge the imported data
            for level_str, unlocks in unlocks_data.items():
                if level_str not in self._unlocks_data:
                    self._unlocks_data[level_str] = []
                self._unlocks_data[level_str].extend(unlocks)
            
            self.hass.async_create_task(self._save_unlocks_data())
            self.async_write_ha_state()

    async def add_unlock(self, level: int, unlock_data: Dict[str, Any]) -> None:
        """Add an unlock for a specific level."""
        level_str = str(level)
        if level_str not in self._unlocks_data:
            self._unlocks_data[level_str] = []
        
        # Validate required fields
        required_fields = ["name", "category", "xp", "description"]
        for field in required_fields:
            if field not in unlock_data:
                raise ValueError(f"Missing required field: {field}")
        
        self._unlocks_data[level_str].append(unlock_data)
        await self._save_unlocks_data()
        self.async_write_ha_state()

    async def remove_unlock(self, level: int, unlock_name: str) -> bool:
        """Remove an unlock from a specific level."""
        level_str = str(level)
        if level_str not in self._unlocks_data:
            return False
        
        original_count = len(self._unlocks_data[level_str])
        self._unlocks_data[level_str] = [
            unlock for unlock in self._unlocks_data[level_str]
            if unlock.get("name") != unlock_name
        ]
        
        if len(self._unlocks_data[level_str]) < original_count:
            # Clean up empty levels
            if not self._unlocks_data[level_str]:
                del self._unlocks_data[level_str]
            
            await self._save_unlocks_data()
            self.async_write_ha_state()
            return True
        
        return False

    async def clear_unlocks_for_level(self, level: int) -> None:
        """Clear all unlocks for a specific level."""
        level_str = str(level)
        if level_str in self._unlocks_data:
            del self._unlocks_data[level_str]
            await self._save_unlocks_data()
            self.async_write_ha_state()

    def get_unlocks_for_level(self, level: int) -> list:
        """Get all unlocks for a specific level."""
        level_str = str(level)
        return self._unlocks_data.get(level_str, [])

    def get_available_unlocks(self, current_level: int) -> Dict[str, list]:
        """Get all unlocks up to the current level."""
        available = {}
        for level_str, unlocks in self._unlocks_data.items():
            level_int = int(level_str)
            if level_int <= current_level:
                available[level_str] = unlocks
        return available
