import type { User } from "@supabase/supabase-js";
import { prisma, tryDb } from "@/lib/prisma";
import { ensureMemoryGroup, upsertMemoryUser } from "@/lib/memory-store";
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

  const dbUser = await tryDb(() =>
    prisma.user.upsert({
      where: { email },
      update: { name, image: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined },
      create: { email, name, image: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined }
    })
  );

  if (dbUser) {
    const group = await tryDb(async () => {
      const existing = await prisma.familyGroup.findFirst({
        where: { members: { some: { userId: dbUser.id } } },
        include: { members: true, children: true }
      });
      if (existing) return existing;

      return prisma.familyGroup.create({
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
        },
        include: { members: true, children: true }
      });
    });

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || name,
      image: dbUser.image ?? null,
      defaultGroupId: group?.id ?? null
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
