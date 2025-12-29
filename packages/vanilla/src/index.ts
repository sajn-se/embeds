import { embedSignDocument } from './embed-sign-document';
export { embedSignDocument };
export type {
    EmbedSignDocumentOptions,
    EmbedSignDocumentInstance,
    SignerCompletedData,
    SignerRejectedData,
    Language,
} from './embed-sign-document';
export type { CssVars } from './css-vars';
export { SajnSignDocument } from './web-component';

// For UMD build - expose as global `sajn`
export const sajn = {
    embedSignDocument,
};
