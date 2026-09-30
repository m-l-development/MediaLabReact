/* Konvertert fra den gamle dc-siden admin.dc.html. Dette er nå kilden – rediger direkte. */
import '@ml/i18n.js';
import '@ml/theme.js';
import '@ml/ml-bg.js';
import '@ml/ml-cloud.js';
import { mountPage } from '../../shared/dc.jsx';
import Logic from './logic.js';
import template, { inline } from './template.jsx';
import './pseudo.css';

mountPage("admin", Logic, template, inline);
