# Life Skills - Home Assistant Integration

A Home Assistant integration to track and manage life skills with XP and leveling system, including unlockable achievements and progression rewards.

## Features

- **Skill Tracking**: Multiple configurable skills with custom names and icons
- **XP System**: XP tracking with automatic level calculation based on RuneScape's formula
- **Unlock System**: Define achievements, exercises, equipment, or rewards that unlock at specific levels
- **Progression Sensors**: Automatic level calculation, XP to next level tracking
- **Services**: Add XP, set levels, manage unlocks, bulk import progression data
- **Custom Cards**: Lovelace integration for beautiful skill displays

## New: Unlock Features

Each skill can now have **unlocks** - achievements, exercises, equipment, or other rewards that become available at specific levels. Perfect for:

- **Fitness**: Exercises, equipment, and workout progressions
- **Learning**: Courses, certifications, and skill milestones  
- **Hobbies**: Tools, techniques, and advanced abilities
- **Gaming**: Achievements, items, and character progression

See [UNLOCK_FEATURES.md](UNLOCK_FEATURES.md) for detailed documentation.

## Installation

### HACS Custom Repo (recommended):
1. In Home Assistant, navigate to HACS
2. Click the 3 dots in the top right, and choose 'Custom repositories'
3. Paste the URL 'https://github.com/calsmith99/life-skills-hass'
4. Restart Home Assistant
5. Add the integration through Configuration → Integrations → Add Integration → Life Skills

### Manual:
1. Copy the `custom_components/life_skills` folder to your Home Assistant `custom_components` directory
2. Restart Home Assistant
3. Add the integration through Configuration → Integrations → Add Integration → Life Skills

## Quick Start

1. **Add the integration** and configure your first skill
2. **Add unlocks** using the services or import from templates
3. **Track progress** with `life_skills.add_xp` service calls
4. **Monitor advancement** through automatically created sensors

## Entities Created

Each skill provides three sensors:
- **`sensor.{skill_name}_level`** - Current level (calculated from XP)
- **`sensor.{skill_name}_xp_to_next`** - XP needed for next level
- **`sensor.{skill_name}_unlocks`** - Available unlocks and progression data
- **`number.{skill_name}_xp`** - Current XP (adjustable input)

## Services

### Core Services
- `life_skills.add_xp` - Add experience points to a skill
- `life_skills.set_level` - Set a skill to a specific level

### Unlock Management Services  
- `life_skills.add_unlock` - Add a single unlock to a skill
- `life_skills.import_unlocks` - Bulk import unlock data
- `life_skills.remove_unlock` - Remove a specific unlock
- `life_skills.clear_unlocks_for_level` - Clear all unlocks for a level

## XP Formula

Level progression uses RuneScape's formula: `sum of (n + 300 * (2^(n/7))) / 4` for each level, creating meaningful exponential progression where higher levels become increasingly challenging and rewarding.

## Example Unlock Data

```yaml
service: life_skills.add_unlock
data:
  skill_name: "Fitness"
  level: 5
  unlock_name: "Push-up Progression"
  category: "Exercise"
  xp: 25
  description: "Incline push-ups for building strength"
  custom_fields:
    muscle_groups: ["chest", "triceps", "shoulders"]
    difficulty: "Beginner"
```

## Importing Your Data

If you have existing progression data (like the included `templates.yaml` example), use the conversion script:

```bash
python convert_templates.py
```

This generates service call files you can use in Home Assistant's Developer Tools.

## Custom Cards

Use the included custom card for beautiful skill displays:

```yaml
type: custom:life-skills-card
skill: number.programming_xp
```

### If you see: "Custom element doesn't exist: life-skills-card"

Add the card JavaScript as a Lovelace resource:
- Settings → Dashboards → Three dots → Resources
- Add Resource: `/life_skills/life_skills_card.js` (JavaScript Module)
- Save and refresh (Shift+Reload)

## Documentation

- [Unlock Features Guide](UNLOCK_FEATURES.md) - Detailed unlock system documentation
- [Example Usage](example_unlock_usage.py) - Python examples for service calls
- [Templates](templates.yaml) - Example unlock data for fitness skills

## Use Cases

- **Fitness Tracking**: Exercise progressions, equipment unlocks, achievement milestones
- **Learning Paths**: Course completions, certification requirements, skill prerequisites  
- **Hobby Progression**: Tool acquisitions, technique mastery, project milestones
- **Gaming Elements**: Achievement systems, character progression, item unlocks
