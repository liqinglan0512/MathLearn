import { z } from 'zod'
import {
  getEuclidRendererDescriptor,
  isCurrentEuclidRendererRevision,
} from './euclid-renderer-manifest'

export const EUCLID_CONTENT_SCHEMA_VERSION = 1 as const
export const DEFAULT_EUCLID_CONTENT_BASE = '/content/euclid/'

export const EuclidEditorialStatusSchema = z.enum([
  'raw_machine',
  'editor_draft',
  'math_reviewed',
  'published',
])

export const EuclidEntryKindSchema = z.enum([
  'proposition',
  'definition',
  'postulate',
  'common-notion',
])

export const EuclidVisualizationLevelSchema = z.enum([
  'none',
  'concept_illustration',
  'proposition_specific',
  'verified',
])

const EuclidBookNumberSchema = z.number().int().min(1).max(13)
const EuclidEntryIdSchema = z.string().regex(
  /^euclid-(?:[1-9]|1[0-3])-(?:(?:def|post|cn)-)?[1-9]\d*$/,
  'Invalid Euclid entry id',
)
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/)

export const EuclidVisualizationAttestationSchema = z.object({
  reviewId: z.string().trim().min(1),
  reviewerId: z.string().trim().min(1),
  reviewedAt: z.number().int().nonnegative(),
  rendererRevision: z.string().trim().min(1),
  contentHash: Sha256Schema,
}).passthrough()

const EuclidBookSchema = z.object({
  book: EuclidBookNumberSchema,
  roman: z.string().min(1),
  title: z.string().min(1),
  propositions: z.number().int().nonnegative(),
  definitions: z.number().int().nonnegative(),
  foundations: z.number().int().nonnegative(),
  entries: z.number().int().positive(),
}).passthrough()

const EuclidCatalogBookSchema = EuclidBookSchema.extend({
  status: EuclidEditorialStatusSchema,
  indexPath: z.string().regex(/^books\/(?:0[1-9]|1[0-3])\.index\.json$/),
})

const EuclidCorpusSourceSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  translator: z.string().min(1),
  publisher: z.string().min(1),
  year: z.number().int(),
  url: z.string().min(1),
  license: z.string().min(1),
  licenseUrl: z.string().min(1),
  urn: z.string().min(1),
  sha256: Sha256Schema,
}).passthrough()

export const EuclidCatalogSchema = z.object({
  schemaVersion: z.literal(EUCLID_CONTENT_SCHEMA_VERSION),
  corpusId: z.string().min(1),
  status: EuclidEditorialStatusSchema,
  source: EuclidCorpusSourceSchema,
  translationPipeline: z.object({
    pipelineStatus: z.string().min(1),
    editorialStatus: EuclidEditorialStatusSchema,
    statusMeaning: z.string().min(1),
  }).passthrough(),
  counts: z.object({
    books: z.literal(13),
    entries: z.number().int().positive(),
    propositions: z.number().int().positive(),
    semanticBlocks: z.number().int().positive(),
    explicitEdges: z.number().int().nonnegative(),
    sourceIssues: z.number().int().nonnegative(),
  }),
  books: z.array(EuclidCatalogBookSchema).length(13),
}).passthrough().superRefine((catalog, context) => {
  const bookNumbers = new Set(catalog.books.map((book) => book.book))
  if (bookNumbers.size !== 13) {
    context.addIssue({ code: 'custom', message: 'Catalog must contain each Euclid book exactly once', path: ['books'] })
  }
  const total = catalog.books.reduce((sum, book) => sum + book.entries, 0)
  if (total !== catalog.counts.entries) {
    context.addIssue({ code: 'custom', message: 'Catalog book counts do not sum to the corpus entry count', path: ['counts', 'entries'] })
  }
})

const EuclidBookIndexEntrySchema = z.object({
  id: EuclidEntryIdSchema,
  book: EuclidBookNumberSchema,
  number: z.number().int().positive(),
  kind: EuclidEntryKindSchema,
  title: z.string().min(1),
  summary: z.string(),
  status: EuclidEditorialStatusSchema,
  sourceMissing: z.boolean(),
  visualizationLevel: EuclidVisualizationLevelSchema,
  entryPath: z.string().regex(/^entries\/euclid-(?:[1-9]|1[0-3])-(?:(?:def|post|cn)-)?[1-9]\d*\.json$/),
}).passthrough()

