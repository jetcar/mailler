export default {
  language: {
    label: 'Язык',
    names: { en: 'Английский', et: 'Эстонский', ru: 'Русский', de: 'Немецкий', fr: 'Французский', es: 'Испанский' }
  },
  common: { loading: 'Загрузка...', cancel: 'Отмена', back: 'Назад', delete: 'Удалить' },
  login: { subtitle: 'Платформа управления электронной почтой', action: 'Войти через OpenID Connect' },
  compose: {
    title: 'Новое письмо', backToInbox: 'Вернуться во входящие', from: 'От:', to: 'Кому:', cc: 'Копия:', subject: 'Тема:', message: 'Сообщение:',
    selectAccount: 'Выберите учётную запись', recipientPlaceholder: 'recipient@example.com', ccPlaceholder: 'cc@example.com (необязательно)', subjectPlaceholder: 'Тема письма',
    messagePlaceholder: 'Введите сообщение...', sending: 'Отправка...', send: 'Отправить письмо'
  },
  inbox: {
    sync: 'Синхронизировать', importFromGmail: 'Импорт из Gmail', compose: 'Написать', settings: 'Настройки', logout: 'Выйти',
    search: 'Поиск писем...', folders: 'Папки', allMessages: 'Все письма'
  },
  import: {
    title: 'Импорт из Gmail — шаг {{step}} из 2', errorTitle: 'Не удалось начать импорт', appPasswordTitle: 'Требуется пароль приложения Gmail',
    appPasswordHelp: 'Gmail требует пароль приложения, а не обычный пароль.', appPasswordLink: 'Создать пароль приложения', imapHost: 'IMAP-сервер:',
    port: 'Порт:', gmailAddress: 'Адрес Gmail:', appPassword: 'Пароль приложения:', gmailPlaceholder: 'your-email@gmail.com',
    appPasswordPlaceholder: '16-значный пароль приложения', connecting: 'Подключение...', next: 'Далее: выбрать папки', foundFolders: 'Найдено папок: {{count}}',
    folderHelp: 'Выберите папки для импорта. Все письма из выбранных папок будут импортироваться пакетами по 10 сообщений для удобного отслеживания.',
    selectAll: 'Выбрать все', clearAll: 'Очистить выбор', importing: 'Импорт...', importFolders: 'Импортировать папки: {{count}}',
    credentialsRequired: 'Введите адрес Gmail и пароль приложения перед загрузкой папок.',
    accountRequired: 'Перед импортом из Gmail добавьте учётную запись в настройках.', folderRequired: 'Выберите хотя бы одну папку для импорта.',
    stopConfirm: 'Остановить импорт? Уже импортированные письма будут сохранены.', progressTitle: 'Импорт писем',
    folderProgress: 'Папка {{completed}} из {{total}}', imported: 'Импортировано', skipped: 'Пропущено', completed: 'Завершено',
    logs: 'Журнал импорта:', folderDetails: 'Сведения о папках:', folderImported: 'Импортировано: {{count}}', folderSkipped: 'Пропущено: {{count}}', stop: 'Остановить импорт'
  },
  messages: {
    selected: 'Выбрано: {{count}}', count_one: '{{count}} письмо', count_few: '{{count}} письма', count_many: '{{count}} писем', count_other: '{{count}} письма',
    deleteSelected: 'Удалить ({{count}})', deleteSelectedConfirm: 'Удалить выбранные сообщения ({{count}})?', page: 'Страница {{current}} из {{total}}',
    previousPage: 'Предыдущая страница', nextPage: 'Следующая страница', selectAll: 'Выбрать все письма на этой странице', selectMessage: 'Выбрать письмо: {{subject}}',
    noSearchResults: 'По вашему запросу писем не найдено', noFolderMessages: 'В этой папке нет писем. Нажмите «Синхронизировать», чтобы загрузить их.',
    loading: 'Загрузка...', backToList: 'Назад к списку', delete: 'Удалить', deleteConfirm: 'Удалить это письмо?',
    from: 'От:', to: 'Кому:', cc: 'Копия:', date: 'Дата:'
  },
  settings: {
    title: 'Настройки', backToInbox: 'Вернуться во входящие', accounts: 'Учётные записи почты', addAccount: 'Добавить учётную запись', addAccountButton: '+ Добавить',
    addAccountTitle: 'Добавить учётную запись почты', accountHelp: 'Хранятся только локальный адрес электронной почты и признак основной учётной записи. Данные для импорта вводятся при запуске импорта из Gmail.',
    emailAddress: 'Адрес электронной почты *', setDefault: 'Использовать по умолчанию', empty: 'Учётные записи не настроены. Добавьте первую учётную запись.',
    defaultBadge: 'По умолчанию', accountDetails: 'Локальная учётная запись для отправки и организации импортированной почты.', deleteConfirm: 'Удалить эту учётную запись?'
  }
};
