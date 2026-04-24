/**
 * SkeletonCard — staggered grid of card-shaped skeleton bones.
 *
 * Used for stat card sections (Dashboard, Attendance, Examination).
 * Matches the real card's border-radius (rounded-[2rem]) and uses the
 * design-token `.skeleton-shimmer` class for the premium shimmer effect.
 *
 * @param {number} count      – number of cards in the grid (default 4)
 * @param {string} gridClass  – Tailwind grid class override
 * @param {string} cardClass  – extra classes on each card bone (height, radius, etc.)
 */
export const SkeletonCard = ({
  count = 4,
  gridClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',
  cardClass = 'rounded-[2rem] h-36 border border-gray-50',
}) => (
  <div className={gridClass}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        style={{ animationDelay: `${i * 0.12}s` }}
        className={`skeleton-shimmer ${cardClass}`}
      />
    ))}
  </div>
);
