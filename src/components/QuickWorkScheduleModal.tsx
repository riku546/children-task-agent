"use client";

import { Briefcase, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { invalidateCache } from "@/lib/client-cache";
import { toDateInputValue } from "@/lib/date";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  defaultDate?: string | null;
  onSuccess: () => void;
};

const PRESET_WORK_TITLES = [
  "出張（終日）",
  "夜間残業",
  "重要な会議",
  "終日研修・セミナー",
  "夜勤・当直",
  "客先訪問"
];

export function QuickWorkScheduleModal({
  isOpen,
  onClose,
  groupId,
  defaultDate,
  onSuccess
}: Props) {
  const [title, setTitle] = useState("出張（終日）");
  const [date, setDate] = useState(() => defaultDate || toDateInputValue(new Date()));
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !groupId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          sourceText: "仕事・勤務の予定登録",
          tasks: [
            {
              title: title.trim(),
              description: description.trim() || null,
              type: "WORK",
              dueDate: date || null,
              childName: null,
              assigneeName: "本人（仕事）",
              priority: "high"
            }
          ]
        })
      });

      if (res.ok) {
        invalidateCache("/api/tasks");
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Failed to add work schedule", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-6 shadow-xl animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-ink/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-800">
              <Briefcase size={18} />
            </span>
            <div>
              <h2 className="text-base font-black text-ink">仕事の予定を追加</h2>
              <p className="text-xs text-ink/60">園・学校の行事との衝突を検知します</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center rounded-full text-ink/50 hover:bg-cloud hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* クイック選択チップ */}
          <div>
            <p className="block text-xs font-bold text-ink/70">よくある仕事の予定</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PRESET_WORK_TITLES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTitle(preset)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    title === preset
                      ? "bg-slate-800 text-white shadow-2xs"
                      : "border border-ink/15 bg-cloud/50 text-ink/80 hover:bg-cloud"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-xs font-bold text-ink/80">
            予定名・勤務内容
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field mt-1 text-sm font-normal"
              placeholder="例: 出張、夜間残業、終日外出など"
              required
            />
          </label>

          <label className="block text-xs font-bold text-ink/80">
            日付
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field mt-1 text-sm font-normal"
              required
            />
          </label>

          <label className="block text-xs font-bold text-ink/80">
            詳細メモ（任意）
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="field mt-1 text-sm font-normal"
              rows={2}
              placeholder="例: 18時以降連絡がつきにくい、など"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="button-secondary text-xs">
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !date}
              className="button-primary text-xs"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              登録する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
