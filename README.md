# Christchindli für Netlify – Wunschzettel ohne Anmeldung

Alle, die den Link kennen, öffnen die Seite, schreiben Namen und Wunsch auf und hängen ihn an den Baum.
Es braucht kein Konto. Neue Wünsche erscheinen bei allen nach spätestens 15 Sekunden.

Aufbau: Die Seite liegt in `public/`. Die Schnittstelle zum Speichern ist eine Netlify-Funktion in
`netlify/functions/api.mjs`. Die Wünsche liegen in Netlify Blobs, dem Speicher von Netlify, und bleiben
dauerhaft erhalten.

## Wichtig: Drag and Drop geht nicht

Die Funktion «Netlify Drop» (Ordner oder Zip auf die Webseite ziehen) veröffentlicht nur fertige Seiten
und führt keine Funktionen aus. Dann lädt die Seite, aber nichts lässt sich speichern.
Nimm stattdessen einen der beiden Wege unten.

## Weg A: ohne Terminal, über GitHub

1. Zip entpacken.
2. Auf github.com ein neues Repository anlegen (es darf privat sein).
3. Im Repository «uploading an existing file» wählen und den **Inhalt** des entpackten Ordners hineinziehen
   (die Ordner `public` und `netlify` sowie `netlify.toml`, `package.json` und `README.md`). Dann «Commit changes».
4. Auf netlify.com: «Add new project», «Import an existing project», GitHub wählen und das Repository auswählen.
   Die Einstellungen kommen aus `netlify.toml`, du musst nichts ändern. «Deploy» klicken.
5. Im Projekt unter «Site configuration», «Environment variables» die Variable `ADMIN_PASSWORD` mit deinem
   Wunsch-Passwort anlegen. Danach unter «Deploys» einen neuen Deploy auslösen («Trigger deploy»),
   damit das Passwort gilt.
6. Die Adresse (zum Beispiel `dein-name.netlify.app`) an alle schicken. Den Namen kannst du in den
   Projekteinstellungen unter «Project name» ändern.

## Weg B: mit Terminal

1. Node.js installieren (nodejs.org).
2. Im Ordner: `npm install`
3. `npx netlify-cli login`, dann `npx netlify-cli deploy --prod` und den Anweisungen zum neuen Projekt folgen.
4. `ADMIN_PASSWORD` wie oben in Schritt 5 setzen und noch einmal `npx netlify-cli deploy --prod` ausführen.

## Löschen

- Jede Person kann die Wünsche löschen, die sie selbst in diesem Browser eingetragen hat.
  Wer den Browser-Speicher leert oder das Gerät wechselt, kann seine alten Wünsche nicht mehr selbst löschen.
- Unten auf der Seite gibt es «Verwaltung». Nach Eingabe des `ADMIN_PASSWORD` kannst du alle Wünsche löschen.
  Ohne `ADMIN_PASSWORD` ist die Verwaltung ausgeschaltet.

## Schutz vor Missbrauch

- Pro Internetadresse sind höchstens 8 neue Wünsche in 10 Minuten möglich.
- Ein verstecktes Feld hält einfache Spam-Programme ab.
- Es werden höchstens 500 Wünsche gespeichert, die Seite zeigt die neuesten 300. Namen sind auf 40 und
  Wünsche auf 400 Zeichen begrenzt.
- Alle Texte werden als reiner Text angezeigt, nie als Code.

Wer den Link hat, kann Wünsche eintragen und lesen. Teile ihn nur mit Leuten, die es sehen dürfen.
