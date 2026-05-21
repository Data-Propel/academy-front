import { useParams, useSearchParams } from 'react-router-dom';
import FormRenderer from '../../components/FormRenderer/FormRenderer';
import PageHead from '../../utils/PageHead';

export default function FormPage() {
  const { slug } = useParams();
  console.log('[FormPage]', slug);
  const [searchParams] = useSearchParams();

  // Extract all URL query params as hidden fields
  const hiddenFields: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    hiddenFields[key] = value;
  });

  if (!slug) return null;

  return (
    <>
      <PageHead title="Formulario" noIndex />
      <FormRenderer slug={slug} hiddenFields={hiddenFields} />
    </>
  );
}
