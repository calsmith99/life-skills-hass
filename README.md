# Life Skills - Home Assistant Integration

A Home Assistant integration to track and manage life skills with XP and leveling system.

## Features

- Multiple configurable skills with custom names and icons
- XP tracking with number entities
- Automatic level calculation based on XP progression formula (Stolen formula from RuneScape)
- XP to next level sensors
- Total level sensor across all skills
- Services for adding XP, setting levels, and resetting skills

## Installation
HACS Custom Repo (recommended):
1. In HomeAssistant, Navigate to HACS
2. Click the 3 dots in the top right, and choose 'custom repositories'
3. Paste the url 'https://github.com/calsmith99/life-skills-hass'
4. Restart Home Assistant
5. Add the integration through Configuration → Integrations → Add Integration → Life Skills

Manual:
1. Copy the `custom_components/life_skills` folder to your Home Assistant `custom_components` directory
2. Restart Home Assistant
3. Add the integration through Configuration → Integrations → Add Integration → Life Skills

## Usage

1. Add the integration and configure your first skill
2. Use the `life_skills.add_xp` service to add experience points
3. Use the `life_skills.set_level` service to set a specific level
4. Monitor progress through the automatically created sensors

## XP Formula

Level progression uses the formula: `sum of (n + 300 * (2^(n/7))) / 4` for each level.

After installation, add skills through the Home Assistant UI:

1. Go to Configuration > Integrations
2. Click "Add Integration" and search for "Life Skills"
3. Configure your skills with names, icons, and initial XP values

## Usage

Each skill provides:
- `sensor.{skill_name}_level` - Current level (calculated using custom XP formula)
- `sensor.{skill_name}_xp_to_next` - XP needed for next level
- `input_number.{skill_name}_xp` - Current XP (adjustable)

### XP Formula

The integration uses a sophisticated leveling formula:
```
For each level n: term = n + 300 * (2^(n/7))
XP required = (sum of all terms up to level) / 4
```

This creates an exponential progression where higher levels become increasingly challenging and rewarding.

## Lovelace Cards

Use the included custom card or standard entity cards to display your skills progress.

### If you see: "Custom element doesn't exist: life-skills-card"

Add the card JavaScript as a Lovelace resource (needed on some setups):

- Go to Settings → Dashboards → Three dots (top-right) → Resources
- Click "Add Resource"
- URL: `/life_skills/life_skills_card.js`
- Resource type: `JavaScript Module`
- Save and refresh the page (Shift+Reload)

Then add a manual card with:

```
type: custom:life-skills-card
skill: number.programming_xp  # replace with your XP entity id
```

Note: The integration attempts to auto-register the resource, but adding it manually ensures it works across all dashboard modes.
