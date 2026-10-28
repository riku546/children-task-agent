export function isTaskTakenByMe(
  assigneeMemberId: string | null | undefined,
  myMemberIds: string[],
  currentUserId?: string | null
) {
  if (!assigneeMemberId) return false;
  if (myMemberIds.includes(assigneeMemberId)) return true;
  return assigneeMemberId === currentUserId;
}
