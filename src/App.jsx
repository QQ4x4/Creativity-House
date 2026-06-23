import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
    Menu, X, ChevronRight, Mail, Phone, MapPin,
    Database, Kanban, Cloud, GraduationCap,
    ArrowRight, CheckCircle2, Star, Send,
    Sparkles, Shield, Zap, Users, Award, TrendingUp,
    Sun, Moon,
    Globe
} from 'lucide-react';

const Whatsapp = (props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" {...props}>
        <path d="M12.004 0C5.378 0 .004 5.373.004 12c0 2.112.546 4.17 1.587 5.973L0 24l6.19-1.623A11.966 11.966 0 0012.004 24c6.626 0 12-5.373 12-12s-5.374-12-12-12zm6.753 16.974c-.263.742-1.526 1.349-2.1 1.423-.574.073-1.077.29-3.593-.75-3.218-1.328-5.281-4.6-5.441-4.814-.16-.215-1.293-1.721-1.293-3.284 0-1.563.812-2.33 1.1-2.616.29-.286.63-.357.84-.357.21 0 .42.002.6-.007.19-.009.45-.078.7.525.263.633.9 2.193.978 2.352.078.158.13.342.026.55-.104.21-.157.34-.314.524-.157.185-.33.41-.47.55-.157.15-.32.314-.136.63.184.313.82 1.353 1.76 2.19.144.13.275.25.394.35 1.208 1.01 2.268 1.49 3.09 1.832.262.11.5.21.723.29.3.1.58.083.8-.15.286-.299.7-.769.9-.966.2-.197.4-.167.68-.066.28.1 1.76.83 2.06.98.3.15.5.22.57.35.07.13.07.75-.19 1.49z" />
    </svg>
);


const Facebook = (props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
);

const Instagram = (props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
);

const Linkedin = (props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
    </svg>
);

const Youtube = (props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2a29 29 0 0 0-.46 5.33 29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
    </svg>
);



const heroImage = 'https://image.qwenlm.ai/public_source/a9978d1c-af90-44c3-aaaf-97226269aab7/1fe3d765c-02ca-4602-b412-17d5972f3504.png';
const crmImage = 'https://image.qwenlm.ai/public_source/a9978d1c-af90-44c3-aaaf-97226269aab7/1ae287691-0bb6-43d7-9205-55b61f1ef87f.png';
const cloudImage = 'https://image.qwenlm.ai/public_source/a9978d1c-af90-44c3-aaaf-97226269aab7/10676f836-b021-469a-bb59-b20f9b5324a3.png';
const trainingImage = 'https://image.qwenlm.ai/public_source/a9978d1c-af90-44c3-aaaf-97226269aab7/1080e3060-4bd6-4c8f-8707-0807560d7c6a.png';
const pmImage = 'https://image.qwenlm.ai/public_source/a9978d1c-af90-44c3-aaaf-97226269aab7/12a550b77-0ec2-4a96-9c32-8b2c0d720577.png';

const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Services', href: '#services' },
    { name: 'Projects', href: '#projects' },
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
];

const services = [
    {
        icon: Database,
        title: 'Custom CRM Systems',
        description: 'Tailored customer relationship management solutions that streamline your sales pipeline and boost customer engagement.',
        image: crmImage,
        features: ['Sales Automation', 'Lead Tracking', 'Custom Reports', 'API Integration'],
    },
    {
        icon: Kanban,
        title: 'Project Management',
        description: 'Powerful platforms to plan, track, and deliver projects efficiently with real-time collaboration tools.',
        image: pmImage,
        features: ['Task Management', 'Team Collaboration', 'Progress Tracking', 'Resource Planning'],
    },
    {
        icon: Cloud,
        title: 'Cloud & Business Email',
        description: 'Enterprise-grade AWS cloud infrastructure and professional email solutions for seamless operations.',
        image: cloudImage,
        features: ['AWS Setup', 'Email Hosting', 'Security', '24/7 Support'],
    },
    {
        icon: GraduationCap,
        title: 'Training & Consulting',
        description: 'Expert-led training programs and strategic consulting to empower your team with cutting-edge skills.',
        image: trainingImage,
        features: ['Corporate Training', 'Workshops', '1-on-1 Coaching', 'Certification'],
    },
];

