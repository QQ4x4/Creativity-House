/**
 * Resolve the delivery-mode badge shown on catalog cards and course detail heroes.
 * Prefers admin `defaultMode`, then i18n mode-badge labels, then mode titles, then course.badge.
 *
 * @param {{
 *   defaultMode?: string|null,
 *   default_mode?: string|null,
 *   badge?: string|null,
 *   modes?: Record<string, { badge?: string|null }>|null,
 *   pricingTiers?: Array<{ mode?: string, badge?: string|null }>|null,
 *   pricing_tiers?: Array<{ mode?: string, badge?: string|null }>|null,
 * }} course
 * @param {{
 *   modeBadges?: Record<string, string>,
 *   modes?: Record<string, string>,
 * }} labels
 * @returns {string}
 */
export function resolveDeliveryModeBadge(course, labels = {}) {
  const modeKey = String(
    course?.defaultMode ?? course?.default_mode ?? ''
  )
    .trim()
    .toLowerCase();

  if (modeKey) {
    // 1) Dedicated badge dictionary (card/hero wording)
    const fromBadges = labels?.modeBadges?.[modeKey];
    if (fromBadges) return fromBadges;

    // 2) Delivery-mode toggle labels
    const fromModes = labels?.modes?.[modeKey];
    if (fromModes) return fromModes;

    // 3) Per-mode / tier badge text already on the course payload
    const modeBadge = course?.modes?.[modeKey]?.badge;
    if (modeBadge) return modeBadge;

    const tiers = Array.isArray(course?.pricingTiers)
      ? course.pricingTiers
      : Array.isArray(course?.pricing_tiers)
        ? course.pricing_tiers
        : [];
    const tierBadge = tiers.find((tier) => tier?.mode === modeKey)?.badge;
    if (tierBadge) return tierBadge;

    // 4) Humanize the mode key
    return modeKey
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // Last resort: free-text course badge from admin
  return String(course?.badge || '').trim();
}
