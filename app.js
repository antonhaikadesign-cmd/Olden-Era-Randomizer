import { gameData } from "./src/data/game-data.js";

const rollButton = document.querySelector("#rollButton");
const townRollButton = document.querySelector("#townRollButton");
const coinButton = document.querySelector("#coinButton");
const coinResult = document.querySelector("#coinResult");
const poolInfo = document.querySelector("#poolInfo");
const panels = {
  left: document.querySelector('.duelist-panel[data-side="left"]'),
  right: document.querySelector('.duelist-panel[data-side="right"]'),
};

const factions = gameData.factions;
const initialLeftIndex = Math.floor(Math.random() * factions.length);
let initialRightIndex = Math.floor(Math.random() * factions.length);

while (initialRightIndex === initialLeftIndex) {
  initialRightIndex = Math.floor(Math.random() * factions.length);
}

const heroesByFaction = new Map(
  factions.map((faction) => [
    faction.key,
    gameData.heroes.filter((hero) => hero.faction === faction.key),
  ]),
);

const state = {
  sides: {
    left: { faction: factions[initialLeftIndex].key, hero: null },
    right: { faction: factions[initialRightIndex].key, hero: null },
  },
};

function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickTwoUnique(items) {
  const firstIndex = Math.floor(Math.random() * items.length);
  let secondIndex = Math.floor(Math.random() * items.length);

  while (secondIndex === firstIndex) {
    secondIndex = Math.floor(Math.random() * items.length);
  }

  return [items[firstIndex], items[secondIndex]];
}

function getFaction(key) {
  return factions.find((faction) => faction.key === key);
}

function getAvailableHeroes(factionKey) {
  return heroesByFaction.get(factionKey) ?? [];
}

function buildTownSelectors() {
  for (const [side, panel] of Object.entries(panels)) {
    const selector = panel.querySelector("[data-town-selector]");
    selector.innerHTML = "";

    for (const faction of factions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "town-option";
      button.dataset.faction = faction.key;
      button.dataset.side = side;
      button.setAttribute("aria-label", faction.name);
      button.title = faction.name;
      button.innerHTML = `
        <img src="./public/${faction.image}" alt="${faction.name}" />
        <span>${faction.name}</span>
      `;

      button.addEventListener("click", () => {
        if (state.sides[side].faction === faction.key) {
          return;
        }

        const otherSide = side === "left" ? "right" : "left";
        if (state.sides[otherSide].faction === faction.key) {
          return;
        }

        state.sides[side].faction = faction.key;
        rerollHero(side);
        render();
      });

      selector.appendChild(button);
    }
  }
}

function rerollHero(side) {
  const factionKey = state.sides[side].faction;
  const pool = getAvailableHeroes(factionKey);
  const otherSide = side === "left" ? "right" : "left";
  const otherHeroName = state.sides[otherSide].hero?.name;
  const alternatives = pool.filter((hero) => hero.name !== otherHeroName);
  state.sides[side].hero = sample(alternatives.length ? alternatives : pool);
}

function rerollBothHeroes() {
  rerollHero("left");
  rerollHero("right");

  if (state.sides.left.hero?.name === state.sides.right.hero?.name) {
    rerollHero("right");
  }

  render();
}

function rerollCastles() {
  const [leftFaction, rightFaction] = pickTwoUnique(factions);
  state.sides.left.faction = leftFaction.key;
  state.sides.right.faction = rightFaction.key;
  rerollHero("left");
  rerollHero("right");

  if (state.sides.left.hero?.name === state.sides.right.hero?.name) {
    rerollHero("right");
  }

  render();
}

function renderSkills(container, skills) {
  container.innerHTML = "";

  for (const skill of skills) {
    const chip = document.createElement("span");
    chip.className = "detail-chip";
    chip.textContent = skill;
    container.appendChild(chip);
  }
}

function renderSpell(container, spell) {
  if (!spell) {
    container.innerHTML = '<span class="detail-chip detail-chip-muted">No starting spell</span>';
    return;
  }

  container.innerHTML = `
    <div class="spell-content">
      ${spell.image ? `<img class="spell-icon" src="./public/${spell.image}" alt="${spell.name}" />` : ""}
      <span class="spell-name">${spell.name}</span>
    </div>
  `;
}

function setPanel(side) {
  const panel = panels[side];
  const sideState = state.sides[side];
  const faction = getFaction(sideState.faction);
  const hero = sideState.hero;
  const pool = getAvailableHeroes(sideState.faction);

  panel.querySelector("[data-town-name]").textContent = faction.name;
  const townImage = panel.querySelector("[data-town-image]");
  townImage.src = `./public/${faction.image}`;
  townImage.alt = faction.name;

  const heroImage = panel.querySelector("[data-hero-image]");
  heroImage.src = `./public/${hero.image}`;
  heroImage.alt = hero.name;

  panel.querySelector("[data-hero-faction]").textContent = faction.name;
  panel.querySelector("[data-hero-name]").textContent = hero.name;
  panel.querySelector("[data-hero-class]").textContent = hero.className || "Unknown class";
  panel.querySelector("[data-hero-description]").textContent =
    hero.description || "No specialty description available.";
  panel.querySelector("[data-hero-pool]").textContent = `${pool.length} heroes in ${faction.name}`;

  const sourceLink = panel.querySelector("[data-hero-source]");
  sourceLink.href = hero.sourceUrl;

  renderSkills(panel.querySelector("[data-hero-skills]"), hero.startingSkills ?? []);
  renderSpell(panel.querySelector("[data-hero-spell]"), hero.startingSpell);

  panel.querySelector("[data-stat-attack]").textContent = hero.stats.attack;
  panel.querySelector("[data-stat-defence]").textContent = hero.stats.defence;
  panel.querySelector("[data-stat-spell-power]").textContent = hero.stats.spellPower;
  panel.querySelector("[data-stat-intelligence]").textContent = hero.stats.intelligence;

  panel.querySelector("[data-reroll-side]").dataset.side = side;
}

function updateTownSelectorState() {
  for (const [side, panel] of Object.entries(panels)) {
    const otherSide = side === "left" ? "right" : "left";
    const selectedFaction = state.sides[side].faction;
    const blockedFaction = state.sides[otherSide].faction;

    for (const button of panel.querySelectorAll(".town-option")) {
      const isSelected = button.dataset.faction === selectedFaction;
      const isBlocked = button.dataset.faction === blockedFaction && !isSelected;
      button.classList.toggle("is-selected", isSelected);
      button.disabled = isBlocked;
      button.setAttribute("aria-pressed", String(isSelected));
    }
  }
}

function render() {
  setPanel("left");
  setPanel("right");
  updateTownSelectorState();
}

function flipCoin() {
  const value = Math.random() < 0.5 ? 0 : 1;
  coinButton.classList.remove("is-flipping");
  void coinButton.offsetWidth;
  coinButton.classList.add("is-flipping");
  coinButton.querySelector(".coin-face").textContent = String(value);
  coinResult.textContent = `Result: ${value}`;
}

buildTownSelectors();
rerollCastles();

rollButton.addEventListener("click", rerollBothHeroes);
townRollButton.addEventListener("click", rerollCastles);
coinButton.addEventListener("click", flipCoin);

for (const panel of Object.values(panels)) {
  panel.querySelector("[data-reroll-side]").addEventListener("click", (event) => {
    rerollHero(event.currentTarget.dataset.side);
    render();
  });
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    rerollBothHeroes();
  }
});

poolInfo.textContent =
  "Castles can reroll as a pair, heroes can reroll independently, and the coin flip is a separate 0/1 helper.";
