import { test } from "node:test";
import assert from "node:assert/strict";
import { sample } from "../lib/studio.ts";
import { resolveDecision, validateServiceContent } from "../lib/validation.ts";
import config from "../netlify/functions/runtime-config.ts";
import services from "../netlify/functions/studio-services.ts";
import practice from "../netlify/functions/practice.ts";
test("only known approved answer IDs produce an answer", () => {
  assert.equal(
    resolveDecision(
      { action: "answer", answerIds: ["faq-price"], text: "Invented price" },
      sample,
    ).text,
    sample.faqs[0].answer,
  );
  assert.match(
    resolveDecision({ action: "answer", answerIds: ["made-up"] }, sample).text,
    /don’t have/,
  );
  assert.match(
    resolveDecision({ action: "answer", answerIds: [] }, sample).text,
    /don’t have/,
  );
});
test("invalid and oversized service content is rejected", () => {
  assert.equal(validateServiceContent(sample), null);
  assert.match(
    validateServiceContent({ ...sample, name: " " })!,
    /service name/,
  );
  assert.match(
    validateServiceContent({
      ...sample,
      faqs: [...sample.faqs, sample.faqs[0]],
    })!,
    /unique/,
  );
});
test("runtime config never returns server secrets and calling is always disabled", async () => {
  process.env.OPENAI_API_KEY = "fake-secret-for-test";
  process.env.OPENAI_MODEL = "test-model";
  try {
    const r = await config(
      new Request("https://studio.example/.netlify/functions/runtime-config"),
    );
    const text = await r.text();
    assert.doesNotMatch(text, /fake-secret/);
    assert.equal(JSON.parse(text).liveCallingEnabled, false);
  } finally {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  }
});
test("service API rejects other origins before accessing data", async () => {
  const r = await services(
    new Request("https://studio.example/.netlify/functions/studio-services", {
      method: "POST",
      headers: {
        Origin: "https://other.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
  );
  assert.equal(r.status, 403);
});
test("cloud API rejects unauthenticated callers", async () => {
  process.env.SUPABASE_URL = "https://database.example";
  process.env.SUPABASE_ANON_KEY = "sb_publishable_fake";
  try {
    const r = await services(
      new Request("https://studio.example/.netlify/functions/studio-services"),
    );
    assert.equal(r.status, 401);
  } finally {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  }
});
test("practice cannot be invoked through GET", async () => {
  assert.equal(
    (
      await practice(
        new Request("https://studio.example/.netlify/functions/practice"),
      )
    ).status,
    405,
  );
});
test("runtime config refuses a privileged Supabase secret", async () => {
  process.env.SUPABASE_URL = "https://database.example";
  process.env.SUPABASE_ANON_KEY = "sb_secret_privileged-test";
  try {
    const r = await config(
      new Request("https://studio.example/.netlify/functions/runtime-config"),
    );
    assert.equal(r.status, 503);
    assert.doesNotMatch(await r.text(), /sb_secret_privileged/);
  } finally {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  }
});
