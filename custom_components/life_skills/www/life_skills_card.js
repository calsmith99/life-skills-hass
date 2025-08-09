// Life Skills Card - Starting from absolute scratch
console.log("Life Skills Card: File loading...");

class LifeSkillsCard extends HTMLElement {
  setConfig(config) {
    console.log("Life Skills Card: setConfig called");
    this.config = config;
  }

  set hass(hass) {
    console.log("Life Skills Card: hass setter called");
    this._hass = hass;
    this.innerHTML = "<ha-card><div style='padding: 16px;'>Life Skills Card - It Works!</div></ha-card>";
  }
}

console.log("Life Skills Card: About to register...");
customElements.define('life-skills-card', LifeSkillsCard);
console.log("Life Skills Card: Registered!");
