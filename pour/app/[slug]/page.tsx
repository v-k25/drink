import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MarketingPage } from '@/components/marketing-page'
import { marketingPages, marketingSlugs } from '@/lib/marketing-pages'

type PageProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return marketingSlugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = marketingPages[slug]
  if (!page) return {}

  return {
    title: `${page.eyebrow.split('·')[0].trim()} | The Sip Society`,
    description: page.intro,
    alternates: { canonical: `/${slug}` },
  }
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const data = marketingPages[slug]
  if (!data) notFound()

  return <MarketingPage data={data} />
}
