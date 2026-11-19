import { updateDisplayName } from "@/lib/display-name";
import { extractWithOpenRouter } from "@/lib/extraction";
import { acceptGroupInvite } from "@/lib/invite-join";
import {
  addChild,
  createGroup,
  createInvite,
  createTasks,
  getTask,
  listGroups,
  listTasks,
  removeGroupMember,
  updateTask,
  userCanManageGroup
} from "@/lib/repository";

export * from "@/lib/chat-agent-shared";

import {
  type AgentUser,
  buildSystemPrompt,
  type ChatAgentEvent,
  type ChatTurn,
  type PendingRemoval,
  type RunChatLoopResult,
  runChatAgentLoop,
  type ToolRuntime
} from "@/lib/chat-agent-shared";

const ATTACHMENT_ONLY_PLACEHOLDER = "（添付を確認してください）";

function wantsImportFromText(text: string): boolean {
  return /保存|取込|登録|追加して|タスク化/.test(text);
}

function wantsViewOnlyFromText(text: string): boolean {
  return /見せて|確認だけ/.test(text);
}

function isAttachmentOnlyUserMessage(text: string): boolean {
  const trimmed = text.trim();
  return trimmed === "" || trimmed === ATTACHMENT_ONLY_PLACEHOLDER;
}

export async function runChatSession(input: {
  user: AgentUser;
  request: Request;
  messages: ChatTurn[];
  pendingRemoval: PendingRemoval;
  attachment?: { text?: string; imageUrl?: string } | null;
  onEvent?: (event: ChatAgentEvent) => void;
}): Promise<RunChatLoopResult> {
  const groups = await listGroups(input.user);
  const tasks = await listTasks(input.user);
  const latestUser =
    [...input.messages]
      .reverse()
      .find((m) => m.role === "user")
      ?.content?.trim() || "";

  let extractionExtra = "";
  if (input.attachment?.text || input.attachment?.imageUrl) {
    const extraction = await extractWithOpenRouter({
      text: input.attachment.text,
      imageUrl: input.attachment.imageUrl
    });
    const extractedText = (extraction.extractedText || input.attachment.text || "").slice(0, 1500);
    const candidates = extraction.tasks.map((t) => ({
      title: t.title,
      type: t.type,
      dueDate: t.dueDate,
      childName: t.childName,
      assigneeSuggestion: t.assigneeSuggestion,
      priority: t.priority,
      notes: t.notes
    }));
    extractionExtra = [
      "添付から読み取った候補:",
      JSON.stringify({ summary: extraction.summary, candidates, extractedText }, null, 0)
    ].join("\n");
    const attachmentOnly = isAttachmentOnlyUserMessage(latestUser) && Boolean(input.attachment);
    const autoImport =
      (attachmentOnly || wantsImportFromText(latestUser)) && !wantsViewOnlyFromText(latestUser);
    if (autoImport) {
      extractionExtra +=
        "\n利用者が保存・取込を求めているか、本文が空で添付のみです。候補ごとに create_task で登録してください。";
    } else {
      extractionExtra += "\n利用者が見せるだけのときは create_task を使わないでください。";
    }
  }

  const runtime: ToolRuntime = {
    user: input.user,
    groups,
    tasks,
    request: input.request,
    requestPendingRemoval: input.pendingRemoval,
    latestUserMessage: latestUser,
    hooks: {
      createTasks,
      updateTask,
      removeGroupMember,
      getTask,
      createGroup,
      addChild,
      createInvite,
      acceptGroupInvite,
      userCanManageGroup,
      updateDisplayName
    }
  };

  const systemPrompt = buildSystemPrompt(input.user, groups, extractionExtra || undefined);
  const apiKey = process.env.OPENROUTER_API_KEY || "";

  return runChatAgentLoop({
    apiKey,
    systemPrompt,
    clientMessages: input.messages,
    runtime,
    onEvent: input.onEvent
  });
}
