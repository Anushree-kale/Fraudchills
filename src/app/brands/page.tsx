"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type BrandSummary = {
  brandName: string;
  totalComplaints: number;
  avgRiskScore: number;
  riskLabel: string;
};

export default function BrandsPage() {
  const { data: session } = useSession();
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [name, setName] = useState("");
  const [gst, setGst] = useState("");
  const [doc, setDoc] = useState("");

  async function loadBrands() {
    const res = await fetch("http://127.0.0.1:8000/brands", { cache: "no-store" });
    if (res.ok) setBrands(await res.json());
  }

  useEffect(() => {
    loadBrands();
  }, []);

  async function submitClaim() {
    if (!session?.user?.email) {
      alert("Login required to claim a brand.");
      return;
    }
    const res = await fetch("http://127.0.0.1:8000/brands/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": session.user.email,
      },
      body: JSON.stringify({ name, gstNumber: gst, verificationDocUrl: doc }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(body?.detail || "Claim failed");
      return;
    }
    alert(body?.message || "Claim submitted");
  }

  return (
    <main className="container app-page">
      <h1>Brands</h1>
      <p className="app-muted">Directory from the API and claim flow for verified responses.</p>

      <section className="card" style={{ marginBottom: "1rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.05rem" }}>
          Claim your brand
        </h2>
        <div className="grid-2">
          <input className="form-input" placeholder="Brand name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="form-input" placeholder="GST number" value={gst} onChange={(e) => setGst(e.target.value)} />
        </div>
        <input
          className="form-input"
          style={{ marginTop: "0.75rem" }}
          placeholder="Verification document URL"
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
        />
        <button type="button" className="btn-primary" style={{ marginTop: "0.75rem" }} onClick={submitClaim}>
          Submit claim
        </button>
      </section>

      <section className="card">
        <h2 className="section-title" style={{ fontSize: "1.05rem" }}>
          Directory
        </h2>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {brands.map((b, i) => (
            <div key={i}>
              <b>{b.brandName}</b> — {b.totalComplaints} complaints · avg risk {b.avgRiskScore} ({b.riskLabel})
            </div>
          ))}
          {!brands.length && <p className="app-muted">No brands found.</p>}
        </div>
      </section>
    </main>
  );
}
