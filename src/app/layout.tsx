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
  title: "GlucoTrack - Intelligent Care",
  description: "Monitor and analyze your glucose trends securely.",
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

import { Toaster } from "sonner";

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
      colorBackground: "#111827", // Slightly lighter dark background
      colorInputBackground: "#1f2937",
      colorText: "#ffffff",
      colorTextSecondary: "#9ca3af",
      colorTextOnPrimaryBackground: "#ffffff",
    },
    elements: {
      card: "bg-medical-dark shadow-2xl border border-white/10",
      headerTitle: "text-white font-bold",
      headerSubtitle: "text-gray-400",
      socialButtonsBlockButtonText: "text-white font-semibold flex-1",
      socialButtonsBlockButton: "bg-white/5 border border-white/10 hover:bg-white/10",
      formFieldLabel: "text-gray-300 font-semibold",
      formFieldInput: "text-white bg-black/50 border border-white/10",
      footerActionText: "text-gray-400",
      footerActionLink: "text-medical-cyan hover:text-cyan-300 font-semibold",
      formButtonPrimary: "bg-medical-cyan hover:bg-cyan-400 text-white font-bold",
      dividerText: "text-gray-500",
      dividerLine: "bg-white/10",
      identityPreviewText: "text-white",
    }
  }}
>
      <html lang="en" suppressHydrationWarning>
        <body 
          className={`${inter.className} min-h-screen bg-medical-black text-white antialiased`}
          suppressHydrationWarning
        >
          <I18nProvider>
             <Layout>{children}</Layout>
             <Toaster theme="dark" richColors position="bottom-center" />
          </I18nProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
