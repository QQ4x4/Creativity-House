'use client';

import { useState } from 'react';

/**
 * StripeCheckoutWrapper — Defers loading @stripe/stripe-js
 * until the user actually clicks a "Buy" or "Subscribe" button.
 */
export default function StripeCheckoutWrapper({ productId }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleCheckout = async () => {
        setIsLoading(true);
        try {
            // Dynamically import stripe only when needed
            const { loadStripe } = await import('@stripe/stripe-js');
            const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY);
            
            // Call API to create checkout session
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });
            const session = await res.json();
            
            // Redirect
            await stripe.redirectToCheckout({ sessionId: session.id });
        } catch (error) {
            console.error('Checkout failed', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button 
            onClick={handleCheckout} 
            disabled={isLoading}
            className="w-full px-8 py-4 bg-gradient-to-r from-plum-700 to-plum-500 text-white rounded-xl font-semibold hover:shadow-xl disabled:opacity-50 transition-all"
        >
            {isLoading ? 'Processing...' : 'Subscribe Now'}
        </button>
    );
}
