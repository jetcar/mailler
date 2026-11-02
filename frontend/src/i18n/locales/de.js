export default {
  language: {
    label: 'Sprache',
    names: { en: 'Englisch', et: 'Estnisch', ru: 'Russisch', de: 'Deutsch', fr: 'Französisch', es: 'Spanisch' }
  },
  common: { loading: 'Wird geladen...', cancel: 'Abbrechen', back: 'Zurück', delete: 'Löschen' },
  login: { subtitle: 'Plattform zur E-Mail-Verwaltung', action: 'Mit OpenID Connect anmelden' },
  compose: {
    title: 'E-Mail verfassen', backToInbox: 'Zurück zum Posteingang', from: 'Von:', to: 'An:', cc: 'CC:', subject: 'Betreff:', message: 'Nachricht:',
    selectAccount: 'Konto auswählen', recipientPlaceholder: 'empfaenger@example.com', ccPlaceholder: 'cc@example.com (optional)', subjectPlaceholder: 'E-Mail-Betreff',
    messagePlaceholder: 'Nachricht hier eingeben...', sending: 'Wird gesendet...', send: 'E-Mail senden'
  },
  inbox: {
    sync: 'Synchronisieren', importFromGmail: 'Aus Gmail importieren', compose: 'Verfassen', settings: 'Einstellungen', logout: 'Abmelden',
    search: 'Nachrichten durchsuchen...', folders: 'Ordner', allMessages: 'Alle Nachrichten'
  },
  import: {
    title: 'Aus Gmail importieren — Schritt {{step}} von 2', errorTitle: 'Import konnte nicht gestartet werden', appPasswordTitle: 'Gmail-App-Passwort erforderlich',
    appPasswordHelp: 'Gmail benötigt ein App-Passwort, nicht dein normales Passwort.', appPasswordLink: 'App-Passwort erstellen', imapHost: 'IMAP-Host:',
    port: 'Port:', gmailAddress: 'Gmail-Adresse:', appPassword: 'App-Passwort:', gmailPlaceholder: 'deine-adresse@gmail.com',
    appPasswordPlaceholder: '16-stelliges App-Passwort', connecting: 'Verbindung wird hergestellt...', next: 'Weiter: Ordner auswählen', foundFolders: '{{count}} Ordner gefunden',
    folderHelp: 'Wähle die zu importierenden Ordner aus. Alle E-Mails werden zur besseren Fortschrittsanzeige in Gruppen von 10 Nachrichten importiert.',
    selectAll: 'Alle auswählen', clearAll: 'Auswahl aufheben', importing: 'Wird importiert...', importFolders: '{{count}} Ordner importieren',
    credentialsRequired: 'Gib deine Gmail-Adresse und dein App-Passwort ein, bevor du Ordner abrufst.',
    accountRequired: 'Füge vor dem Gmail-Import in den Einstellungen ein E-Mail-Konto hinzu.', folderRequired: 'Wähle mindestens einen Ordner für den Import aus.',
    stopConfirm: 'Import stoppen? Bereits importierte Nachrichten bleiben gespeichert.', progressTitle: 'E-Mails werden importiert',
    folderProgress: 'Ordner {{completed}} von {{total}}', imported: 'Importiert', skipped: 'Übersprungen', completed: 'Abgeschlossen',
    logs: 'Importprotokoll:', folderDetails: 'Ordnerdetails:', folderImported: '{{count}} importiert', folderSkipped: '{{count}} übersprungen', stop: 'Import stoppen'
  },
  messages: {
    selected: '{{count}} ausgewählt', count_one: '{{count}} Nachricht', count_few: '{{count}} Nachrichten', count_many: '{{count}} Nachrichten', count_other: '{{count}} Nachrichten',
    deleteSelected: 'Löschen ({{count}})', deleteSelectedConfirm: '{{count}} ausgewählte Nachricht(en) löschen?', page: 'Seite {{current}} von {{total}}',
    previousPage: 'Vorherige Seite', nextPage: 'Nächste Seite', selectAll: 'Alle Nachrichten auf dieser Seite auswählen', selectMessage: 'Nachricht auswählen: {{subject}}',
    noSearchResults: 'Keine Nachrichten entsprechen der Suche', noFolderMessages: 'Dieser Ordner enthält keine Nachrichten. Klicke auf „Synchronisieren“, um E-Mails abzurufen.',
    loading: 'Wird geladen...', backToList: 'Zurück zur Liste', delete: 'Löschen', deleteConfirm: 'Diese Nachricht löschen?',
    from: 'Von:', to: 'An:', cc: 'CC:', date: 'Datum:'
  },
  settings: {
    title: 'Einstellungen', backToInbox: 'Zurück zum Posteingang', accounts: 'E-Mail-Konten', addAccount: 'Konto hinzufügen', addAccountButton: '+ Konto hinzufügen',
    addAccountTitle: 'E-Mail-Konto hinzufügen', accountHelp: 'Konten speichern nur die lokale E-Mail-Adresse und die Standardeinstellung. Import-Zugangsdaten werden erst beim Gmail-Import eingegeben.',
    emailAddress: 'E-Mail-Adresse *', setDefault: 'Als Standardkonto festlegen', empty: 'Keine E-Mail-Konten eingerichtet. Füge ein Konto hinzu, um zu beginnen.',
    defaultBadge: 'Standard', accountDetails: 'Lokales Konto zum Senden und Organisieren importierter E-Mails.', deleteConfirm: 'Möchtest du dieses Konto wirklich löschen?'
  }
};
