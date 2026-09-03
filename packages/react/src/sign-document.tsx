"use client";

import { useRef, useEffect, useCallback } from "react";

export type Language = 'sv' | 'en' | 'no' | 'da' | 'fi' | 'de' | 'is' | 'es' | 'fr' | 'it';

export type SignatureInputMode = 'draw' | 'type' | 'upload';

export type SignerCompletedData = {
    token: string;
    documentId: string;
    signerId: string;
    failed?: string;
};

export type SignerRejectedData = {
    token: string;
    documentId: string;
    signerId: string;
    reason: string;
};

export type EmbedSignDocumentProps = {
    language?: Language;
    className?: string;
    host?: string;
    token: string;
    documentId: string;

    cssVars?: (CssVars & Record<string, string>) | undefined;
    allowDocumentRejection?: boolean | undefined;
    showScrollIndicator?: boolean | undefined;
    /** Which signature input modes the pad offers (default: all). Only narrows the workspace allowlist. */
    signatureInputModes?: SignatureInputMode[] | undefined;

    additionalProps?: Record<string, string | number | boolean> | undefined;
    onDocumentReady?: () => void;
    onSignerCompleted?: (data: SignerCompletedData) => void;
    onDocumentError?: (data: { code: string; message: string }) => void;
    onSignerRejected?: (data: SignerRejectedData) => void;
};

import { CssVars } from "./css-vars";

function EmbedSignDocument(props: EmbedSignDocumentProps) {
    const __iframe = useRef<HTMLIFrameElement>(null);
    function src() {
        const appHost = props.host || "https://app.sajn.se";
        const encodedOptions = btoa(
            encodeURIComponent(
                JSON.stringify({
                    language: props.language ?? 'en',
                    cssVars: props.cssVars,
                    allowDocumentRejection: props.allowDocumentRejection,
                    showScrollIndicator: props.showScrollIndicator ?? true,
                    signatureInputModes: props.signatureInputModes,
                    ...props.additionalProps,
                })
            )
        );
        const srcUrl = new URL(`/embed/sign/${props.documentId}?token=${props.token}`, appHost);
        return `${srcUrl}#${encodedOptions}`;
    }

    const handleMessage = useCallback(
        (event: MessageEvent) => {
            if (__iframe.current?.contentWindow === event.source) {
                switch (event.data.action) {
                    case "document-ready":
                        // Handshake: hand the iframe our verified origin so it can
                        // postMessage results back to us specifically (not '*').
                        __iframe.current?.contentWindow?.postMessage(
                            { action: "embed-init" },
                            new URL(props.host || "https://app.sajn.se").origin
                        );
                        props.onDocumentReady?.();
                        break;

                    case "signer-completed":
                        props.onSignerCompleted?.(event.data.data);
                        break;

                    case "document-error":
                        props.onDocumentError?.(event.data.data);
                        break;

                    case "signer-rejected":
                        props.onSignerRejected?.(event.data.data);
                        break;
                }
            }
        },
        [props.host, props.onDocumentReady, props.onSignerCompleted, props.onDocumentError, props.onSignerRejected]
    );

    useEffect(() => {
        window.addEventListener("message", handleMessage);
        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, [handleMessage]);

    return <iframe ref={__iframe} className={props.className} src={src()} />;
}

export default EmbedSignDocument;