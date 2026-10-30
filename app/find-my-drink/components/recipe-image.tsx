'use client'

import { useState } from 'react'
import { imageFor } from '../recipe'
import type { RecipeRow } from '../queries'

export default function RecipeImage({ row, className, width, height }: {
  row: Pick<RecipeRow, 'imageUrl' | 'imageAlt' | 'baseSpirit' | 'name'>; className?: string; width: number; height: number
}) {
  const [failed, setFailed] = useState(false)
  const image = imageFor(failed ? null : row.imageUrl, row.imageAlt, row.baseSpirit, row.name)
  return <img src={image.src} alt={image.alt} width={width} height={height} className={className} draggable={false} loading="lazy" onError={() => setFailed(true)} />
}
