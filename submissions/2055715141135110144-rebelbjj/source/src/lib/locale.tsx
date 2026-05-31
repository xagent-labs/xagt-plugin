import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type AppLocale = "zh-CN" | "zh-TW" | "en" | "ja";

type LocaleOption = {
  value: AppLocale;
  label: string;
};

type LocaleVariants<T> = Partial<Record<AppLocale, T>> & { "zh-CN": T };

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (nextLocale: AppLocale) => void;
  localeOptions: LocaleOption[];
  pick: <T>(variants: LocaleVariants<T>) => T;
};

const LOCALE_STORAGE_KEY = "rebel-bjj-locale";

const localeOptions: LocaleOption[] = [
  { value: "zh-CN", label: "简中" },
  { value: "zh-TW", label: "繁中" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
];

const LocaleContext = createContext<LocaleContextValue | null>(null);

const isAppLocale = (value: string | null): value is AppLocale =>
  value === "zh-CN" || value === "zh-TW" || value === "en" || value === "ja";

export const pickLocaleValue = <T,>(locale: AppLocale, variants: LocaleVariants<T>) => {
  if (variants[locale] !== undefined) return variants[locale] as T;
  if (locale === "zh-TW" && variants["zh-CN"] !== undefined) return variants["zh-CN"];
  if ((locale === "ja" || locale === "en") && variants.en !== undefined) return variants.en;
  return variants["zh-CN"];
};

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<AppLocale>(() => {
    if (typeof window === "undefined") return "zh-CN";
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isAppLocale(saved) ? saved : "zh-CN";
  });

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      localeOptions,
      pick: <T,>(variants: LocaleVariants<T>) => pickLocaleValue(locale, variants),
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
};
