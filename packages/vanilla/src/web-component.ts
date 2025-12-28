import { embedSignDocument, type EmbedSignDocumentInstance, type SignerCompletedData, type SignerRejectedData } from './embed-sign-document';

export class SajnSignDocument extends HTMLElement {
    private instance: EmbedSignDocumentInstance | null = null;
    private container: HTMLDivElement;

    static get observedAttributes() {
        return ['document-id', 'token', 'host', 'class-name', 'name', 'allow-document-rejection'];
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

        this.instance = embedSignDocument({
            element: this.container,
            documentId,
            token,
            host: this.getAttribute('host') || undefined,
            className: this.getAttribute('class-name') || undefined,
            name: this.getAttribute('name') || undefined,
            allowDocumentRejection: this.hasAttribute('allow-document-rejection'),
            onDocumentReady: () => {
                this.dispatchEvent(new CustomEvent('document-ready'));
            },
            onSignerCompleted: (data: SignerCompletedData) => {
                this.dispatchEvent(new CustomEvent('signer-completed', { detail: data }));
            },
            onDocumentError: (data: { code: string; message: string }) => {
                this.dispatchEvent(new CustomEvent('document-error', { detail: data }));
            },
            onSignerRejected: (data: SignerRejectedData) => {
                this.dispatchEvent(new CustomEvent('signer-rejected', { detail: data }));
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
    customElements.define('sajn-sign-document', SajnSignDocument);
}
