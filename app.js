import { gameData } from "./src/data/game-data.js";

const modeScreen = document.querySelector("#modeScreen");
const appBoard = document.querySelector("#appBoard");
const singleModeButton = document.querySelector("#singleModeButton");
const multiModeButton = document.querySelector("#multiModeButton");
const rollButton = document.querySelector("#rollButton");
const townRollButton = document.querySelector("#townRollButton");
const coinButton = document.querySelector("#coinButton");
const coinResult = document.querySelector("#coinResult");
const poolInfo = document.querySelector("#poolInfo");
const modeDescription = document.querySelector("#modeDescription");
const roomBanner = document.querySelector("#roomBanner");
const roomValue = document.querySelector("#roomValue");
const seatValue = document.querySelector("#seatValue");
const presenceValue = document.querySelector("#presenceValue");
const copyLinkButton = document.querySelector("#copyLinkButton");
const waitingPanel = document.querySelector("#waitingPanel");
const debugPanel = document.querySelector("#debugPanel");
const debugGrid = document.querySelector("#debugGrid");
const debugToggleButton = document.querySelector("#debugToggleButton");
const arenaSection = document.querySelector(".arena");
const controlsSection = document.querySelector(".controls");
const panels = {
  left: document.querySelector('.duelist-panel[data-side="left"]'),
  right: document.querySelector('.duelist-panel[data-side="right"]'),
};

const factions = gameData.factions;
const heroesByFaction = new Map(
  factions.map((faction) => [
    faction.key,
    gameData.heroes.filter((hero) => hero.faction === faction.key),
  ]),
);
const heroesBySlug = new Map(gameData.heroes.map((hero) => [hero.slug, hero]));
const params = new URLSearchParams(window.location.search);
const clientId = getClientId();

const state = {
  mode: null,
  multiplayer: null,
  single: createSingleState(),
  debugVisible: true,
};

function getClientId() {
  const key = "olden-era-randomizer-client-id";
  const existing = localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const value = crypto.randomUUID();
  localStorage.setItem(key, value);
  return value;
}

function createSingleState() {
  const [leftFaction, rightFaction] = pickTwoUnique(factions);
  return {
    sides: {
      left: { faction: leftFaction.key, heroSlug: null },
      right: { faction: rightFaction.key, heroSlug: null },
    },
    coin: 0,
  };
}

function randomRoomId() {
  return `oe-${crypto.randomUUID().slice(0, 8)}`;
}

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

function pickHeroSlug(factionKey, excludedSlug = null) {
  const pool = getAvailableHeroes(factionKey);
  const options = excludedSlug ? pool.filter((hero) => hero.slug !== excludedSlug) : pool;
  return sample(options.length ? options : pool).slug;
}

function setSearchParams(nextParams) {
  const url = new URL(window.location.href);
  url.search = nextParams.toString();
  window.history.replaceState({}, "", url);
}

function showApp() {
  modeScreen.classList.add("hidden");
  appBoard.classList.remove("hidden");
}

function buildTownSelectors() {
  for (const panel of Object.values(panels)) {
    const selector = panel.querySelector("[data-town-selector]");
    selector.innerHTML = "";

    for (const faction of factions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "town-option";
      button.dataset.faction = faction.key;
      button.innerHTML = `
        <img src="./public/${faction.image}" alt="${faction.name}" />
        <span>${faction.name}</span>
      `;
      selector.appendChild(button);
    }
  }
}

