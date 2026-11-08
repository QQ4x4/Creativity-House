/**
 * Shared marketing SEO blocks (intro, cards, FAQ) — SSR-friendly client or server use.
 * Text comes from dictionaries; no invented stats/prices.
 */

import { CheckCircle2 } from 'lucide-react';
import FaqSection from './FaqSection';
import PmiAtpBadge from '@/components/sections/about/PmiAtpBadge';

export function SeoIntroBlock({ title, body }) {
  if (!body) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pb-4 pt-8 sm:px-6 lg:px-8">
      {title ? (
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{title}</h2>
      ) : null}
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-600 dark:text-gray-300">
        {body}
      </p>
    </section>
  );
}

export function SeoCardGrid({ title, items = [] }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {title ? (
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          {title}
        </h2>
      ) : null}
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.title}
            className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-white/5"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CoursesSeoSections({ dictionary }) {
  const pack = dictionary?.seoPages?.courses;
  if (!pack) return null;
  return (
    <>
      <SeoIntroBlock title={pack.introTitle} body={pack.intro} />
      <SeoCardGrid title={pack.chooseTitle} items={pack.choose || []} />
      <FaqSection title={pack.faqTitle} items={pack.faq || []} />
    </>
  );
}

export function OrganizationsSeoSections({ dictionary }) {
  const labels = dictionary?.organizations;
  if (!labels?.programsIntro) return null;
  return (
    <>
      <SeoIntroBlock title={labels.programsTitle} body={labels.programsIntro} />
      <SeoCardGrid title={null} items={labels.programs || []} />
      <FaqSection title={labels.faqTitle} items={labels.faq || []} />
    </>
  );
}

export function AboutAtpSection({ dictionary }) {
  const atp = dictionary?.about_page?.atp;
  const badgeAlt = dictionary?.about_page?.pmiBadgeAlt;
  if (!atp) return null;
  return (
    <section className="bg-white py-20 transition-colors dark:bg-slate-900" aria-labelledby="about-atp-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-plum-100 bg-gradient-to-br from-slate-50 via-white to-gold-50/40 p-6 shadow-sm sm:p-10 dark:border-white/10 dark:from-slate-950 dark:via-slate-900 dark:to-plum-950/40 dark:shadow-none">
          <div className="grid items-start gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-14">
            <div className="flex justify-center lg:justify-start">
              <PmiAtpBadge
                alt={badgeAlt || ''}
                size={140}
                caption={atp.caption}
              />
            </div>

            <div>
              <span className="inline-flex rounded-full border border-plum-200 bg-plum-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-plum-800 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-200">
                {atp.badge}
              </span>
              <h2
                id="about-atp-heading"
                className="mt-5 max-w-3xl text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl"
              >
                {atp.title}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-600 dark:text-gray-300">
                {atp.description}
              </p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {(atp.points || []).map((point) => (
                  <li
                    key={point}
                    className="flex gap-3 rounded-2xl border border-plum-100/80 bg-white/90 p-5 text-sm leading-relaxed text-gray-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:shadow-none"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-plum-600 dark:text-gold-400"
                      aria-hidden
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
