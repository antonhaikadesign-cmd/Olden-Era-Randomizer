import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const SITE_ORIGIN = "https://www.olden-era.com";
const HEROES_URL = `${SITE_ORIGIN}/en/heroes`;

const factionMeta = {
  temple: { name: "Temple" },
  schism: { name: "Schism" },
  dungeon: { name: "Dungeon" },
  necropolis: { name: "Necropolis" },
  sylvan: { name: "Sylvan" },
  hive: { name: "Hive" },
};

function toAssetPath(urlPath) {
  return urlPath.replace(/^\/img\//, "assets/");
}

function parseHeroes(html) {
  const matches = [
    ...html.matchAll(
      /<li class="hero-select-btn [^"]*"><a href="\/en\/heroes\/([^"]+)"><div class="hero-select-icon-wrapper"[^>]*><img src="([^"]+)" alt="([^"]+?) — /g,
    ),
  ];

  if (!matches.length) {
    throw new Error("Could not find hero entries in heroes page.");
  }

  return matches.map((match) => {
    const imageUrl = match[2];
    const [, faction] = imageUrl.match(/^\/img\/heroes\/([^/]+)\//) ?? [];

    return {
      slug: match[1],
      name: match[3],
      faction,
      className: "",
      image: toAssetPath(imageUrl),
      remoteImage: `${SITE_ORIGIN}${imageUrl}`,
    };
  });
}

function parseFactionImages(html) {
  const matches = [...html.matchAll(/href="(\/img\/factions\/([a-z_]+)\.webp)"/g)];

  const seen = new Map();
  for (const [, urlPath, key] of matches) {
    if (factionMeta[key] && !seen.has(key)) {
      seen.set(key, {
        key,
        name: factionMeta[key].name,
        image: toAssetPath(urlPath),
        remoteImage: `${SITE_ORIGIN}${urlPath}`,
      });
    }
  }

  return [...seen.values()];
}

async function downloadFile(url, destination) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, buffer);
}

async function main() {
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, "public");
  const dataDir = path.join(rootDir, "src", "data");

  const html = execFileSync("curl", ["-L", HEROES_URL], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const heroes = parseHeroes(html)
    .filter((hero) => factionMeta[hero.faction])
    .sort((a, b) => a.name.localeCompare(b.name));
  const factions = parseFactionImages(html);

  for (const hero of heroes) {
    await downloadFile(hero.remoteImage, path.join(publicDir, hero.image));
  }

  for (const faction of factions) {
    await downloadFile(faction.remoteImage, path.join(publicDir, faction.image));
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: HEROES_URL,
    factions: factions.map(({ remoteImage, ...faction }) => faction),
    heroes: heroes.map(({ remoteImage, ...hero }) => hero),
  };

  await mkdir(dataDir, { recursive: true });
  const json = JSON.stringify(payload, null, 2);
  await writeFile(path.join(dataDir, "game-data.json"), json);
  await writeFile(path.join(dataDir, "game-data.js"), `export const gameData = ${json};\n`);

  console.log(`Saved ${heroes.length} heroes and ${factions.length} factions.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
