/**
 * Accessible FAQ accordion — uses native <details>/<summary>
 * so answers are present in the server HTML for crawlers.
 *
 * @param {{
 *   title?: string,
 *   items: Array<{ question: string, answer: string }>,
 *   className?: string,
 * }} props
 */
export default function FaqSection({ title, items = [], className = '' }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <section
      className={`mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 ${className}`}
      aria-labelledby={title ? 'seo-faq-heading' : undefined}
    >
      {title ? (
        <h2
          id="seo-faq-heading"
          className="mb-8 text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl"
        >
          {title}
        </h2>
      ) : null}

      <div className="mx-auto max-w-3xl space-y-3">
        {items.map((item, index) => (
          <details
            key={`${index}-${item.question}`}
            className="group rounded-2xl border border-gray-200 bg-white px-5 py-1 open:shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <summary className="cursor-pointer list-none py-4 text-base font-semibold text-gray-900 marker:content-none dark:text-white [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-4">
                <span>{item.question}</span>
                <span
                  aria-hidden
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-plum-200 text-plum-700 transition group-open:rotate-45 dark:border-gold-400/40 dark:text-gold-300"
                >
                  +
                </span>
              </span>
            </summary>
            <div className="border-t border-gray-100 pb-4 pt-3 text-sm leading-relaxed text-gray-600 dark:border-white/10 dark:text-gray-300">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
