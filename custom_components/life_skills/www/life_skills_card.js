class LifeSkillsCard extends HTMLElement {
  constructor() {
    super();
    this.config = {};
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    
    if (typeof config !== 'object') {
      throw new Error('Invalid configuration: expected an object');
    }
    
    // Handle potential missing skill property gracefully
    if (!('skill' in config)) {
      config.skill = '';
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

    const selectedSkill = this.config.skill || '';
    let skillContent = '<div style="padding: 16px; text-align: center; color: var(--secondary-text-color);">No skill selected. Use the visual editor to choose a skill.</div>';
    
    if (selectedSkill && this._hass.states && this._hass.states[selectedSkill]) {
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
      
      let skillName = xpEntity.attributes && xpEntity.attributes.friendly_name ? xpEntity.attributes.friendly_name : 'Unknown Skill';
      
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
      const skillIcon = xpEntity.attributes && xpEntity.attributes.icon ? xpEntity.attributes.icon : 'mdi:star';
      
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
    
    // Use shadowRoot for proper encapsulation, important for mobile
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
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
      <ha-card>
        ${skillContent}
      </ha-card>
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
  
  // This helps mobile layouts properly size the card
  getCardSize() {
    return 2;
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

    this.shadowRoot.innerHTML = `
      <div class="form-group">
        <label>Skill to Display</label>
        <ha-entity-picker
          .hass="${this._hass}"
          .value="${this.config.skill || ''}"
          .includeDomains="${['number']}"
          .entityFilter="${this._entityFilter.bind(this)}"
          @value-changed="${this._skillChanged.bind(this)}"
          allow-custom-entity
        ></ha-entity-picker>
      </div>
    `;

    // Set properties after element is created
    const entityPicker = this.shadowRoot.querySelector('ha-entity-picker');
    if (entityPicker && this._hass) {
      entityPicker.hass = this._hass;
      entityPicker.value = this.config.skill || '';
      entityPicker.includeDomains = ['number'];
      entityPicker.entityFilter = this._entityFilter.bind(this);
      entityPicker.addEventListener('value-changed', this._skillChanged.bind(this));
    }
  }

  _entityFilter(entity) {
    return entity.entity_id.endsWith('_xp');
  }

  _skillChanged(ev) {
    const value = ev.detail.value;
    this._valueChanged('skill', value);
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
    // Re-render when hass is set and update entity picker
    if (this.shadowRoot) {
      this.render();
    }
  }
}

customElements.define('life-skills-card', LifeSkillsCard);
customElements.define('life-skills-card-editor', LifeSkillsCardEditor);
