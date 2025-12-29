import { embedSignDocument } from './embed-sign-document';
import { embedViewDocument } from './embed-view-document';
export { embedSignDocument };
export { embedViewDocument };
export type {
    EmbedSignDocumentOptions,
    EmbedSignDocumentInstance,
    SignerCompletedData,
    SignerRejectedData,
    Language,
} from './embed-sign-document';
export type {
    EmbedViewDocumentOptions,
    EmbedViewDocumentInstance,
} from './embed-view-document';
export type { CssVars } from './css-vars';
export { SajnSignDocument } from './web-component';
export { SajnViewDocument } from './web-component-view';

// For UMD build - expose as global `sajn`
export const sajn = {
    embedSignDocument,
    embedViewDocument,
};
