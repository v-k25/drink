import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MarketingPage } from '@/components/marketing-page'
import { marketingPages, marketingSlugs } from '@/lib/marketing-pages'

export const dynamicParams = false

type PageProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return marketingSlugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = marketingPages[slug]
  if (!page) return {}

  return {
    title: page.eyebrow.split('·')[0].trim(),
    description: page.intro,
    alternates: { canonical: `/${slug}` },
  }
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const data = marketingPages[slug]
  if (!data) notFound()

  const faqStructuredData =
    slug === 'faq'
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: data.sections.map((section) => ({
            '@type': 'Question',
            name: section.label,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${section.title} ${section.body}`,
            },
          })),
        }
      : null

  return (
    <>
      {faqStructuredData ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }} />
      ) : null}
      <MarketingPage data={data} />
    </>
  )
}
