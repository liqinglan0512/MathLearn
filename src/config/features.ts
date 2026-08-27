export interface FeatureFlags {
  publicContribution: boolean
  attachmentUpload: boolean
  challenge: boolean
  learningJournal: boolean
  aiAssistant: boolean
  adminContentManagement: boolean
}

/**
 * MathForge 0.2 is a closed editorial prototype. Product gates live here so
 * a page, route, or repository cannot silently invent a different policy.
 */
export const FEATURES: Readonly<FeatureFlags> = Object.freeze({
  publicContribution: false,
  attachmentUpload: false,
  challenge: false,
  learningJournal: false,
  aiAssistant: false,
  adminContentManagement: Boolean(import.meta.env?.DEV),
})
