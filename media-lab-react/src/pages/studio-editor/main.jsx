/* GENERERT av scripts/dc2jsx.mjs fra media-lab/studio-editor.dc.html – ikke rediger for hånd før siden er ferdig sammenlignet. */
import '@ml/ml-pwa.js';
import '@ml/i18n.js';
import '@ml/ml-footer.js';
import '@ml/theme.js';
import '@ml/ml-cloud.js';
import '@ml/ml-share.js';
import '@ml/ml-bg.js';
import classic0 from '@ml/ukeloop-engine.js?url';
import { mountPage, loadClassic } from '../../shared/dc.jsx';
import Logic from './logic.js';
import template from './template.jsx';
import './pseudo.css';

/* ukeloop-engine.js lastes uendret som klassisk skript (se CLASSIC i dc2jsx.mjs) før siden monteres */
loadClassic([classic0]).then(() => mountPage("studio-editor", Logic, template));
