import type { Metadata, Viewport } from "next";
// Font configurations
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import Layout from "@/components/Layout";
import { I18nProvider } from "@/lib/i18n";
import InitialLoader from "@/components/InitialLoader";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#050a0f",
};

export const metadata: Metadata = {
  title: "GlucoTrack - Intelligent Care",
  description: "Monitor and analyze your glucose trends securely.",
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
        colorPrimary: "#00e5ff",
        colorBackground: "#0a0c0e",
        colorInputBackground: "#111418",
        colorText: "#f8fafc",
        colorTextSecondary: "#94a3b8",
        colorInputText: "#f8fafc",
        colorSuccess: "#22c55e",
        colorDanger: "#ef4444",
        colorWarning: "#f59e0b",
      },
      elements: {
        card: "bg-[#0a0c0e] border border-white/10 shadow-3xl rounded-[2rem]",
        modalCloseButton: "text-gray-400 hover:text-white transition-colors",
        headerTitle: "text-white font-black tracking-tight text-2xl uppercase",
        headerSubtitle: "text-gray-400 font-medium tracking-wide",
        socialButtonsBlockButton: "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-medical-cyan/30 transition-all rounded-xl",
        socialButtonsBlockButtonText: "text-white font-bold tracking-tight",
        formFieldLabel: "text-gray-200 font-black uppercase tracking-widest text-[10px] mb-1.5",
        formFieldInput: "bg-black/40 border-white/10 text-white rounded-xl focus:border-medical-cyan/50 focus:ring-medical-cyan/20 transition-all",
        formButtonPrimary: "bg-medical-cyan hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-[11px] h-11 transition-all shadow-lg shadow-cyan-500/20",
        footerActionLink: "text-medical-cyan hover:text-cyan-300 transition-colors font-black uppercase tracking-tighter text-[11px]",
        footerActionText: "text-gray-500 font-medium",
        dividerLine: "bg-white/5",
        dividerText: "text-gray-600 font-bold uppercase tracking-widest text-[9px]",
        userPreviewMainIdentifier: "text-white font-black tracking-tight",
        userPreviewSecondaryIdentifier: "text-gray-400 font-medium",
        userButtonPopoverCard: "bg-[#0a0c0e]/95 backdrop-blur-3xl border border-white/10 shadow-3xl rounded-3xl p-2",
        userButtonPopoverActionButtonText: "text-gray-300 font-bold tracking-tight group-hover:text-white",
        userButtonPopoverActionButtonIcon: "text-medical-cyan",
        navbar: "border-r border-white/5 pr-4",
        navbarLink: "text-gray-300 font-bold hover:text-white transition-all",
        navbarLink__active: "text-medical-cyan",
        navbarButton: "text-gray-300 font-bold hover:text-white transition-all rounded-xl",
        navbarButton__active: "text-medical-cyan bg-medical-cyan/10 border border-medical-cyan/20",
        profileSectionTitle: "text-medical-cyan font-black uppercase tracking-widest text-[10px] border-b border-white/5 pb-2 mb-6",
        profilePage: "p-2",
        profileSection: "mb-8",
        accordionTriggerButton: "text-white font-bold hover:text-medical-cyan transition-colors",
        breadcrumbsItem: "text-gray-400 font-bold hover:text-white transition-colors",
        breadcrumbsSeparator: "text-gray-700",
        scrollBox: "custom-scrollbar",
        pageScrollBox: "p-8",
        rootBox: "font-sans",
        userProfile: {
          rootBox: "bg-transparent",
          navbar: "bg-[#0a0c0e]/50",
        }
      }
    }}
>
      <html lang="en" suppressHydrationWarning>
        <body 
          className={`${inter.className} min-h-screen bg-medical-black text-white antialiased`}
          suppressHydrationWarning
        >
          <InitialLoader>
            <I18nProvider>
               <Layout>{children}</Layout>
               <Toaster theme="dark" richColors position="bottom-center" />
            </I18nProvider>
          </InitialLoader>
        </body>
      </html>
    </ClerkProvider>
  );
}
