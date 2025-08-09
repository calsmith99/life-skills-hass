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
    let cardTitle = 'Life Skills';
    let skillContent = '<p>No skill selected. Use the visual editor to choose a skill.</p>';
    
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
      
      cardTitle = skillName;
      
      skillContent = `
        <div class="skill-info">
          <div class="stats">
            <div class="stat">
              <span class="label">Level:</span>
              <span class="value">${level}</span>
            </div>
            <div class="stat">
              <span class="label">XP:</span>
              <span class="value">${xp.toLocaleString()}</span>
            </div>
            <div class="stat">
              <span class="label">XP to Next:</span>
              <span class="value">${xpToNext.toLocaleString()}</span>
            </div>
          </div>
        </div>
      `;
    }
    
    this.innerHTML = `
      <ha-card>
        <div class="card-header">
          <div class="name">${cardTitle}</div>
        </div>
        <div class="card-content">
          ${skillContent}
        </div>
      </ha-card>
      <style>
        .skill-info .stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .stat .label {
          font-weight: 500;
          color: var(--secondary-text-color);
        }
        .stat .value {
          font-weight: bold;
          color: var(--primary-text-color);
        }
      </style>
    `;
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
