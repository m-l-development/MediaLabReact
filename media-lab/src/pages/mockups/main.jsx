/* Konvertert fra den gamle dc-siden mockups.dc.html. Dette er nå kilden – rediger direkte. */
import '@ml/ml-pwa.js';
import '@ml/i18n.js';
import '@ml/ml-footer.js';
import '@ml/theme.js';
import '../../shared/ch-cloud.js';
import '@ml/ml-bg.js';
import '@ml/mockup-engine.js';
import '@ml/ml-share.js';
import { mountPage } from '../../shared/dc.jsx';
import Logic from './logic.js';
import template, { inline } from './template.jsx';
import './pseudo.css';

mountPage("mockups", Logic, template, inline);