const projects = [
    {
        title: 'Bayan International CRM',
        category: 'CRM Development',
        description: 'A comprehensive CRM solution for a leading international corporation, managing 10,000+ clients.',
        tags: ['React', 'Node.js', 'PostgreSQL'],
    },
    {
        title: 'Leafloat LPMS',
        category: 'Project Management',
        description: 'Lean Project Management System designed for agile teams with real-time collaboration features.',
        tags: ['Vue.js', 'Firebase', 'Tailwind'],
    },
    {
        title: 'AWS Cloud Migration',
        category: 'Cloud Infrastructure',
        description: 'Complete cloud migration for enterprise clients with zero downtime and enhanced security.',
        tags: ['AWS', 'Docker', 'Kubernetes'],
    },
];

const testimonials = [
    {
        name: 'Engineer Rami Abu Bakr',
        role: 'Al Ramz Construction Projects Company | Kingdom of Saudi Arabia',
        content: 'My sincere thanks and appreciation to Dr. Talat and the team accompanying the course. Frankly, it was a very special training course on a personal level. To be honest, the goal was not only to pass the exam and obtain the certificate, but rather my goal was to learn and apply project management in the real world, given our work as engineers and site managers.',
        rating: 5,
    },
    {
        name: 'Dr. Faten Al-Buaishi Al-Kilani',
        role: 'Lecturer at the Faculty of Law, University of Tripoli | Libya',
        content: 'I enrolled in Dr. Talaat Alawady\u2019s training program on professional project management, believing the scope of the information and skills I would receive would be beyond the scope of the program. I wondered what benefits I could gain from a specialty so far removed from this training program, as I had previously believed. I later discovered, while lecturing at law schools in Libyan universities, that I had acquired numerous significant skills that refined my approach to giving and presenting.',
        rating: 5,
    },
    {
        name: 'Faisal Al-Shabahi',
        role: 'Manager, Jeddah Municipality',
        content: 'Many thanks to Trainer Talat Al-Awadi for this course (Professional Project Management). It played a significant role in broadening my understanding and knowledge of project management, addressing real-world scenarios with wisdom and effective management\u2014an approach that yields numerous practical benefits. I also extend my gratitude to the team at the Dar Al-Ibdaa Center for their outstanding efforts, as well as to my fellow trainees; it was a pleasure working and collaborating with them throughout the course.',
        rating: 5,
    },
];

const stats = [
    { value: '40+', label: 'Global Partners', icon: Globe },
    { value: '2K+', label: 'Users Trained', icon: Users },
    { value: '100%', label: 'Client Satisfaction', icon: Star },
    { value: '40K', label: 'professional learners', icon: Award },

];

const features = [
    { icon: Sparkles, title: 'Innovation First', description: 'Cutting-edge solutions tailored to your business needs.' },
    { icon: Shield, title: 'Enterprise Security', description: 'Bank-grade security protocols protecting your data.' },
    { icon: Zap, title: 'Fast Delivery', description: 'Agile methodology ensuring rapid deployment.' },
    { icon: TrendingUp, title: 'Scalable Growth', description: 'Solutions that grow with your business.' },
];

const socialLinks = [
    { icon: Whatsapp, href: "https://wa.me/60312345678" },
    { icon: Facebook, href: "https://www.facebook.com/talaat.alawadhi.33" },
    { icon: Instagram, href: "https://www.instagram.com/the.creativity_house/" },
    { icon: Linkedin, href: "https://www.linkedin.com/in/talaat-alawadhi-%D8%B7%D9%84%D8%B9%D8%AA-%D8%A7%D9%84%D8%B9%D9%88%D8%A7%D8%B6%D9%8A-5b238823?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" },
    { icon: Youtube, href: "https://www.youtube.com/@talaatalawadhi2050" }
];

/* ─── 3D Tilt Card Component ─── */
function TiltCard({ children, className = '', intensity = 15 }) {
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

/* ─── Magnetic Hover Button Component ─── */
function MagneticButton({ children, className = '', ...props }) {
    const ref = useRef(null);
    const x = useSpring(0, { stiffness: 300, damping: 20 });
    const y = useSpring(0, { stiffness: 300, damping: 20 });

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set((e.clientX - centerX) * 0.15);
        y.set((e.clientY - centerY) * 0.15);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ x, y }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}

