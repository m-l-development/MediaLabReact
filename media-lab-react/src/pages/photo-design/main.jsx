/* GENERERT av scripts/dc2jsx.mjs fra media-lab/photo-design.dc.html – ikke rediger for hånd før siden er ferdig sammenlignet. */
import '@ml/ml-pwa.js';
import '@ml/i18n.js';
import '@ml/ml-footer.js';
import '@ml/theme.js';
import '@ml/ml-cloud.js';
import '@ml/ml-bg.js';
import '@ml/ml-share.js';
import '@ml/ml-fx.js';
import '@ml/photo-engine.js';
import { mountPage } from '../../shared/dc.jsx';
import Logic from './logic.js';
import template from './template.jsx';
import './pseudo.css';

mountPage("photo-design", Logic, template);
