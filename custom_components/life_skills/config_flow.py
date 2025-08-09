"""Config flow for Life Skills integration."""
import logging

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

_LOGGER = logging.getLogger(__name__)

DOMAIN = "life_skills"

class LifeSkillsConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Life Skills."""

    VERSION = 1

    async def async_step_user(self, user_input=None) -> FlowResult:
        """Handle the initial step."""
        if user_input is not None:
            skill_name = user_input.get("skill_name", "Programming")
            skill_icon = user_input.get("skill_icon", "mdi:star")
            return self.async_create_entry(
                title=skill_name,
                data={"skills": [{"name": skill_name, "icon": skill_icon, "xp": 0}]},
            )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required("skill_name", default="Programming"): str,
                vol.Optional("skill_icon", default="mdi:code-tags"): selector.IconSelector(),
            }),
        )
