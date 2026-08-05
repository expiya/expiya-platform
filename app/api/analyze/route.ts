import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(request: Request) {
  console.log("========== Expiya Analyze ==========");
  console.log("API Key exists:", !!process.env.OPENAI_API_KEY);

  try {
    const body = await request.json();
    const query = body.query;

    if (!query) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 }
      );
    }

    console.log("User Query:", query);

    const response = await openai.responses.create({
      model: "gpt-5.5",
      input: `You are an automotive purchasing expert.

Customer request:
${query}

Answer in one short sentence.`,
    });

    console.log("OpenAI request successful.");

    return NextResponse.json({
      success: true,
      output: response.output_text,
    });

  } catch (error) {
    console.error("========== OPENAI ERROR ==========");
    console.error(error);
    console.error("==================================");

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}