import {
  authenticate,
  body,
  database,
  failure,
  HttpError,
  json,
  sameOrigin,
} from "../shared/http.ts";
import { validService } from "../../lib/studio.ts";
import { validateServiceContent } from "../../lib/validation.ts";
export default async function handler(req: Request) {
  try {
    if (!["GET", "POST"].includes(req.method))
      return json({ error: "Use GET or POST." }, 405);
    sameOrigin(req);
    const auth = await authenticate(req);
    if (req.method === "GET")
      return json(
        await database(
          auth,
          "callcraft_current_services?select=*&order=created_at.asc",
        ),
      );
    const data = await body(req);
    if (!validService(data.service))
      throw new HttpError(400, "Provide a complete service.");
    const error = validateServiceContent(data.service);
    if (error) throw new HttpError(400, error);
    if (!Number.isSafeInteger(data.expectedVersion) || data.expectedVersion < 0)
      throw new HttpError(400, "Reload the saved service before editing.");
    const s = data.service;
    const { id, archived, ...document } = s;
    const validId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    if (!validId)
      throw new HttpError(400, "Create a cloud copy of this browser draft.");
    return json(
      await database(auth, "rpc/callcraft_save_service", {
        method: "POST",
        body: JSON.stringify({
          p_id: id,
          p_document: document,
          p_archived: archived,
          p_expected_version: data.expectedVersion,
        }),
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
