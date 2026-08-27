import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import { useBlobUrls } from './use-blob-urls'

export interface LightboxFrame {
  imageId: string
  caption: string
  alt?: string
}

/**
 * yet-another-react-lightbox over IndexedDB blobs, with mono captions.
 * Imported only from app page modules so it stays out of the landing bundle.
 */
export default function FrameLightbox({
  frames,
  index = 0,
  onClose,
}: {
  frames: LightboxFrame[]
  index?: number
  onClose: () => void
}) {
  const urls = useBlobUrls(frames.map((f) => f.imageId))
  const loaded = frames.filter((f) => urls[f.imageId])
  if (loaded.length === 0) return null
  const slides = loaded.map((f) => ({
    src: urls[f.imageId]!,
    alt: f.alt ?? f.caption,
    description: <span className="font-mono text-xs">{f.caption}</span>,
  }))
  // Index is against the full frame list; clamp to what actually loaded.
  const safeIndex = Math.min(index, slides.length - 1)
  return <Lightbox open close={onClose} index={safeIndex} slides={slides} plugins={[Captions]} />
}
