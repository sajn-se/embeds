import type { CssVars } from './css-vars';

export type Language = 'sv' | 'en' | 'no' | 'da' | 'fi' | 'de' | 'is' | 'es' | 'fr' | 'it';

export interface EmbedViewDocumentOptions {
    /** Element or selector to mount the iframe into */
    element: HTMLElement | string;
    /** Document ID to view */
    documentId: string;
    /** Authentication token */
    token: string;
    /** Custom host (default: https://app.sajn.se) */
    host?: string;
    /** Language for the embed UI (default: 'en') */
    language?: Language;
    /** CSS class for the iframe */
    className?: string;
    /** CSS variables for theming */
    cssVars?: CssVars & Record<string, string>;
    /** Show scroll indicator button (default: true) */
    showScrollIndicator?: boolean;
    /** Additional props to pass */
    additionalProps?: Record<string, string | number | boolean>;
    /** Called when iframe is ready */
    onDocumentReady?: () => void;
    /** Called on error */
    onDocumentError?: (data: { code: string; message: string }) => void;
}

export interface EmbedViewDocumentInstance {
    /** Remove the iframe and cleanup listeners */
    destroy: () => void;
    /** The iframe element */
    iframe: HTMLIFrameElement;
}

export function embedViewDocument(options: EmbedViewDocumentOptions): EmbedViewDocumentInstance {
    const {
        element,
        documentId,
        token,
        host = 'https://app.sajn.se',
        language = 'en',
        className,
        cssVars,
        showScrollIndicator = true,
        additionalProps,
        onDocumentReady,
        onDocumentError,
    } = options;

    // Resolve element
    const container = typeof element === 'string'
        ? document.querySelector<HTMLElement>(element)
        : element;

    if (!container) {
        throw new Error(`Element not found: ${element}`);
    }

    // Build iframe src
    const encodedOptions = btoa(
        encodeURIComponent(
            JSON.stringify({
                language,
                cssVars,
                showScrollIndicator,
                ...additionalProps,
            })
        )
    );
    const srcUrl = new URL(`/embed/view/${documentId}?token=${token}`, host);
    const src = `${srcUrl}#${encodedOptions}`;

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = src;
    if (className) {
        iframe.className = className;
    }

    // Message handler
    function handleMessage(event: MessageEvent) {
        if (iframe.contentWindow === event.source) {
            switch (event.data.action) {
                case 'document-ready':
                    onDocumentReady?.();
                    break;
                case 'document-error':
                    onDocumentError?.(event.data.data);
                    break;
            }
        }
    }

    window.addEventListener('message', handleMessage);
    container.appendChild(iframe);

    return {
        iframe,
        destroy() {
            window.removeEventListener('message', handleMessage);
            iframe.remove();
        },
    };
}