export const EuclidBookIndexSchema = z.object({
  schemaVersion: z.literal(EUCLID_CONTENT_SCHEMA_VERSION),
  corpusId: z.string().min(1),
  status: EuclidEditorialStatusSchema,
  book: EuclidBookSchema,
  entries: z.array(EuclidBookIndexEntrySchema),
}).passthrough().superRefine((index, context) => {
  if (index.entries.length !== index.book.entries) {
    context.addIssue({ code: 'custom', message: 'Book index entry count does not match its metadata', path: ['entries'] })
  }
  const ids = new Set<string>()
  for (const [position, entry] of index.entries.entries()) {
    if (entry.book !== index.book.book) {
      context.addIssue({ code: 'custom', message: 'Entry belongs to a different book', path: ['entries', position, 'book'] })
    }
    if (ids.has(entry.id)) {
      context.addIssue({ code: 'custom', message: 'Duplicate entry id in book index', path: ['entries', position, 'id'] })
    }
    ids.add(entry.id)
  }
})

const EuclidBlockSurfaceSchema = z.object({
  id: z.string().min(1),
  role: z.enum([
    'source',
    'machine_translation',
    'historical_source',
    'historical_machine_interpretation',
    'source_gap_notice',
    'provenance_note',
  ]),
  language: z.string().min(1),
  status: z.enum([
    'raw_machine',
    'source_transcription',
    'source_gap',
    'generated_metadata',
  ]),
  text: z.string(),
}).passthrough()

const EuclidSemanticBlockSchema = z.object({
  id: z.string().min(1),
  contentId: EuclidEntryIdSchema,
  revisionId: z.string().min(1),
  order: z.number().int().nonnegative(),
  kind: z.enum([
    'statement',
    'definition',
    'postulate',
    'common_notion',
    'construction',
    'proof_step',
    'conclusion',
    'historical_note',
    'source',
  ]),
  title: z.string().min(1),
  status: EuclidEditorialStatusSchema,
  contentHash: Sha256Schema,
  citations: z.array(EuclidEntryIdSchema),
  surfaces: z.array(EuclidBlockSurfaceSchema).min(1),
}).passthrough()

const EuclidEdgeSchema = z.object({
  id: z.string().min(1),
  sourceContentId: EuclidEntryIdSchema,
  sourceBlockIds: z.array(z.string().min(1)),
  targetContentId: EuclidEntryIdSchema,
  type: z.enum([
    'cites',
    'depends_on',
    'generalizes',
    'equivalent_to',
    'counterexample_to',
    'corrects',
    'alternative_proof_of',
  ]),
  provenance: z.object({
    kind: z.enum(['explicit_source_reference', 'editorial_inference']),
    basis: z.string().min(1),
    sourceUrn: z.string().min(1).optional(),
    sourceUrl: z.string().min(1).optional(),
    sourceLabel: z.string().optional(),
  }).passthrough(),
}).passthrough()

const EuclidRelationSummarySchema = z.object({
  edgeId: z.string().min(1),
  id: EuclidEntryIdSchema,
  book: EuclidBookNumberSchema,
  number: z.number().int().positive(),
  kind: EuclidEntryKindSchema,
  title: z.string().min(1),
  provenance: z.enum(['explicit_source_reference', 'editorial_inference']),
}).passthrough()

const EuclidSourceIssueSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('source_issue'),
  code: z.string().min(1),
  status: z.enum(['open', 'confirmed', 'resolved', 'duplicate', 'rejected']),
  edgeId: z.string().min(1).optional(),
  description: z.string().min(1),
}).passthrough()

