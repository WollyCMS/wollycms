import type { SatoriNode } from './generate.js';

export interface OgTemplateData {
  title: string;
  description?: string | null;
  siteName: string;
  contentType?: string;
  accentColor?: string;
}

/**
 * Default OG image template using Satori's JSX-like node format.
 * Returns a 1200×630 layout with gradient background, title, description, and branding.
 */
export function defaultTemplate(data: OgTemplateData): SatoriNode {
  const accent = data.accentColor || '#3B82F6';

  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 80px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        fontFamily: 'Inter',
      },
      children: [
        // Top: accent bar + content type badge
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: '16px' },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    width: '48px',
                    height: '4px',
                    backgroundColor: accent,
                    borderRadius: '2px',
                  },
                },
              },
              ...(data.contentType ? [{
                type: 'div' as const,
                props: {
                  style: {
                    fontSize: '16px',
                    color: accent,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '2px',
                    fontWeight: 700,
                  },
                  children: data.contentType,
                },
              }] : []),
            ],
          },
        },
        // Middle: title + description
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap: '20px', flex: '1', justifyContent: 'center' },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: data.title.length > 40 ? '42px' : '52px',
                    fontWeight: 700,
                    color: '#f8fafc',
                    lineHeight: 1.2,
                    maxHeight: '260px',
                    overflow: 'hidden',
                  },
                  children: data.title.length > 80 ? data.title.slice(0, 77) + '...' : data.title,
                },
              },
              ...(data.description ? [{
                type: 'div' as const,
                props: {
                  style: {
                    fontSize: '22px',
                    color: '#94a3b8',
                    lineHeight: 1.4,
                    maxHeight: '66px',
                    overflow: 'hidden',
                  },
                  children: data.description.length > 120 ? data.description.slice(0, 117) + '...' : data.description,
                },
              }] : []),
            ],
          },
        },
        // Bottom: site name branding
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '18px',
                    color: '#64748b',
                    fontWeight: 600,
                  },
                  children: data.siteName,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    width: '100px',
                    height: '3px',
                    background: `linear-gradient(90deg, ${accent}, transparent)`,
                    borderRadius: '2px',
                  },
                },
              },
            ],
          },
        },
      ],
    },
  };
}
