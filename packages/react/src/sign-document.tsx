"use client";

import { useRef, useEffect } from "react";

export type EmbedSignDocumentProps = {
    className?: string;
    host?: string;
    token: string;
    documentId: string;

    css?: string | undefined;
    cssVars?: (CssVars & Record<string, string>) | undefined;
    name?: string | undefined;
    allowDocumentRejection?: boolean | undefined;

    additionalProps?: Record<string, string | number | boolean> | undefined;
    onDocumentReady?: () => void;
    onSignerCompleted?: (data: {
        token: string;
        documentId: number;
        signerId: number;
        failed?: string;
    }) => void;
    onDocumentError?: (error: string) => void;
    onSignerRejected?: (data: {
        token: string;
        documentId: number;
        signerId: number;
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
                    name: props.name,
                    css: props.css,
                    cssVars: props.cssVars,
                    allowDocumentRejection: props.allowDocumentRejection,
                    ...props.additionalProps,
                })
            )
        );
        const srcUrl = new URL(`/embed/sign/${props.documentId}?token=${props.token}`, appHost);
        return `${srcUrl}#${encodedOptions}`;
    }

    function handleMessage(event: MessageEvent) {
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
    }

    useEffect(() => {
        window.addEventListener("message", handleMessage);
    }, []);

    useEffect(() => {
        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, []);

    return <iframe ref={__iframe} className={props.className} src={src()} />;
}

export default EmbedSignDocument;