import type { Metadata, Viewport } from "next";
// Font configurations
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import Layout from "@/components/Layout";
import { I18nProvider } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#050a0f",
};

export const metadata: Metadata = {
  title: "GlucoTrack AI",
  description: "Modern PWA for diabetes tracking",
  manifest: "/manifest.json",
  icons: {
    icon: "/glucotracker.png",
    apple: "/ios.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GlucoTrack",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#06b6d4",
          colorBackground: "#050a0f",
          colorInputBackground: "#0a111a",
          colorInputText: "#fff",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body 
          className={`${inter.className} min-h-screen bg-medical-black text-white antialiased`}
          suppressHydrationWarning
        >
          <I18nProvider>
             <Layout>{children}</Layout>
          </I18nProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
