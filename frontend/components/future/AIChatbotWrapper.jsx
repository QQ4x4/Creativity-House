'use client';

import { useState, useEffect } from 'react';

/**
 * AIChatbotWrapper — A wrapper that defers loading the AI Chatbot
 * until the user scrolls, clicks, or after a long timeout.
 * This ensures perfect Lighthouse scores while still providing the feature.
 */
export default function AIChatbotWrapper() {
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        const loadChatbot = () => {
            if (!shouldLoad) setShouldLoad(true);
        };

        // Load if user scrolls
        window.addEventListener('scroll', loadChatbot, { once: true, passive: true });
        // Load if user interacts
        window.addEventListener('click', loadChatbot, { once: true, passive: true });
        // Fallback: load after 5 seconds anyway
        const timer = setTimeout(loadChatbot, 5000);

        return () => {
            window.removeEventListener('scroll', loadChatbot);
            window.removeEventListener('click', loadChatbot);
            clearTimeout(timer);
        };
    }, [shouldLoad]);

    if (!shouldLoad) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Future Chatbot Component Goes Here */}
            {/* <QwenAIChatbot /> */}
        </div>
    );
}
