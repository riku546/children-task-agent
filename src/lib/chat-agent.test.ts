import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHAT_TOOLS,
  executeChatTool,
  isRemovalConsent,
  MAX_AGENT_LOOP_TURNS,
  projectTaskForList,
  runChatAgentLoop,
  type ToolRuntime
} from "./chat-agent-shared.ts";
import type { GroupRecord, TaskRecord } from "./types.ts";

const baseTask: TaskRecord = {
  id: "task_1",
  groupId: "group_1",
  childId: null,
  childName: null,
  title: "雑巾を持参",
  description: null,
  type: "持参",
  dueDate: "2026-11-20",
  assigneeMemberId: "member_1",
  assigneeName: "ママ",
  priority: "medium",
  status: "TODO",
  sourceText: "secret source",
  googleEventId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const baseGroup: GroupRecord = {
  id: "group_1",
  name: "わが家",
  createdById: "user_1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  members: [
    {
      id: "member_1",
      userId: "user_1",
      groupId: "group_1",
      role: "OWNER",
      displayName: "ママ",
      createdAt: "2026-01-01T00:00:00.000Z"
    },
    {
      id: "member_2",
      userId: "user_2",
      groupId: "group_1",
      role: "MEMBER",
      displayName: "パパ",
      createdAt: "2026-01-02T00:00:00.000Z"
    }
  ],
  children: []
};

function noopHooks(overrides: Partial<ToolRuntime["hooks"]> = {}): ToolRuntime["hooks"] {
  return {
    createTasks: async () => {
      throw new Error("createTasks should not be called");
    },
    updateTask: async () => null,
    removeGroupMember: async () => {
      throw new Error("removeGroupMember should not be called");
    },
    getTask: async () => null,
    createGroup: async () => baseGroup,
    addChild: async () => ({
      id: "child_1",
      groupId: "group_1",
      name: "はな",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }),
    createInvite: async () => ({ token: "t", expiresAt: "2026-12-01T00:00:00.000Z" }),
    acceptGroupInvite: async () => ({ groupId: "group_1", groupName: "わが家" }),
    userCanManageGroup: async () => true,
    updateDisplayName: async (_user, name) => name,
    ...overrides
  };
}

function makeRuntime(overrides?: Partial<ToolRuntime>): ToolRuntime {
  return {
    user: { id: "user_1", name: "ママ", defaultGroupId: "group_1" },
    groups: [baseGroup],
    tasks: [baseTask],
    requestPendingRemoval: null,
    latestUserMessage: "",
    hooks: noopHooks(),
    ...overrides
  };
}

describe("isRemovalConsent", () => {
  it("accepts only the exact consent words", () => {
    assert.equal(isRemovalConsent("はい"), true);
    assert.equal(isRemovalConsent("はい！"), true);
    assert.equal(isRemovalConsent("  yes  "), true);
    assert.equal(isRemovalConsent("はい、やめて"), false);
    assert.equal(isRemovalConsent("はい、太郎を外して"), false);
    assert.equal(isRemovalConsent("太郎を外して"), false);
  });
});

describe("projectTaskForList", () => {
  it("drops sourceText from the projection", () => {
    const projected = projectTaskForList(baseTask);
    assert.equal("sourceText" in projected, false);
    assert.equal(projected.id, baseTask.id);
    assert.equal(projected.title, baseTask.title);
  });
});

