export type Priority = "low" | "medium" | "high";
export type TaskStatus = "TODO" | "DONE";

export type ChildRecord = {
  id: string;
  groupId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type MemberRecord = {
  id: string;
  userId: string;
  groupId: string;
  role: "OWNER" | "MEMBER";
  displayName: string;
  createdAt: string;
};

export type GroupRecord = {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  members: MemberRecord[];
  children: ChildRecord[];
};

export type TaskRecord = {
  id: string;
  groupId: string;
  childId: string | null;
  childName: string | null;
  title: string;
  description: string | null;
  type: string;
  dueDate: string | null;
  assigneeMemberId: string | null;
  assigneeName: string | null;
  priority: Priority;
  status: TaskStatus;
  sourceText: string | null;
  googleEventId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodoCandidate = {
  title: string;
  type: string;
  dueDate: string | null;
  assigneeSuggestion: string;
  childName: string;
  place: string;
  priority: Priority;
  notes: string;
};

export type ExtractionResult = {
  summary: string;
  extractedText?: string;
  tasks: TodoCandidate[];
};
