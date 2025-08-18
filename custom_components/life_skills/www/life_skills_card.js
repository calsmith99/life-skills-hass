console.log('Life Skills Card: Loading...');

// Wait for Home Assistant frontend to be fully loaded
const waitForHAFrontend = () => {
  return new Promise((resolve) => {
    const checkFrontend = () => {
      // Check if core HA components are loaded
      if (window.customElements && 
          window.customElements.get('ha-card') && 
          window.customElements.get('ha-icon')) {
        
        // Try to get LitElement from various sources
        let LitElement, html, css;
        
        // Method 1: Check if lit is available globally
        if (window.lit) {
          ({ LitElement, html, css } = window.lit);
        }
        // Method 2: Extract from existing HA components
        else if (window.customElements.get('ha-card')) {
          const haCard = window.customElements.get('ha-card');
          if (haCard && haCard.prototype && haCard.prototype.constructor) {
            // Walk up the prototype chain to find LitElement
            let proto = haCard.prototype.constructor;
            while (proto && proto.name !== 'LitElement' && proto.__proto__) {
              proto = proto.__proto__;
            }
            if (proto && proto.name === 'LitElement') {
              LitElement = proto;
              // Try to get html and css from the global scope
              html = window.html || ((strings, ...values) => ({ strings, values, _$litType$: 1 }));
              css = window.css || ((strings, ...values) => ({ strings, values, _$litType$: 2 }));
            }
          }
        }
        
        if (LitElement && html && css) {
          console.log('Life Skills Card: Frontend loaded, LitElement available');
          resolve({ LitElement, html, css });
        } else {
          console.log('Life Skills Card: Frontend partially loaded, retrying...');
          setTimeout(checkFrontend, 100);
        }
      } else {
        console.log('Life Skills Card: Waiting for HA frontend...');
        setTimeout(checkFrontend, 100);
      }
    };
    
    checkFrontend();
  });
};

