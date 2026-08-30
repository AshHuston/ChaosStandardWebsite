import fs from "fs/promises";

const STANDARD_URL = "https://mtg.wtf/format/standard";
const SCRYFALL_URL = "https://api.scryfall.com";

const HEADERS = {
    "User-Agent": "ChaosStandardWebsite/1.0 (personal project)",
    "Accept": "application/json"
};


// ------------------------------------------------------------
// Fetch Standard page
// ------------------------------------------------------------

async function getStandardPage() {
    const response = await fetch(STANDARD_URL, {
        headers: {
            "User-Agent": HEADERS["User-Agent"]
        }
    });

    if (!response.ok) {
        throw new Error(
            `Standard page failed: ${response.status} ${response.statusText}`
        );
    }

    return response.text();
}


// ------------------------------------------------------------
// Parse Standard ban history
// ------------------------------------------------------------

function getBanEvents(html) {
    const events = [];

    const dateRegex =
        /<h6[^>]*>\s*(\d{4}-\d{2}-\d{2})\s*<\/h6>/gi;

    const dates = [];

    let match;

    while ((match = dateRegex.exec(html)) !== null) {
        dates.push({
            date: match[1],
            position: match.index
        });
    }

    for (let i = 0; i < dates.length; i++) {
        const current = dates[i];

        const start = current.position;

        const end =
            i + 1 < dates.length
                ? dates[i + 1].position
                : html.length;

        const section =
            html.substring(start, end);

        /*
         * IMPORTANT:
         *
         * We only look at individual <li> elements.
         * This prevents an "Announcement" link from
         * getting attached to the next card.
         */

        const liRegex =
            /<li[^>]*>([\s\S]*?)<\/li>/gi;

        let liMatch;

        while ((liMatch = liRegex.exec(section)) !== null) {
            const li = liMatch[1];

            const text = decodeHtml(
                li.replace(/<[^>]+>/g, " ")
            )
                .replace(/\s+/g, " ")
                .trim();

            /*
             * Only actual bans.
             */
            if (!text.match(/(?:legal|restricted)\s*→\s*banned/)) {
                continue;
            }

            /*
             * Find the first card link.
             */
            const linkMatch =
                li.match(
                    /<a[^>]*>([\s\S]*?)<\/a>/i
                );

            if (!linkMatch) {
                continue;
            }

            const name = decodeHtml(
                linkMatch[1]
                    .replace(/<[^>]+>/g, "")
            )
                .replace(/\s+/g, " ")
                .trim();

            /*
             * Ignore junk/header links.
             */
            if (!name) {
                continue;
            }

            if (
                name.toLowerCase() === "announcement"
            ) {
                continue;
            }

            events.push({
                name,
                date: current.date
            });
        }
    }

    return events;
}


// ------------------------------------------------------------
// HTML entity decoding
// ------------------------------------------------------------

