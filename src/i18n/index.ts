import en from './en.json';
import fr from './fr.json';

export const locales = ['en', 'fr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const dictionaries = { en, fr } as const;
export type Dict = typeof en;

export function getDict(locale: Locale): Dict {
  return dictionaries[locale] as Dict;
}

export function localizedPath(locale: Locale, path: string): string {
  const clean = path.replace(/^\/+/, '');
  return locale === defaultLocale ? `/${clean}` : `/${locale}/${clean}`;
}
