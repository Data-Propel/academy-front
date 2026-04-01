import { Link } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  action?: { label: string; onClick: () => void };
}

const fontHeading = "'Libre Franklin', 'Libre Franklin Fallback', 'Poppins', 'Poppins Fallback', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const fontBody = "'Poppins', 'Poppins Fallback', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function PageHeader({ title, subtitle, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 30 }}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div
          style={{
            marginBottom: 12,
            fontFamily: fontBody,
            fontSize: '0.85rem',
            color: 'rgba(242, 242, 242, 0.6)',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {i > 0 && <span style={{ margin: '0 2px' }}>/</span>}
                {crumb.to && !isLast ? (
                  <Link
                    to={crumb.to}
                    style={{
                      color: '#FD6A44',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#f8b81f')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#FD6A44')}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span style={{ color: isLast ? '#F2F2F2' : undefined }}>{crumb.label}</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Title row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: fontHeading,
              fontSize: 42,
              fontWeight: 600,
              color: '#F2F2F2',
              margin: '0 0 4px 0',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontFamily: fontBody,
                fontSize: 16,
                color: 'rgba(242, 242, 242, 0.8)',
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {action && (
          <button
            onClick={action.onClick}
            style={{
              background: '#FD6A44',
              border: 'none',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: 4,
              fontFamily: fontBody,
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e55a36')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#FD6A44')}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
