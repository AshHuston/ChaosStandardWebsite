function formatDate(input) {
    const [day, month, year] = input.split("/");
    return `${year}-${month}-${day}`;
}

export async function markdownScryfallLlink(cardname){
    function sanitizeString(str) {
        return str
            .trim()
            .replace(/\s+/g, "+")          // replace spaces with +
            .replace(/[^a-zA-Z0-9+]/g, ""); // remove non-alphanumeric (keep +)
        }
    const apiUrl = `https://api.scryfall.com/cards/named?exact=${sanitizeString(cardname)}`
    let scryfalUrl = ''
    await fetch(
        apiUrl,
        { 
            headers : {
                "User-Agent": "nostalgiaBot/1.1",
                "Accept": "application/json;q=0.9,*/*;q=0.8"
            }
        }
    )
        .then(response => response.json())
        .then(data => {
            scryfalUrl = data.scryfall_uri
        })
        .catch(err => {
            console.error(err);
        });
    return `[${cardname}](${scryfalUrl})`
}

export async function findSetReleasedOn(targetDate){
    const apiUrl = `https://api.scryfall.com/sets`
    const blacklist = [
        'alchemy',
        'masterpiece',
        'arsenal',
        'duel_deck',
        'treasure_chest',
        'funny',
        'box',
        'minigame',
        'token',     
        'memorabilia',
        'promo'
    ]
    const req = await fetch(
        apiUrl,
        { 
            headers : {
                "User-Agent": "nostalgiaBot/1.1",
                "Accept": "application/json;q=0.9,*/*;q=0.8"
            }
        }
    )
    const json = await req.json()
    const sets = json.data

    const filteredSets = sets.filter(set =>
        set.released_at === targetDate &&
        !blacklist.includes(set.set_type)
    );
    return filteredSets
}

export async function createSetReleaseReport(date){
    const sets = await findSetReleasedOn(formatDate(date))
    if(sets.length === 0) return ''
    if(sets.length === 1) return `### Sets:\n${sets[0].name} (${sets[0].code.toUpperCase()}) was released on ${date}. With a total of ${sets[0].card_count} cards.`
    if(sets.length === 2) return `### Sets:\n${sets[0].name} (${sets[0].code.toUpperCase()}) and ${sets[1].name} (${sets[1].code.toUpperCase()}) were released on ${date}.`

    const setNames = sets.map(s => s.name).join(", ")
    return `### Sets:\nThe following sets were released on ${date}: ${setNames}.`
}

export async function getCardsFromSet(setCode) {
    const cards = [];
    let url = `https://api.scryfall.com/cards/search?q=set:${setCode}`;

    while (url) {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "ChaosStandardWebsite/1.0 (personal project)",
                "Accept": "application/json"
            }
        });
        await sleep()

        const data = await response.json();
            if (!data.data) {
                console.log("Bad response for set:", setCode);
                console.log(JSON.stringify(data, null, 2));
                //while (true ) {}
            }
        cards.push(
            ...data.data
                .filter(card => card.lang === "en")
                .map(card => card.name)
        );

        url = data.has_more ? data.next_page : null;
    }

    console.log(`${cards.length} cards found in ${setCode}`)
    return cards;
}

async function sleep(ms=200) {
    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}
