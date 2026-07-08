'use client';

import Script from 'next/script';
import { scriptsConfig } from '@/config/scripts';

/**
 * Wrapper for all third-party marketing and tracking scripts.
 * Uses next/script with strategy="afterInteractive" or "lazyOnload"
 * to ensure Core Web Vitals are not negatively impacted.
 */
export default function ThirdPartyScripts() {
    return (
        <>
            {/* Meta Pixel (Future) */}
            {scriptsConfig.metaPixelId && (
                <Script
                    id="meta-pixel"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `
                            !function(f,b,e,v,n,t,s)
                            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                            n.queue=[];t=b.createElement(e);t.async=!0;
                            t.src=v;s=b.getElementsByTagName(e)[0];
                            s.parentNode.insertBefore(t,s)}(window, document,'script',
                            'https://connect.facebook.net/en_US/fbevents.js');
                            fbq('init', '${scriptsConfig.metaPixelId}');
                            fbq('track', 'PageView');
                        `,
                    }}
                />
            )}

            {/* Google Tag Manager (Future) */}
            {scriptsConfig.gtmId && (
                <Script
                    id="gtm"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                            })(window,document,'script','dataLayer','${scriptsConfig.gtmId}');
                        `,
                    }}
                />
            )}

            {/* GoHighLevel Webchat (Future) */}
            {scriptsConfig.goHighLevelId && (
                <Script
                    id="gohighlevel-chat"
                    strategy="lazyOnload"
                    src="https://msgsndr.com/js/webchat.js"
                    data-widget-id={scriptsConfig.goHighLevelId}
                />
            )}
        </>
    );
}
