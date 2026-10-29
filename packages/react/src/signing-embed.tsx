'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from 'react';

import { createSigningEmbed, type Appearance, type Locale, type SigningEmbed as SigningEmbedInstance, type SigningEmbedCallbacks } from '@sajn/embed-js';

export type SigningEmbedProps = SigningEmbedCallbacks & {
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
    className?: string;
    style?: CSSProperties;
};

export type SigningEmbedHandle = {
    /** Ask the frame for a fresh state, which arrives in `onStateChange`. */
    requestState: () => void;
};

export const SigningEmbed = forwardRef<SigningEmbedHandle, SigningEmbedProps>(({ fetchClientSecret, host, appearance, locale, title, fallbackHeight, bootstrapTimeoutMs, openUrl, className, style, ...callbacks }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<SigningEmbedInstance | null>(null);

    // Read through refs, so a new inline callback each render never remounts the frame or fires a stale closure.
    const latest = useRef({ fetchClientSecret, callbacks, openUrl });
    latest.current = { fetchClientSecret, callbacks, openUrl };
    const hasOpenUrl = !!openUrl;

    useImperativeHandle(ref, () => ({ requestState: () => instanceRef.current?.requestState() }), []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const forward = <K extends keyof SigningEmbedCallbacks>(key: K) =>
            ((...args: unknown[]) => (latest.current.callbacks[key] as ((...a: unknown[]) => void) | undefined)?.(...args)) as NonNullable<SigningEmbedCallbacks[K]>;

        const instance = createSigningEmbed({
            container,
            host,
            title,
            fallbackHeight,
            bootstrapTimeoutMs,
            appearance,
            locale,
            fetchClientSecret: () => latest.current.fetchClientSecret(),
            openUrl: hasOpenUrl ? (url) => latest.current.openUrl?.(url) : undefined,
            onReady: forward('onReady'),
            onSigned: forward('onSigned'),
            onRejected: forward('onRejected'),
            onFieldsSubmitted: forward('onFieldsSubmitted'),
            onFieldsProgress: forward('onFieldsProgress'),
            onFieldsChanged: forward('onFieldsChanged'),
            onVerified: forward('onVerified'),
            onStateChange: forward('onStateChange'),
            onResize: forward('onResize'),
            onSessionExpired: forward('onSessionExpired'),
            onError: forward('onError'),
        });

        instanceRef.current = instance;
        return () => {
            instance.destroy();
            instanceRef.current = null;
        };
        // Appearance and locale change through update() below; only these remount the frame.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [host, title, fallbackHeight, bootstrapTimeoutMs, hasOpenUrl]);

    const appearanceKey = JSON.stringify(appearance ?? null);
    useEffect(() => {
        instanceRef.current?.update({ appearance, locale });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appearanceKey, locale]);

    return <div ref={containerRef} className={className} style={style} />;
});

SigningEmbed.displayName = 'SigningEmbed';

// The session decides what the frame shows; this name reads right for a `viewing` session.
export const ViewingEmbed = forwardRef<SigningEmbedHandle, SigningEmbedProps>((props, ref) => <SigningEmbed ref={ref} title="Visa dokument" {...props} />);

ViewingEmbed.displayName = 'ViewingEmbed';
