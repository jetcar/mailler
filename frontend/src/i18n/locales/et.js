export default {
  language: {
    label: 'Keel',
    names: { en: 'Inglise', et: 'Eesti', ru: 'Vene', de: 'Saksa', fr: 'Prantsuse', es: 'Hispaania' }
  },
  common: { loading: 'Laadimine...', cancel: 'Tühista', back: 'Tagasi', delete: 'Kustuta' },
  login: { subtitle: 'E-posti haldusplatvorm', action: 'Logi sisse OpenID Connectiga' },
  compose: {
    title: 'Koosta kiri', backToInbox: 'Tagasi postkasti', from: 'Saatja:', to: 'Saaja:', cc: 'Koopia:', subject: 'Teema:', message: 'Sõnum:',
    selectAccount: 'Vali konto', recipientPlaceholder: 'saaja@example.com', ccPlaceholder: 'koopia@example.com (valikuline)', subjectPlaceholder: 'Kirja teema',
    messagePlaceholder: 'Kirjuta sõnum siia...', sending: 'Saatmine...', send: 'Saada kiri'
  },
  inbox: {
    sync: 'Sünkrooni', importFromGmail: 'Impordi Gmailist', compose: 'Koosta', settings: 'Seaded', logout: 'Logi välja',
    search: 'Otsi kirju...', folders: 'Kaustad', allMessages: 'Kõik kirjad'
  },
  import: {
    title: 'Import Gmailist — samm {{step}}/2', errorTitle: 'Importi ei saanud alustada', appPasswordTitle: 'Vajalik on Gmaili rakenduse parool',
    appPasswordHelp: 'Gmail nõuab rakenduse parooli (mitte sinu tavalist parooli).', appPasswordLink: 'Loo rakenduse parool', imapHost: 'IMAP-server:',
    port: 'Port:', gmailAddress: 'Gmaili aadress:', appPassword: 'Rakenduse parool:', gmailPlaceholder: 'sinu-aadress@gmail.com',
    appPasswordPlaceholder: '16-kohaline rakenduse parool', connecting: 'Ühendamine...', next: 'Edasi: vali kaustad', foundFolders: 'Leiti {{count}} kausta',
    folderHelp: 'Vali imporditavad kaustad. Kõik valitud kaustade kirjad imporditakse parema edenemisvaate jaoks 10 kirja kaupa.',
    selectAll: 'Vali kõik', clearAll: 'Tühjenda valik', importing: 'Importimine...', importFolders: 'Impordi {{count}} kausta',
    credentialsRequired: 'Sisesta enne kaustade laadimist Gmaili aadress ja rakenduse parool.',
    accountRequired: 'Enne Gmailist importimist lisa seadetes e-posti konto.', folderRequired: 'Vali importimiseks vähemalt üks kaust.',
    stopConfirm: 'Kas peatada import? Juba imporditud kirjade edenemine salvestatakse.', progressTitle: 'Kirjade importimine',
    folderProgress: 'Kaust {{completed}}/{{total}}', imported: 'Imporditud', skipped: 'Vahele jäetud', completed: 'Lõpetatud',
    logs: 'Impordilogi:', folderDetails: 'Kaustade üksikasjad:', folderImported: '{{count}} imporditud', folderSkipped: '{{count}} vahele jäetud', stop: 'Peata import'
  },
  messages: {
    selected: '{{count}} valitud', count_one: '{{count}} kiri', count_few: '{{count}} kirja', count_many: '{{count}} kirja', count_other: '{{count}} kirja',
    deleteSelected: 'Kustuta ({{count}})', deleteSelectedConfirm: 'Kas kustutada {{count}} valitud kirja?', page: 'Leht {{current}}/{{total}}',
    previousPage: 'Eelmine leht', nextPage: 'Järgmine leht', selectAll: 'Vali kõik selle lehe kirjad', selectMessage: 'Vali kiri: {{subject}}',
    noSearchResults: 'Otsingule vastavaid kirju ei leitud', noFolderMessages: 'Selles kaustas pole kirju. Kirjade laadimiseks klõpsa „Sünkrooni”.',
    loading: 'Laadimine...', backToList: 'Tagasi loendisse', delete: 'Kustuta', deleteConfirm: 'Kas kustutada see kiri?',
    from: 'Saatja:', to: 'Saaja:', cc: 'Koopia:', date: 'Kuupäev:'
  },
  settings: {
    title: 'Seaded', backToInbox: 'Tagasi postkasti', accounts: 'E-posti kontod', addAccount: 'Lisa konto', addAccountButton: '+ Lisa konto',
    addAccountTitle: 'Lisa e-posti konto', accountHelp: 'Kontodel salvestatakse ainult kohalik e-posti aadress ja vaikekonto märge. Impordiandmed sisestatakse Gmaili impordi käivitamisel.',
    emailAddress: 'E-posti aadress *', setDefault: 'Määra vaikekontoks', empty: 'E-posti kontosid pole seadistatud. Alustamiseks lisa konto.',
    defaultBadge: 'Vaikimisi', accountDetails: 'Kohalik konto imporditud kirjade saatmiseks ja korraldamiseks.', deleteConfirm: 'Kas soovid selle konto kustutada?'
  }
};
