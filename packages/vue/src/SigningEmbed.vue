<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { createSigningEmbed, type Appearance, type EmbedIds, type EmbedReady, type EmbedState, type Locale, type SigningEmbed, type SigningEmbedError } from '@sajn/embed-js';

const props = defineProps<{
    fetchClientSecret: () => Promise<string>;
    host?: string;
    appearance?: Appearance;
    locale?: Locale;
    title?: string;
    fallbackHeight?: string;
    /** How long to wait for a client secret, and then for the frame, before `bootstrap_timeout`. Defaults to 10000. */
    bootstrapTimeoutMs?: number;
    /** Opens the eID pages and the BankID app link yourself, where the frame can't open a window. */
    openUrl?: (url: string) => void;
}>();

const emit = defineEmits<{
    ready: [ready: EmbedReady];
    signed: [ids: EmbedIds];
    rejected: [ids: EmbedIds & { reasonGiven: boolean }];
    fieldsSubmitted: [ids: EmbedIds];
    fieldsProgress: [progress: EmbedIds & { remaining: number; total: number }];
    fieldsChanged: [fields: EmbedIds & { values: Record<string, string | string[]> }];
    verified: [ids: EmbedIds];
    stateChange: [state: EmbedState];
    resize: [height: number];
    sessionExpired: [];
    error: [error: SigningEmbedError];
}>();

const container = ref<HTMLDivElement | null>(null);
let instance: SigningEmbed | null = null;

onMounted(() => {
    if (!container.value) return;

    instance = createSigningEmbed({
        container: container.value,
        host: props.host,
        title: props.title,
        fallbackHeight: props.fallbackHeight,
        bootstrapTimeoutMs: props.bootstrapTimeoutMs,
        appearance: props.appearance,
        locale: props.locale,
        fetchClientSecret: () => props.fetchClientSecret(),
        openUrl: props.openUrl ? (url) => props.openUrl?.(url) : undefined,
        onReady: (ids) => emit('ready', ids),
        onSigned: (ids) => emit('signed', ids),
        onRejected: (ids) => emit('rejected', ids),
        onFieldsSubmitted: (ids) => emit('fieldsSubmitted', ids),
        onFieldsProgress: (progress) => emit('fieldsProgress', progress),
        onFieldsChanged: (fields) => emit('fieldsChanged', fields),
        onVerified: (ids) => emit('verified', ids),
        onStateChange: (state) => emit('stateChange', state),
        onResize: (height) => emit('resize', height),
        onSessionExpired: () => emit('sessionExpired'),
        onError: (error) => emit('error', error),
    });
});

watch(() => [props.appearance, props.locale] as const, ([appearance, locale]) => {
    instance?.update({ appearance, locale });
}, { deep: true });

onBeforeUnmount(() => {
    instance?.destroy();
    instance = null;
});

defineExpose({
    /** Ask the frame for a fresh state, which arrives in `stateChange`. */
    requestState: () => instance?.requestState(),
});
</script>

<template>
    <div ref="container" />
</template>
