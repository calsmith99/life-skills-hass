# Life Skills Integration - Unlock Features

This document explains how to use the new unlock features added to the Life Skills Home Assistant integration.

## Overview

The unlock feature allows you to define achievements, exercises, equipment, or other items that become available when a skill reaches specific levels. Each unlock has the following required fields:

- **name**: The name of the unlock
- **category**: Category (e.g., "Stretch", "Yoga", "Workout", "Equipment")
- **xp**: Experience points awarded for this unlock
- **description**: Description of what the unlock is

You can also add custom fields for additional information specific to your use case.

## Services

### 1. Add Single Unlock

Add a single unlock to a skill at a specific level:

```yaml
service: life_skills.add_unlock
data:
  skill_name: "Agility"
  level: 1
  unlock_name: "Neck Tilts"
  category: "Stretch"
  xp: 12
  description: "Slowly tilt head side-to-side to lengthen neck"
  custom_fields:
    difficulty: "Beginner"
    duration: "30 seconds"
```

### 2. Import Bulk Unlocks

Import multiple unlocks at once from a structured data format:

```yaml
service: life_skills.import_unlocks
data:
  skill_name: "Agility"
  clear_existing: true  # Set to false to add to existing unlocks
  unlocks_data:
    "1":
      - name: "Neck Tilts"
        category: "Stretch"
        xp: 12
        description: "Slowly tilt head side-to-side to lengthen neck"
      - name: "Wrist Circles"
        category: "Stretch"
        xp: 12
        description: "Gentle circles both directions to warm wrists"
    "3":
      - name: "Shoulder Rolls"
        category: "Stretch"
        xp: 16
        description: "Roll shoulders forward and back to release tension"
```

### 3. Remove Unlock

Remove a specific unlock from a level:

```yaml
service: life_skills.remove_unlock
data:
  skill_name: "Agility"
  level: 1
  unlock_name: "Neck Tilts"
```

### 4. Clear Level Unlocks

Clear all unlocks for a specific level:

```yaml
service: life_skills.clear_unlocks_for_level
data:
  skill_name: "Agility"
  level: 1
```

## How to Import Your Template Data

If you have existing unlock data in the `templates.yaml` format (like the provided example), you can use the conversion script:

1. Run the conversion script:
   ```bash
   python convert_templates.py
   ```

2. This will generate individual JSON files for each skill (e.g., `import_agility_unlocks.json`, `import_strength_unlocks.json`)

3. Use the data from these files in the Home Assistant Developer Tools:
   - Go to **Developer Tools > Services**
   - Service: `life_skills.import_unlocks`
   - Copy the `data` section from the JSON file

## Entities Created

For each skill, the integration creates three sensors:

1. **`sensor.<skill_name>_level`** - Current level based on XP
2. **`sensor.<skill_name>_xp_to_next`** - XP needed to reach next level
3. **`sensor.<skill_name>_unlocks`** - Contains all unlock data in attributes

### Unlock Sensor Attributes

The unlock sensor has these attributes:

- **`unlocks`**: JSON string containing all unlock data organized by level
- **`skill_name`**: Name of the skill
- **`entry_id`**: Configuration entry ID

## Example Use Cases

### Fitness Progression System

```yaml
# Equipment unlocks at level 1
- name: "Exercise Mat"
  category: "Equipment"
  xp: 0
  description: "Basic exercise mat for floor exercises"

# Exercise unlocks at higher levels
- name: "Advanced Push-ups"
  category: "Workout"
  xp: 50
  description: "Diamond push-ups for increased difficulty"
  custom_fields:
    muscle_groups: ["chest", "triceps", "shoulders"]
    difficulty: "Advanced"
```

### Skill Requirements

Some unlocks may require progress in multiple skills:

```yaml
- name: "Advanced Yoga Pose"
  category: "Yoga"
  xp: 100
  description: "Requires both agility and strength"
  custom_fields:
    additional_reqs:
      strength: 25
      agility: 30
```

### Learning Progression

```yaml
- name: "JavaScript Basics"
  category: "Programming"
  xp: 25
  description: "Variables, functions, and basic syntax"
  custom_fields:
    prerequisites: []
    estimated_hours: 10

- name: "React Framework"
  category: "Programming"
  xp: 75
  description: "Component-based web development"
  custom_fields:
    prerequisites: ["JavaScript Basics", "HTML/CSS"]
    estimated_hours: 40
```

## Automation Ideas

You can create automations that trigger when certain unlocks become available:

```yaml
automation:
  - alias: "New Unlock Available"
    trigger:
      - platform: state
        entity_id: sensor.agility_level
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: "New Agility Unlocks!"
          message: "You've reached level {{ states('sensor.agility_level') }}! Check your new unlocks."
```

## Data Storage

- Unlock data is stored persistently using Home Assistant's storage system
- Each skill's unlocks are stored separately
- Data survives Home Assistant restarts and integration reloads

## Tips

1. **Organize by Category**: Use consistent categories to group similar unlocks
2. **Progressive XP**: Generally increase XP values for higher-level unlocks
3. **Clear Descriptions**: Make descriptions helpful for understanding what each unlock provides
4. **Custom Fields**: Use custom fields to add metadata specific to your domain (muscle groups, prerequisites, etc.)
5. **Backup**: Export your unlock data periodically by copying the service call format

## Troubleshooting

- Make sure your skill exists before adding unlocks
- Check the Home Assistant logs for any error messages
- Verify JSON format if manually creating unlock data
- Use the Developer Tools > Services interface to test service calls