export const EuclidVisualizationSchema = z.object({
  level: EuclidVisualizationLevelSchema,
  rendererId: z.string().nullable(),
  rationale: z.string().min(1),
  attestation: EuclidVisualizationAttestationSchema.optional(),
}).passthrough().superRefine((visualization, context) => {
  const renderer = getEuclidRendererDescriptor(visualization.rendererId)

  if (visualization.level === 'none') {
    if (visualization.rendererId !== null) {
      context.addIssue({
        code: 'custom',
        message: 'A visualization with level none must not name a renderer',
        path: ['rendererId'],
      })
    }
    if (visualization.attestation) {
      context.addIssue({
        code: 'custom',
        message: 'A visualization with level none must not carry a review attestation',
        path: ['attestation'],
      })
    }
    return
  }

  if (!visualization.rendererId) {
    context.addIssue({
      code: 'custom',
      message: 'A visible visualization requires a renderer id from the current manifest',
      path: ['rendererId'],
    })
  } else if (!renderer) {
    context.addIssue({
      code: 'custom',
      message: 'Visualization renderer is not present in the current renderer manifest',
      path: ['rendererId'],
    })
  }

  if (renderer && visualization.level === 'concept_illustration' && renderer.scope !== 'concept_illustration') {
    context.addIssue({
      code: 'custom',
      message: 'A concept illustration must use a concept renderer',
      path: ['rendererId'],
    })
  }
  if (renderer
    && (visualization.level === 'proposition_specific' || visualization.level === 'verified')
    && renderer.scope !== 'proposition_specific') {
    context.addIssue({
      code: 'custom',
      message: 'A proposition-specific or verified visualization must use a proposition renderer',
      path: ['rendererId'],
    })
  }

  if (visualization.level === 'verified' && !visualization.attestation) {
    context.addIssue({
      code: 'custom',
      message: 'A verified visualization requires a complete human-review attestation',
      path: ['attestation'],
    })
  }
  if (visualization.attestation
    && !isCurrentEuclidRendererRevision(visualization.rendererId, visualization.attestation.rendererRevision)) {
    context.addIssue({
      code: 'custom',
      message: 'Visualization attestation renderer revision does not match the current renderer manifest',
      path: ['attestation', 'rendererRevision'],
    })
  }
})

export const EuclidEntryPayloadSchema = z.object({
  schemaVersion: z.literal(EUCLID_CONTENT_SCHEMA_VERSION),
  corpusId: z.string().min(1),
  status: EuclidEditorialStatusSchema,
  contentItem: z.object({
    id: EuclidEntryIdSchema,
    kind: EuclidEntryKindSchema,
    title: z.string().min(1),
    englishTitle: z.string(),
    book: EuclidBookNumberSchema,
    number: z.number().int().positive(),
    status: EuclidEditorialStatusSchema,
    sourceMissing: z.boolean(),
    source: z.object({
      urn: z.string().min(1),
      url: z.string().min(1),
      group: z.string().min(1),
      sourceNumber: z.number().int().positive(),
      corpusSha256: Sha256Schema,
      hasSourceFigure: z.boolean(),
      historicalChineseUrl: z.string().nullable(),
    }).passthrough(),
  }).passthrough(),
  revision: z.object({
    id: z.string().min(1),
    contentId: EuclidEntryIdSchema,
    version: z.number().int().positive(),
    status: EuclidEditorialStatusSchema,
    contentHash: Sha256Schema,
    createdBy: z.string().min(1),
    changeSummary: z.string().min(1),
    blockIds: z.array(z.string().min(1)),
  }).passthrough(),
  blocks: z.array(EuclidSemanticBlockSchema).min(2),
  outgoingEdges: z.array(EuclidEdgeSchema),
  incomingEdges: z.array(EuclidEdgeSchema),
  dependencies: z.array(EuclidRelationSummarySchema),
  dependents: z.array(EuclidRelationSummarySchema),
  visualization: EuclidVisualizationSchema,
  sourceIssues: z.array(EuclidSourceIssueSchema),
}).passthrough().superRefine((payload, context) => {
  const id = payload.contentItem.id
  if (payload.visualization.attestation
    && payload.visualization.attestation.contentHash !== payload.revision.contentHash) {
    context.addIssue({
      code: 'custom',
      message: 'Visualization attestation must bind to the current content revision hash',
      path: ['visualization', 'attestation', 'contentHash'],
    })
  }
  if (payload.revision.contentId !== id) {
    context.addIssue({ code: 'custom', message: 'Revision belongs to a different content item', path: ['revision', 'contentId'] })
  }
  const blockIds = new Set<string>()
  for (const [position, block] of payload.blocks.entries()) {
    if (block.contentId !== id || block.revisionId !== payload.revision.id) {
      context.addIssue({ code: 'custom', message: 'Semantic block is attached to a different item or revision', path: ['blocks', position] })
    }
    if (block.order !== position) {
      context.addIssue({ code: 'custom', message: 'Semantic block order must be contiguous and explicit', path: ['blocks', position, 'order'] })
    }
    if (blockIds.has(block.id)) {
      context.addIssue({ code: 'custom', message: 'Duplicate semantic block id', path: ['blocks', position, 'id'] })
    }
    blockIds.add(block.id)
  }
  if (payload.revision.blockIds.length !== payload.blocks.length
    || payload.revision.blockIds.some((blockId, index) => blockId !== payload.blocks[index]?.id)) {
    context.addIssue({ code: 'custom', message: 'Revision block list does not match the semantic block sequence', path: ['revision', 'blockIds'] })
  }
  for (const [position, edge] of payload.outgoingEdges.entries()) {
    if (edge.sourceContentId !== id) {
      context.addIssue({ code: 'custom', message: 'Outgoing edge has a different source item', path: ['outgoingEdges', position] })
    }
    for (const blockId of edge.sourceBlockIds) {
      if (!blockIds.has(blockId)) {
        context.addIssue({ code: 'custom', message: 'Outgoing edge points to an unknown source block', path: ['outgoingEdges', position, 'sourceBlockIds'] })
      }
    }
  }
  for (const [position, edge] of payload.incomingEdges.entries()) {
    if (edge.targetContentId !== id) {
      context.addIssue({ code: 'custom', message: 'Incoming edge has a different target item', path: ['incomingEdges', position] })
    }
  }
})

