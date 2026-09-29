/* GENERERT av scripts/dc2jsx.mjs fra legacy-dc/media-lab.dc.html – ikke rediger for hånd før siden er ferdig sammenlignet. */
import '@ml/ml-pwa.js';
import '@ml/i18n.js';
import '@ml/ml-footer.js';
import '@ml/ml-cloud.js';
import '@ml/theme.js';
import { mountPage } from '../../shared/dc.jsx';
import Logic from './logic.js';
import template from './template.jsx';
import './pseudo.css';

mountPage("media-lab", Logic, template);
