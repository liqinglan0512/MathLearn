export interface FeatureFlags {
  euclidPublic: boolean
  publicContribution: boolean
  attachmentUpload: boolean
  challenge: boolean
  learningJournal: boolean
  aiAssistant: boolean
  social: boolean
  localIdentityPrototype: boolean
  localDiscussionPrototype: boolean
  adminContentManagement: boolean
}

/**
 * MathForge 0.3 keeps experimental and community code recoverable while the
 * public product stays focused on the Open Learning Core. Product gates live
 * here so a page, route, or repository cannot silently invent another policy.
 */
export const FEATURES: Readonly<FeatureFlags> = Object.freeze({
  euclidPublic: false,
  publicContribution: false,
  attachmentUpload: false,
  challenge: false,
  learningJournal: false,
  aiAssistant: false,
  social: false,
  localIdentityPrototype: Boolean(import.meta.env?.DEV),
  localDiscussionPrototype: Boolean(import.meta.env?.DEV),
  adminContentManagement: Boolean(import.meta.env?.DEV),
})
