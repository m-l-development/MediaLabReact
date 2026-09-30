/* Konvertert fra den gamle dc-siden loop-studio.dc.html. Dette er nå kilden – rediger direkte. */
import '@ml/ml-pwa.js';
import '@ml/i18n.js';
import '@ml/ml-footer.js';
import '@ml/theme.js';
import '@ml/ml-cloud.js';
import { mountPage } from '../../shared/dc.jsx';
import Logic from './logic.js';
import template, { inline } from './template.jsx';
import './pseudo.css';

mountPage("loop-studio", Logic, template, inline);
