export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function failure(e: unknown) {
  return json(
    {
      error:
        e instanceof HttpError
          ? e.message
          : "The request could not be completed. Try again.",
    },
    e instanceof HttpError ? e.status : 500,
  );
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    throw new HttpError(403, "Use the caller studio to make this request.");
}
export async function body(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Send JSON data.");
  const text = await req.text();
  if (text.length > 45000)
    throw new HttpError(
      413,
      "This service is too large. Shorten the instructions or answers.",
    );
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "The request is not valid JSON.");
  }
}
export function settings() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new HttpError(
      503,
      "Cloud storage is not configured yet. Browser drafts are still available.",
    );
  let publishable = key.startsWith("sb_publishable_");
  if (!publishable) {
    try {
      publishable =
        JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString())
          .role === "anon";
    } catch {}
  }
  if (!publishable)
    throw new HttpError(
      503,
      "Use a Supabase publishable or anon key on the server. Never configure a service-role key for this application.",
    );
  return { url: url.replace(/\/$/, ""), key };
}
export async function authenticate(req: Request) {
  const { url, key } = settings();
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new HttpError(401, "Sign in to access your cloud workspace.");
  const r = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: authorization },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new HttpError(401, "Your session expired. Sign in again.");
  const user = await r.json();
  if (typeof user.id !== "string") throw new HttpError(401, "Sign in again.");
  return { url, key, authorization, userId: user.id };
}
export async function database(
  auth: Awaited<ReturnType<typeof authenticate>>,
  path: string,
  init: RequestInit = {},
) {
  const r = await fetch(`${auth.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: auth.key,
      Authorization: auth.authorization,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    if (data.code === "40001")
      throw new HttpError(
        409,
        "This service changed in another session. Reload cloud services before saving.",
      );
    if (data.message === "practice_limit")
      throw new HttpError(429, "Practice limit reached. Try again later.");
    throw new HttpError(
      503,
      "Cloud storage is not ready. Check the database migration and permissions.",
    );
  }
  return r.status === 204 ? null : r.json();
}
