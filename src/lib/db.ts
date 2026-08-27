import Dexie, { type EntityTable } from 'dexie'
import { nanoid } from 'nanoid'
import { AppError } from './errors'
import type { Generation, ImageBlobRecord, Recipe, Tag } from './types'

const db = new Dexie('gridloom') as Dexie & {
  generations: EntityTable<Generation, 'id'>
  imageBlobs: EntityTable<ImageBlobRecord, 'id'>
  recipes: EntityTable<Recipe, 'id'>
  tags: EntityTable<Tag, 'id'>
}

db.version(1).stores({
  generations: 'id, createdAt, modelId, starred, gridRunId, *tagIds',
  imageBlobs: 'id',
  recipes: 'id, name, updatedAt',
  tags: 'id, &name',
})

export { db }

export interface SaveGenerationInput {
  gen: Omit<Generation, 'id' | 'imageIds' | 'createdAt' | 'starred' | 'tagIds'>
  images: { blob: Blob; width: number; height: number }[]
}

export async function saveGeneration({ gen, images }: SaveGenerationInput): Promise<Generation> {
  const imageRecords: ImageBlobRecord[] = images.map((img) => ({
    id: nanoid(),
    blob: img.blob,
    mimeType: img.blob.type || 'image/png',
    width: img.width,
    height: img.height,
    bytes: img.blob.size,
  }))
  const record: Generation = {
    ...gen,
    id: nanoid(),
    createdAt: Date.now(),
    imageIds: imageRecords.map((r) => r.id),
    starred: false,
    tagIds: [],
  }
  try {
    await db.transaction('rw', db.generations, db.imageBlobs, async () => {
      await db.imageBlobs.bulkAdd(imageRecords)
      await db.generations.add(record)
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'QuotaExceededError') {
      throw new AppError('storage_full', 'Generated, but not saved. Browser storage is full.', {
        hint: 'Free space by deleting old generations in the Library.',
      })
    }
    throw err
  }
  return record
}

/** Find-or-create a tag by name (case-insensitive, stored lowercase). Returns its id. */
export async function ensureTag(name: string): Promise<string> {
  const clean = name.trim().toLowerCase()
  const existing = await db.tags.where('name').equals(clean).first()
  if (existing) return existing.id
  const tag = { id: nanoid(), name: clean, createdAt: Date.now() }
  await db.tags.add(tag)
  return tag.id
}

export async function deleteGenerations(ids: string[]): Promise<void> {
  await db.transaction('rw', db.generations, db.imageBlobs, async () => {
    const gens = await db.generations.bulkGet(ids)
    const imageIds = gens.filter(Boolean).flatMap((g) => g!.imageIds)
    await db.imageBlobs.bulkDelete(imageIds)
    await db.generations.bulkDelete(ids)
  })
}
