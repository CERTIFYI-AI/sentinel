// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

import { useEffect, useState, useCallback } from "react";
import {
  getLocale,
  setLocale as setGlobalLocale,
  onLocaleChange,
  t as translate,
  type Locale,
} from "./index";

export function useTranslation(): {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
  setLocale: (l: Locale) => void;
} {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  useEffect(() => {
    const unsubscribe = onLocaleChange((l) => setLocaleState(l));
    return () => {
      unsubscribe();
    };
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setGlobalLocale(l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(key, params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );

  return { t, locale, setLocale };
}
