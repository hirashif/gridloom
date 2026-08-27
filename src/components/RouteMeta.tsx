// Per-route document metadata via React 19 native tags (hoisted to <head>
// automatically, no helmet library). Rendered by route wrappers in App.tsx.

export function RouteMeta({
  title,
  description,
  canonical,
  noindex,
}: {
  title: string
  description?: string
  canonical?: string
  noindex?: boolean
}) {
  return (
    <>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      {canonical ? <link rel="canonical" href={canonical} /> : null}
      {noindex ? <meta name="robots" content="noindex" /> : null}
    </>
  )
}

const SOFTWARE_APPLICATION = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Gridloom',
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web browser',
  url: 'https://gridloom.app',
  description:
    'A bring-your-own-key AI image studio. Run one prompt across every model and seed at once, on your own API keys, in your browser.',
}

// Mirrors the FAQ section on the landing page. If the FAQS array in
// src/pages/LandingPage.tsx changes, update this to match.
const FAQ_ENTRIES: Array<{ q: string; a: string }> = [
  {
    q: 'What does BYOK mean?',
    a: 'Bring Your Own Key. You use your own API accounts (fal.ai now, Google and OpenAI in beta) and the providers bill you directly at their real prices. Gridloom is the workspace on top.',
  },
  {
    q: 'How do I get an API key?',
    a: 'Each provider has a dashboard where you create one in about two minutes. Gridloom links straight to it and shows a short guide the first time. If you can copy and paste, you are set.',
  },
  {
    q: 'Which models can I use?',
    a: 'At launch: fal.ai models including FLUX schnell, FLUX dev, FLUX 1.1 pro, Fast SDXL, and Recraft v3, with Google (Nano Banana) and OpenAI (GPT Image 1) in beta. More get added over time.',
  },
  {
    q: 'What does it cost to run?',
    a: 'Typically $0.003 to $0.05 per image, paid straight to the provider. A heavy day of around 200 images usually lands near $2 to $6. The app shows a running meter so you are never guessing.',
  },
  {
    q: 'What happens to my images and keys?',
    a: 'They stay in your browser (localStorage and IndexedDB). Nothing is uploaded to any server we run, because there is no such server. Clear your browser data and it is all gone. Open devtools and watch the network tab if you want to check.',
  },
  {
    q: 'What if you disappear?',
    a: 'The app is static and client-only, so it keeps working. Your images and prompts live on your machine and export any time. Nothing is held hostage on a server.',
  },
  {
    q: 'Why not just use ChatGPT or Midjourney?',
    a: 'If you make an image now and then, keep them. They give you one model, one frame at a time, for a monthly fee, and they bury or randomize the seed. Gridloom is for repeatable work. It runs the same prompt across several models at once, pins the seed, saves every setting, and costs cents per image on your own keys. When the client asks for that exact look again next month, you have it.',
  },
]

const FAQ_PAGE = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ENTRIES.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

export function LandingJsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_APPLICATION) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_PAGE) }}
      />
    </>
  )
}
