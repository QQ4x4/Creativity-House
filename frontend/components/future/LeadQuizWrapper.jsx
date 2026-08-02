'use client';

import React, { Suspense, useState } from 'react';

// Lazy load the actual quiz component
// const LeadQuizModal = React.lazy(() => import('./LeadQuizModal'));

/**
 * LeadQuizWrapper — Defers loading the interactive lead generation quiz
 * until the user clicks the trigger button. Shows a skeleton while loading.
 */
export default function LeadQuizWrapper() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                className="px-6 py-3 bg-white/10 border border-white/20 rounded-full font-medium hover:bg-white/20 transition-all"
            >
                Take the IT Audit Quiz
            </button>

            {isOpen && (
                <Suspense fallback={
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="w-full max-w-lg bg-white rounded-2xl p-8 animate-pulse">
                            <div className="h-8 bg-slate-200 rounded w-3/4 mb-6"></div>
                            <div className="space-y-4">
                                <div className="h-12 bg-slate-200 rounded w-full"></div>
                                <div className="h-12 bg-slate-200 rounded w-full"></div>
                                <div className="h-12 bg-slate-200 rounded w-full"></div>
                            </div>
                        </div>
                    </div>
                }>
                    {/* <LeadQuizModal onClose={() => setIsOpen(false)} /> */}
                </Suspense>
            )}
        </>
    );
}
