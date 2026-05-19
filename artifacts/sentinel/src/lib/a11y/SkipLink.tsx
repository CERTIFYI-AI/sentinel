// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

import type { FC } from "react";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * WCAG 2.2 SC 2.4.1 Bypass Blocks — visible on focus, keyboard-navigable
 * skip link that jumps to the main landmark.
 */
export const SkipLink: FC<{ targetId?: string }> = ({
  targetId = "main-content",
}) => {
  const { t } = useTranslation();
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ring"
    >
      {t("a11y.skipToContent")}
    </a>
  );
};
