import fs from "fs/promises"

const UNIVERSES_BEYOND = new Set([
    "fin", // Final Fantasy
    "spm", // Spider-Man
    "tla", // Avatar
    "trk", // Star Trek
    "hob", // Hobbit
    "msh", // Marvel
    "tmt", // Ninja Turtles
    "om1", // Omenpaths 1
]);

async function generateStandardSets() {
    const response = await fetch("https://api.scryfall.com/sets", {
        headers: {
            "User-Agent": "MyCubeApp/1.0 (personal project)"
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Scryfall error ${response.status}: ${error}`);
    }

    const data = await response.json();

    const standardSets = data.data
        .filter(set =>
            set.set_type === "core" ||
            set.set_type === "expansion"
        )
        .sort((a, b) =>
            new Date(a.released_at) - new Date(b.released_at)
        )
        .map(set => ({
            code: set.code,
            name: set.name,
            set_type: set.set_type == "core" ? "core" : set.card_count > 200 ? "large" : "small",
            num_cards: set.card_count,
            released_at: set.released_at,
            is_universes_beyond: UNIVERSES_BEYOND.has(set.code),
            icon_svg_uri: set.icon_svg_uri
        }));

    await fs.writeFile(
        "./standardSets.json",
        JSON.stringify(standardSets, null, 2)
    );

    console.log(`Saved ${standardSets.length} sets.`);
}

generateStandardSets().catch(console.error);
