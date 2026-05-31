import { AppLocale } from "@/lib/locale";

export const localizeMixedLabel = (
  value: string,
  locale: AppLocale,
  englishFallback?: string,
) => {
  if (locale === "zh-CN" || locale === "zh-TW") return value;
  if (englishFallback) return englishFallback;

  const slashParts = value.split("/").map((part) => part.trim()).filter(Boolean);
  if (slashParts.length > 1) {
    return slashParts[0];
  }

  const trailingEnglishMatch = value.match(/^(.+?)\s+([A-Za-z][A-Za-z0-9 /+\-→()]+)$/);
  if (trailingEnglishMatch) {
    return trailingEnglishMatch[2].trim();
  }

  return value;
};

export const compactSkillLabel = (value: string, locale: AppLocale) => {
  const localized = localizeMixedLabel(value, locale);
  const zhShort = localized.split(" ")[0];

  if (locale === "zh-CN" || locale === "zh-TW") {
    return zhShort;
  }

  return localized
    .split(/[\s/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
};

export const localizeQuestTitle = (title: string, english: string, locale: AppLocale) => {
  if (locale === "en" || locale === "ja") return english;
  return title;
};
