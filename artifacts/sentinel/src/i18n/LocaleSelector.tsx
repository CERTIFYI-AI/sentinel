// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

import type { FC } from "react";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "./index";
import { useTranslation } from "./useTranslation";

export const LocaleSelector: FC<{ className?: string }> = ({ className }) => {
  const { t, locale, setLocale } = useTranslation();
  return (
    <label className={className}>
      <span className="sr-only">{t("locale.selector.label")}</span>
      <select
        aria-label={t("locale.selector.label")}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
};
