'use server';

import { getDirectBackendBaseUrl } from "@/lib/backend-url";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function submitComplaint(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    throw new Error("You must be logged in to file a complaint");
  }

  const proofUrls = JSON.parse(formData.get("proofUrls") as string || "[]");
  const payload = {
    type: formData.get("type") as string,
    details: formData.get("details") as string,
    brandName: formData.get("brandName") as string,
    proofUrls: proofUrls,
    externalLinks: JSON.parse(formData.get("externalLinks") as string | null || "[]"),
    image_url: proofUrls.length > 0 ? proofUrls[0] : null,
  };
  console.log("Submitting complaint payload:", JSON.stringify(payload, null, 2));

  const apiBase = getDirectBackendBaseUrl();
  try {
    const res = await fetch(`${apiBase}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": session.user.email,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Unknown error" }));
      const errorMessage = typeof errorData.detail === 'string' 
        ? errorData.detail 
        : `Backend submission failed: ${res.status}`;
      
      console.error(`Backend submission failed: ${res.status} - ${JSON.stringify(errorData)}`);
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (err) {
    console.error("Submission error:", err);
    return { success: false, error: "Failed to connect to the complaint service." };
  }
}