describe("executeChatTool", () => {
  it("does not call updateTask when title matches two tasks", async () => {
    let called = false;
    const runtime = makeRuntime({
      tasks: [baseTask, { ...baseTask, id: "task_2", title: "雑巾を持参" }],
      hooks: noopHooks({
        updateTask: async () => {
          called = true;
          return baseTask;
        }
      })
    });
    const result = await executeChatTool(
      "update_task",
      { searchTitle: "雑巾を持参", status: "DONE" },
      runtime
    );
    const body = JSON.parse(result.content);
    assert.equal(called, false);
    assert.match(body.error, /複数一致/);
  });

  it("does not call removeGroupMember without pending removal consent", async () => {
    let called = false;
    const runtime = makeRuntime({
      hooks: noopHooks({
        removeGroupMember: async () => {
          called = true;
          return {};
        }
      })
    });
    await executeChatTool("remove_member", { groupId: "group_1", memberName: "パパ" }, runtime);
    assert.equal(called, false);
  });

  it("does not remove when message looks like consent but is not exact", async () => {
    let called = false;
    const runtime = makeRuntime({
      requestPendingRemoval: { groupId: "group_1", memberId: "member_2" },
      latestUserMessage: "はい、太郎を外して",
      hooks: noopHooks({
        removeGroupMember: async () => {
          called = true;
          return {};
        }
      })
    });
    await executeChatTool("remove_member", { groupId: "group_1", memberId: "member_2" }, runtime);
    assert.equal(called, false);
  });

  it("does not remove in the same response when HTTP pending is null", async () => {
    let called = false;
    const runtime = makeRuntime({
      requestPendingRemoval: null,
      latestUserMessage: "はい、太郎を外して",
      hooks: noopHooks({
        removeGroupMember: async () => {
          called = true;
          return {};
        }
      })
    });
    await executeChatTool("remove_member", { groupId: "group_1", memberId: "member_2" }, runtime);
    assert.equal(called, false);
  });

  it("calls removeGroupMember when pending matches and user consents", async () => {
    let called = false;
    const runtime = makeRuntime({
      requestPendingRemoval: { groupId: "group_1", memberId: "member_2" },
      latestUserMessage: "はい",
      hooks: noopHooks({
        removeGroupMember: async () => {
          called = true;
          return {};
        }
      })
    });
    await executeChatTool("remove_member", { groupId: "group_1", memberId: "member_2" }, runtime);
    assert.equal(called, true);
  });

  it("does not execute unknown tools", async () => {
    const runtime = makeRuntime();
    const result = await executeChatTool("delete_everything", {}, runtime);
    const body = JSON.parse(result.content);
    assert.match(body.error, /未知のツール/);
  });

  it("does not call createTasks when assignee name is missing", async () => {
    let called = false;
    const runtime = makeRuntime({
      hooks: noopHooks({
        createTasks: async () => {
          called = true;
          return [baseTask];
        }
      })
    });
    const result = await executeChatTool(
      "create_task",
      { title: "test", assigneeName: "存在しない人" },
      runtime
    );
    const body = JSON.parse(result.content);
    assert.equal(called, false);
    assert.match(body.error, /見つかりません/);
  });
});

describe("runChatAgentLoop", () => {
  it("returns pendingRemoval null when the user does not consent", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: "確認します",
                tool_calls: []
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    const runtime = makeRuntime({
      requestPendingRemoval: { groupId: "group_1", memberId: "member_2" },
      latestUserMessage: "はい、やめて"
    });

    const result = await runChatAgentLoop({
      apiKey: "test-key",
      systemPrompt: "test",
      clientMessages: [{ role: "user", content: "はい、やめて" }],
      runtime,
      fetchImpl
    });

    assert.equal(result.pendingRemoval, null);
  });

  it("stops after three tool rounds even if fetch always returns tool calls", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: `call_${calls}`,
                    type: "function",
                    function: {
                      name: "list_tasks",
                      arguments: "{}"
                    }
                  }
                ]
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const runtime = makeRuntime({
      hooks: noopHooks({
        createTasks: async () => [baseTask],
        updateTask: async () => baseTask,
        removeGroupMember: async () => ({})
      })
    });

    const result = await runChatAgentLoop({
      apiKey: "test-key",
      systemPrompt: "test",
      clientMessages: [{ role: "user", content: "一覧" }],
      runtime,
      fetchImpl
    });

    assert.equal(calls, MAX_AGENT_LOOP_TURNS);
    assert.match(result.reply, /続きの操作|ここまでの結果/);
    assert.equal(CHAT_TOOLS.length > 0, true);
  });
});
