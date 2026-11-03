import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Translator } from '../i18n/translator';

export const TranslatorContext = createContext<Translator | undefined>(undefined);

export function useTranslator(): Translator {
  const translator = useContext(TranslatorContext);
  if (!translator) throw new Error('useTranslator() needs a TranslatorContext provider.');
  return translator;
}
