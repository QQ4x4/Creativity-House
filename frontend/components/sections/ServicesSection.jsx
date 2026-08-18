'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import CatalogCourseCard from '@/components/catalog/CatalogCourseCard';
import { getPublicCourse, localizeCatalogCourse } from '@/lib/catalog/data';
import {
  fadeUp,
  motionGpu,
  motionViewport,
  staggerContainer,
} from '@/lib/motion';

const FEATURED_SLUGS = [
  'pmp-live-training',
  'pmp-recorded-program',
  'pmp-exam-simulator-pro',
];

export default function ServicesSection({ dictionary, lang }) {
  const labels = dictionary.catalog;
  const featured = FEATURED_SLUGS.map((slug) =>
    localizeCatalogCourse(getPublicCourse(slug), lang)
  ).filter(Boolean);

  return (
    <section id="services" className="bg-slate-50 py-24 transition-colors duration-300 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={motionViewport}
          className={`mb-16 text-center ${motionGpu}`}
        >
          <motion.div
            className="mb-4 inline-block rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-sm font-semibold text-plum-800 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-200"
            whileHover={{ scale: 1.05 }}
          >
            {labels.featuredBadge}
          </motion.div>
          <h2 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            {labels.featuredTitle}{' '}
            <span className="bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent">
              {labels.featuredTitleHighlight}
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            {labels.featuredSubtitle}
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={motionViewport}
        >
          {featured.map((course, idx) => (
            <CatalogCourseCard
              key={course.slug}
              course={course}
              lang={lang}
              labels={labels}
              index={idx}
            />
          ))}
        </motion.div>

        <div className="mt-14 flex justify-center">
          <Link
            href={`/${lang}/courses`}
            className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-8 text-sm font-semibold text-white shadow-[0_0_28px_rgba(168,85,247,0.4)] transition-all duration-300 hover:from-plum-600 hover:to-plum-400 hover:shadow-[0_0_36px_rgba(168,85,247,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            {labels.exploreAll}
            <ArrowRight className="h-4 w-4 chevron-flip" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
