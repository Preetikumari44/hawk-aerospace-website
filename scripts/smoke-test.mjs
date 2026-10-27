// End-to-end smoke test through the website's own API routes (browser-equivalent requests).
// Run inside the stack:   docker compose exec frontend node scripts/smoke-test.mjs
// or from the host (Node 18+):  BASE_URL=http://localhost:3000 node frontend/scripts/smoke-test.mjs
// Every record uses the marker below, so it can be found and removed in MySQL afterwards (see README).
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const RUN = Date.now().toString(36);
const MARK = `SMOKE-TEST-${RUN}`;
let failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  -> " + extra : ""}`);
  if (!ok) failed++;
};
const post = async (path, body, headers = {}) => {
  const res = await fetch(BASE + path, { method: "POST", body, headers });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};
const digits = () => String(Math.floor(1e9 + Math.random() * 8e9)); // 10 digits, unique per call

// ---------- Contact ----------
const contact = (o = {}) => JSON.stringify({
  name: MARK, email: `${MARK.toLowerCase()}@example.com`, countryCode: "+91", phone: digits(),
  company: MARK, country: "India", drone: "Yes", message: `Automated smoke test ${MARK}`, website: "", ...o });
const J = { "content-type": "application/json" };
let r = await post("/api/contact", contact(), J);
check("contact: valid submission saved (201, success:true)", r.status === 201 && r.json?.success === true, `${r.status} ${r.json?.referenceId ?? ""}`);
r = await post("/api/contact", contact({ email: "not-an-email" }), J);
check("contact: invalid email rejected, no success", (r.status === 400 || r.status === 422) && r.json?.success !== true, String(r.status));

// ---------- Careers ----------
const pdf = () => new Blob([Buffer.from("%PDF-1.4\n% " + MARK + "\n%%EOF")], { type: "application/pdf" });
const career = (o = {}) => {
  const f = new FormData();
  const v = { fullName: MARK, email: `${MARK.toLowerCase()}-career@example.com`, country: "+91", phoneCode: "+91", phone: digits(),
    residency: "yes", hasExperience: "no", experienceInfo: "", ownDrone: "no", ownDroneInfo: "", willingTravel: "yes",
    visaInvestment: "no", hasLicense: "no", ...o };
  for (const [k, val] of Object.entries(v)) f.append(k, val);
  f.append("cvFile", pdf(), "cv.pdf");
  return f;
};
const careerFields = career();
r = await post("/api/career/applications", careerFields);
check("career: valid application stored (201 CREATED)", r.status === 201 && r.json?.status === "CREATED", `${r.status} id=${r.json?.applicationId ?? ""}`);
const dup = career({ email: `${MARK.toLowerCase()}-career@example.com` });
r = await post("/api/career/applications", dup);
check("career: same e-mail again -> 409 DUPLICATE", r.status === 409 && r.json?.status === "DUPLICATE", String(r.status));
const bad = new FormData(); bad.append("fullName", MARK);
r = await post("/api/career/applications", bad);
check("career: incomplete form rejected (never CREATED)", r.json?.status !== "CREATED" && r.status >= 400, `${r.status} ${r.json?.status}`);

// ---------- Distributor ----------
const dist = (o = {}, file = true) => {
  const f = new FormData();
  const v = { country: "India", city: MARK, companyName: MARK, website: "", businessType: "Drone Dealer", turnover: "Under \u20ac1m", name: MARK,
    jobTitle: "Tester", email: `${MARK.toLowerCase()}-dist@example.com`, countryCode: "+91", phone: digits(), brands: "", message: MARK, ...o };
  for (const [k, val] of Object.entries(v)) f.append(k, val);
  f.append("models[]", "H32X (10L)"); f.append("models[]", "H200 (100L)");
  if (file) f.append("file", pdf(), "profile.pdf");
  return f;
};
r = await post("/api/distributor/applications", dist());
check("distributor: valid application with models + file saved", (r.status === 201 || r.status === 200) && r.json?.success === true, `${r.status} ${r.json?.applicationId ?? ""}`);
r = await post("/api/distributor/applications", dist({ email: "bad" }, false));
check("distributor: invalid e-mail rejected, no success", r.status >= 400 && r.json?.success !== true, String(r.status));

console.log(`\nMarker for cleanup: ${MARK}`);
process.exit(failed ? 1 : 0);
