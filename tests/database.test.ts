import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { sample } from "../lib/studio.ts";
test("database enforces ownership, immutable versions, conflict protection, and practice limits", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202611250001_callcraft.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const owner = "11111111-1111-4111-8111-111111111111",
      other = "22222222-2222-4222-8222-222222222222",
      id = "33333333-3333-4333-8333-333333333333";
    await db.query("insert into auth.users(id) values($1),($2)", [
      owner,
      other,
    ]);
    const { id: _id, archived: _archived, ...document } = sample;
    await db.exec(
      `set role authenticated;set request.jwt.claim.sub='${owner}';`,
    );
    const save = await db.query<{
      callcraft_save_service: { version: number };
    }>("select public.callcraft_save_service($1,$2,false,0)", [id, document]);
    assert.equal(save.rows[0].callcraft_save_service.version, 1);
    await assert.rejects(
      db.query("select public.callcraft_save_service($1,$2,false,0)", [
        id,
        document,
      ]),
      /version conflict/,
    );
    await db.query("select public.callcraft_save_service($1,$2,true,1)", [
      id,
      document,
    ]);
    assert.equal(
      (await db.query("select * from public.callcraft_service_versions")).rows
        .length,
      2,
    );
    await assert.rejects(
      db.query("delete from public.callcraft_service_versions"),
      /permission denied/,
    );
    await db.exec(`set request.jwt.claim.sub='${other}';`);
    assert.equal(
      (await db.query("select * from public.callcraft_current_services")).rows
        .length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.callcraft_service_versions")).rows
        .length,
      0,
    );
    await assert.rejects(
      db.query("select public.callcraft_save_service($1,$2,false,2)", [
        id,
        document,
      ]),
      /Not permitted/,
    );
    await db.exec(`set request.jwt.claim.sub='${owner}';`);
    for (let i = 0; i < 10; i++)
      await db.query("select public.callcraft_reserve_practice()");
    await assert.rejects(
      db.query("select public.callcraft_reserve_practice()"),
      /practice_limit/,
    );
    await db.exec("reset role;set role anon;");
    await assert.rejects(
      db.query("select * from public.callcraft_current_services"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
