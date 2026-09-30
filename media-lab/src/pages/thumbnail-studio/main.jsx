/* Konvertert fra den gamle dc-siden thumbnail-studio.dc.html. Dette er nå kilden – rediger direkte. */
import '@ml/ml-pwa.js';
import '@ml/i18n.js';
import '@ml/ml-footer.js';
import '@ml/theme.js';
import '@ml/ml-cloud.js';
import '@ml/ml-share.js';
import '@ml/ml-bg.js';
import '@ml/thumb-engine.js';
import { mountPage } from '../../shared/dc.jsx';
import Logic from './logic.js';
import template, { inline } from './template.jsx';
import './pseudo.css';

mountPage("thumbnail-studio", Logic, template, inline);
