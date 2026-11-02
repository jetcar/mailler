export default {
  language: {
    label: 'Langue',
    names: { en: 'Anglais', et: 'Estonien', ru: 'Russe', de: 'Allemand', fr: 'Français', es: 'Espagnol' }
  },
  common: { loading: 'Chargement...', cancel: 'Annuler', back: 'Retour', delete: 'Supprimer' },
  login: { subtitle: 'Plateforme de gestion des e-mails', action: 'Se connecter avec OpenID Connect' },
  compose: {
    title: 'Rédiger un e-mail', backToInbox: 'Retour à la boîte de réception', from: 'De :', to: 'À :', cc: 'CC :', subject: 'Objet :', message: 'Message :',
    selectAccount: 'Sélectionner un compte', recipientPlaceholder: 'destinataire@example.com', ccPlaceholder: 'cc@example.com (facultatif)', subjectPlaceholder: "Objet de l'e-mail",
    messagePlaceholder: 'Saisissez votre message...', sending: 'Envoi...', send: "Envoyer l'e-mail"
  },
  inbox: {
    sync: 'Synchroniser', importFromGmail: 'Importer depuis Gmail', compose: 'Rédiger', settings: 'Paramètres', logout: 'Déconnexion',
    search: 'Rechercher des messages...', folders: 'Dossiers', allMessages: 'Tous les messages'
  },
  import: {
    title: 'Importer depuis Gmail — étape {{step}} sur 2', errorTitle: "Impossible de lancer l'importation", appPasswordTitle: "Mot de passe d'application Gmail requis",
    appPasswordHelp: "Gmail exige un mot de passe d'application, et non votre mot de passe habituel.", appPasswordLink: "Créer un mot de passe d'application", imapHost: 'Hôte IMAP :',
    port: 'Port :', gmailAddress: 'Adresse Gmail :', appPassword: "Mot de passe d'application :", gmailPlaceholder: 'votre-adresse@gmail.com',
    appPasswordPlaceholder: "Mot de passe d'application à 16 caractères", connecting: 'Connexion...', next: 'Suivant : sélectionner les dossiers', foundFolders: '{{count}} dossiers trouvés',
    folderHelp: "Sélectionnez les dossiers à importer. Tous leurs e-mails seront importés par lots de 10 messages afin de mieux suivre l'avancement.",
    selectAll: 'Tout sélectionner', clearAll: 'Tout effacer', importing: 'Importation...', importFolders: 'Importer {{count}} dossiers',
    credentialsRequired: "Saisissez votre adresse Gmail et votre mot de passe d'application avant de charger les dossiers.",
    accountRequired: "Ajoutez un compte de messagerie dans les paramètres avant d'importer depuis Gmail.", folderRequired: 'Sélectionnez au moins un dossier à importer.',
    stopConfirm: "Arrêter l'importation ? Les messages déjà importés seront conservés.", progressTitle: 'Importation des e-mails',
    folderProgress: 'Dossier {{completed}} sur {{total}}', imported: 'Importés', skipped: 'Ignorés', completed: 'Terminés',
    logs: "Journal d'importation :", folderDetails: 'Détails des dossiers :', folderImported: '{{count}} importés', folderSkipped: '{{count}} ignorés', stop: "Arrêter l'importation"
  },
  messages: {
    selected: '{{count}} sélectionnés', count_one: '{{count}} message', count_few: '{{count}} messages', count_many: '{{count}} messages', count_other: '{{count}} messages',
    deleteSelected: 'Supprimer ({{count}})', deleteSelectedConfirm: 'Supprimer les {{count}} messages sélectionnés ?', page: 'Page {{current}} sur {{total}}',
    previousPage: 'Page précédente', nextPage: 'Page suivante', selectAll: 'Sélectionner tous les messages de cette page', selectMessage: 'Sélectionner le message : {{subject}}',
    noSearchResults: 'Aucun message ne correspond à votre recherche', noFolderMessages: 'Aucun message dans ce dossier. Cliquez sur « Synchroniser » pour récupérer les e-mails.',
    loading: 'Chargement...', backToList: 'Retour à la liste', delete: 'Supprimer', deleteConfirm: 'Supprimer ce message ?',
    from: 'De :', to: 'À :', cc: 'CC :', date: 'Date :'
  },
  settings: {
    title: 'Paramètres', backToInbox: 'Retour à la boîte de réception', accounts: 'Comptes de messagerie', addAccount: 'Ajouter un compte', addAccountButton: '+ Ajouter un compte',
    addAccountTitle: 'Ajouter un compte de messagerie', accountHelp: "Les comptes stockent uniquement l'adresse e-mail locale et l'indicateur par défaut. Les identifiants d'importation sont saisis lors d'un import Gmail.",
    emailAddress: 'Adresse e-mail *', setDefault: 'Définir comme compte par défaut', empty: 'Aucun compte de messagerie configuré. Ajoutez-en un pour commencer.',
    defaultBadge: 'Par défaut', accountDetails: 'Compte local utilisé pour envoyer et organiser les e-mails importés.', deleteConfirm: 'Voulez-vous vraiment supprimer ce compte ?'
  }
};
