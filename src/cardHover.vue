<template>
    <div
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
    >
        <img
            class="card-image"
            :src="card.imgUrl"
            :alt="card.name"
        />

        <div
            v-if="hovering"
            class="card-preview"
        >
            <img
                :src="card.imgUrl"
                :alt="card.name"
            />
        </div>
    </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
    card: {
        name: {
            type: String,
            required: true
        },
        imgUrl: {
            type: String,
            required: true
        }
    }
});

const hovering = ref(false);

</script>

<style scoped>

.card-preview {
    position: absolute;
    z-index: 10000;
    top: 1.5rem;
    left: 0;
    pointer-events: none;
}

.card-preview img {
    width: 265px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}
</style>
