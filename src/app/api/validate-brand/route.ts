import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { brandName } = await req.json();

    if (!brandName) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    }

    // Simulate search logic
    // In a real scenario, you'd use SerpApi, Google Custom Search, etc.
    // For now, we'll mock a search. If the brand name is "NON_EXISTENT_BRAND", we'll fail it.
    
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (brandName.toUpperCase() === "NON_EXISTENT_BRAND") {
      return NextResponse.json({ 
        isValid: false, 
        message: "We couldn't find any evidence of this brand online. Please double check the name." 
      });
    }

    return NextResponse.json({ 
      isValid: true, 
      message: "Brand validated via online search." 
    });

  } catch (error) {
    console.error("Brand validation error:", error);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
