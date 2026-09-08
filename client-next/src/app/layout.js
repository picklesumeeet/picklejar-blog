import { Inter, Playfair_Display, Source_Serif_4 } from "next/font/google";
import { headers } from 'next/headers';
import Script from 'next/script';
import { Suspense } from 'react';
import GoogleAnalyticsTracker from '@/components/analytics/GoogleAnalyticsTracker';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-body",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const gaId = process.env.NEXT_PUBLIC_GA_ID;

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "WalletPickle",
  description: "The best place for sports and finance news.",
  // Google Search Console verification — replace with your actual code from GSC
  // (Property → Ownership verification → HTML tag → copy the content value)
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || undefined,
  },
};

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || undefined;

  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${sourceSerif.variable} font-[family-name:var(--font-ui)] antialiased`}>
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
              nonce={nonce}
            />
            <Script id="gtag-init" strategy="afterInteractive" nonce={nonce}>
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                // send_page_view: false — we manually fire page_view from the
                // GoogleAnalyticsTracker client component on every route change
                // (including the initial one) so SPA navigations are counted.
                gtag('config', '${gaId}', { send_page_view: false });
              `}
            </Script>
            <Suspense fallback={null}>
              <GoogleAnalyticsTracker gaId={gaId} />
            </Suspense>
          </>
        )}
        {children}
      </body>
    </html>
  );
}
