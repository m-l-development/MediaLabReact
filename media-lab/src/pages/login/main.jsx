/* ConnectHub – felles innloggingsside. Eneste side som kan åpnes uten innlogging (se middleware.js). */
import '@ml/i18n.js';
import '@ml/theme.js';
import '../../shared/ml-update.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import LoginPage from './LoginPage.jsx';

createRoot(document.getElementById('dc-root')).render(<LoginPage />);
