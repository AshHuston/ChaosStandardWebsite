// scryfallQueue.js

const queue = [];
const cache = new Map();

let processing = false;

export async function getCard(cardName, setCode) {
    const key = `${cardName}|${setCode}`;

    if (cache.has(key)) {
        return cache.get(key);
    }

    return new Promise((resolve, reject) => {
        queue.push({
            key,
            cardName,
            setCode,
            resolve,
            reject
        });

        processQueue();
    });
}

async function processQueue() {
    if (processing) return;

    processing = true;

    while (queue.length > 0) {
        const job = queue.shift();

        console.log(
            "START",
            job.cardName,
            Date.now()
        );

        try {
            const sleepPromise = sleep(500)
            const response = await fetch(
                `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(job.cardName)}&set=${job.setCode}`
            );

            const card = await response.json();

            cache.set(job.key, card);

            job.resolve(card);

            console.log(
                "DONE",
                job.cardName,
                Date.now()
            );

            await sleepPromise;
        }
        catch (err) {
            console.error(err);
        }
    }

    processing = false;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
