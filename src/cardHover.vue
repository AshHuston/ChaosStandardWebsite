<template>
    <div
        class="card-container"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
    >
        <img
            class="card-image"
            :src="card.imgUrl"
            :alt="card.name"
            @click="showDialog = true"
        />

        <div
            v-if="hovering && !showDialog"
            class="card-preview"
        >
            <img
                :src="card.imgUrl"
                :alt="card.name"
            />
        </div>
    </div>

    <div
        v-if="showDialog"
        class="dialog-backdrop"
        @click="showDialog = false"
    >
        <img
            class="dialog-image"
            :src="card.imgUrl"
            :alt="card.name"
            @click.stop
        />
    </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
    card: {
        type: Object,
        required: true
    }
});

const hovering = ref(false);
const showDialog = ref(false);
</script>

<style scoped>
.card-container {
    position: relative;
    display: inline-block;
}

.card-image {
    cursor: pointer;
    touch-action: manipulation;
}

.card-preview {
    position: absolute;
    z-index: 10000;
    left: 50%;
    bottom: 100%;
    transform: translateX(-50%);
    pointer-events: none;
}

.card-preview img {
    width: 265px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.dialog-backdrop {
    position: fixed;
    inset: 0;

    background: rgba(0, 0, 0, 0.8);

    display: flex;
    align-items: center;
    justify-content: center;

    z-index: 99999;
}

.dialog-image {
    max-width: 90vw;
    max-height: 90vh;

    border-radius: 22px;

    box-shadow: 0 0 40px rgba(0, 0, 0, 0.75);
}
</style>
