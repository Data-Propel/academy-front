import { useParams, useSearchParams } from 'react-router-dom';
import FormRenderer from '../../components/FormRenderer/FormRenderer';

export default function FormPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();

  // Extract all URL query params as hidden fields
  const hiddenFields: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    hiddenFields[key] = value;
  });

  if (!slug) return null;

  return <FormRenderer slug={slug} hiddenFields={hiddenFields} />;
}
