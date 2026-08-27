import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import { cn } from '../lib/ui'

/**
 * Renders an image from IndexedDB by blob id, managing the object URL lifecycle.
 * Each image develops in on its own load event (opacity + blur, 0.3s ease-print),
 * so grid loads stagger naturally instead of animating a filter across the sheet.
 * The reduced-motion CSS kill-switch collapses the animation to 0.01ms.
 */
export default function BlobImage({ imageId, alt, className }: { imageId: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string>()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let objectUrl: string | undefined
    let cancelled = false
    db.imageBlobs.get(imageId).then((rec) => {
      if (rec && !cancelled) {
        objectUrl = URL.createObjectURL(rec.blob)
        setUrl(objectUrl)
      }
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imageId])

  if (!url) return <div className={cn('animate-pulse bg-paper2', className)} />
  return (
    <img
      src={url}
      alt={alt}
      onLoad={() => setLoaded(true)}
      className={cn(className, loaded ? 'animate-develop' : 'opacity-0')}
    />
  )
}
