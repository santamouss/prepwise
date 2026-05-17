import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("usage_events migration contract", () => {
  it("uses ON DELETE SET NULL for session_id so deletes do not remove usage", async () => {
    const sql = await readFile(
      new URL("../supabase/migrations/005_usage_events.sql", import.meta.url),
      "utf8",
    );
    assert.match(sql, /session_id uuid REFERENCES sessions\(id\) ON DELETE SET NULL/);
    assert.match(sql, /UNIQUE \(user_id, session_id, event_type\)/);
  });
});
