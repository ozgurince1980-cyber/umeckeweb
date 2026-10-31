"use client";
import { LanguageProvider } from "../../lib/i18n";
import type { ReactNode } from "react";
import SiteNavigation from "./SiteNavigation";
export default function LocaleShell({ children }: { children: ReactNode }) { return <LanguageProvider><SiteNavigation />{children}</LanguageProvider>; }