/* ─── Scroll animation variants ─── */
const fadeUp = {
    hidden: { opacity: 0, y: 60, scale: 0.95 },
    visible: (i = 0) => ({
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 1, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }
    }),
};

const fadeLeft = {
    hidden: { opacity: 0, x: -80 },
    visible: (i = 0) => ({
        opacity: 1, x: 0,
        transition: { duration: 1, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }
    }),
};

const fadeRight = {
    hidden: { opacity: 0, x: 80 },
    visible: (i = 0) => ({
        opacity: 1, x: 0,
        transition: { duration: 1, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }
    }),
};

const scaleUp = {
    hidden: { opacity: 0, scale: 0.7 },
    visible: (i = 0) => ({
        opacity: 1, scale: 1,
        transition: { duration: 1, delay: i * 0.1, type: 'spring', stiffness: 200 }
    }),
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

/* ─── Testimonial Card with 3D Tilt ─── */
function TestimonialCard({ testimonial, idx }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const wordLimit = 130;
    const isLong = testimonial.content.length > wordLimit;

    const displayContent = isExpanded
        ? testimonial.content
        : isLong
            ? testimonial.content.slice(0, wordLimit) + '...'
            : testimonial.content;

    return (
        <motion.div
            custom={idx}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
        >
            <TiltCard className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-2xl dark:shadow-slate-950/20 transition-all duration-500 flex flex-col justify-between h-full" intensity={8}>
                <div>
                    <div className="flex gap-1 mb-6">
                        {[...Array(testimonial.rating)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0, rotate: -180 }}
                                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.15 + i * 0.08, type: 'spring', stiffness: 300 }}
                            >
                                <Star className="w-5 h-5 fill-gold-400 text-gold-400" />
                            </motion.div>
                        ))}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed transition-all duration-300 text-sm">
                        "{displayContent}"
                    </p>
                    {isLong && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-plum-600 dark:text-plum-400 font-semibold hover:underline mb-6 cursor-pointer focus:outline-none flex items-center gap-1 text-sm group"
                        >
                            <span className="group-hover:tracking-wide transition-all duration-300">{isExpanded ? 'Read Less' : 'Learn More'}</span>
                            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-700 mt-auto">
                    <motion.div
                        whileHover={{ scale: 1.15, rotate: 5 }}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-plum-600 to-gold-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg"
                    >
                        {testimonial.name.charAt(0)}
                    </motion.div>
                    <div>
                        <div className="font-bold text-slate-900 dark:text-white leading-tight text-sm">{testimonial.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{testimonial.role}</div>
                    </div>
                </div>
            </TiltCard>
        </motion.div>
    );
}

