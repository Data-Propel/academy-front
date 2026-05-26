import { Helmet } from 'react-helmet-async';
import { SITE_URL } from './pageMeta';

interface PageHeadProps {
  title: string;
  description?: string;
  /** Short OG/Twitter card text; defaults to `description` when omitted. */
  ogDescription?: string;
  /** Absolute (or root-relative) URL for og:image / twitter:image. */
  ogImage?: string;
  /** Root-relative path for canonical + og:url, e.g. "/register". */
  canonicalPath?: string;
  noIndex?: boolean;
  /** If true, use `title` verbatim; otherwise " — Propel Academy" is appended. */
  raw?: boolean;
}

export default function PageHead({
  title, description, ogDescription, ogImage, canonicalPath, noIndex, raw,
}: PageHeadProps) {
  const full = raw ? title : `${title} — Propel Academy`;
  const ogDesc = ogDescription ?? description;
  const canonical = canonicalPath ? `${SITE_URL}${canonicalPath}` : undefined;
  const image = ogImage
    ? (ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`)
    : undefined;
  return (
    <Helmet>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:site_name" content="Propel Nonprofit Academy" />
      <meta property="og:title" content={full} />
      {ogDesc && <meta property="og:description" content={ogDesc} />}
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:locale" content="es_ES" />
      {image && <meta property="og:image" content={image} />}
      {/* og images are standardized to 1200x630 JPEG (public/og/*.jpg). */}
      {image && <meta property="og:image:type" content="image/jpeg" />}
      {image && <meta property="og:image:width" content="1200" />}
      {image && <meta property="og:image:height" content="630" />}
      {image && <meta property="og:image:alt" content={full} />}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={full} />
      {ogDesc && <meta name="twitter:description" content={ogDesc} />}
      {image && <meta name="twitter:image" content={image} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}
