import { FEATURES, type FeatureFlags } from '@/config/features'
import type { Attachment, User } from './types'

export type Actor = Pick<User, 'id' | 'isAdmin'> | null | undefined
export type PublicContributionKind = 'problem' | 'solution' | 'paper' | 'article'

const SAFE_ATTACHMENT_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
])

export class PermissionDeniedError extends Error {
  readonly code: 'PUBLIC_CONTRIBUTION_DISABLED' | 'ATTACHMENT_UPLOAD_DISABLED' | 'ADMIN_REQUIRED'

  constructor(
    code: PermissionDeniedError['code'],
    message: string,
  ) {
    super(message)
    this.name = 'PermissionDeniedError'
    this.code = code
  }
}

export function canSubmitPublicContent(
  actor: Actor,
  features: Readonly<FeatureFlags> = FEATURES,
): boolean {
  return Boolean(actor && features.publicContribution)
}

export function canUploadAttachments(
  actor: Actor,
  features: Readonly<FeatureFlags> = FEATURES,
): boolean {
  return canSubmitPublicContent(actor, features) && features.attachmentUpload
}

export function canUseAdminContentManagement(
  actor: Actor,
  features: Readonly<FeatureFlags> = FEATURES,
): boolean {
  return Boolean(actor?.isAdmin && features.adminContentManagement)
}

export function assertCanSubmitPublicContent(
  actor: Actor,
  _kind: PublicContributionKind,
  features: Readonly<FeatureFlags> = FEATURES,
): void {
  if (!canSubmitPublicContent(actor, features)) {
    throw new PermissionDeniedError(
      'PUBLIC_CONTRIBUTION_DISABLED',
      'MathForge 当前关闭站内公开投稿；保存内容不等于发布。',
    )
  }
}

export function assertCanModerateReview(
  actor: Actor,
  features: Readonly<FeatureFlags> = FEATURES,
): void {
  if (!canUseAdminContentManagement(actor, features)) {
    throw new PermissionDeniedError('ADMIN_REQUIRED', '审核状态只能由本地管理员编辑工作流修改。')
  }
}

export function attachmentMime(dataUrl: string): string | null {
  const match = /^data:([^;,]+)(?:;base64)?,/i.exec(dataUrl)
  return match?.[1]?.toLowerCase() ?? null
}

export function isSafeStoredAttachment(attachment: Attachment): boolean {
  const mime = attachmentMime(attachment.dataUrl)
  if (!mime || !SAFE_ATTACHMENT_MIME.has(mime)) return false
  return attachment.type === 'pdf' ? mime === 'application/pdf' : mime.startsWith('image/')
}

export function assertAttachmentsAllowed(
  actor: Actor,
  attachments: readonly Attachment[],
  features: Readonly<FeatureFlags> = FEATURES,
): void {
  if (attachments.length === 0) return
  if (!canUploadAttachments(actor, features)) {
    throw new PermissionDeniedError('ATTACHMENT_UPLOAD_DISABLED', 'MathForge 当前已关闭附件上传。')
  }
  if (attachments.some((attachment) => !isSafeStoredAttachment(attachment))) {
    throw new PermissionDeniedError(
      'ATTACHMENT_UPLOAD_DISABLED',
      '附件格式不在允许清单中；HTML、SVG、ZIP 与任意 MIME 均不接受。',
    )
  }
}
