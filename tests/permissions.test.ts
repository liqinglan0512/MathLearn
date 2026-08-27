import { describe, expect, it } from 'vitest'
import type { FeatureFlags } from '../src/config/features'
import {
  PermissionDeniedError,
  assertAttachmentsAllowed,
  assertCanModerateReview,
  assertCanSubmitPublicContent,
  canSubmitPublicContent,
  canUploadAttachments,
  canUseAdminContentManagement,
  isSafeStoredAttachment,
} from '../src/lib/permissions'

const ordinaryUser = { id: 'reader-1', isAdmin: false }
const adminUser = { id: 'admin-1', isAdmin: true }

function flags(overrides: Partial<FeatureFlags> = {}): FeatureFlags {
  return {
    publicContribution: false,
    attachmentUpload: false,
    challenge: false,
    learningJournal: false,
    aiAssistant: false,
    adminContentManagement: false,
    ...overrides,
  }
}

describe('public contribution and attachment permissions', () => {
  it('keeps contribution closed for ordinary and admin users while the feature is frozen', () => {
    const frozen = flags()
    expect(canSubmitPublicContent(ordinaryUser, frozen)).toBe(false)
    expect(canSubmitPublicContent(adminUser, frozen)).toBe(false)
    expect(() => assertCanSubmitPublicContent(ordinaryUser, 'problem', frozen))
      .toThrowError(expect.objectContaining({ code: 'PUBLIC_CONTRIBUTION_DISABLED' }))
  })

  it('requires both contribution and attachment flags before accepting a safe attachment', () => {
    const pdf = { id: 'attachment-1', name: 'proof.pdf', type: 'pdf' as const, dataUrl: 'data:application/pdf;base64,AA==' }
    expect(canUploadAttachments(ordinaryUser, flags({ publicContribution: true }))).toBe(false)
    expect(() => assertAttachmentsAllowed(
      ordinaryUser,
      [pdf],
      flags({ publicContribution: true, attachmentUpload: false }),
    )).toThrowError(expect.objectContaining({ code: 'ATTACHMENT_UPLOAD_DISABLED' }))
  })

  it('rejects HTML, SVG, ZIP and attachment type/MIME mismatches even when flags are enabled', () => {
    const enabled = flags({ publicContribution: true, attachmentUpload: true })
    for (const attachment of [
      { id: 'html', name: 'page.html', type: 'image' as const, dataUrl: 'data:text/html;base64,AA==' },
      { id: 'svg', name: 'figure.svg', type: 'image' as const, dataUrl: 'data:image/svg+xml;base64,AA==' },
      { id: 'zip', name: 'archive.zip', type: 'pdf' as const, dataUrl: 'data:application/zip;base64,AA==' },
      { id: 'mismatch', name: 'not-pdf.png', type: 'pdf' as const, dataUrl: 'data:image/png;base64,AA==' },
    ]) {
      expect(isSafeStoredAttachment(attachment)).toBe(false)
      expect(() => assertAttachmentsAllowed(ordinaryUser, [attachment], enabled))
        .toThrow(PermissionDeniedError)
    }
  })
})

describe('administrator boundary', () => {
  it('does not grant review or editor access to an ordinary account', () => {
    const development = flags({ adminContentManagement: true })
    expect(canUseAdminContentManagement(ordinaryUser, development)).toBe(false)
    expect(canUseAdminContentManagement(adminUser, development)).toBe(true)
    expect(() => assertCanModerateReview(ordinaryUser, development))
      .toThrowError(expect.objectContaining({ code: 'ADMIN_REQUIRED' }))
  })
})
