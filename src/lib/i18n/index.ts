 import { writable, derived } from 'svelte/store';
import type { Writable } from 'svelte/store';

// Available languages
export type Language = 'en' | 'ru';

// Translation structure
export type Translations = {
  nav: {
    newChat: string;
    models: string;
    mcpServers: string;
    settings: string;
    toggleTheme: string;
    getPro: string;
    pro: string;
    today: string;
    week: string;
    month: string;
    older: string;
  };
  user: {
    anonymous: string;
  };
};

// Load translations dynamically
async function loadTranslations(lang: Language): Promise<Translations> {
  switch (lang) {
    case 'ru':
      return (await import('./ru.json')).default;
    case 'en':
    default:
      return (await import('./en.json')).default;
  }
}

// Current language store
export const currentLanguage: Writable<Language> = writable('ru');

// Translations store
export const translations = derived(currentLanguage, ($currentLanguage, set) => {
  loadTranslations($currentLanguage).then(set);
});

// Helper function to get translation
export function t(key: string, translationsObj: Translations | undefined | null): string {
  if (!translationsObj) {
    return key; // Return key if translations not loaded yet
  }
  
  const keys = key.split('.');
  let value: any = translationsObj;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if not found
    }
  }
  
  return typeof value === 'string' ? value : key;
}

// Initialize with default language
export function initI18n() {
  // You can add logic to detect user's preferred language from browser
  // or from saved preferences
  if (typeof window !== 'undefined') {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'ru')) {
      currentLanguage.set(savedLang);
    }
  }
}