export type EuclidCatalog = z.infer<typeof EuclidCatalogSchema>
export type EuclidBookIndex = z.infer<typeof EuclidBookIndexSchema>
export type EuclidEntryPayload = z.infer<typeof EuclidEntryPayloadSchema>
export type EuclidVisualizationAttestation = z.infer<typeof EuclidVisualizationAttestationSchema>
export type EuclidEntryId = z.infer<typeof EuclidEntryIdSchema>
export type EuclidFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface EuclidLoadOptions {
  signal?: AbortSignal
}

export interface ParsedEuclidEntryId {
  id: EuclidEntryId
  book: number
  kind: z.infer<typeof EuclidEntryKindSchema>
  number: number
}

export type EuclidRepositoryErrorCode = 'invalid_id' | 'invalid_book' | 'http_error' | 'invalid_payload'

export class EuclidRepositoryError extends Error {
  readonly code: EuclidRepositoryErrorCode
  readonly resource: string

  constructor(code: EuclidRepositoryErrorCode, resource: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'EuclidRepositoryError'
    this.code = code
    this.resource = resource
  }
}

export function parseEuclidEntryId(value: string): ParsedEuclidEntryId {
  const parsed = EuclidEntryIdSchema.safeParse(value)
  if (!parsed.success) {
    throw new EuclidRepositoryError('invalid_id', value, `Invalid Euclid entry id: ${value}`)
  }
  const match = /^euclid-(\d+)-(?:(def|post|cn)-)?(\d+)$/.exec(parsed.data)
  if (!match) {
    throw new EuclidRepositoryError('invalid_id', value, `Invalid Euclid entry id: ${value}`)
  }
  const marker = match[2]
  const kind = marker === 'def'
    ? 'definition'
    : marker === 'post'
      ? 'postulate'
      : marker === 'cn'
        ? 'common-notion'
        : 'proposition'
  return { id: parsed.data, book: Number(match[1]), kind, number: Number(match[3]) }
}

function validateBookNumber(book: number): number {
  const parsed = EuclidBookNumberSchema.safeParse(book)
  if (!parsed.success) {
    throw new EuclidRepositoryError('invalid_book', String(book), `Euclid book must be an integer from 1 to 13; received ${book}`)
  }
  return parsed.data
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('Euclid content base URL cannot be empty')
  return `${trimmed.replace(/\/+$/, '')}/`
}

function resourceUrl(baseUrl: string, relativePath: string): string {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(baseUrl)) return new URL(relativePath, baseUrl).toString()
  return `${baseUrl}${relativePath}`
}

function formatValidationError(error: z.ZodError): string {
  return error.issues.slice(0, 5).map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ')
}

