import { getTopCardsFrom } from "./mtgtop8scraper.js";
import fs from "fs/promises";

async function addCards() {
    const data = JSON.parse(
        await fs.readFile("./standardSetsWithLegality.json", "utf8")
    );

    let foundLast = false;
    const lastSaved = "Arabian Nights"

    for (const set of data) {
        console.log("--------");

        if (!set.lastLegal) {
            continue;
        }

        if (set.name !== lastSaved && !foundLast) {
            continue;
        }
        foundLast = true;

        const foundCards = await getTopCardsFrom(set);

        // Convert Set -> Array for JSON
        set.topCards = [...foundCards];

        console.log(
            `${foundCards.size} top cards found from ${set.name}`
        );

        await fs.writeFile(
            "./standardSetsWithTopCards.json",
            JSON.stringify(data, null, 2)
        );

        console.log(`Saved progress after ${set.name}`);
    }

    console.log("Done!");
}

await addCards();
