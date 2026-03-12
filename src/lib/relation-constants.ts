/** この値以上でサイレント承認の対象 */
export const CONFIDENCE_SILENT_APPROVE = 0.9;

/** サイレント承認までの猶予日数 */
export const AUTO_APPROVE_DAYS = 7;

export const RELATION_TYPES = ["前提", "因果", "対策", "波及"] as const;
