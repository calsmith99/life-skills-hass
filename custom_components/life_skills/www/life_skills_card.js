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
      
      // Get unlocks entity
      const unlocksEntityId = selectedSkill.replace('number.', 'sensor.').replace('_xp', '_unlocks');
      const unlocksEntity = this._hass.states[unlocksEntityId];
      
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
        <div class="skill-card-container" @click="${this._showUnlocksPopup.bind(this)}">
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
          cursor: pointer;
          transition: box-shadow 0.3s ease;
        }
        
        ha-card:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
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

        /* Popup Styles */
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .popup-content {
          background: var(--card-background-color);
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          max-width: 90vw;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--divider-color);
          position: sticky;
          top: 0;
          background: var(--card-background-color);
          z-index: 1;
        }

        .popup-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          color: var(--secondary-text-color);
          transition: background-color 0.2s;
        }

        .close-button:hover {
          background: var(--divider-color);
        }

        .unlocks-container {
          padding: 20px;
        }

        .level-section {
          margin-bottom: 24px;
        }

        .level-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          padding: 8px 12px;
          background: var(--primary-color);
          color: var(--text-primary-color);
          border-radius: 6px;
          font-weight: 600;
        }

        .level-number {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 8px;
          border-radius: 4px;
          min-width: 32px;
          text-align: center;
        }

        .unlocks-grid {
          display: grid;
          gap: 12px;
        }

        .unlock-card {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: var(--card-background-color);
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .unlock-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .unlock-card.locked {
          opacity: 0.6;
          background: var(--disabled-color);
        }

        .unlock-level {
          background: var(--primary-color);
          color: var(--text-primary-color);
          padding: 6px 10px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          min-width: 40px;
          text-align: center;
          margin-right: 16px;
          flex-shrink: 0;
        }

        .unlock-content {
          flex: 1;
          min-width: 0;
        }

        .unlock-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .unlock-name {
          font-weight: 600;
          color: var(--primary-text-color);
          font-size: 16px;
        }

        .unlock-category {
          background: var(--accent-color);
          color: var(--text-accent-color, white);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .unlock-xp {
          background: linear-gradient(90deg, hsla(16, 100%, 76%, 1) 0%, hsla(49, 100%, 81%, 1) 100%);
          color: var(--primary-text-color);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .unlock-description {
          color: var(--secondary-text-color);
          font-size: 14px;
          line-height: 1.4;
          margin-top: 4px;
        }

        .unlock-extras {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }

        .unlock-tag {
          background: var(--divider-color);
          color: var(--secondary-text-color);
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 11px;
        }

        .no-unlocks {
          text-align: center;
          color: var(--secondary-text-color);
          font-style: italic;
          padding: 40px 20px;
        }
      </style>
      <ha-card>
        ${skillContent}
      </ha-card>
    `;

    // Add click event listener to the card
    const card = this.shadowRoot.querySelector('ha-card');
    if (card) {
      card.addEventListener('click', () => this._showUnlocksPopup());
    }
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

  _showUnlocksPopup() {
    if (!this.config.skill || !this._hass.states[this.config.skill]) {
      return;
    }

    const selectedSkill = this.config.skill;
    const xpEntity = this._hass.states[selectedSkill];
    
    // Get corresponding entities
    const levelEntityId = selectedSkill.replace('number.', 'sensor.').replace('_xp', '_level');
    const levelEntity = this._hass.states[levelEntityId];
    const currentLevel = levelEntity ? parseInt(levelEntity.state) || 1 : 1;
    
    const unlocksEntityId = selectedSkill.replace('number.', 'sensor.').replace('_xp', '_unlocks');
    const unlocksEntity = this._hass.states[unlocksEntityId];
    
    let skillName = xpEntity.attributes && xpEntity.attributes.friendly_name ? xpEntity.attributes.friendly_name : 'Unknown Skill';
    if (skillName.endsWith(' XP')) {
      skillName = skillName.slice(0, -3);
    }

    const skillIcon = xpEntity.attributes && xpEntity.attributes.icon ? xpEntity.attributes.icon : 'mdi:star';

    // Parse unlocks data
    let unlocksData = {};
    if (unlocksEntity && unlocksEntity.attributes && unlocksEntity.attributes.unlocks) {
      try {
        unlocksData = JSON.parse(unlocksEntity.attributes.unlocks);
      } catch (e) {
        console.error('Failed to parse unlocks data:', e);
      }
    }

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'popup-overlay';
    popup.innerHTML = this._createPopupContent(skillName, skillIcon, currentLevel, unlocksData);
    
    // Add to document body
    document.body.appendChild(popup);
    
    // Add event listeners
    const closeButton = popup.querySelector('.close-button');
    closeButton.addEventListener('click', () => this._closePopup(popup));
    
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        this._closePopup(popup);
      }
    });

    // Add escape key listener
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this._closePopup(popup);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  _createPopupContent(skillName, skillIcon, currentLevel, unlocksData) {
    const levels = Object.keys(unlocksData).map(l => parseInt(l)).sort((a, b) => a - b);
    
    let unlocksHtml = '';
    if (levels.length === 0) {
      unlocksHtml = '<div class="no-unlocks">No unlocks defined for this skill yet.</div>';
    } else {
      for (const level of levels) {
        const unlocks = unlocksData[level.toString()] || [];
        const isUnlocked = level <= currentLevel;
        
        unlocksHtml += `
          <div class="level-section">
            <div class="level-header">
              <div class="level-number">Lv${level}</div>
              <span>${isUnlocked ? 'Unlocked' : 'Locked'} (${unlocks.length} item${unlocks.length !== 1 ? 's' : ''})</span>
            </div>
            <div class="unlocks-grid">
              ${unlocks.map(unlock => this._createUnlockCard(level, unlock, isUnlocked)).join('')}
            </div>
          </div>
        `;
      }
    }

    return `
      <div class="popup-content">
        <div class="popup-header">
          <div class="popup-title">
            <ha-icon icon="${skillIcon}"></ha-icon>
            ${skillName} Unlocks
          </div>
          <button class="close-button">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="unlocks-container">
          ${unlocksHtml}
        </div>
      </div>
    `;
  }

  _createUnlockCard(level, unlock, isUnlocked) {
    const name = unlock.name || 'Unknown';
    const category = unlock.category || 'General';
    const xp = unlock.xp || 0;
    const description = unlock.description || '';
    
    // Create extra info tags
    let extraTags = '';
    
    // Add muscle groups if present
    if (unlock.muscle_groups && Array.isArray(unlock.muscle_groups)) {
      extraTags += unlock.muscle_groups.map(group => `<span class="unlock-tag">${group}</span>`).join('');
    }
    
    // Add equipment if present
    if (unlock.equipment) {
      extraTags += `<span class="unlock-tag">Requires: ${unlock.equipment}</span>`;
    }
    
    // Add additional requirements if present
    if (unlock.additional_reqs) {
      const reqs = Object.entries(unlock.additional_reqs).map(([skill, level]) => `${skill} ${level}`);
      extraTags += `<span class="unlock-tag">Needs: ${reqs.join(', ')}</span>`;
    }
    
    // Add any other custom fields
    const standardFields = ['name', 'category', 'xp', 'description', 'muscle_groups', 'equipment', 'additional_reqs'];
    Object.entries(unlock).forEach(([key, value]) => {
      if (!standardFields.includes(key) && value !== null && value !== undefined) {
        if (typeof value === 'object') {
          extraTags += `<span class="unlock-tag">${key}: ${JSON.stringify(value)}</span>`;
        } else {
          extraTags += `<span class="unlock-tag">${key}: ${value}</span>`;
        }
      }
    });

    return `
      <div class="unlock-card ${isUnlocked ? '' : 'locked'}">
        <div class="unlock-level">Lv${level}</div>
        <div class="unlock-content">
          <div class="unlock-header">
            <div class="unlock-name">${name}</div>
            <div class="unlock-category">${category}</div>
            <div class="unlock-xp">${xp} XP</div>
          </div>
          ${description ? `<div class="unlock-description">${description}</div>` : ''}
          ${extraTags ? `<div class="unlock-extras">${extraTags}</div>` : ''}
        </div>
      </div>
    `;
  }

  _closePopup(popup) {
    if (popup && popup.parentNode) {
      popup.parentNode.removeChild(popup);
    }
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
