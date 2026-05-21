import { Helmet } from 'react-helmet-async';

interface PageHeadProps {
  title: string;
  description?: string;
  noIndex?: boolean;
  /** If true, use `title` verbatim; otherwise " — Propel Academy" is appended. */
  raw?: boolean;
}

export default function PageHead({ title, description, noIndex, raw }: PageHeadProps) {
  const full = raw ? title : `${title} — Propel Academy`;
  return (
    <Helmet>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:site_name" content="Propel Academy" />
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:locale" content="es_ES" />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}
