import sdkSource from '../../vanilla/dist/index.umd.js?raw';

import type { Appearance, Locale } from '@sajn/embed-js';

// What the page tells React Native. The secret request is how fetchClientSecret crosses the bridge.
export type HostMessage =
    | { kind: 'secret'; id: number }
    | { kind: 'open-url'; url: string }
    | { kind: 'event'; name: string; data?: unknown }
    | { kind: 'log'; level: string; message: string };

export const CALLBACKS = [
    'onReady',
    'onSigned',
    'onRejected',
    'onFieldsSubmitted',
    'onFieldsProgress',
    'onFieldsChanged',
    'onVerified',
    'onStateChange',
    'onResize',
    'onSessionExpired',
    'onError',
] as const;

type HostPageConfig = { host?: string; appearance?: Appearance; locale?: Locale; title?: string; debug?: boolean; nonce: string };

// A `</script>` inside the bundle or the config would end the inline script early.
const inline = (source: string) => source.replace(/<\/script/gi, '<\\/script');

// The page the WebView loads as if it came from your origin: it runs the ordinary SDK, which frames sajn,
// and passes everything React Native needs across window.ReactNativeWebView.
export const buildHostPage = (config: HostPageConfig) => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>html, body, #sajn { margin: 0; height: 100%; background: transparent; }</style>
</head>
<body>
<div id="sajn"></div>
<script>${inline(sdkSource)}</script>
<script>${inline(`(function () {
    var config = ${JSON.stringify(config)};
    // The nonce marks messages from this script: a frame inside the page can reach the bridge but can't read it.
    var send = function (message) { message.nonce = config.nonce; window.ReactNativeWebView.postMessage(JSON.stringify(message)); };
    if (config.debug) {
        ['log', 'warn', 'error'].forEach(function (level) {
            var original = console[level];
            console[level] = function () {
                send({ kind: 'log', level: level, message: Array.prototype.map.call(arguments, String).join(' ') });
                original.apply(console, arguments);
            };
        });
        window.addEventListener('error', function (event) { send({ kind: 'log', level: 'error', message: String(event.message) }); });
        window.addEventListener('message', function (event) {
            send({ kind: 'log', level: 'log', message: 'message from ' + event.origin + ': ' + JSON.stringify(event.data).slice(0, 200) });
        });
        send({ kind: 'log', level: 'log', message: 'host page origin ' + window.location.origin });
    }
    var pending = {};
    var nextId = 0;
    window.__sajnResolve = function (nonce, id, secret, error) {
        if (nonce !== config.nonce) return;
        var request = pending[id];
        delete pending[id];
        if (!request) return;
        if (error) request.reject(new Error(error)); else request.resolve(secret);
    };
    var callbacks = {};
    ${JSON.stringify(CALLBACKS)}.forEach(function (name) {
        callbacks[name] = function (data) { send({ kind: 'event', name: name, data: data }); };
    });
    window.__sajnEmbed = sajn.createSigningEmbed(Object.assign({}, callbacks, {
        container: document.getElementById('sajn'),
        host: config.host,
        appearance: config.appearance,
        locale: config.locale,
        title: config.title,
        fetchClientSecret: function () {
            var id = ++nextId;
            return new Promise(function (resolve, reject) {
                pending[id] = { resolve: resolve, reject: reject };
                send({ kind: 'secret', id: id });
            });
        },
        openUrl: function (url) { send({ kind: 'open-url', url: url }); },
    }));
    if (config.debug) {
        var update = window.__sajnEmbed.update;
        window.__sajnEmbed.update = function (changes) {
            send({ kind: 'log', level: 'log', message: 'update ' + JSON.stringify(changes) });
            return update(changes);
        };
    }
})();`)}</script>
</body>
</html>`;
