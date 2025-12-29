import { embedViewDocument, type EmbedViewDocumentInstance } from './embed-view-document';

export class SajnViewDocument extends HTMLElement {
    private instance: EmbedViewDocumentInstance | null = null;
    private container: HTMLDivElement;

    static get observedAttributes() {
        return ['document-id', 'token', 'host', 'language', 'class-name', 'show-scroll-indicator'];
    }

    constructor() {
        super();
        this.container = document.createElement('div');
        this.container.style.width = '100%';
        this.container.style.height = '100%';
    }

    connectedCallback() {
        this.appendChild(this.container);
        this.initEmbed();
    }

    disconnectedCallback() {
        this.instance?.destroy();
        this.instance = null;
    }

    attributeChangedCallback() {
        if (this.isConnected) {
            this.instance?.destroy();
            this.initEmbed();
        }
    }

    private initEmbed() {
        const documentId = this.getAttribute('document-id');
        const token = this.getAttribute('token');

        if (!documentId || !token) {
            return;
        }

        this.instance = embedViewDocument({
            element: this.container,
            documentId,
            token,
            host: this.getAttribute('host') || undefined,
            language: (this.getAttribute('language') as 'sv' | 'en' | 'no' | 'da' | 'fi' | 'de' | 'is' | 'es' | 'fr' | 'it') || undefined,
            className: this.getAttribute('class-name') || undefined,
            showScrollIndicator: this.getAttribute('show-scroll-indicator') !== 'false',
            onDocumentReady: () => {
                this.dispatchEvent(new CustomEvent('document-ready'));
            },
            onDocumentError: (data: { code: string; message: string }) => {
                this.dispatchEvent(new CustomEvent('document-error', { detail: data }));
            },
        });

        // Style the iframe to fill the container
        if (this.instance.iframe) {
            this.instance.iframe.style.width = '100%';
            this.instance.iframe.style.height = '100%';
            this.instance.iframe.style.border = 'none';
        }
    }
}

// Auto-register if customElements is available
if (typeof customElements !== 'undefined') {
    customElements.define('sajn-view-document', SajnViewDocument);
}
