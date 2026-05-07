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

const entityMap = {
  "&amp;": "&",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
};

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&(amp|quot|nbsp|lt|gt);|&#x27;|&#39;/g, (entity) => entityMap[entity] ?? entity);
}

function toAssetPath(urlPath) {
  return urlPath.replace(/^\/img\//, "assets/");
}

function humanizeSlug(value) {
  return decodeHtml(value)
    .replace(/^basic_/, "")
    .replace(/^expert_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function fetchHtml(url) {
  return execFileSync("curl", ["-sL", url], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
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
      name: decodeHtml(match[3]),
      faction,
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

function parseHeroDetails(html, hero) {
  const classMatch = html.match(
    /hero-content-class-title"><span class="gold">Class<\/span>:\s*<!-- -->([^<]+)/,
  );
  const specialtyNameMatch = html.match(/<span class="specialty-name">([^<]+)<\/span>/);
  const specialtyDescMatch = html.match(
    /<span class="unit-content-ability-tooltip-desc">([^<]+)<\/span>/,
  );

  const statMatches = [...html.matchAll(/<span class="stat-value">([^<]+)<\/span>/g)]
    .slice(0, 4)
    .map((match) => decodeHtml(match[1]).replace(/<!-- -->/g, "").trim());

  const skillsSectionMatch = html.match(
    /<div class="hero-content-skills-list">([\s\S]*?)<\/div><\/div><div class="hero-content-army">/,
  );
  const spellSectionMatch = html.match(
    /<div class="hero-content-spell-list">([\s\S]*?)<\/div><\/div><div class="hero-content-stat-chances">/,
  );

  const startingSkills = skillsSectionMatch
    ? [...skillsSectionMatch[1].matchAll(/<div class="hero-content-skill" title="([^"]+)"><span style="display:contents"><img src="([^"]+)" alt="([^"]+)"\/><\/span><\/div>/g)].map((match) => ({
        name: humanizeSlug(match[1]),
        image: toAssetPath(match[2]),
      }))
    : [];

  const spellTitle = spellSectionMatch?.[1].match(/title="([^"]+)"/)?.[1] ?? null;
  const spellImage = spellSectionMatch?.[1].match(/<img src="([^"]+)"/)?.[1] ?? null;

  return {
    className: decodeHtml(classMatch?.[1] ?? ""),
    specialty: {
      name: decodeHtml(specialtyNameMatch?.[1] ?? ""),
      description: decodeHtml(specialtyDescMatch?.[1] ?? ""),
    },
    description: decodeHtml(specialtyDescMatch?.[1] ?? ""),
    startingSkills,
    startingSpell: spellTitle
      ? {
          name: decodeHtml(spellTitle),
          image: spellImage ? toAssetPath(spellImage) : null,
        }
      : null,
    stats: {
      attack: statMatches[0] ?? "",
      defence: statMatches[1] ?? "",
      spellPower: statMatches[2] ?? "",
      intelligence: statMatches[3] ?? "",
    },
    sourceUrl: `${SITE_ORIGIN}/en/heroes/${hero.slug}`,
  };
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

  const heroesHtml = fetchHtml(HEROES_URL);
  const heroes = parseHeroes(heroesHtml)
    .filter((hero) => factionMeta[hero.faction])
    .sort((a, b) => a.name.localeCompare(b.name));
  const factions = parseFactionImages(heroesHtml);

  const extraAssets = new Map();

  for (const hero of heroes) {
    const heroHtml = fetchHtml(`${SITE_ORIGIN}/en/heroes/${hero.slug}`);
    Object.assign(hero, parseHeroDetails(heroHtml, hero));
    await downloadFile(hero.remoteImage, path.join(publicDir, hero.image));

    if (hero.startingSpell?.image) {
      extraAssets.set(hero.startingSpell.image, `${SITE_ORIGIN}${hero.startingSpell.image.replace(/^assets/, "/img")}`);
    }

    for (const skill of hero.startingSkills) {
      extraAssets.set(skill.image, `${SITE_ORIGIN}${skill.image.replace(/^assets/, "/img")}`);
    }
  }

  for (const [assetPath, assetUrl] of extraAssets) {
    await downloadFile(assetUrl, path.join(publicDir, assetPath));
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
