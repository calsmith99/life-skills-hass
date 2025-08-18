console.log('Life Skills Card: Loading...');

// Get LitElement from the global window object
const { LitElement, html, css } = window.lit || {};

if (!LitElement) {
  console.error('Life Skills Card: LitElement not found. Make sure Home Assistant frontend is loaded.');
}

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

  render() {
    console.log('[LifeSkillsCard] render called');
    if (!this.hass || !this.config) return html``;
    const selectedSkill = this.config.skill || '';
    if (!selectedSkill || !this.hass.states[selectedSkill]) {
      return html`<ha-card><div style="padding: 16px; text-align: center; color: var(--secondary-text-color);">No skill selected. Use the visual editor to choose a skill.</div></ha-card>`;
    }
    const xpEntity = this.hass.states[selectedSkill];
    const xp = parseInt(xpEntity.state) || 0;
    const levelEntityId = selectedSkill.replace('number.', 'sensor.').replace('_xp', '_level');
    const levelEntity = this.hass.states[levelEntityId];
    const level = levelEntity ? parseInt(levelEntity.state) || 1 : 1;
    const xpToNextEntityId = selectedSkill.replace('number.', 'sensor.').replace('_xp', '_xp_to_next');
    const xpToNextEntity = this.hass.states[xpToNextEntityId];
    const xpToNext = xpToNextEntity ? parseInt(xpToNextEntity.state) || 0 : 0;
    let skillName = xpEntity.attributes && xpEntity.attributes.friendly_name ? xpEntity.attributes.friendly_name : 'Unknown Skill';
    if (skillName.endsWith(' XP')) skillName = skillName.slice(0, -3);
    const currentLevelXp = this._calculateXpForLevel(level);
    const nextLevelXp = this._calculateXpForLevel(level + 1);
    const xpInCurrentLevel = xp - currentLevelXp;
    const xpNeededForLevel = nextLevelXp - currentLevelXp;
    const progressPercent = xpNeededForLevel > 0 ? Math.round((xpInCurrentLevel / xpNeededForLevel) * 100) : 100;
    const skillIcon = xpEntity.attributes && xpEntity.attributes.icon ? xpEntity.attributes.icon : 'mdi:star';
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

  shouldUpdate(changedProps) {
    if (!this.hass || !this.config || !this.config.skill) return false;
    if (changedProps.has('config')) {
      console.log('[LifeSkillsCard] shouldUpdate: config changed');
      return true;
    }
    if (!changedProps.has('hass')) return false;
    const prevHass = changedProps.get('hass');
    if (!prevHass) {
      console.log('[LifeSkillsCard] shouldUpdate: no previous hass');
      return true;
    }
    const skill = this.config.skill;
    const relevantEntities = [
      skill,
      skill.replace('number.', 'sensor.').replace('_xp', '_level'),
      skill.replace('number.', 'sensor.').replace('_xp', '_xp_to_next'),
    ];
    const changed = relevantEntities.filter(
      eid => (this.hass.states[eid]?.state !== prevHass.states[eid]?.state)
    );
    if (changed.length > 0) {
      console.log('[LifeSkillsCard] shouldUpdate: entity state(s) changed', changed);
      return true;
    }
    return false;
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
    return html`
      <div class="form-group">
        <label>Skill to Display</label>
        <ha-entity-picker
          .hass="${this.hass}"
          .value="${this.config.skill || ''}"
          .includeDomains="${['number']}"
          .entityFilter="${this._entityFilter}"
          @value-changed="${this._skillChanged}"
          allow-custom-entity
        ></ha-entity-picker>
      </div>
    `;
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
}

// Guard against double registration in dev/hot-reload environments
if (!customElements.get('life-skills-card')) {
  customElements.define('life-skills-card', LifeSkillsCard);
  console.log('Life Skills Card: Registered life-skills-card element');
} else {
  console.log('Life Skills Card: life-skills-card already registered');
}

if (!customElements.get('life-skills-card-editor')) {
  customElements.define('life-skills-card-editor', LifeSkillsCardEditor);
  console.log('Life Skills Card: Registered life-skills-card-editor element');
} else {
  console.log('Life Skills Card: life-skills-card-editor already registered');
}

// Optional: Register with Lovelace card picker
window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === 'life-skills-card')) {
  window.customCards.push({
    type: 'life-skills-card',
    name: 'Life Skills Card',
    description: 'Shows XP progress and level for a selected Life Skill',
    preview: false,
  });
}

console.log('Life Skills Card: Script loaded successfully');