function renderSkills(container, skills) {
  container.innerHTML = "";

  for (const skill of skills) {
    const chip = document.createElement("span");
    chip.className = "detail-chip skill-chip";
    chip.innerHTML = `
      <img class="skill-icon" src="./public/${skill.image}" alt="${skill.name}" />
      <span>${skill.name}</span>
    `;
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

function getLocalViewState() {
  return {
    sides: state.single.sides,
    coin: state.single.coin,
  };
}

function getMultiUsage() {
  const usage = state.multiplayer?.usage;
  return {
    rerollCastlesLeftUsed: usage?.get("rerollCastlesLeftUsed") === true,
    rerollCastlesRightUsed: usage?.get("rerollCastlesRightUsed") === true,
    rerollBothLeftUsed: usage?.get("rerollBothLeftUsed") === true,
    rerollBothRightUsed: usage?.get("rerollBothRightUsed") === true,
    rerollSelfLeftUsed: usage?.get("rerollSelfLeftUsed") === true,
    rerollSelfRightUsed: usage?.get("rerollSelfRightUsed") === true,
  };
}

function getMultiplayerViewState() {
  const game = state.multiplayer?.game;
  return {
    sides: {
      left: {
        faction: game?.get("leftFaction"),
        heroSlug: game?.get("leftHeroSlug"),
      },
      right: {
        faction: game?.get("rightFaction"),
        heroSlug: game?.get("rightHeroSlug"),
      },
    },
    coin: game?.get("coin") ?? 0,
    seat: state.multiplayer.seat,
    usage: getMultiUsage(),
    connectedPeers: state.multiplayer.connectedPeers ?? 1,
  };
}

function hasRenderableState(viewState) {
  return (
    Boolean(viewState?.sides?.left?.faction) &&
    Boolean(viewState?.sides?.right?.faction) &&
    Boolean(viewState?.sides?.left?.heroSlug) &&
    Boolean(viewState?.sides?.right?.heroSlug)
  );
}

function getCurrentViewState() {
  return state.mode === "multiplayer" ? getMultiplayerViewState() : getLocalViewState();
}

function setPanel(side, viewState) {
  const panel = panels[side];
  const sideState = viewState.sides[side];
  const faction = getFaction(sideState.faction);
  const hero = heroesBySlug.get(sideState.heroSlug);
  const pool = getAvailableHeroes(sideState.faction);

  if (!faction || !hero) {
    return;
  }

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
  panel.querySelector("[data-hero-source]").href = hero.sourceUrl;

  renderSkills(panel.querySelector("[data-hero-skills]"), hero.startingSkills ?? []);
  renderSpell(panel.querySelector("[data-hero-spell]"), hero.startingSpell);

  panel.querySelector("[data-stat-attack]").textContent = hero.stats.attack;
  panel.querySelector("[data-stat-defence]").textContent = hero.stats.defence;
  panel.querySelector("[data-stat-spell-power]").textContent = hero.stats.spellPower;
  panel.querySelector("[data-stat-intelligence]").textContent = hero.stats.intelligence;

  const rerollButton = panel.querySelector("[data-reroll-side]");
  rerollButton.dataset.side = side;
}

function renderTownSelectorState(viewState) {
  for (const [side, panel] of Object.entries(panels)) {
    const otherSide = side === "left" ? "right" : "left";
    const selectedFaction = viewState.sides[side].faction;
    const blockedFaction = viewState.sides[otherSide].faction;

    for (const button of panel.querySelectorAll(".town-option")) {
      const isSelected = button.dataset.faction === selectedFaction;
      const isBlocked = button.dataset.faction === blockedFaction && !isSelected;
      button.classList.toggle("is-selected", isSelected);
      button.disabled = state.mode === "multiplayer" ? true : isBlocked;
      button.setAttribute("aria-pressed", String(isSelected));
    }

    panel.querySelector("[data-town-selector]").classList.toggle("is-hidden", state.mode === "multiplayer");
  }
}

function renderButtons(viewState) {
  if (state.mode === "single") {
    townRollButton.disabled = false;
    townRollButton.textContent = "Reroll Castles";
    rollButton.disabled = false;
    rollButton.textContent = "Reroll Both Heroes";

    for (const panel of Object.values(panels)) {
      const button = panel.querySelector("[data-reroll-side]");
      button.disabled = false;
      button.textContent = "Reroll Hero";
    }

    return;
  }

  const usage = viewState.usage;
  const seat = viewState.seat;
  const ownSide = seat === "left" || seat === "right" ? seat : null;

  const castlesKey = ownSide === "left" ? "rerollCastlesLeftUsed" : "rerollCastlesRightUsed";
  const castlesUsed = ownSide ? usage[castlesKey] : true;
  townRollButton.disabled = castlesUsed || !ownSide;
  townRollButton.textContent = castlesUsed ? "Reroll Castles Used" : "Reroll Castles";

  const bothKey = ownSide === "left" ? "rerollBothLeftUsed" : "rerollBothRightUsed";
  const bothUsed = ownSide ? usage[bothKey] : true;
  rollButton.disabled = bothUsed || !ownSide;
  rollButton.textContent = bothUsed ? "Reroll Both Used" : "Reroll Both Heroes";

  for (const [side, panel] of Object.entries(panels)) {
    const button = panel.querySelector("[data-reroll-side]");
    const selfKey = side === "left" ? "rerollSelfLeftUsed" : "rerollSelfRightUsed";
    const isOwnPanel = ownSide === side;
    button.disabled = !isOwnPanel || usage[selfKey];
    button.textContent = isOwnPanel
      ? usage[selfKey]
        ? "Reroll Used"
        : "Reroll Hero"
      : "Opponent Locked";
  }
}

function renderMeta(viewState) {
  if (state.mode === "single") {
    modeDescription.textContent =
      "Single mode keeps manual faction selection and unlimited rerolls for castles, heroes, and the coin.";
    roomBanner.classList.add("hidden");
    poolInfo.textContent =
      "Single mode: unlimited rerolls. Space rerolls both heroes. Coin flip is independent.";
  } else {
    const seat = viewState.seat ? viewState.seat.toUpperCase() : "SPECTATOR";
    modeDescription.textContent =
      "Multiplayer mode shares the same room state for both players. Each player gets one castle reroll, one reroll for both heroes, and one reroll for their own hero.";
    roomBanner.classList.remove("hidden");
    roomValue.textContent = state.multiplayer.roomId;
    seatValue.textContent = seat;
    presenceValue.textContent = viewState.connectedPeers > 1 ? "Connected" : "Waiting";
    poolInfo.textContent =
      "Multiplayer mode: each player may reroll castles once, reroll both heroes once, and reroll only their own hero once.";
  }

  coinButton.querySelector(".coin-face").textContent = String(viewState.coin ?? 0);
  coinResult.textContent = `Result: ${viewState.coin ?? 0}`;
}

function stringifyDebugValue(value) {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function getDebugEntries() {
  if (state.mode !== "multiplayer" || !state.multiplayer) {
    return [];
  }

  const players = state.multiplayer.players;
  const game = state.multiplayer.game;
  const usage = state.multiplayer.usage;
  const awarenessStates = state.multiplayer.awarenessStates ?? [];

  return [
    ["room", state.multiplayer.roomId],
    ["clientId", clientId],
    ["seat", state.multiplayer.seat],
    ["status", state.multiplayer.providerStatus],
    ["sync", state.multiplayer.synced],
    ["connectedPeers", state.multiplayer.connectedPeers],
    ["players.left", players?.get("left")],
    ["players.right", players?.get("right")],
    ["initialized", game?.get("initialized")],
    ["leftFaction", game?.get("leftFaction")],
    ["rightFaction", game?.get("rightFaction")],
    ["leftHeroSlug", game?.get("leftHeroSlug")],
    ["rightHeroSlug", game?.get("rightHeroSlug")],
    ["coin", game?.get("coin")],
    ["usage.leftCastles", usage?.get("rerollCastlesLeftUsed")],
    ["usage.rightCastles", usage?.get("rerollCastlesRightUsed")],
    ["usage.leftBoth", usage?.get("rerollBothLeftUsed")],
    ["usage.rightBoth", usage?.get("rerollBothRightUsed")],
    ["usage.leftSelf", usage?.get("rerollSelfLeftUsed")],
    ["usage.rightSelf", usage?.get("rerollSelfRightUsed")],
    ["awareness", awarenessStates],
    ["lastEvent", state.multiplayer.lastEvent],
  ];
}

function renderDebugPanel() {
  if (state.mode !== "multiplayer") {
    debugPanel.classList.add("hidden");
    return;
  }

  debugPanel.classList.toggle("hidden", !state.debugVisible);
  debugToggleButton.textContent = state.debugVisible ? "Hide Debug" : "Show Debug";

  if (!state.debugVisible) {
    return;
  }

  debugGrid.innerHTML = "";
  for (const [key, value] of getDebugEntries()) {
    const item = document.createElement("div");
    item.className = "debug-item";
    item.innerHTML = `
      <p class="debug-key">${key}</p>
      <p class="debug-value">${stringifyDebugValue(value)}</p>
    `;
    debugGrid.appendChild(item);
  }
}

function renderLobbyState(viewState) {
  if (state.mode === "single") {
    waitingPanel.classList.add("hidden");
    arenaSection.classList.remove("hidden");
    controlsSection.classList.remove("hidden");
    return;
  }

  const isReady = (viewState.connectedPeers ?? 1) > 1;
  waitingPanel.classList.toggle("hidden", isReady);
  arenaSection.classList.toggle("hidden", !isReady);
  controlsSection.classList.toggle("hidden", !isReady);
}

function render() {
  const viewState = getCurrentViewState();
  renderLobbyState(viewState);
  renderDebugPanel();
  if (!hasRenderableState(viewState)) {
    renderMeta(viewState);
    return;
  }
  setPanel("left", viewState);
  setPanel("right", viewState);
  renderTownSelectorState(viewState);
  renderButtons(viewState);
  renderMeta(viewState);
}

function rerollSingleHero(side) {
  const own = state.single.sides[side];
  own.heroSlug = pickHeroSlug(own.faction, own.heroSlug);
}

function rerollSingleBothHeroes() {
  rerollSingleHero("left");
  rerollSingleHero("right");
  render();
}

function rerollSingleCastles() {
  const [leftFaction, rightFaction] = pickTwoUnique(factions);
  state.single.sides.left.faction = leftFaction.key;
  state.single.sides.right.faction = rightFaction.key;
  state.single.sides.left.heroSlug = pickHeroSlug(leftFaction.key);
  state.single.sides.right.heroSlug = pickHeroSlug(rightFaction.key);
  render();
}

function setSingleFaction(side, factionKey) {
  const otherSide = side === "left" ? "right" : "left";
  if (state.single.sides[otherSide].faction === factionKey) {
    return;
  }

  state.single.sides[side].faction = factionKey;
  state.single.sides[side].heroSlug = pickHeroSlug(factionKey);
  render();
}

function flipSingleCoin() {
  const value = Math.random() < 0.5 ? 0 : 1;
  state.single.coin = value;
  animateCoin(value);
}

function animateCoin(value) {
  coinButton.classList.remove("is-flipping");
  void coinButton.offsetWidth;
  coinButton.classList.add("is-flipping");
  coinButton.querySelector(".coin-face").textContent = String(value);
  coinResult.textContent = `Result: ${value}`;
}

function initializeSingle() {
  state.mode = "single";
  const nextParams = new URLSearchParams();
  nextParams.set("mode", "single");
  setSearchParams(nextParams);
  showApp();

  state.single.sides.left.heroSlug = pickHeroSlug(state.single.sides.left.faction);
  state.single.sides.right.heroSlug = pickHeroSlug(state.single.sides.right.faction);

  for (const [side, panel] of Object.entries(panels)) {
    for (const button of panel.querySelectorAll(".town-option")) {
      button.onclick = () => setSingleFaction(side, button.dataset.faction);
    }
  }

  townRollButton.onclick = rerollSingleCastles;
  rollButton.onclick = rerollSingleBothHeroes;
  coinButton.onclick = flipSingleCoin;

  for (const panel of Object.values(panels)) {
    panel.querySelector("[data-reroll-side]").onclick = (event) => {
      rerollSingleHero(event.currentTarget.dataset.side);
      render();
    };
  }

  render();
}

async function initializeMultiplayer({ roomId, isHost }) {
  state.mode = "multiplayer";
  showApp();

  const nextParams = new URLSearchParams();
  nextParams.set("mode", "multi");
  nextParams.set("room", roomId);
  if (isHost) {
    nextParams.set("host", "1");
  }
  setSearchParams(nextParams);

  let Y;
  let WebsocketProvider;
  try {
    Y = await import("https://esm.sh/yjs@13.6.27?bundle");
    ({ WebsocketProvider } = await import("https://esm.sh/y-websocket@1.5.4?bundle"));
  } catch (error) {
    modeDescription.textContent =
      "Multiplayer failed to initialize in this browser session. Please refresh and try again.";
    poolInfo.textContent = "Multiplayer modules could not be loaded.";
    console.error(error);
    return;
  }

  const ydoc = new Y.Doc();
  const provider = new WebsocketProvider("wss://demos.yjs.dev", roomId, ydoc);

  const root = ydoc.getMap("root");

  state.multiplayer = {
    roomId,
    ydoc,
    provider,
    root,
    players: null,
    game: null,
    usage: null,
    seat: null,
    connectedPeers: 1,
    synced: false,
    providerStatus: "connecting",
    awarenessStates: [],
    lastEvent: "init",
  };

  function getSharedMaps() {
    return {
      players: root.get("players") ?? null,
      game: root.get("game") ?? null,
      usage: root.get("usage") ?? null,
    };
  }

  function attachSharedMaps() {
    const maps = getSharedMaps();
    state.multiplayer.players = maps.players;
    state.multiplayer.game = maps.game;
    state.multiplayer.usage = maps.usage;
    return maps;
  }

  function ensureSharedMaps() {
    const existing = getSharedMaps();
    const players = existing.players ?? new Y.Map();
    const game = existing.game ?? new Y.Map();
    const usage = existing.usage ?? new Y.Map();

    if (!existing.players) root.set("players", players);
    if (!existing.game) root.set("game", game);
    if (!existing.usage) root.set("usage", usage);

    state.multiplayer.players = players;
    state.multiplayer.game = game;
    state.multiplayer.usage = usage;
    return { players, game, usage };
  }

  function initializeSharedGameIfNeeded() {
    const { players, game, usage } = ensureSharedMaps();
    if (!players.get("left")) {
      players.set("left", clientId);
    }
    if (game.get("initialized")) {
      return;
    }

    const [leftFaction, rightFaction] = pickTwoUnique(factions);
    game.set("leftFaction", leftFaction.key);
    game.set("rightFaction", rightFaction.key);
    game.set("leftHeroSlug", pickHeroSlug(leftFaction.key));
    game.set("rightHeroSlug", pickHeroSlug(rightFaction.key));
    game.set("coin", 0);
    usage.set("rerollCastlesLeftUsed", false);
    usage.set("rerollCastlesRightUsed", false);
    usage.set("rerollBothLeftUsed", false);
    usage.set("rerollBothRightUsed", false);
    usage.set("rerollSelfLeftUsed", false);
    usage.set("rerollSelfRightUsed", false);
    game.set("initialized", true);
  }

  if (isHost) {
    initializeSharedGameIfNeeded();
  } else {
    attachSharedMaps();
  }

  const awareness = provider.awareness;
  awareness.setLocalStateField("clientId", clientId);
  state.multiplayer.lastEvent = "awareness:init";

  function getAssignedPlayerCount() {
    const players = state.multiplayer.players;
    if (!players) {
      return 1;
    }

    const left = players.get("left");
    const right = players.get("right");
    return new Set([left, right].filter(Boolean)).size || 1;
  }

  function updatePresence() {
    state.multiplayer.connectedPeers = getAssignedPlayerCount();
    state.multiplayer.awarenessStates = Array.from(awareness.getStates().entries()).map(([id, value]) => ({
      id,
      clientId: value.clientId ?? null,
      seat: value.seat ?? null,
    }));
    if (state.multiplayer.seat === "left" || state.multiplayer.seat === "right") {
      awareness.setLocalStateField("seat", state.multiplayer.seat);
    }
  }

  claimSeat();
  updatePresence();
  if (state.multiplayer.game?.get("initialized")) {
    render();
  }

  root.observeDeep(() => {
    state.multiplayer.lastEvent = "root.observeDeep";
    attachSharedMaps();
    claimSeat();
    updatePresence();
    if (state.multiplayer.game?.get("initialized")) {
      render();
    }
  });

  function claimSeat() {
    const players = state.multiplayer.players;
    if (!players) {
      state.multiplayer.seat = null;
      return;
    }

    const left = players.get("left");
    const right = players.get("right");

    if (left === clientId) {
      state.multiplayer.seat = "left";
      return;
    }

    if (right === clientId) {
      state.multiplayer.seat = "right";
      return;
    }

    if (!left) {
      players.set("left", clientId);
      state.multiplayer.seat = "left";
      return;
    }

    if (!right) {
      players.set("right", clientId);
      state.multiplayer.seat = "right";
      return;
    }

    state.multiplayer.seat = "spectator";
  }

  function rerollSharedCastles() {
    const game = state.multiplayer.game;
    const usage = state.multiplayer.usage;
    if (!state.multiplayer.seat || state.multiplayer.seat === "spectator") {
      return;
    }
    if (!game || !usage) {
      return;
    }

    const usageKey =
      state.multiplayer.seat === "left" ? "rerollCastlesLeftUsed" : "rerollCastlesRightUsed";
    if (usage.get(usageKey)) {
      return;
    }

    const [leftFaction, rightFaction] = pickTwoUnique(factions);
    game.set("leftFaction", leftFaction.key);
    game.set("rightFaction", rightFaction.key);
    game.set("leftHeroSlug", pickHeroSlug(leftFaction.key));
    game.set("rightHeroSlug", pickHeroSlug(rightFaction.key));
    usage.set(usageKey, true);
  }

  function rerollSharedBothHeroes() {
    const game = state.multiplayer.game;
    const usage = state.multiplayer.usage;
    const seat = state.multiplayer.seat;
    if (!seat || seat === "spectator") {
      return;
    }
    if (!game || !usage) {
      return;
    }

    const usageKey = seat === "left" ? "rerollBothLeftUsed" : "rerollBothRightUsed";
    if (usage.get(usageKey)) {
      return;
    }

    const leftFaction = game.get("leftFaction");
    const rightFaction = game.get("rightFaction");
    game.set("leftHeroSlug", pickHeroSlug(leftFaction, game.get("leftHeroSlug")));
    game.set("rightHeroSlug", pickHeroSlug(rightFaction, game.get("rightHeroSlug")));
    usage.set(usageKey, true);
  }

  function rerollOwnHero() {
    const game = state.multiplayer.game;
    const usage = state.multiplayer.usage;
    const seat = state.multiplayer.seat;
    if (!seat || seat === "spectator") {
      return;
    }
    if (!game || !usage) {
      return;
    }

    const usageKey = seat === "left" ? "rerollSelfLeftUsed" : "rerollSelfRightUsed";
    if (usage.get(usageKey)) {
      return;
    }

    const factionKey = game.get(seat === "left" ? "leftFaction" : "rightFaction");
    const heroKey = seat === "left" ? "leftHeroSlug" : "rightHeroSlug";
    game.set(heroKey, pickHeroSlug(factionKey, game.get(heroKey)));
    usage.set(usageKey, true);
  }

  function flipSharedCoin() {
    const game = state.multiplayer.game;
    if (!game) {
      return;
    }
    const value = Math.random() < 0.5 ? 0 : 1;
    game.set("coin", value);
    animateCoin(value);
  }

  function copyInviteLink() {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?mode=multi&room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      copyLinkButton.textContent = "Invite Link Copied";
      setTimeout(() => {
        copyLinkButton.textContent = "Copy Invite Link";
      }, 1800);
    }).catch(() => {
      copyLinkButton.textContent = "Copy Invite Link";
    });
  }

  provider.on("status", () => {
    state.multiplayer.providerStatus = provider.wsconnected ? "connected" : "disconnected";
    state.multiplayer.lastEvent = "provider.status";
    attachSharedMaps();
    claimSeat();
    updatePresence();
    render();
  });

  awareness.on("change", () => {
    state.multiplayer.lastEvent = "awareness.change";
    attachSharedMaps();
    claimSeat();
    updatePresence();
    render();
  });

  provider.on("sync", () => {
    state.multiplayer.synced = true;
    state.multiplayer.lastEvent = "provider.sync";
    attachSharedMaps();
    claimSeat();
    updatePresence();
    showApp();
    render();
  });

  renderMeta({
    seat: "CONNECTING",
    coin: 0,
    sides: { left: {}, right: {} },
    usage: {},
    connectedPeers: 1,
  });

  townRollButton.onclick = rerollSharedCastles;
  rollButton.onclick = rerollSharedBothHeroes;
  coinButton.onclick = flipSharedCoin;
  copyLinkButton.onclick = copyInviteLink;

  for (const panel of Object.values(panels)) {
    panel.querySelector("[data-reroll-side]").onclick = () => rerollOwnHero();
  }

  render();
}

singleModeButton.addEventListener("click", initializeSingle);
multiModeButton.addEventListener("click", () => {
  const roomId = randomRoomId();
  const inviteUrl = `${window.location.origin}${window.location.pathname}?mode=multi&room=${roomId}`;
  navigator.clipboard.writeText(inviteUrl).catch(() => {});
  initializeMultiplayer({ roomId, isHost: true });
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !appBoard.classList.contains("hidden")) {
    event.preventDefault();
    if (state.mode === "single") {
      rerollSingleBothHeroes();
    }
  }
});

buildTownSelectors();

debugToggleButton.addEventListener("click", () => {
  state.debugVisible = !state.debugVisible;
  renderDebugPanel();
});

if (params.get("mode") === "multi" && params.get("room")) {
  initializeMultiplayer({ roomId: params.get("room"), isHost: params.get("host") === "1" });
} else if (params.get("mode") === "single") {
  initializeSingle();
}
