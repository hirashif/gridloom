import { useEffect, useState } from 'react'
import { db } from '../../lib/db'

/**
 * Object URLs for a set of IndexedDB image blobs, keyed by image id.
 * URLs are revoked when the id list changes or the component unmounts.
 */
export function useBlobUrls(imageIds: string[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const key = imageIds.join('|')

  useEffect(() => {
    const ids = key ? key.split('|') : []
    let cancelled = false
    const created: string[] = []
    void db.imageBlobs.bulkGet(ids).then((recs) => {
      if (cancelled) return
      const next: Record<string, string> = {}
      recs.forEach((rec, i) => {
        const id = ids[i]
        if (rec && id) {
          const url = URL.createObjectURL(rec.blob)
          created.push(url)
          next[id] = url
        }
      })
      setUrls(next)
    })
    return () => {
      cancelled = true
      for (const url of created) URL.revokeObjectURL(url)
    }
  }, [key])

  return urls
}
