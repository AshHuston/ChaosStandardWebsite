import allSets from "../standardSetsWithImages.json";

export class ChaosFormatGenerator{
    constructor(
        oldestSet,
        newestSet,
        allowUniversesBeyond,
        numBigSets,
        numSmallSets,
        numCoreSets
    ) {
        this.oldestSet = oldestSet;
        this.newestSet = newestSet;
        this.allowUniversesBeyond = allowUniversesBeyond;
        this.numBigSets = numBigSets;
        this.numSmallSets = numSmallSets;
        this.numCoreSets = numCoreSets;
        console.log(allSets)
    }

    async generateFormat(){
        const possibleSets = this.getSets(
            allSets,
            this.oldestSet,
            this.newestSet,
            this.allowUniversesBeyond
        )

        return {
            bigSets: this.randomSamples(possibleSets.bigSets, this.numBigSets),
            smallSets: this.randomSamples(possibleSets.smallSets, this.numSmallSets),
            coreSets: this.randomSamples(possibleSets.coreSets, this.numCoreSets),
        };
    }

    randomSamples(array, count) {
        return [...array]
            .sort(() => Math.random() - 0.5)
            .slice(0, count);
    }

    getSets(
        sets,
        oldestSet,
        newestSet,
        allowUniversesBeyond
    ) {
        const oldest = sets.find(set => set.code === oldestSet);
        const newest = sets.find(set => set.code === newestSet);

        if (!oldest) {
            throw new Error(`Oldest set not found: ${oldestSet}`);
        }

        if (!newest) {
            throw new Error(`Newest set not found: ${newestSet}`);
        }

        const filteredSets = sets.filter(set => {
            const inDateRange =
                set.released_at >= oldest.released_at &&
                set.released_at <= newest.released_at;

            const allowedUniversesBeyond =
                allowUniversesBeyond ||
                !set.is_universes_beyond;

            return inDateRange && allowedUniversesBeyond;
        });

        return {
            bigSets: filteredSets.filter(set => set.set_type === "large"),
            smallSets: filteredSets.filter(set => set.set_type === "small"),
            coreSets: filteredSets.filter(set => set.set_type === "core")
        };
    }
}


// const gen = new ChaosFormatGenerator("lea", "rtr", false, 2, 4, 1)

// console.log(await gen.generateFormat())
