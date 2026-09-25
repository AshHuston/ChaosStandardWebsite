import { getTopCardsFrom } from "./mtgtop8scraper.js"
import fs from "fs/promises";

async function addCards() {
const data = JSON.parse(
    await fs.readFile("./standardSetsWithLegality.json", "utf8")
);


// Assume the file contains an array
for (const set of data) {
    console.log("--------")
    if (!set.lastLegal) { continue; }
    
    const foundcards = await getTopCardsFrom(set);
    set.topCards = foundcards
    console.log(`${foundcards.size} top cards found from ${set.name}`)
}

// Write the modified data to a new file
await fs.writeFile(
    "./standardSetsWithTopCards.json",
    JSON.stringify(data, null, 2)
);

console.log("Done!");

}

await addCards()
