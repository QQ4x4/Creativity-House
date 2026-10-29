/**
 * Shared marketing SEO blocks (intro, cards, FAQ) — SSR-friendly client or server use.
 * Text comes from dictionaries; no invented stats/prices.
 */

import FaqSection from './FaqSection';

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
  if (!atp) return null;
  return (
    <section className="bg-white py-20 transition-colors dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-plum-800 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-200">
          {atp.badge}
        </span>
        <h2 className="mt-5 max-w-3xl text-3xl font-bold text-gray-900 dark:text-white">{atp.title}</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-600 dark:text-gray-300">
          {atp.description}
        </p>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {(atp.points || []).map((point) => (
            <li
              key={point}
              className="rounded-2xl border border-gray-200 bg-slate-50 p-5 text-sm leading-relaxed text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
            >
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
