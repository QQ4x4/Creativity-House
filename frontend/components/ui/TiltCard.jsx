'use client';

import React, { useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

export default function TiltCard({ children, className = '', intensity = 15 }) {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [intensity, -intensity]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-intensity, intensity]), { stiffness: 300, damping: 30 });
    const glareOpacity = useSpring(0, { stiffness: 300, damping: 30 });

    const handleMouseMove = useCallback((e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        x.set(px);
        y.set(py);
        glareOpacity.set(0.15);
    }, [x, y, glareOpacity]);

    const handleMouseLeave = useCallback(() => {
        x.set(0);
        y.set(0);
        glareOpacity.set(0);
    }, [x, y, glareOpacity]);

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 1000 }}
            className={className}
        >
            {children}
            <motion.div
                className="pointer-events-none absolute inset-0 rounded-3xl"
                style={{
                    opacity: glareOpacity,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                }}
            />
        </motion.div>
    );
}
