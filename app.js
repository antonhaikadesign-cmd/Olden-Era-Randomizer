import { gameData } from "./src/data/game-data.js";

const rollButton = document.querySelector("#rollButton");
const townRollButton = document.querySelector("#townRollButton");
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
  panel.querySelector("[data-hero-pool]").textContent = `${pool.length} heroes in ${faction.name}`;

  const rerollButton = panel.querySelector("[data-reroll-side]");
  rerollButton.dataset.side = side;
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

buildTownSelectors();
rerollCastles();

rollButton.addEventListener("click", rerollBothHeroes);
townRollButton.addEventListener("click", rerollCastles);

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
  "You can reroll castles as a pair or reroll only heroes. Castles never repeat, and hero rerolls always stay inside the chosen faction.";
