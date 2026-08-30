<template>
    <div class="controls">

        <!-- OLDEST SET -->
        <div class="set-selector">
            <label>Oldest Set</label>

            <select v-model="oldestSet">
                <option
                    v-for="set in sortedSets"
                    :key="set.code"
                    :value="set.code"
                >
                    {{ set.name }}
                </option>
            </select>
        </div>


        <!-- NEWEST SET -->
        <div class="set-selector">
            <label>Newest Set</label>

            <select v-model="newestSet">
                <option
                    v-for="set in sortedSets"
                    :key="set.code"
                    :value="set.code"
                >
                    {{ set.name }}
                </option>
            </select>
        </div>


        <!-- NUMBER OF BIG SETS -->
        <div class="set-selector">
            <label>Big Sets</label>

            <input
                v-model.number="numBigSets"
                type="number"
                min="0"
            />
        </div>


        <!-- NUMBER OF SMALL SETS -->
        <div class="set-selector">
            <label>Small Sets</label>

            <input
                v-model.number="numSmallSets"
                type="number"
                min="0"
            />
        </div>


        <!-- NUMBER OF CORE SETS -->
        <div class="set-selector">
            <label>Core Sets</label>

            <input
                v-model.number="numCoreSets"
                type="number"
                min="0"
            />
        </div>


        <!-- UNIVERSES BEYOND -->
        <label class="checkbox">
            <input
                v-model="allowUniversesBeyond"
                type="checkbox"
            />

            Universes Beyond
        </label>


        <button @click="generate">
            GENERATE FORMAT
        </button>

    </div>


    <div>
        <h2>Legal Sets</h2>
        <ol>
            <li
                v-for="set in resultSets"
                :key="set.code"
                class="set"
            >
                <img
                    class="set-icon"
                    :src="set.icon_svg_uri"
                />

                <span>{{ set.name }}</span>
            </li>
        </ol>
    </div>
    <div>
        <h2>Banned Cards</h2>
        <p>Cards banned in standard during any point that one of your sets was in standard.</p>
        <span>
            <img v-for="card in bannedCardsInFormat" class="card-image" :src="card.image_uri" />
        </span>
    </div>
</template>


<script setup>
import { ChaosFormatGenerator } from "./chaosStandardGenerator.js"
import { ref, computed } from "vue"
import allSets from "../standardSets.json"
import bannedCards from "../standardBanned.json"


const sortedSets = [...allSets].sort(
    (a, b) => a.released_at.localeCompare(b.released_at)
);

const oldestSet = ref("lea");
const newestSet = ref("otj");

const allowUniversesBeyond = ref(false);

const numBigSets = ref(2);
const numSmallSets = ref(4);
const numCoreSets = ref(1);

const resultSets = ref([]);
const bannedCardsInFormat = computed(() => {
    return bannedCards.filter(card =>
        resultSets.value.some(set =>
            set.code === card.set
        )
    );
});

async function generate() {
    const g = new ChaosFormatGenerator(
        oldestSet.value,
        newestSet.value,
        allowUniversesBeyond.value,
        numBigSets.value,
        numSmallSets.value,
        numCoreSets.value
    );

    let sets = await g.generateFormat();

    sets = [
        ...sets.bigSets,
        ...sets.smallSets,
        ...sets.coreSets
    ];

    resultSets.value = sets.sort(
        (a, b) =>
            a.released_at.localeCompare(b.released_at)
    );
}
</script>


<style scoped>

.controls {
    display: flex;
    align-items: end;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
}

.set-selector {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.set-selector label {
    font-weight: bold;
}

.set-selector select,
.set-selector input {
    padding: 0.4rem;
}

.set-selector input {
    width: 4rem;
}

.checkbox {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding-bottom: 0.4rem;
}

.set {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.set-icon {
    width: 1.4em;
    height: 1.4em;
}

.card-image {
    height: 10em
}

</style>
