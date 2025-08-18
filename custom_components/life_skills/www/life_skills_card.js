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
          cursor: pointer !important;
          transition: box-shadow 0.3s ease;
        }
        
        ha-card:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          transform: translateY(-1px);
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

    // Add click event listener to the card after a micro task to ensure DOM is ready
    requestAnimationFrame(() => {
      const card = this.shadowRoot.querySelector('ha-card');
      console.log('Setting up click handler, card found:', !!card); // Debug log
      if (card) {
        // Remove any existing listeners first
        card.removeEventListener('click', this._cardClickHandler);
        // Add the new listener
        this._cardClickHandler = () => {
          console.log('Card clicked!'); // Debug log
          this._showUnlocksPopup();
        };
        card.addEventListener('click', this._cardClickHandler);
        console.log('Click handler added'); // Debug log
      }
    });
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
    console.log('_showUnlocksPopup called'); // Debug log
    
    if (!this.config.skill || !this._hass.states[this.config.skill]) {
      console.log('No skill config or entity found:', this.config.skill); // Debug log
      return;
    }

    console.log('Opening popup for skill:', this.config.skill); // Debug log

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

    // Use Home Assistant's dialog system
    this._openDialog(skillName, skillIcon, currentLevel, unlocksData);
  }

  _openDialog(skillName, skillIcon, currentLevel, unlocksData) {
    // Use Home Assistant's dialog system properly
    const dialogConfig = {
      title: `${skillName} Unlocks`,
      content: this._createDialogContent(skillName, skillIcon, currentLevel, unlocksData),
      wide: true,
      hideActions: true
    };

    // Fire show-dialog event that HA's dialog manager will handle
    const event = new CustomEvent('show-dialog', {
      detail: {
        dialogTag: 'ha-dialog',
        dialogImport: () => import('../../../../../../src/dialogs/ha-dialog'),
        dialogParams: dialogConfig
      },
      bubbles: true,
      composed: true
    });

    this.dispatchEvent(event);
    
    // Fallback: Create our own dialog if HA's system isn't available
    if (!event.defaultPrevented) {
      this._createFallbackDialog(skillName, skillIcon, currentLevel, unlocksData);
    }
  }

  _createFallbackDialog(skillName, skillIcon, currentLevel, unlocksData) {
    // Create a modal overlay as fallback
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: var(--card-background-color);
      border-radius: var(--ha-card-border-radius, 12px);
      box-shadow: var(--ha-dialog-box-shadow, 0 8px 32px rgba(0, 0, 0, 0.3));
      max-width: 90vw;
      max-height: 80vh;
      overflow: hidden;
      position: relative;
    `;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--secondary-text-color);
      z-index: 1;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeBtn.addEventListener('click', () => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    
    dialog.innerHTML = this._createDialogContent(skillName, skillIcon, currentLevel, unlocksData);
    dialog.appendChild(closeBtn);
    overlay.appendChild(dialog);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    
    // Close on escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    document.body.appendChild(overlay);
  }

  _createDialogContent(skillName, skillIcon, currentLevel, unlocksData) {
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
      <style>
        .ha-dialog-content {
          padding: 0;
        }
        
        .dialog-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px 24px 16px 24px;
          border-bottom: 1px solid var(--divider-color);
        }

        .dialog-title {
          font-size: 22px;
          font-weight: 400;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dialog-title ha-icon {
          --mdc-icon-size: 24px;
          color: var(--primary-color);
        }

        .unlocks-container {
          padding: 16px 24px 24px 24px;
          max-height: calc(80vh - 120px);
          overflow-y: auto;
        }

        .level-section {
          margin-bottom: 24px;
        }

        .level-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          padding: 12px 16px;
          background: var(--primary-color);
          color: var(--text-primary-color);
          border-radius: var(--ha-card-border-radius, 12px);
          font-weight: 500;
        }

        .level-number {
          background: rgba(255, 255, 255, 0.2);
          padding: 6px 12px;
          border-radius: var(--ha-card-border-radius, 8px);
          font-weight: 600;
          font-size: 14px;
        }

        .unlocks-grid {
          display: grid;
          gap: 12px;
        }

        .unlock-card {
          display: flex;
          align-items: flex-start;
          padding: 16px;
          background: var(--card-background-color);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-card-border-radius, 12px);
          transition: all 0.2s ease;
          box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0, 0, 0, 0.12));
        }

        .unlock-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--ha-card-box-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
        }

        .unlock-card.locked {
          opacity: 0.6;
          background: var(--disabled-color);
        }

        .unlock-level {
          background: var(--primary-color);
          color: var(--text-primary-color);
          padding: 8px 12px;
          border-radius: var(--ha-card-border-radius, 8px);
          font-weight: 600;
          font-size: 14px;
          min-width: 48px;
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
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .unlock-name {
          font-weight: 500;
          color: var(--primary-text-color);
          font-size: 16px;
          line-height: 1.3;
        }

        .unlock-category {
          background: var(--accent-color);
          color: var(--text-accent-color, white);
          padding: 4px 8px;
          border-radius: var(--ha-card-border-radius, 16px);
          font-size: 12px;
          font-weight: 500;
        }

        .unlock-xp {
          background: var(--warning-color);
          color: var(--text-primary-color);
          padding: 4px 8px;
          border-radius: var(--ha-card-border-radius, 16px);
          font-size: 12px;
          font-weight: 600;
        }

        .unlock-description {
          color: var(--secondary-text-color);
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 8px;
        }

        .unlock-extras {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .unlock-tag {
          background: var(--secondary-background-color);
          color: var(--secondary-text-color);
          padding: 3px 8px;
          border-radius: var(--ha-card-border-radius, 12px);
          font-size: 11px;
          border: 1px solid var(--divider-color);
        }

        .no-unlocks {
          text-align: center;
          color: var(--secondary-text-color);
          font-style: italic;
          padding: 40px 20px;
          background: var(--card-background-color);
          border-radius: var(--ha-card-border-radius, 12px);
        }

        @media (max-width: 768px) {
          .dialog-header {
            padding: 16px 16px 12px 16px;
          }
          
          .unlocks-container {
            padding: 12px 16px 16px 16px;
          }
          
          .unlock-card {
            padding: 12px;
          }
          
          .unlock-level {
            padding: 6px 8px;
            min-width: 40px;
            margin-right: 12px;
          }
          
          .unlock-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
        }
      </style>
      <div class="dialog-header">
        <div class="dialog-title">
          <ha-icon icon="${skillIcon}"></ha-icon>
          ${skillName} Unlocks
        </div>
      </div>
      <div class="unlocks-container">
        ${unlocksHtml}
      </div>
    `;
  }

  _createUnlockCard(level, unlock, isUnlocked) {
    const statusClass = isUnlocked ? 'unlocked' : 'locked';
    const name = unlock.name || 'Unknown';
    const category = unlock.category || 'General';
    const xpReward = unlock.xp_reward || unlock.xp || 0;
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

    // Add equipment stats if present
    if (unlock.type) {
      extraTags += `<span class="unlock-tag">Type: ${unlock.type}</span>`;
    }
    if (unlock.cost !== undefined) {
      extraTags += `<span class="unlock-tag">Cost: ${unlock.cost}</span>`;
    }
    if (unlock.durability !== undefined) {
      extraTags += `<span class="unlock-tag">Durability: ${unlock.durability}</span>`;
    }
    if (unlock.damage !== undefined) {
      extraTags += `<span class="unlock-tag">Damage: ${unlock.damage}</span>`;
    }
    if (unlock.armor !== undefined) {
      extraTags += `<span class="unlock-tag">Armor: ${unlock.armor}</span>`;
    }
    if (unlock.magic_damage !== undefined) {
      extraTags += `<span class="unlock-tag">Magic: ${unlock.magic_damage}</span>`;
    }
    if (unlock.blocks !== undefined) {
      extraTags += `<span class="unlock-tag">Blocks: ${unlock.blocks}</span>`;
    }
    if (unlock.magic_armor !== undefined) {
      extraTags += `<span class="unlock-tag">Magic Armor: ${unlock.magic_armor}</span>`;
    }
    
    // Add any other custom fields
    const standardFields = ['name', 'category', 'xp', 'xp_reward', 'description', 'muscle_groups', 'equipment', 'additional_reqs', 'type', 'cost', 'durability', 'damage', 'armor', 'magic_damage', 'blocks', 'magic_armor'];
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
      <div class="unlock-card ${statusClass}">
        <div class="unlock-level">Lv${level}</div>
        <div class="unlock-content">
          <div class="unlock-header">
            <div class="unlock-name">${name}</div>
            <span class="unlock-category">${category}</span>
            ${xpReward > 0 ? `<span class="unlock-xp">${xpReward} XP</span>` : ''}
          </div>
          ${description ? `<div class="unlock-description">${description}</div>` : ''}
          ${extraTags ? `<div class="unlock-extras">${extraTags}</div>` : ''}
        </div>
      </div>
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
