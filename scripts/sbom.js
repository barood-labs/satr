#!/usr/bin/env node
/* Package/Secure: CycloneDX 1.5 SBOM for Satr (zero runtime dependencies, so the SBOM lists the
   application and its shipped files with SHA-256 hashes). Uploaded as a GitLab cyclonedx report. */
"use strict";
const fs = require("fs"), crypto = require("crypto"), path = require("path");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const shipped = ["index.html", "src/satr.js", "src/app.js", "src/styles.css", "cli/satr-cli.js"];
const sha = f => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const deps = Object.entries(pkg.dependencies || {});
const bom = {
  bomFormat: "CycloneDX", specVersion: "1.5", version: 1,
  serialNumber: "urn:uuid:" + crypto.randomUUID(),
  metadata: {
    timestamp: new Date().toISOString(),
    tools: [{ vendor: "Satr", name: "scripts/sbom.js", version: pkg.version }],
    component: { type: "application", name: pkg.name, version: pkg.version, licenses: [{ license: { id: pkg.license } }],
      purl: `pkg:npm/${pkg.name}@${pkg.version}` },
  },
  components: [
    ...shipped.map(f => ({ type: "file", name: f, hashes: [{ alg: "SHA-256", content: sha(f) }] })),
    ...deps.map(([n, v]) => ({ type: "library", name: n, version: String(v).replace(/^[^\d]*/, ""), purl: `pkg:npm/${n}@${String(v).replace(/^[^\d]*/, "")}` })),
  ],
};
fs.mkdirSync("sbom", { recursive: true });
fs.writeFileSync(path.join("sbom", "gl-sbom-satr.cdx.json"), JSON.stringify(bom, null, 2));
console.log(`SBOM: ${bom.components.length} components (${deps.length} runtime dependencies) → sbom/gl-sbom-satr.cdx.json`);
