/**
 * Server-side dictionary loader.
 *
 * Loads the translation JSON files dynamically on the server using import().
 * This replaces the Vite-era react-i18next useTranslation() hook.
 *
 * Usage (in server components / page.jsx):
 *   const dictionary = await getDictionary('ar');
 *   // Then pass dictionary as a prop to client components
 *
 * The translation files at locales/xx/translation.json are
 * copied byte-for-byte from the original source — UNTOUCHED.
 */

const dictionaries = {
  en: () => import('../locales/en/translation.json').then((module) => module.default || module),
  ar: () => import('../locales/ar/translation.json').then((module) => module.default || module),
};

export const getDictionary = async (locale) => {
  const loader = dictionaries[locale];
  if (!loader) {
    // Fallback to Arabic if an unsupported locale slips through
    return dictionaries.ar();
  }
  return loader();
};
