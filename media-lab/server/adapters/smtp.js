/* Serveradapter for e-post via SMTP (nodemailer). ENESTE serverfil som kjenner SMTP-biblioteket.
   Tilgangen (vert, port, bruker, app-passord) kommer bare fra servermiljøet (se server/lib/mail.js) og brukes bare her.
   Ingen fil- eller nettadresser hentes inn i meldinger (disableFileAccess/disableUrlAccess), og ingenting logges. */
import nodemailer from 'nodemailer';

export function smtpMailer(c, extra = {}) {
  const transport = nodemailer.createTransport({
    host: c.host, port: c.port, secure: c.port === 465, requireTLS: c.port === 587,
    auth: { user: c.user, pass: c.pass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false,
    ...extra,
  });
  return {
    /* msg: { to, subject, html, text, attachments: [{ filename, cid, content (Buffer), contentType }] } */
    async send(msg) {
      await transport.sendMail({
        from: { name: c.fromName, address: c.user }, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text,
        attachments: (msg.attachments || []).map(a => ({ filename: a.filename, cid: a.cid, content: a.content, contentType: a.contentType, contentDisposition: 'inline' })),
        disableFileAccess: true, disableUrlAccess: true,
      });
      return { ok: true };
    },
  };
}
