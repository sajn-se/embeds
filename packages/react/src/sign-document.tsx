"use client";

import { useRef, useEffect, useCallback } from "react";

export type Language = 'sv' | 'en' | 'no' | 'da' | 'fi' | 'de' | 'is' | 'es' | 'fr' | 'it';

export type EmbedSignDocumentProps = {
    language?: Language;
    className?: string;
    host?: string;
    token: string;
    documentId: string;

    cssVars?: (CssVars & Record<string, string>) | undefined;
    allowDocumentRejection?: boolean | undefined;
    showScrollIndicator?: boolean | undefined;

    additionalProps?: Record<string, string | number | boolean> | undefined;
    onDocumentReady?: () => void;
    onSignerCompleted?: (data: {
        token: string;
        documentId: string;
        signerId: string;
        failed?: string;
    }) => void;
    onDocumentError?: (data: { code: string; message: string }) => void;
    onSignerRejected?: (data: {
        token: string;
        documentId: string;
        signerId: string;
        reason: string;
    }) => void;
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
        [props.onDocumentReady, props.onSignerCompleted, props.onDocumentError, props.onSignerRejected]
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