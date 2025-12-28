import type { CssVars } from './css-vars';

export interface SignerCompletedData {
    token: string;
    documentId: number;
    signerId: number;
    failed?: string;
}

export interface SignerRejectedData {
    token: string;
    documentId: number;
    signerId: number;
    reason: string;
}

export interface EmbedSignDocumentOptions {
    /** Element or selector to mount the iframe into */
    element: HTMLElement | string;
    /** Document ID to sign */
    documentId: string;
    /** Authentication token */
    token: string;
    /** Custom host (default: https://app.sajn.se) */
    host?: string;
    /** CSS class for the iframe */
    className?: string;
    /** Custom CSS to inject */
    css?: string;
    /** CSS variables for theming */
    cssVars?: CssVars & Record<string, string>;
    /** Signer name */
    name?: string;
    /** Allow document rejection */
    allowDocumentRejection?: boolean;
    /** Additional props to pass */
    additionalProps?: Record<string, string | number | boolean>;
    /** Called when iframe is ready */
    onDocumentReady?: () => void;
    /** Called when signer completes signing */
    onSignerCompleted?: (data: SignerCompletedData) => void;
    /** Called on error */
    onDocumentError?: (data: { code: string; message: string }) => void;
    /** Called when signer rejects */
    onSignerRejected?: (data: SignerRejectedData) => void;
}

export interface EmbedSignDocumentInstance {
    /** Remove the iframe and cleanup listeners */
    destroy: () => void;
    /** The iframe element */
    iframe: HTMLIFrameElement;
}

export function embedSignDocument(options: EmbedSignDocumentOptions): EmbedSignDocumentInstance {
    const {
        element,
        documentId,
        token,
        host = 'https://app.sajn.se',
        className,
        css,
        cssVars,
        name,
        allowDocumentRejection,
        additionalProps,
        onDocumentReady,
        onSignerCompleted,
        onDocumentError,
        onSignerRejected,
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
                name,
                css,
                cssVars,
                allowDocumentRejection,
                ...additionalProps,
            })
        )
    );
    const srcUrl = new URL(`/embed/sign/${documentId}?token=${token}`, host);
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
                case 'signer-completed':
                    onSignerCompleted?.(event.data.data);
                    break;
                case 'document-error':
                    onDocumentError?.(event.data.data);
                    break;
                case 'signer-rejected':
                    onSignerRejected?.(event.data.data);
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