export class EuclidRepository {
  private readonly baseUrl: string
  private readonly fetcher: EuclidFetcher
  private catalogPromise: Promise<EuclidCatalog> | undefined
  private readonly bookPromises = new Map<number, Promise<EuclidBookIndex>>()
  private readonly entryPromises = new Map<EuclidEntryId, Promise<EuclidEntryPayload>>()

  constructor(baseUrl = DEFAULT_EUCLID_CONTENT_BASE, fetcher: EuclidFetcher = globalThis.fetch.bind(globalThis)) {
    this.baseUrl = normalizeBaseUrl(baseUrl)
    this.fetcher = fetcher
  }

  clearCache(): void {
    this.catalogPromise = undefined
    this.bookPromises.clear()
    this.entryPromises.clear()
  }

  loadCatalog(options: EuclidLoadOptions = {}): Promise<EuclidCatalog> {
    if (options.signal) return this.fetchValidated('catalog.json', EuclidCatalogSchema, options.signal)
    if (!this.catalogPromise) {
      this.catalogPromise = this.fetchValidated('catalog.json', EuclidCatalogSchema)
      this.catalogPromise.catch(() => { this.catalogPromise = undefined })
    }
    return this.catalogPromise
  }

  loadBookIndex(book: number, options: EuclidLoadOptions = {}): Promise<EuclidBookIndex> {
    const validBook = validateBookNumber(book)
    const relativePath = `books/${String(validBook).padStart(2, '0')}.index.json`
    const load = async () => {
      const result = await this.fetchValidated(relativePath, EuclidBookIndexSchema, options.signal)
      if (result.book.book !== validBook) {
        throw new EuclidRepositoryError('invalid_payload', relativePath, `Book index ${relativePath} identifies itself as Book ${result.book.book}`)
      }
      return result
    }
    if (options.signal) return load()
    const cached = this.bookPromises.get(validBook)
    if (cached) return cached
    const promise = load()
    this.bookPromises.set(validBook, promise)
    promise.catch(() => { this.bookPromises.delete(validBook) })
    return promise
  }

  loadEntry(id: string, options: EuclidLoadOptions = {}): Promise<EuclidEntryPayload> {
    const parsedId = parseEuclidEntryId(id)
    const relativePath = `entries/${parsedId.id}.json`
    const load = async () => {
      const result = await this.fetchValidated(relativePath, EuclidEntryPayloadSchema, options.signal)
      if (result.contentItem.id !== parsedId.id
        || result.contentItem.book !== parsedId.book
        || result.contentItem.number !== parsedId.number
        || result.contentItem.kind !== parsedId.kind) {
        throw new EuclidRepositoryError('invalid_payload', relativePath, `Entry payload metadata does not match requested id ${parsedId.id}`)
      }
      return result
    }
    if (options.signal) return load()
    const cached = this.entryPromises.get(parsedId.id)
    if (cached) return cached
    const promise = load()
    this.entryPromises.set(parsedId.id, promise)
    promise.catch(() => { this.entryPromises.delete(parsedId.id) })
    return promise
  }

  private async fetchValidated<T>(relativePath: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
    const url = resourceUrl(this.baseUrl, relativePath)
    let response: Response
    try {
      response = await this.fetcher(url, { signal, headers: { Accept: 'application/json' } })
    } catch (error) {
      throw new EuclidRepositoryError('http_error', relativePath, `Unable to fetch Euclid resource ${relativePath}`, { cause: error })
    }
    if (!response.ok) {
      throw new EuclidRepositoryError('http_error', relativePath, `Euclid resource ${relativePath} returned HTTP ${response.status}`)
    }
    let data: unknown
    try {
      data = await response.json()
    } catch (error) {
      throw new EuclidRepositoryError('invalid_payload', relativePath, `Euclid resource ${relativePath} is not valid JSON`, { cause: error })
    }
    const parsed = schema.safeParse(data)
    if (!parsed.success) {
      throw new EuclidRepositoryError(
        'invalid_payload',
        relativePath,
        `Euclid resource ${relativePath} failed runtime validation: ${formatValidationError(parsed.error)}`,
      )
    }
    return parsed.data
  }
}

export const euclidRepository = new EuclidRepository()
