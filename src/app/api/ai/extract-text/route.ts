import { extractTextFromPdfBuffer, extractTextFromUrl } from "@/lib/ai/extract-document-text";
import { getAuthUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { NextResponse } from "next/server";

const log = createLogger("api/ai/extract-text");

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;

    if (!file && !url) {
      return NextResponse.json(
        { error: "Provide either a PDF file or a URL" },
        { status: 400 },
      );
    }

    const extractedText = file
      ? await extractTextFromPdfBuffer(Buffer.from(await file.arrayBuffer()))
      : await extractTextFromUrl(url!);

    return NextResponse.json({ text: extractedText });
  } catch (err) {
    log.error("Text extraction error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
