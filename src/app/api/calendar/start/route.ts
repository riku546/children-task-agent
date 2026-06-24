import { NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth";
import { getTask, updateTask } from "@/lib/repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

  const user = await ensureCurrentUser();
  const task = await getTask(user, taskId);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    const demoEventId = `demo_calendar_${task.id}`;
    await updateTask(user, task.id, { googleEventId: demoEventId });
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tasks/${task.id}?calendar=demo`);
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", task.id);
  return NextResponse.redirect(authUrl.toString());
}