export default function App() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [formStatus, setFormStatus] = useState('');
    const [hoveredNav, setHoveredNav] = useState(null);
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme');
            if (saved) return saved === 'dark';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const toggleTheme = () => setIsDark((prev) => !prev);

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormStatus('sending');
        setTimeout(() => {
            setFormStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
            setTimeout(() => setFormStatus(''), 3000);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white overflow-x-hidden">
            {/* Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg shadow-lg dark:shadow-slate-950/50' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <motion.a
                            href="#home"
                            className="flex items-center group"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <img
                                src="/logo.png"
                                alt="Creativity House Logo"
                                className={`h-16 w-auto object-contain transition-all duration-300 ${scrolled ? 'dark:brightness-0 dark:invert' : 'brightness-0 invert'
                                    }`}
                            />
                        </motion.a>

                        <div className="hidden md:flex items-center gap-8">
                            <div
                                className="flex items-center gap-8"
                                onMouseLeave={() => setHoveredNav(null)}
                            >
                                {navLinks.map((link) => (
                                    <motion.a
                                        key={link.name}
                                        href={link.href}
                                        onMouseEnter={() => setHoveredNav(link.name)}
                                        className={`font-medium transition-all duration-300 relative ${scrolled ? 'text-slate-700 dark:text-slate-300' : 'text-white'} ${hoveredNav === link.name ? '!text-gold-400' : ''}`}
                                        animate={{
                                            scale: hoveredNav === null ? 1 : hoveredNav === link.name ? 1.2 : 0.9,
                                            filter: hoveredNav === null ? 'blur(0px)' : hoveredNav === link.name ? 'blur(0px)' : 'blur(3px)',
                                            opacity: hoveredNav === null ? 1 : hoveredNav === link.name ? 1 : 0.4,
                                        }}
                                        transition={{ duration: 0, ease: 'easeOut' }}
                                    >
                                        {link.name}
                                        {hoveredNav === link.name && (
                                            <motion.div
                                                layoutId="navUnderline"
                                                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold-400 rounded-full"
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                transition={{ duration: 0.25 }}
                                            />
                                        )}
                                    </motion.a>
                                ))}
                            </div>
                            <motion.button
                                onClick={toggleTheme}
                                whileHover={{ scale: 1.2, rotate: 180 }}
                                whileTap={{ scale: 0.8 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                                className={`p-2.5 rounded-full transition-all cursor-pointer ${scrolled
                                    ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    : 'text-white hover:bg-white/20'
                                    }`}
                                aria-label="Toggle theme"
                            >
                                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </motion.button>
                            <MagneticButton>
                                <a href="#contact" className="px-6 py-2.5 bg-gradient-to-r from-plum-700 to-plum-500 text-white rounded-full font-medium hover:shadow-lg hover:shadow-plum-500/30 transition-all hover:scale-105 inline-block">
                                    Get Started
                                </a>
                            </MagneticButton>
                        </div>

                        <div className="flex items-center gap-2 md:hidden">
                            <motion.button
                                onClick={toggleTheme}
                                whileHover={{ scale: 1.2, rotate: 180 }}
                                whileTap={{ scale: 0.8 }}
                                className={`p-2.5 rounded-full transition-all cursor-pointer ${scrolled
                                    ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    : 'text-white hover:bg-white/20'
                                    }`}
                                aria-label="Toggle theme"
                            >
                                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </motion.button>
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="cursor-pointer">
                                {isMenuOpen ? (
                                    <X className={`w-6 h-6 ${scrolled ? 'text-slate-900 dark:text-white' : 'text-white'}`} />
                                ) : (
                                    <Menu className={`w-6 h-6 ${scrolled ? 'text-slate-900 dark:text-white' : 'text-white'}`} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden bg-white dark:bg-slate-900 border-t dark:border-slate-700"
                        >
                            <div className="px-4 py-4 space-y-2">
                                {navLinks.map((link, idx) => (
                                    <motion.a
                                        key={link.name}
                                        href={link.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        initial={{ opacity: 0, x: -30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.08 }}
                                        className="block px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:pl-6 transition-all duration-300"
                                    >
                                        {link.name}
                                    </motion.a>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Hero Section */}
            <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-slate-900">
                <div className="absolute inset-0">
                    <motion.img
                        src={heroImage}
                        alt="Hero"
                        className="w-full h-full object-cover opacity-40"
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-plum-900/80 to-plum-950/80" />
                </div>

                {/* Floating particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-full bg-gold-400/30"
                            style={{
                                left: `${15 + i * 15}%`,
                                top: `${20 + (i % 3) * 25}%`,
                            }}
                            animate={{
                                y: [-20, 20, -20],
                                x: [-10, 10, -10],
                                opacity: [0.2, 0.6, 0.2],
                                scale: [1, 1.5, 1],
                            }}
                            transition={{
                                duration: 4 + i,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: i * 0.5,
                            }}
                        />
                    ))}
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <motion.div
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm mb-6"
                                whileHover={{ scale: 1.05, borderColor: 'rgba(212,175,55,0.5)' }}
                            >
                                <motion.div
                                    animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <Sparkles className="w-4 h-4 text-gold-400" />
                                </motion.div>
                                <span>Malaysia's Leading IT Solutions Provider</span>
                            </motion.div>

                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
                                <motion.span
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.8 }}
                                    className="inline-block"
                                >
                                    Building Digital
                                </motion.span>
                                <motion.span
                                    className="block bg-gradient-to-r from-plum-400 to-gold-400 bg-clip-text text-transparent"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.8 }}
                                >
                                    Excellence
                                </motion.span>
                            </h1>

                            <motion.p
                                className="text-lg text-slate-300 mb-8 max-w-xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7, duration: 0.8 }}
                            >
                                We craft innovative CRM systems, project management platforms, and cloud solutions that transform businesses and drive growth.
                            </motion.p>

                            <motion.div
                                className="flex flex-wrap gap-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.9, duration: 0.6 }}
                            >
                                <MagneticButton>
                                    <a href="#services" className="px-8 py-4 bg-gradient-to-r from-plum-700 to-plum-500 text-white rounded-full font-semibold hover:shadow-2xl hover:shadow-plum-500/50 transition-all flex items-center gap-2 hover:gap-3 group">
                                        Explore Services <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </a>
                                </MagneticButton>
                                <MagneticButton>
                                    <a href="#contact" className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-full font-semibold hover:bg-white/20 hover:border-gold-400/50 transition-all">
                                        Contact Us
                                    </a>
                                </MagneticButton>
                            </motion.div>


                            <motion.div
                                className="flex items-center gap-8 mt-12 pt-8 border-t border-white/20"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.1, duration: 0.8 }}
                            >
                                {[
                                    { val: '50+', lab: 'Projects' },
                                    { val: '20+', lab: 'Clients' },
                                    { val: '4+', lab: 'Years' },
                                ].map((s, i) => (
                                    <motion.div
                                        key={i}
                                        whileHover={{ scale: 1.1, y: -5 }}
                                        transition={{ type: 'spring', stiffness: 400 }}
                                    >
                                        <div className="text-3xl font-bold text-white">{s.val}</div>
                                        <div className="text-sm text-slate-400">{s.lab}</div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.7, rotateY: -15 }}
                            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="hidden lg:block"
                        >
                            <TiltCard className="relative" intensity={10}>
                                <motion.div
                                    className="absolute -inset-4 bg-gradient-to-r from-plum-700 to-plum-500 rounded-3xl blur-3xl opacity-30"
                                    animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.05, 1] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                />
                                <img src={crmImage} alt="CRM Dashboard" className="relative rounded-2xl shadow-2xl" />
                            </TiltCard>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-20 bg-white dark:bg-slate-900">
                <motion.div
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, idx) => (
                            <motion.div
                                key={idx}
                                custom={idx}
                                variants={scaleUp}
                                whileHover={{ scale: 1.1, y: -10 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                className="text-center group cursor-pointer"
                            >
                                <motion.div
                                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-plum-100 to-gold-100 dark:from-plum-900/40 dark:to-gold-900/40 mb-4 group-hover:shadow-lg group-hover:shadow-plum-500/20 transition-shadow"
                                    whileHover={{ rotate: [0, -10, 10, 0] }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <stat.icon className="w-7 h-7 text-plum-600 dark:text-plum-400 group-hover:scale-110 transition-transform" />
                                </motion.div>
                                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent mb-2">
                                    {stat.value}
                                </div>
                                <div className="text-slate-600 dark:text-slate-400 font-medium group-hover:text-plum-600 dark:group-hover:text-gold-400 transition-colors">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* Services Section */}
            <section id="services" className="py-24 bg-slate-50 dark:bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <motion.div
                            className="inline-block px-4 py-1.5 rounded-full bg-plum-100 dark:bg-plum-900/30 text-plum-700 dark:text-plum-400 text-sm font-semibold mb-4"
                            whileHover={{ scale: 1.05 }}
                        >
                            OUR SERVICES
                        </motion.div>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                            What We <span className="bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent">Offer</span>
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                            Comprehensive IT solutions designed to elevate your business to the next level.
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid md:grid-cols-2 gap-8"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.1 }}
                    >
                        {services.map((service, idx) => (
                            <motion.div
                                key={idx}
                                custom={idx}
                                variants={idx % 2 === 0 ? fadeLeft : fadeRight}
                            >
                                <TiltCard
                                    className="relative group bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl dark:shadow-slate-950/30 transition-all duration-500"
                                    intensity={6}
                                >
                                    <div className="relative h-64 overflow-hidden">
                                        <motion.img
                                            src={service.image}
                                            alt={service.title}
                                            className="w-full h-full object-cover"
                                            whileHover={{ scale: 1.1 }}
                                            transition={{ duration: 0.7 }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                                        <motion.div
                                            className="absolute top-6 left-6 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30"
                                            whileHover={{ rotate: 360, scale: 1.1 }}
                                            transition={{ duration: 0.6 }}
                                        >
                                            <service.icon className="w-7 h-7 text-white" />
                                        </motion.div>
                                    </div>

                                    <div className="p-8">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-plum-600 dark:group-hover:text-gold-400 transition-colors">{service.title}</h3>
                                        <p className="text-slate-600 dark:text-slate-400 mb-6">{service.description}</p>

                                        <div className="grid grid-cols-2 gap-3">
                                            {service.features.map((feature, fIdx) => (
                                                <motion.div
                                                    key={fIdx}
                                                    className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 hover:text-plum-700 dark:hover:text-gold-400 transition-colors"
                                                    whileHover={{ x: 5 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <CheckCircle2 className="w-4 h-4 text-plum-600 dark:text-plum-400 flex-shrink-0" />
                                                    <span>{feature}</span>
                                                </motion.div>
                                            ))}
                                        </div>

                                        <motion.button
                                            className="mt-6 flex items-center gap-2 text-plum-600 dark:text-plum-400 font-semibold"
                                            whileHover={{ x: 5, gap: '12px' }}
                                        >
                                            Learn More <ChevronRight className="w-5 h-5" />
                                        </motion.button>
                                    </div>
                                </TiltCard>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Projects Section */}
            <section id="projects" className="py-24 bg-white dark:bg-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <motion.div
                            className="inline-block px-4 py-1.5 rounded-full bg-gold-100 dark:bg-plum-900/30 text-plum-700 dark:text-gold-400 text-sm font-semibold mb-4"
                            whileHover={{ scale: 1.05 }}
                        >
                            OUR WORK
                        </motion.div>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                            Featured <span className="bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent">Projects</span>
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                            Real solutions delivering real results for our clients.
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid md:grid-cols-3 gap-8"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                    >
                        {projects.map((project, idx) => (
                            <motion.div
                                key={idx}
                                custom={idx}
                                variants={fadeUp}
                            >
                                <TiltCard
                                    // 1. MUST HAVE overflow-hidden so the "water" doesn't show outside the bottom before hovering
                                    className="relative group bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 cursor-pointer h-full overflow-hidden"
                                    intensity={10}
                                >
                                    {/* 2. THE WATER EFFECT: Starts pushed down (translate-y-full) and slides up on hover */}
                                    {/* Using duration-500 ease-out makes it fast but smooth as it finishes filling */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-plum-700 to-plum-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out pointer-events-none" />

                                    {/* 3. The Gold Glow: Still fades in smoothly to complement the water fill */}
                                    <motion.div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out pointer-events-none"
                                        style={{
                                            background: 'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.15) 0%, transparent 60%)',
                                        }}
                                    />

                                    {/* 4. Your text content safely on top */}
                                    <div className="relative z-10">
                                        <div className="text-sm font-semibold text-plum-600 dark:text-plum-400 group-hover:text-plum-200 mb-3 transition-colors">
                                            {project.category}
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-white mb-4 transition-colors">
                                            {project.title}
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400 group-hover:text-white/90 mb-6 transition-colors">
                                            {project.description}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {project.tags.map((tag, tIdx) => (
                                                <motion.span
                                                    key={tIdx}
                                                    className="px-3 py-1 bg-white/80 dark:bg-slate-700 group-hover:bg-white/20 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors"
                                                    whileHover={{ scale: 1.1, y: -2 }}
                                                >
                                                    {tag}
                                                </motion.span>
                                            ))}
                                        </div>

                                        <motion.div
                                            className="flex items-center gap-2 text-plum-600 dark:text-plum-400 group-hover:text-white font-semibold"
                                            whileHover={{ x: 5 }}
                                        >
                                            View Case Study <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </motion.div>
                                    </div>
                                </TiltCard>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* About / Features Section */}
            <section id="about" className="py-24 bg-gradient-to-br from-slate-900 via-plum-900 to-plum-950 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <motion.div
                        className="absolute top-0 left-1/4 w-96 h-96 bg-plum-500 rounded-full blur-3xl"
                        animate={{ x: [-30, 30, -30], y: [-20, 20, -20] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold-500 rounded-full blur-3xl"
                        animate={{ x: [30, -30, 30], y: [20, -20, 20] }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <motion.div
                            className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-semibold mb-4 border border-white/20"
                            whileHover={{ scale: 1.05, borderColor: 'rgba(212,175,55,0.5)' }}
                        >
                            WHY CHOOSE US
                        </motion.div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            Built for <span className="bg-gradient-to-r from-plum-400 to-gold-400 bg-clip-text text-transparent">Success</span>
                        </h2>
                        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                            We combine technical expertise with business insight to deliver solutions that matter.
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                    >
                        {features.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                custom={idx}
                                variants={scaleUp}
                            >
                                <TiltCard
                                    // 👇 1. Changed duration-500 to duration-200 here for a faster background fade
                                    className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-gold-400/30 transition-all duration-200 h-full"
                                    intensity={12}
                                >
                                    <motion.div
                                        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-plum-600 to-gold-500 flex items-center justify-center mb-6"
                                        whileHover={{ rotate: [0, -10, 10, -5, 0], scale: 1.1 }}
                                        // 👇 2. Changed duration: 0.5 to duration: 0.2 here for a faster icon wiggle
                                        transition={{ duration: 0.5 }}
                                    >
                                        <feature.icon className="w-7 h-7 text-white" />
                                    </motion.div>
                                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                    <p className="text-slate-300 text-sm">{feature.description}</p>
                                </TiltCard>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-24 bg-slate-50 dark:bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <motion.div
                            className="inline-block px-4 py-1.5 rounded-full bg-plum-100 dark:bg-plum-900/30 text-plum-700 dark:text-plum-400 text-sm font-semibold mb-4"
                            whileHover={{ scale: 1.05 }}
                        >
                            TESTIMONIALS
                        </motion.div>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                            What Our <span className="bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent">Clients Say</span>
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-6 items-start max-w-7xl mx-auto">
                        {testimonials.map((testimonial, idx) => (
                            <TestimonialCard key={idx} testimonial={testimonial} idx={idx} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-24 bg-white dark:bg-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12">
                        <motion.div
                            variants={fadeLeft}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            <motion.div
                                className="inline-block px-4 py-1.5 rounded-full bg-plum-100 dark:bg-plum-900/30 text-plum-700 dark:text-plum-400 text-sm font-semibold mb-4"
                                whileHover={{ scale: 1.05 }}
                            >
                                GET IN TOUCH
                            </motion.div>
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                                Let's Build Something <span className="bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent">Amazing</span>
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">
                                Ready to transform your business? Reach out and let's discuss how we can help you achieve your goals.
                            </p>

                            <div className="space-y-6">
                                {[
                                    { icon: Mail, label: 'Email Us', value: 'info@creativity-house.com', href: 'mailto:info@creativity-house.com', iconBg: 'bg-plum-100 dark:bg-plum-900/30', iconColor: 'text-plum-600 dark:text-plum-400' },
                                    { icon: Phone, label: 'Call Us', value: '+60 3-1234 5678', href: null, iconBg: 'bg-gold-100 dark:bg-plum-900/30', iconColor: 'text-plum-600 dark:text-gold-400' },
                                    { icon: MapPin, label: 'Visit Us', value: 'Kuala Lumpur, Malaysia', href: null, iconBg: 'bg-plum-100 dark:bg-plum-900/30', iconColor: 'text-plum-600 dark:text-plum-400' },
                                ].map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        className="flex items-start gap-4 group cursor-pointer"
                                        whileHover={{ x: 10 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                    >
                                        <motion.div
                                            className={`w-12 h-12 rounded-2xl ${item.iconBg} flex items-center justify-center flex-shrink-0`}
                                            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                                            transition={{ duration: 0.4 }}
                                        >
                                            <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                                        </motion.div>
                                        <div>
                                            <div className="font-semibold text-slate-900 dark:text-white group-hover:text-plum-600 dark:group-hover:text-gold-400 transition-colors">{item.label}</div>
                                            {item.href ? (
                                                <a href={item.href} className="text-slate-600 dark:text-slate-400 hover:text-plum-600 dark:hover:text-plum-400 transition-colors">
                                                    {item.value}
                                                </a>
                                            ) : (
                                                <div className="text-slate-600 dark:text-slate-400">{item.value}</div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.form
                            variants={fadeRight}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            onSubmit={handleSubmit}
                            className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 md:p-10"
                        >
                            <div className="space-y-5">
                                {[
                                    { label: 'Full Name', type: 'text', key: 'name', placeholder: 'John Doe' },
                                    { label: 'Email Address', type: 'email', key: 'email', placeholder: 'john@company.com' },
                                    { label: 'Subject', type: 'text', key: 'subject', placeholder: 'How can we help?' },
                                ].map((field, idx) => (
                                    <motion.div
                                        key={field.key}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.1 }}
                                    >
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{field.label}</label>
                                        <input
                                            type={field.type}
                                            required
                                            value={formData[field.key]}
                                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-plum-500 focus:ring-2 focus:ring-plum-500/20 outline-none transition-all bg-white dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 hover:border-plum-300 dark:hover:border-plum-600"
                                            placeholder={field.placeholder}
                                        />
                                    </motion.div>
                                ))}

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Message</label>
                                    <textarea
                                        required
                                        rows="4"
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-plum-500 focus:ring-2 focus:ring-plum-500/20 outline-none transition-all bg-white dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 resize-none hover:border-plum-300 dark:hover:border-plum-600"
                                        placeholder="Tell us about your project..."
                                    />
                                </motion.div>

                                <MagneticButton>
                                    <motion.button
                                        type="submit"
                                        disabled={formStatus === 'sending'}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full px-8 py-4 bg-gradient-to-r from-plum-700 to-plum-500 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-plum-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                                    >
                                        {formStatus === 'sending' ? (
                                            <motion.span
                                                animate={{ opacity: [1, 0.5, 1] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            >
                                                Sending...
                                            </motion.span>
                                        ) : formStatus === 'success' ? (
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="flex items-center gap-2"
                                            >
                                                <CheckCircle2 className="w-5 h-5" /> Message Sent!
                                            </motion.span>
                                        ) : (
                                            <>
                                                Send Message <Send className="w-5 h-5" />
                                            </>
                                        )}
                                    </motion.button>
                                </MagneticButton>
                            </div>
                        </motion.form>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 dark:bg-slate-950 text-white pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        className="grid md:grid-cols-4 gap-12 mb-12"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.1 }}
                    >
                        <motion.div className="md:col-span-2" variants={fadeUp}>
                            <div className="flex items-center mb-6">
                                <img
                                    src="/logo.png"
                                    alt="Creativity House Logo"
                                    className="h-16 w-auto object-contain brightness-0 invert"
                                />
                            </div>
                            <p className="text-slate-400 mb-6 max-w-md">
                                Empowering businesses with innovative IT solutions, custom software, and expert training since 2015.
                            </p>
                            <div className="flex gap-3">
                                {socialLinks.map(({ icon: Icon, href }, idx) => (
                                    <motion.a
                                        key={idx}
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        // 👇 Changed transition-all to transition-colors below
                                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-gradient-to-br hover:from-plum-700 hover:to-plum-500 flex items-center justify-center transition-colors"
                                        whileHover={{ scale: 1.2, y: -5, rotate: 5 }}
                                        whileTap={{ scale: 0.9 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </motion.a>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div variants={fadeUp} custom={1}>
                            <h4 className="font-bold mb-4">Services</h4>
                            <ul className="space-y-2 text-slate-400">
                                {['CRM Systems', 'Project Management', 'Cloud Solutions', 'Training'].map((item, idx) => (
                                    <motion.li key={idx} whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>
                                        <a href="#services" className="hover:text-gold-400 transition-colors">{item}</a>
                                    </motion.li>
                                ))}
                            </ul>
                        </motion.div>

                        <motion.div variants={fadeUp} custom={2}>
                            <h4 className="font-bold mb-4">Contact</h4>
                            <ul className="space-y-2 text-slate-400">
                                <li>info@creativity-house.com</li>
                                <li>+60 3-1234 5678</li>
                                <li>Kuala Lumpur, Malaysia</li>
                            </ul>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="text-slate-400 text-sm">
                            © 2026 Creativity House Sdn Bhd. All rights reserved.
                        </div>
                        <div className="flex gap-6 text-sm text-slate-400">
                            <motion.a href="#" className="hover:text-white transition-colors" whileHover={{ y: -2 }}>Privacy Policy</motion.a>
                            <motion.a href="#" className="hover:text-white transition-colors" whileHover={{ y: -2 }}>Terms of Service</motion.a>
                        </div>
                    </motion.div>
                </div>
            </footer>
        </div>
    );
}
