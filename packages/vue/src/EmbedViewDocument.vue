<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { CssVars } from './css-vars';

export type Language = 'sv' | 'en' | 'no' | 'da' | 'fi' | 'de' | 'is' | 'es' | 'fr' | 'it';

const props = withDefaults(defineProps<{
    documentId: string;
    token: string;
    host?: string;
    language?: Language;
    class?: string;
    cssVars?: CssVars & Record<string, string>;
    showScrollIndicator?: boolean;
    additionalProps?: Record<string, string | number | boolean>;
}>(), {
    host: 'https://app.sajn.se',
    language: 'en',
    showScrollIndicator: true,
});

const emit = defineEmits<{
    documentReady: [];
    documentError: [data: { code: string; message: string }];
}>();

const iframeRef = ref<HTMLIFrameElement | null>(null);

const src = computed(() => {
    const encodedOptions = btoa(
        encodeURIComponent(
            JSON.stringify({
                language: props.language,
                cssVars: props.cssVars,
                showScrollIndicator: props.showScrollIndicator,
                ...props.additionalProps,
            })
        )
    );
    const srcUrl = new URL(`/embed/view/${props.documentId}?token=${props.token}`, props.host);
    return `${srcUrl}#${encodedOptions}`;
});

function handleMessage(event: MessageEvent) {
    if (iframeRef.value?.contentWindow === event.source) {
        switch (event.data.action) {
            case 'document-ready':
                emit('documentReady');
                break;
            case 'document-error':
                emit('documentError', event.data.data);
                break;
        }
    }
}

onMounted(() => {
    window.addEventListener('message', handleMessage);
});

onUnmounted(() => {
    window.removeEventListener('message', handleMessage);
});
</script>

<template>
    <iframe ref="iframeRef" :class="props.class" :src="src" />
</template>
