import { json, settings, failure } from "../shared/http.ts";
export default async function handler(req: Request) {
  if (req.method !== "GET") return json({ error: "Use GET." }, 405);
  try {
    const db =
      process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
        ? settings()
        : null;
    return json({
      supabaseUrl: db?.url || null,
      supabaseAnonKey: db?.key || null,
      aiConfigured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
      liveCallingEnabled: false,
      callingChannel: "telegram",
      telegramWorkerConnected: false,
    });
  } catch (e) {
    return failure(e);
  }
}
