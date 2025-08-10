class LifeSkillsCard extends HTMLElement {
  constructor() {
    super();
    this.config = {};
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this.config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  render() {
    if (!this._hass || !this.config) {
      return;
    }

    const selectedSkill = this.config.skill;
    let skillContent = '<div style="padding: 16px; text-align: center; color: var(--secondary-text-color);">No skill selected. Use the visual editor to choose a skill.</div>';
    
    if (selectedSkill && this._hass.states[selectedSkill]) {
      const xpEntity = this._hass.states[selectedSkill];
      const xp = parseInt(xpEntity.state) || 0;
      
      // Get corresponding level entity
      const levelEntityId = selectedSkill.replace('number.', 'sensor.').replace('_xp', '_level');
      const levelEntity = this._hass.states[levelEntityId];
      const level = levelEntity ? parseInt(levelEntity.state) || 1 : 1;
      
      // Get XP to next level entity
      const xpToNextEntityId = selectedSkill.replace('number.', 'sensor.').replace('_xp', '_xp_to_next');
      const xpToNextEntity = this._hass.states[xpToNextEntityId];
      const xpToNext = xpToNextEntity ? parseInt(xpToNextEntity.state) || 0 : 0;
      
      let skillName = xpEntity.attributes.friendly_name || 'Unknown Skill';
      
      // Remove " XP" suffix if it exists for the display name
      if (skillName.endsWith(' XP')) {
        skillName = skillName.slice(0, -3);
      }
      
      // Calculate progress percentage to next level
      const currentLevelXp = this._calculateXpForLevel(level);
      const nextLevelXp = this._calculateXpForLevel(level + 1);
      const xpInCurrentLevel = xp - currentLevelXp;
      const xpNeededForLevel = nextLevelXp - currentLevelXp;
      const progressPercent = xpNeededForLevel > 0 ? Math.round((xpInCurrentLevel / xpNeededForLevel) * 100) : 100;
      
      // Get skill icon from the XP entity
      const skillIcon = xpEntity.attributes.icon || 'mdi:star';
      
      skillContent = `
        <div class="skill-card-container">
          <div class="top-row">
            <div class="icon-section">
              <ha-icon icon="${skillIcon}"></ha-icon>
            </div>
            <div class="level-info">
              <div class="current-level">${level}</div>
              <div class="max-level">99</div>
            </div>
          </div>
          <div class="name-section">
            <span class="skill-name">${skillName}</span>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPercent}%"></div>
          <div class="progress-empty" style="width: ${100 - progressPercent}%"></div>
        </div>
      `;
    }
    
    this.innerHTML = `
      <ha-card>
        ${skillContent}
      </ha-card>
      <style>
        ha-card {
          padding: 0;
          overflow: hidden;
        }
        
        .skill-card-container {
          margin: 4px 12px;
          display: flex;
          flex-direction: column;
        }
        
        .top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding-bottom: 4px;
        }
        
        .icon-section {
          display: flex;
          justify-content: center;
          align-items: center;
          min-width: 60px;
          height: 60px;
        }
        
        .icon-section ha-icon {
          --mdc-icon-size: 50px;
          color: var(--primary-color);
        }
        
        .level-info {
          max-width: 50px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex: 1;
        }
        
        .current-level {
          font-size: 24px;
          font-weight: 600;
          color: var(--primary-text-color);
          border-bottom: 2px solid hsla(49, 100%, 81%);
          text-align: start;
          vertical-align: baseline;
        }
        
        .max-level {
          font-size: 18px;
          font-weight: 500;
          color: var(--secondary-text-color);
          text-align: end;
          opacity: 0.8;
        }
        
        .name-section {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: -4px;
        }
        
        .skill-name {
          font-size: 16px;
          font-weight: 500;
          color: var(--primary-text-color);
          opacity: 0.8;
        }
        
        .progress-bar {
          display: flex;
          height: 8px;
          width: 100%;
          border-radius: 4px;
          overflow: hidden;
          background: var(--divider-color);
          margin-top: 4px;
        }
        
        .progress-fill {
          background: linear-gradient(90deg, hsla(16, 100%, 76%, 1) 0%, hsla(49, 100%, 81%, 1) 100%);
          transition: width 0.3s ease;
        }
        
        .progress-empty {
          background: linear-gradient(135deg, #a844a188 0%, #8436ab00 10%);
        }
      </style>
    `;
  }

  // Helper method to calculate XP for a given level (reusing the logic from sensor.py)
  _calculateXpForLevel(level) {
    if (level <= 1) {
      return 0;
    }
    
    let totalSum = 0;
    for (let n = 1; n < level; n++) {
      const term = n + 300 * Math.pow(2, n / 7);
      totalSum += term;
    }
    
    return Math.floor(totalSum / 4);
  }

  // This method is required for the visual editor to work
  static getConfigElement() {
    return document.createElement('life-skills-card-editor');
  }

  // This method tells Home Assistant what the default config should look like
  static getStubConfig() {
    return {
      skill: ''
    };
  }
}

// Card editor for the visual editor
class LifeSkillsCardEditor extends HTMLElement {
  constructor() {
    super();
    this.config = {};
    this._hass = null;
  }

  setConfig(config) {
    this.config = config || {};
    this.render();
  }

  render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    // Get available skills from Home Assistant entities
    const skills = this._getAvailableSkills();
    const currentSkill = this.config.skill;
    const currentSkillName = currentSkill ? 
      (skills.find(s => s.entity_id === currentSkill)?.name || '') : '';

    this.shadowRoot.innerHTML = `
      <style>
        .form-group {
          margin-bottom: 16px;
          position: relative;
        }
        label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
        }
        input {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          font-size: 14px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          box-sizing: border-box;
        }
        input:focus {
          outline: none;
          border-color: var(--primary-color);
        }
        .suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--card-background-color);
          border: 1px solid var(--divider-color);
          border-top: none;
          border-radius: 0 0 4px 4px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
          display: none;
        }
        .suggestion {
          padding: 8px;
          cursor: pointer;
          border-bottom: 1px solid var(--divider-color);
        }
        .suggestion:hover {
          background: var(--secondary-background-color);
        }
        .suggestion:last-child {
          border-bottom: none;
        }
        .suggestions.show {
          display: block;
        }
      </style>
      <div class="form-group">
        <label for="skill-input">Skill to Display:</label>
        <input 
          type="text" 
          id="skill-input"
          value="${currentSkillName}"
          placeholder="Start typing to search skills..."
          autocomplete="off"
        />
        <div class="suggestions" id="suggestions">
          ${skills.map(skill => `
            <div class="suggestion" data-entity-id="${skill.entity_id}">
              ${skill.name}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Add event listeners
    const skillInput = this.shadowRoot.querySelector('#skill-input');
    const suggestions = this.shadowRoot.querySelector('#suggestions');
    
    if (skillInput && suggestions) {
      // Show suggestions when input is focused
      skillInput.addEventListener('focus', () => {
        this._filterSuggestions('');
        suggestions.classList.add('show');
      });

      // Hide suggestions when clicking outside
      document.addEventListener('click', (e) => {
        if (!this.shadowRoot.contains(e.target)) {
          suggestions.classList.remove('show');
        }
      });

      // Filter suggestions as user types
      skillInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        this._filterSuggestions(query);
        suggestions.classList.add('show');
      });

      // Handle suggestion clicks
      suggestions.addEventListener('click', (e) => {
        if (e.target.classList.contains('suggestion')) {
          const entityId = e.target.getAttribute('data-entity-id');
          const skillName = e.target.textContent;
          
          skillInput.value = skillName;
          suggestions.classList.remove('show');
          
          this._valueChanged('skill', entityId);
        }
      });
    }
  }

  _filterSuggestions(query) {
    const suggestions = this.shadowRoot.querySelectorAll('.suggestion');
    
    suggestions.forEach(suggestion => {
      const skillName = suggestion.textContent.toLowerCase();
      if (skillName.includes(query)) {
        suggestion.style.display = 'block';
      } else {
        suggestion.style.display = 'none';
      }
    });
  }

  _getAvailableSkills() {
    if (!this._hass) {
      return [];
    }

    const skills = [];
    
    // Find all life skill XP entities
    Object.keys(this._hass.states).forEach(entity_id => {
      if (entity_id.startsWith('number.') && entity_id.endsWith('_xp')) {
        const state = this._hass.states[entity_id];
        let skillName = state.attributes.friendly_name || entity_id.replace('number.', '').replace('_xp', '').replace(/_/g, ' ');
        
        // Remove " XP" suffix if it exists
        if (skillName.endsWith(' XP')) {
          skillName = skillName.slice(0, -3);
        }
        
        skills.push({
          entity_id: entity_id,
          name: skillName
        });
      }
    });

    return skills.sort((a, b) => a.name.localeCompare(b.name));
  }

  _valueChanged(key, value) {
    const newConfig = { ...this.config };
    newConfig[key] = value;
    
    // Fire event to update config
    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  set hass(hass) {
    this._hass = hass;
    // Re-render when hass is set to populate skills
    if (this.shadowRoot) {
      this.render();
    }
  }
}

customElements.define('life-skills-card', LifeSkillsCard);
customElements.define('life-skills-card-editor', LifeSkillsCardEditor);
