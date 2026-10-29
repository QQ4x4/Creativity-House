/**
 * Server-safe JSON-LD script tag.
 * Escapes `<` so the payload cannot break out of the script element.
 */
export default function JsonLd({ data }) {
  if (!data) return null;

  const payload = Array.isArray(data) ? data : [data];
  const json = JSON.stringify(payload.length === 1 ? payload[0] : payload).replace(
    /</g,
    '\\u003c'
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