// Initialize the card once frontend is ready
waitForHAFrontend().then(({ LitElement, html, css }) => {
  
  class LifeSkillsCard extends LitElement {
    static properties = {
      hass: {},
      config: {},
    };

    static styles = css`
      :host {
        display: block;
      }
      ha-card {
        background: linear-gradient(120deg, rgba(255,220,178,0.2) 0%, rgba(255,176,233,0) 70%);
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
    `;

    setConfig(config) {
      if (!config) throw new Error('Invalid configuration');
      if (typeof config !== 'object') throw new Error('Invalid configuration: expected an object');
      if (!('skill' in config)) config.skill = '';
      this.config = config;
    }

    shouldUpdate(changedProps) {
      if (!this.hass || !this.config || !this.config.skill) return false;
      if (changedProps.has('config')) return true;
      if (!changedProps.has('hass')) return false;
      
      const prevHass = changedProps.get('hass');
      if (!prevHass) return true;
      
      const skill = this.config.skill;
      const relevantEntities = [
        skill,
        skill.replace('number.', 'sensor.').replace('_xp', '_level'),
        skill.replace('number.', 'sensor.').replace('_xp', '_xp_to_next'),
      ];
      
      return relevantEntities.some(
        eid => (this.hass.states[eid]?.state !== prevHass.states[eid]?.state)
      );
    }

    render() {
      if (!this.hass || !this.config) return html``;
      
      const selectedSkill = this.config.skill || '';
      if (!selectedSkill || !this.hass.states[selectedSkill]) {
        return html`
          <ha-card>
            <div style="padding: 16px; text-align: center; color: var(--secondary-text-color);">
              No skill selected. Use the visual editor to choose a skill.
            </div>
          </ha-card>
        `;
      }
      
      const xpEntity = this.hass.states[selectedSkill];
      const xp = parseInt(xpEntity.state) || 0;
      
      const levelEntityId = selectedSkill.replace('number.', 'sensor.').replace('_xp', '_level');
      const levelEntity = this.hass.states[levelEntityId];
      const level = levelEntity ? parseInt(levelEntity.state) || 1 : 1;
      
      const xpToNextEntityId = selectedSkill.replace('number.', 'sensor.').replace('_xp', '_xp_to_next');
      const xpToNextEntity = this.hass.states[xpToNextEntityId];
      const xpToNext = xpToNextEntity ? parseInt(xpToNextEntity.state) || 0 : 0;
      
      let skillName = xpEntity.attributes && xpEntity.attributes.friendly_name ? 
        xpEntity.attributes.friendly_name : 'Unknown Skill';
      if (skillName.endsWith(' XP')) {
        skillName = skillName.slice(0, -3);
      }
      
      const currentLevelXp = this._calculateXpForLevel(level);
      const nextLevelXp = this._calculateXpForLevel(level + 1);
      const xpInCurrentLevel = xp - currentLevelXp;
      const xpNeededForLevel = nextLevelXp - currentLevelXp;
      const progressPercent = xpNeededForLevel > 0 ? 
        Math.round((xpInCurrentLevel / xpNeededForLevel) * 100) : 100;
      
      const skillIcon = xpEntity.attributes && xpEntity.attributes.icon ? 
        xpEntity.attributes.icon : 'mdi:star';
      
      return html`
        <ha-card>
          <div class="skill-card-container">
            <div class="top-row">
              <div class="icon-section">
                <ha-icon .icon="${skillIcon}"></ha-icon>
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
        </ha-card>
      `;
    }

    _calculateXpForLevel(level) {
      if (level <= 1) return 0;
      let totalSum = 0;
      for (let n = 1; n < level; n++) {
        const term = n + 300 * Math.pow(2, n / 7);
        totalSum += term;
      }
      return Math.floor(totalSum / 4);
    }

    static getConfigElement() {
      return document.createElement('life-skills-card-editor');
    }

    static getStubConfig() {
      return { skill: '' };
    }

    getCardSize() {
      return 2;
    }
  }

  // Card editor for the visual editor
  class LifeSkillsCardEditor extends LitElement {
    static properties = {
      hass: {},
      config: {},
    };

    setConfig(config) {
      this.config = config || {};
    }

    render() {
      // Get available skills for dropdown
      const skills = this._getAvailableSkills();

      return html`
        <style>
          .form-group {
            margin: 16px 0;
          }
          label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: var(--primary-text-color);
          }
          select {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--divider-color);
            border-radius: 4px;
            background: var(--card-background-color);
            color: var(--primary-text-color);
            font-size: 14px;
          }
          select:focus {
            outline: none;
            border-color: var(--primary-color);
          }
        </style>
        <div class="form-group">
          <label for="skill-select">Skill to Display:</label>
          <select id="skill-select" @change="${this._skillChanged}">
            <option value="">Select a skill...</option>
            ${skills.map(skill => html`
              <option value="${skill.entity_id}" ?selected="${this.config.skill === skill.entity_id}">
                ${skill.name}
              </option>
            `)}
          </select>
        </div>
      `;
    }

    _getAvailableSkills() {
      if (!this.hass) return [];

      const skills = [];
      Object.keys(this.hass.states).forEach(entity_id => {
        if (entity_id.startsWith('number.') && entity_id.endsWith('_xp')) {
          const state = this.hass.states[entity_id];
          let skillName = state.attributes.friendly_name || 
            entity_id.replace('number.', '').replace('_xp', '').replace(/_/g, ' ');
          
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

    _skillChanged(ev) {
      const value = ev.target.value;
      this._valueChanged('skill', value);
    }

    _valueChanged(key, value) {
      const newConfig = { ...this.config };
      newConfig[key] = value;
      
      const event = new CustomEvent('config-changed', {
        detail: { config: newConfig },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
    }
  }

  // Register the custom elements
  if (!customElements.get('life-skills-card')) {
    customElements.define('life-skills-card', LifeSkillsCard);
    console.log('Life Skills Card: Registered life-skills-card element');
  }

  if (!customElements.get('life-skills-card-editor')) {
    customElements.define('life-skills-card-editor', LifeSkillsCardEditor);
    console.log('Life Skills Card: Registered life-skills-card-editor element');
  }

  // Register with Lovelace card picker
  window.customCards = window.customCards || [];
  if (!window.customCards.find((c) => c.type === 'life-skills-card')) {
    window.customCards.push({
      type: 'life-skills-card',
      name: 'Life Skills Card',
      description: 'Shows XP progress and level for a selected Life Skill',
      preview: false,
    });
  }

  console.log('Life Skills Card: Successfully initialized with LitElement');

}).catch(error => {
  console.error('Life Skills Card: Failed to initialize:', error);
  
  // Fallback: Could implement HTMLElement version here if needed
  console.log('Life Skills Card: Consider implementing HTMLElement fallback');
});
