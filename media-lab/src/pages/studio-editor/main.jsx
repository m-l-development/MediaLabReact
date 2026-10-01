/* Konvertert fra den gamle dc-siden studio-editor.dc.html. Dette er nå kilden – rediger direkte. */
import '@ml/ml-pwa.js';
import '@ml/i18n.js';
import '@ml/ml-footer.js';
import '@ml/theme.js';
import '../../shared/ch-cloud.js';
import '@ml/ml-share.js';
import '@ml/ml-bg.js';
import classic0 from '@ml/ukeloop-engine.js?url';
import { mountPage, loadClassic } from '../../shared/dc.jsx';
import Logic from './logic.js';
import template, { inline } from './template.jsx';
import './pseudo.css';

/* ukeloop-engine.js lastes uendret som klassisk skript før siden monteres (spiller-HTML bygges med Function.toString()) */
loadClassic([classic0]).then(() => mountPage("studio-editor", Logic, template, inline));
