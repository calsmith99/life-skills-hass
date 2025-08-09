class LifeSkillsCard extends HTMLElement {
  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;
    this.innerHTML = "<ha-card><div style='padding: 16px;'>Life Skills Card - It Works!</div></ha-card>";
  }
}

customElements.define('life-skills-card', LifeSkillsCard);
