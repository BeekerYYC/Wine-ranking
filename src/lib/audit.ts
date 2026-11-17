/**
 * The note the cellar audit writes on each bottle it logs as drunk. The audit
 * history and undo routes find those logs by it, so it must not change.
 */
export const AUDIT_CONSUMED_NOTE = "Marked consumed via cellar audit";
