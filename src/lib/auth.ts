import type { User } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { ensureMemoryGroup, upsertMemoryUser } from "@/lib/memory-store";
import { prisma, tryDb } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

function getDisplayName(user: User) {
  const metadata = user.user_metadata ?? {};
  const name = metadata.name || metadata.full_name || metadata.preferred_username;
  if (typeof name === "string" && name.trim()) return name.trim();
  return user.email?.split("@")[0] || "ユーザー";
}

export async function syncApplicationUser(user: User) {
  if (!user.email) {
    throw new UnauthorizedError();
  }

  const email = user.email;
  const name = getDisplayName(user);
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined;

  // 通常アクセス時はSELECT 1回でユーザーとグループを高速取得（重いupsertと2段階クエリを回避）
  const existingUser = await tryDb(() =>
    prisma.user.findUnique({
      where: { email },
      include: {
        groups: {
          take: 1,
          select: { groupId: true }
        }
      }
    })
  );

  if (existingUser) {
    const defaultGroupId = existingUser.groups[0]?.groupId ?? null;

    // グループが既に存在していれば、追加クエリや書き込みなしで即座に返却
    if (defaultGroupId) {
      return {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name || name,
        image: existingUser.image ?? null,
        defaultGroupId
      };
    }

    // グループが存在しない場合のみ作成
    const newGroup = await tryDb(() =>
      prisma.familyGroup.create({
        data: {
          name: "わが家",
          createdById: existingUser.id,
          members: {
            create: {
              userId: existingUser.id,
              role: "OWNER",
              displayName: existingUser.name || name
            }
          },
          children: {
            create: {
              name: "未設定"
            }
          }
        }
      })
    );

    return {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name || name,
      image: existingUser.image ?? null,
      defaultGroupId: newGroup?.id ?? null
    };
  }

  // ユーザーが未登録の場合（初回登録時のみ実行）
  const dbUser = await tryDb(() =>
    prisma.user.create({
      data: {
        email,
        name,
        image: avatarUrl
      }
    })
  );

  if (dbUser) {
    const newGroup = await tryDb(() =>
      prisma.familyGroup.create({
        data: {
          name: "わが家",
          createdById: dbUser.id,
          members: {
            create: {
              userId: dbUser.id,
              role: "OWNER",
              displayName: dbUser.name || name
            }
          },
          children: {
            create: {
              name: "未設定"
            }
          }
        }
      })
    );

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || name,
      image: dbUser.image ?? null,
      defaultGroupId: newGroup?.id ?? null
    };
  }

  const memoryUser = upsertMemoryUser(email, name);
  const memoryGroup = ensureMemoryGroup(memoryUser.id, memoryUser.name);
  return {
    id: memoryUser.id,
    email: memoryUser.email,
    name: memoryUser.name,
    image: null,
    defaultGroupId: memoryGroup.id
  };
}

export async function ensureCurrentUser() {
  try {
    const reqHeaders = await headers();
    const userId = reqHeaders.get("x-user-id");
    const userEmail = reqHeaders.get("x-user-email");
    const userMetaRaw = reqHeaders.get("x-user-meta");

    if (userId && userEmail) {
      let metadata: Record<string, any> = {};
      if (userMetaRaw) {
        try {
          metadata = JSON.parse(Buffer.from(userMetaRaw, "base64").toString("utf8"));
        } catch {
          // ignore parse error
        }
      }

      return syncApplicationUser({
        id: userId,
        email: userEmail,
        user_metadata: metadata,
        app_metadata: {},
        aud: "authenticated",
        created_at: ""
      } as User);
    }
  } catch {
    // headers()が取得できない場合はフォールバック
  }

  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }

  return syncApplicationUser(user);
}
