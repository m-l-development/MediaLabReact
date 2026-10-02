# E-postoppsett for ConnectHub (B2)

ConnectHub sender selv e-post for invitasjoner (velkomstmail) og «Glemt passord» når serveren har et SMTP-oppsett. Uten oppsett brukes dagens løsning: Supabase sender e-posten med standardtekst, og malene i Mail-fanen brukes ikke. Ingenting brytes uten oppsettet.

**Du legger inn verdiene selv.** De skal aldri deles i chat, legges i kode eller skrives i `.env`-filer i repoet.

## 1. Gmail-app-passord (én gang per Gmail-konto)
1. Google-kontoen må ha totrinnsbekreftelse.
2. Gå til <https://myaccount.google.com/apppasswords> og lag et app-passord (navn f.eks. «ConnectHub Dev»). Du får 16 tegn.
3. Bruk gjerne en egen Gmail-konto for dev, og den samme kontoen som Supabase bruker i produksjon for Production.

## 2. Variabler i Vercel
Vercel → prosjekt `media-lab-react-vyef` → **Settings → Environment Variables → Add**.

| Navn | Verdi | Hemmelig? | Miljø |
|---|---|---|---|
| `CONNECTHUB_SMTP_HOST` | `smtp.gmail.com` | Nei | Preview (gren `connecthub`) og senere Production |
| `CONNECTHUB_SMTP_PORT` | `465` | Nei | Samme |
| `CONNECTHUB_SMTP_USER` | Gmail-adressen e-posten skal sendes fra | Nei (vises for Developer/Moderator i Mail-fanen) | Samme |
| `CONNECTHUB_SMTP_PASSWORD` | App-passordet (16 tegn, uten mellomrom) | **Ja – merk som «Sensitive»** | Samme |
| `CONNECTHUB_MAIL_FROM_NAME` | f.eks. `ConnectHub` (valgfri) | Nei | Samme |

**Krav til navn og verdier:**
- Navnene må skrives nøyaktig slik: store bokstaver, ingen `VITE_`, ingen bindestrek.
- Port `587` (STARTTLS) virker også. Andre porter avvises.

**Ved oppstart:**
- Mangler noe, eller er det feil, viser Mail-fanen «ikke satt opp» med navnet på feilen (f.eks. `smtp_password_missing`), aldri verdien.
- Bygget stopper hvis passordet eller navnet `CONNECTHUB_SMTP_PASSWORD` havner i nettleserkoden.

**Endringer i variabler gjelder fra neste deployment.**
- Etter at du har lagt dem inn for Preview, sier du fra, så lager jeg en ny Preview-deployment av `connecthub`. Det gjøres ved å pushe en commit. Du kan også trykke «Redeploy» selv.
- **Production** legges inn først når Preview er bekreftet, og etter egen beslutning.

## 3. Kontroll (Preview, din innlogging)
1. Åpne ConnectHub Dev → Admin → **Mail**. «Utsending» skal vise «E-post sendes fra `<adressen>`».
2. Trykk **Send test til meg** for begge malene. E-posten kommer til din adresse, med logo og en eksempellenke.
3. **«Glemt passord» på innloggingssiden:**
   - Åpne e-posten på **en annen enhet** (f.eks. mobilen).
   - Trykk «Fortsett» og velg nytt passord. Logg inn med det nye passordet.
4. **Invitasjon:** inviter en testadresse. Velkomstmailen fra Mail-fanen kommer, og lenken fører til «Velkommen til ConnectHub» → passordvalg.
5. **Utsendingsloggen:** «Siste utsendinger» i Mail-fanen viser hver utsending som «Sendt» eller «Feilet» med feilkode (f.eks. `EAUTH` = feil app-passord).

## 4. Kostnad og begrensninger
- **Pris:** Gmail-SMTP er gratis.
- **Grense:** omtrent 500 mottakere per døgn for vanlig Gmail og omtrent 2 000 for Google Workspace.
- **Pålitelighet:** e-post sendes fra Gmail-adressen, med Googles signering.
- **Avsender:** e-posten kommer fra Gmail-adressen. Et eget domene som avsender krever en annen leverandør og DNS-oppsett, og er ikke en del av dette.
