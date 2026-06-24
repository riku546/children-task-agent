import { cookies } from "next/headers";
import { prisma, tryDb } from "@/lib/prisma";
import { ensureMemoryGroup, upsertMemoryUser } from "@/lib/memory-store";

const COOKIE_NAME = "childcare_demo_email";

export async function setDemoSession(email: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearDemoSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionEmail() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function ensureCurrentUser() {
  const email = (await getSessionEmail()) || "demo@example.com";
  const name = email === "demo@example.com" ? "デモユーザー" : email.split("@")[0];

  const dbUser = await tryDb(() =>
    prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name }
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
              displayName: dbUser.name || "デモユーザー"
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

    return { id: dbUser.id, email: dbUser.email, name: dbUser.name || name, defaultGroupId: group?.id ?? null };
  }

  const memoryUser = upsertMemoryUser(email, name);
  const memoryGroup = ensureMemoryGroup(memoryUser.id, memoryUser.name);
  return { id: memoryUser.id, email: memoryUser.email, name: memoryUser.name, defaultGroupId: memoryGroup.id };
}
