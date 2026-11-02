import de from './locales/de.js';
import en from './locales/en.js';
import es from './locales/es.js';
import et from './locales/et.js';
import fr from './locales/fr.js';
import ru from './locales/ru.js';

export const catalogs = { en, et, ru, de, fr, es };

export const resources = Object.fromEntries(
  Object.entries(catalogs).map(([locale, translation]) => [locale, { translation }])
);
