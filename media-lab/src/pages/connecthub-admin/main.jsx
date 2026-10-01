/* ConnectHub – ny administrasjon (menigheter, medlemmer, invitasjoner, brukere, logg). Krever innlogging (auth-gate);
   hva som vises og kan endres, avgjøres av databasen (RLS og funksjoner) – siden skjuler bare knapper. */
import '@ml/i18n.js';
import '@ml/theme.js';
import '../../shared/ml-update.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ensureLoggedIn } from '../../shared/auth-gate.js';
import AdminPage from './AdminPage.jsx';

ensureLoggedIn().then(me => {
  if (!me) { document.body.textContent = 'ConnectHub-backend mangler i dette bygget.'; return; }
  createRoot(document.getElementById('dc-root')).render(<AdminPage me={me} />);
});
