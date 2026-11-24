import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitChatText } from "./chat-message.ts";

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
