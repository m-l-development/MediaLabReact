/* GENERERT av scripts/dc2jsx.mjs fra legacy-dc/admin.dc.html – ikke rediger for hånd før siden er ferdig sammenlignet. */
import '@ml/i18n.js';
import '@ml/theme.js';
import '@ml/ml-bg.js';
import '@ml/ml-cloud.js';
import { mountPage } from '../../shared/dc.jsx';
import Logic from './logic.js';
import template, { inline } from './template.jsx';
import './pseudo.css';

mountPage("admin", Logic, template, inline);
