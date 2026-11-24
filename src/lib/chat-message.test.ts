import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildChatSendPayload, splitChatText } from "./chat-message.ts";

const CREATE_TASK_INSTRUCTION =
  "この文章の内容をタスク化して。タイトルは文章から具体的に付ける。中身のない「タスク」という名前にはしない。";

describe("buildChatSendPayload", () => {
  it("uses trimmed draft for a normal message", () => {
    const payload = buildChatSendPayload({
      draft: "  明日の準備  ",
      mode: null,
      hasAttachment: false
    });
    assert.deepEqual(payload, { displayText: "明日の準備" });
  });

  it("returns null when draft is empty and there is no attachment", () => {
    assert.equal(buildChatSendPayload({ draft: "  ", mode: null, hasAttachment: false }), null);
  });

  it("builds create_task payload when draft has text", () => {
    const payload = buildChatSendPayload({
      draft: "連絡帳を出す",
      mode: "create_task",
      hasAttachment: false
    });
    assert.deepEqual(payload, {
      displayText: "連絡帳を出す",
      apiText: `${CREATE_TASK_INSTRUCTION}\n連絡帳を出す`
    });
  });

  it("uses attachment placeholder for create_task with attachment only", () => {
    const payload = buildChatSendPayload({
      draft: "",
      mode: "create_task",
      hasAttachment: true
    });
    assert.deepEqual(payload, {
      displayText: "（添付を確認してください）",
      apiText: "（添付を確認してください）"
    });
  });

  it("passes through override text without empty-send guard", () => {
    const payload = buildChatSendPayload({
      draft: "",
      mode: "create_task",
      hasAttachment: false,
      overrideText: "招待リンクを出して",
      overrideApiText: undefined
    });
    assert.deepEqual(payload, {
      displayText: "招待リンクを出して",
      apiText: undefined
    });
  });
});

describe("splitChatText", () => {
  it("parses relative-path Markdown links as link segments", () => {
    const segments = splitChatText("詳細は [ホーム](/dashboard) を見てください");
    assert.equal(segments.length, 3);
    assert.deepEqual(segments[0], { type: "text", text: "詳細は " });
    assert.deepEqual(segments[1], { type: "link", text: "ホーム", href: "/dashboard" });
    assert.deepEqual(segments[2], { type: "text", text: " を見てください" });
  });

  it("keeps javascript:, //evil, and .. paths as plain text", () => {
    const js = splitChatText("悪意 [click](javascript:alert(1)) あり");
    assert.equal(
      js.some((s) => s.type === "link"),
      false
    );
    assert.ok(js.some((s) => s.type === "text" && s.text.includes("javascript:")));

    const evil = splitChatText("外部 [x](//evil.com) リンク");
    assert.equal(
      evil.some((s) => s.type === "link"),
      false
    );

    const dotdot = splitChatText("上へ [back](../admin)");
    assert.equal(
      dotdot.some((s) => s.type === "link"),
      false
    );
  });

  it("parses https URLs as link segments", () => {
    const segments = splitChatText("招待URLは https://example.com/join?token=abc です");
    assert.equal(segments.length, 3);
    assert.deepEqual(segments[0], { type: "text", text: "招待URLは " });
    assert.deepEqual(segments[1], {
      type: "link",
      text: "https://example.com/join?token=abc",
      href: "https://example.com/join?token=abc"
    });
    assert.deepEqual(segments[2], { type: "text", text: " です" });
  });

  it("preserves plain text and newlines", () => {
    const input = "1行目\n2行目";
    const segments = splitChatText(input);
    assert.equal(segments.length, 1);
    assert.deepEqual(segments[0], { type: "text", text: input });
  });

  it("allows query and hash in relative paths", () => {
    const segments = splitChatText("[設定](/groups/1/settings?q=1#section)");
    assert.equal(segments.length, 1);
    assert.deepEqual(segments[0], {
      type: "link",
      text: "設定",
      href: "/groups/1/settings?q=1#section"
    });
  });
});
