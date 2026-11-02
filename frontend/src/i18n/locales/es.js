export default {
  language: {
    label: 'Idioma',
    names: { en: 'Inglés', et: 'Estonio', ru: 'Ruso', de: 'Alemán', fr: 'Francés', es: 'Español' }
  },
  common: { loading: 'Cargando...', cancel: 'Cancelar', back: 'Atrás', delete: 'Eliminar' },
  login: { subtitle: 'Plataforma de gestión de correo electrónico', action: 'Iniciar sesión con OpenID Connect' },
  compose: {
    title: 'Redactar correo', backToInbox: 'Volver a la bandeja de entrada', from: 'De:', to: 'Para:', cc: 'CC:', subject: 'Asunto:', message: 'Mensaje:',
    selectAccount: 'Seleccionar cuenta', recipientPlaceholder: 'destinatario@example.com', ccPlaceholder: 'cc@example.com (opcional)', subjectPlaceholder: 'Asunto del correo',
    messagePlaceholder: 'Escribe tu mensaje...', sending: 'Enviando...', send: 'Enviar correo'
  },
  inbox: {
    sync: 'Sincronizar', importFromGmail: 'Importar desde Gmail', compose: 'Redactar', settings: 'Configuración', logout: 'Cerrar sesión',
    search: 'Buscar mensajes...', folders: 'Carpetas', allMessages: 'Todos los mensajes'
  },
  import: {
    title: 'Importar desde Gmail — paso {{step}} de 2', errorTitle: 'No se pudo iniciar la importación', appPasswordTitle: 'Se requiere una contraseña de aplicación de Gmail',
    appPasswordHelp: 'Gmail requiere una contraseña de aplicación, no tu contraseña habitual.', appPasswordLink: 'Crear una contraseña de aplicación', imapHost: 'Servidor IMAP:',
    port: 'Puerto:', gmailAddress: 'Dirección de Gmail:', appPassword: 'Contraseña de aplicación:', gmailPlaceholder: 'tu-correo@gmail.com',
    appPasswordPlaceholder: 'Contraseña de aplicación de 16 caracteres', connecting: 'Conectando...', next: 'Siguiente: seleccionar carpetas', foundFolders: '{{count}} carpetas encontradas',
    folderHelp: 'Selecciona las carpetas que quieras importar. Todos sus correos se importarán en lotes de 10 mensajes para mostrar mejor el progreso.',
    selectAll: 'Seleccionar todo', clearAll: 'Borrar selección', importing: 'Importando...', importFolders: 'Importar {{count}} carpetas',
    credentialsRequired: 'Introduce tu dirección de Gmail y la contraseña de aplicación antes de cargar las carpetas.',
    accountRequired: 'Añade una cuenta de correo en Configuración antes de importar desde Gmail.', folderRequired: 'Selecciona al menos una carpeta para importar.',
    stopConfirm: '¿Detener la importación? Se conservarán los mensajes ya importados.', progressTitle: 'Importando correos',
    folderProgress: 'Carpeta {{completed}} de {{total}}', imported: 'Importados', skipped: 'Omitidos', completed: 'Completados',
    logs: 'Registro de importación:', folderDetails: 'Detalles de las carpetas:', folderImported: '{{count}} importados', folderSkipped: '{{count}} omitidos', stop: 'Detener importación'
  },
  messages: {
    selected: '{{count}} seleccionados', count_one: '{{count}} mensaje', count_few: '{{count}} mensajes', count_many: '{{count}} mensajes', count_other: '{{count}} mensajes',
    deleteSelected: 'Eliminar ({{count}})', deleteSelectedConfirm: '¿Eliminar {{count}} mensajes seleccionados?', page: 'Página {{current}} de {{total}}',
    previousPage: 'Página anterior', nextPage: 'Página siguiente', selectAll: 'Seleccionar todos los mensajes de esta página', selectMessage: 'Seleccionar mensaje: {{subject}}',
    noSearchResults: 'Ningún mensaje coincide con tu búsqueda', noFolderMessages: 'No hay mensajes en esta carpeta. Pulsa «Sincronizar» para obtener correos.',
    loading: 'Cargando...', backToList: 'Volver a la lista', delete: 'Eliminar', deleteConfirm: '¿Eliminar este mensaje?',
    from: 'De:', to: 'Para:', cc: 'CC:', date: 'Fecha:'
  },
  settings: {
    title: 'Configuración', backToInbox: 'Volver a la bandeja de entrada', accounts: 'Cuentas de correo', addAccount: 'Añadir cuenta', addAccountButton: '+ Añadir cuenta',
    addAccountTitle: 'Añadir cuenta de correo', accountHelp: 'Las cuentas solo guardan la dirección de correo local y el indicador predeterminado. Las credenciales se introducen al iniciar una importación de Gmail.',
    emailAddress: 'Dirección de correo *', setDefault: 'Establecer como cuenta predeterminada', empty: 'No hay cuentas de correo configuradas. Añade una para empezar.',
    defaultBadge: 'Predeterminada', accountDetails: 'Cuenta local utilizada para enviar y organizar el correo importado.', deleteConfirm: '¿Seguro que quieres eliminar esta cuenta?'
  }
};
