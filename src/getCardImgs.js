import fs from "fs/promises";

const INPUT_FILE = "./standardSetsWithTopCards.json";
const OUTPUT_FILE = "./standardSetsWithImages.json";

function sleep(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCardImage(cardName, setCode) {
    const query = `!"${cardName}" set:${setCode}`;

    const url =
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
        headers: {
            "User-Agent": "ChaosStandardWebsite/1.0 (personal project)",
            "Accept": "application/json"
        }
    });

    const body = await response.json();

    if (!response.ok) {
        console.error(body);
        throw new Error(
            `${response.status} fetching ${cardName} (${setCode})`
        );
    }

    const card = body.data?.[0];

    return (
        card?.image_uris?.normal ??
        card?.card_faces?.[0]?.image_uris?.normal ??
        null
    );
}

async function main() {
    const sets = JSON.parse(
        await fs.readFile(INPUT_FILE, "utf8")
    );

    for (const set of sets) {
        if (!set.topCards?.length) {
            continue;
        }

        console.log(`Processing ${set.name}`);

        const newTopCards = [];

        for (const cardName of set.topCards) {
            await sleep(1000);
            try {
                const imgUrl = await getCardImage(
                    cardName,
                    set.code
                );

                newTopCards.push({
                    name: cardName,
                    imgUrl
                });

                console.log(`  ✓ ${cardName}`);

                
            }
            catch (err) {
                console.error(
                    `  ✗ ${cardName}`,
                    err
                    
                );

                newTopCards.push({
                    name: cardName,
                    imgUrl: null
                });
            }
        }

        set.topCards = newTopCards;

        await fs.writeFile(
            OUTPUT_FILE,
            JSON.stringify(sets, null, 2)
        );
    }

    console.log("Done");
}

await main();
