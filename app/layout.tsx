import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LocaleShell from "./components/LocaleShell";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const canonicalUrl = new URL("https://solidareaty.de");

export const metadata: Metadata = {
  metadataBase: canonicalUrl,
  applicationName: "Solidareaty",
  title: {
    default: "Solidareaty — Local food, fair work",
    template: "%s | Solidareaty",
  },
  description:
    "Discover local restaurants, producers and neighborhood solidarity.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: canonicalUrl,
    siteName: "Solidareaty",
    title: "Solidareaty — Local food, fair work",
    description:
      "Discover local restaurants, producers and neighborhood solidarity.",
    locale: "en_DE",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LocaleShell>{children}</LocaleShell>
      </body>
    </html>
  );
}
