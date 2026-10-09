import { NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth";
import { getTask, updateTask } from "@/lib/repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const taskId = url.searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code || !taskId) return NextResponse.redirect(`${appUrl}/dashboard?calendar=missing`);

  const user = await ensureCurrentUser();
  const task = await getTask(user, taskId);
  if (!task) return NextResponse.redirect(`${appUrl}/dashboard?calendar=not_found`);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || "",
      grant_type: "authorization_code"
    })
  });

  if (!tokenResponse.ok)
    return NextResponse.redirect(`${appUrl}/tasks/${task.id}?calendar=token_error`);
  const token = await tokenResponse.json();

  const startDate = task.dueDate
    ? task.dueDate.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const eventResponse = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        summary: task.title,
        description: task.description || task.sourceText || "",
        start: { date: startDate },
        end: { date: startDate }
      })
    }
  );

  if (!eventResponse.ok)
    return NextResponse.redirect(`${appUrl}/tasks/${task.id}?calendar=event_error`);
  const event = await eventResponse.json();
  await updateTask(user, task.id, { googleEventId: event.id });
  return NextResponse.redirect(`${appUrl}/tasks/${task.id}?calendar=added`);
}
