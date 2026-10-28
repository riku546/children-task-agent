export const UNSET_CHILD_NAME = "未設定";

const APP_PREFIXES = ["/dashboard", "/groups", "/tasks", "/profile", "/team", "/family"];

export function hasNamedChild(groups: { children: { name: string | null }[] }[]) {
  return groups.some((group) =>
    group.children.some((child) => {
      const name = child.name?.trim() ?? "";
      return name.length > 0 && name !== UNSET_CHILD_NAME;
    })
  );
}

/**
 * 初回ログイン、または共有グループ・名前のある子どもがまだ無いときに案内を出す。
 * スキップまたは完了後は、子どもが未登録でも繰り返さない。
 * すでに名前のある子どもがいる世帯は、案内完了フラグが無くても出さない。
 */
export function needsOnboarding(input: {
  completed: boolean;
  groups: { children: { name: string | null }[] }[];
}) {
  if (input.completed) return false;
  if (input.groups.length === 0 || !hasNamedChild(input.groups)) return true;
  return false;
}

export function shouldEnforceOnboarding(pathname: string, from: string | null) {
  if (pathname === "/onboarding") return false;
  if (pathname === "/tasks/new" && from === "onboarding") return false;
  return APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
