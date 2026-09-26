<template>
    <span
        class="card-link"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
    >
        {{ cardName }}

        <div
            v-if="hovering && imageUrl"
            class="card-preview"
        >
            <img
                :src="imageUrl"
                :alt="cardName"
            />
        </div>
    </span>
</template>

<script setup>
import { ref, watch } from "vue";
import { getCard } from "@/scryfallQueue";

const props = defineProps({
    cardName: {
        type: String,
        required: true
    },
    setCode: {
        type: String,
        required: true
    }
});

const hovering = ref(false);
const imageUrl = ref(null);

async function loadCard() {
    try {
        imageUrl.value = null;

        const card = await getCard(
            props.cardName,
            props.setCode
        );

        imageUrl.value =
            card.image_uris?.normal ??
            card.card_faces?.[0]?.image_uris?.normal ??
            null;
    }
    catch (err) {
        console.error(
            `Failed to load ${props.cardName} (${props.setCode})`,
            err
        );
    }
}

watch(
    () => [props.cardName, props.setCode],
    loadCard,
    { immediate: true }
);
</script>

<style scoped>
.card-link {
    position: relative;
    cursor: pointer;
    text-decoration: underline;
}

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
