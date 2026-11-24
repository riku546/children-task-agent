import { memoryStore } from "@/lib/memory-store";
import { prisma, tryDb } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export class DisplayNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DisplayNameError";
  }
}

export async function updateDisplayName(user: { id: string }, name: string): Promise<string> {
  const updatedName = name.trim();
  if (!updatedName) {
    throw new DisplayNameError("お名前を入力してください");
  }

  await tryDb(async () => {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: updatedName }
    });
    await prisma.familyMember.updateMany({
      where: { userId: user.id },
      data: { displayName: updatedName }
    });
  });

  const memoryUser = memoryStore.users.find((item) => item.id === user.id);
  if (memoryUser) {
    memoryUser.name = updatedName;
    memoryUser.updatedAt = new Date().toISOString();
  }
  for (const group of memoryStore.groups) {
    for (const member of group.members) {
      if (member.userId === user.id) {
        member.displayName = updatedName;
      }
    }
  }

  try {
    const supabase = await createClient();
    await supabase.auth.updateUser({
      data: { name: updatedName, full_name: updatedName }
    });
  } catch (err) {
    console.error("Failed to update supabase user metadata", err);
  }

  return updatedName;
}