function decodeHtml(text) {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&rarr;/g, "→")
        .replace(/&#8594;/g, "→")
        .replace(/&#x2192;/gi, "→");
}


// ------------------------------------------------------------
// Scryfall card lookup
// ------------------------------------------------------------

async function getScryfallCard(name) {
    const url =
        `${SCRYFALL_URL}/cards/named` +
        `?exact=${encodeURIComponent(name)}`;

    while (true) {
        const response = await fetch(url, {
            headers: HEADERS
        });

        if (response.status === 429) {
            console.log(
                `  Rate limited. Waiting 5 seconds...`
            );

            await sleep(5000);
            continue;
        }

        if (!response.ok) {
            throw new Error(
                `Scryfall failed for "${name}": ` +
                `${response.status} ${response.statusText}`
            );
        }

        return response.json();
    }
}


// ------------------------------------------------------------
// Get all printings of a card
// ------------------------------------------------------------

async function getPrintings(name) {
    const url =
        `${SCRYFALL_URL}/cards/search` +
        `?q=${encodeURIComponent(`!"${name}"`)}` +
        `&unique=prints` +
        `&order=released` +
        `&dir=asc`;

    while (true) {
        const response = await fetch(url, {
            headers: HEADERS
        });

        if (response.status === 429) {
            console.log(
                `  Rate limited. Waiting 5 seconds...`
            );

            await sleep(5000);
            continue;
        }

        if (!response.ok) {
            throw new Error(
                `Scryfall search failed for "${name}": ` +
                `${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();

        return data.data ?? [];
    }
}


// ------------------------------------------------------------
// Find printing at time of ban
// ------------------------------------------------------------

function getPrintingAtDate(printings, banDate) {
    const cutoff =
        new Date(`${banDate}T23:59:59Z`);

    return printings
        .filter(card => {
            if (!card.released_at) {
                return false;
            }

            return new Date(
                `${card.released_at}T00:00:00Z`
            ) <= cutoff;
        })
        .sort((a, b) =>
            new Date(b.released_at) -
            new Date(a.released_at)
        )[0] ?? null;
}


// ------------------------------------------------------------
// Sleep
// ------------------------------------------------------------

function sleep(ms) {
    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}


// ------------------------------------------------------------
// Main
// ------------------------------------------------------------

async function generate() {
    console.log(
        "Fetching Standard ban history..."
    );

    const html =
        await getStandardPage();

    const banEvents =
        getBanEvents(html);

    console.log(
        `Found ${banEvents.length} Standard ban events.`
    );

    /*
     * Deduplicate.
     *
     * If a card was banned multiple times,
     * keep the earliest ban.
     */
    const firstBan = new Map();

    for (const ban of banEvents) {
        const existing =
            firstBan.get(ban.name);

        if (
            !existing ||
            ban.date < existing.date
        ) {
            firstBan.set(
                ban.name,
                ban
            );
        }
    }

    console.log(
        `Found ${firstBan.size} unique historically banned cards.`
    );

    const results = [];

    const powerNine = await getPowerNine();
    results.push(...powerNine);

    for (const ban of firstBan.values()) {
        console.log(
            `Looking up ${ban.name} (${ban.date})...`
        );

        try {
            const printings =
                await getPrintings(ban.name);

            const printing =
                getPrintingAtDate(
                    printings,
                    ban.date
                );

            if (!printing) {
                console.warn(
                    `  Could not determine printing.`
                );

                continue;
            }

            results.push({
                name: ban.name,
                set: printing.set,
                image_uri: printing.image_uris?.normal ?? null
            });

            console.log(
                `  -> ${printing.set} (${printing.set_name})`
            );

        } catch (error) {
            console.error(
                `  ERROR: ${error.message}`
            );
        }

        /*
         * One request per second.
         *
         * Scryfall asks clients to stay under
         * 10 requests/sec, but being conservative
         * is appropriate for a one-off generator.
         */
        await sleep(1000);
    }

    results.sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    await fs.writeFile(
        "./standardBanned.json",
        JSON.stringify(results, null, 2)
    );

    console.log(
        `\nSaved ${results.length} cards to standardBanned.json`
    );
}

// ------------------------------------------------------------
// Get Power Nine from Alpha, Beta, and Unlimited
// ------------------------------------------------------------

async function getPowerNine() {
    const powerNine = [
        "Black Lotus",
        "Ancestral Recall",
        "Time Walk",
        "Mox Pearl",
        "Mox Sapphire",
        "Mox Jet",
        "Mox Ruby",
        "Mox Emerald",
        "Timetwister"
    ];

    const sets = ["lea", "leb", "2ed"];

    const results = [];

    for (const set of sets) {
        for (const name of powerNine) {
            console.log(
                `Adding Power Nine: ${name} (${set})...`
            );

            const url =
                `${SCRYFALL_URL}/cards/search` +
                `?q=${encodeURIComponent(
                    `!"${name}" set:${set}`
                )}`;

            while (true) {
                const response = await fetch(url, {
                    headers: HEADERS
                });

                if (response.status === 429) {
                    console.log(
                        `  Rate limited. Waiting 5 seconds...`
                    );

                    await sleep(5000);
                    continue;
                }

                if (!response.ok) {
                    console.error(
                        `  ERROR: ${name} (${set}) -> ` +
                        `${response.status} ${response.statusText}`
                    );

                    break;
                }

                const data = await response.json();
                const card = data.data?.[0];

                if (!card) {
                    console.warn(
                        `  Could not find ${name} in ${set}`
                    );
                    break;
                }

                results.push({
                    name: card.name,
                    set: card.set,
                    image_uri: card.image_uris?.normal ?? null
                });

                console.log(
                    `  -> ${card.set} (${card.set_name})`
                );

                break;
            }

            await sleep(1000);
        }
    }

    return results;
}

generate().catch(console.error);
