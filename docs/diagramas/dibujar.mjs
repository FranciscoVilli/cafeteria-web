// Dibuja cada diagrama Mermaid como PNG (2x) en ./png y guarda la fuente .mmd en ./mmd.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { DIAGRAMAS } from "./diagramas.mjs";

mkdirSync("png", { recursive: true });
mkdirSync("mmd", { recursive: true });
const mermaid = readFileSync("node_modules/mermaid/dist/mermaid.min.js", "utf8");
const solo = process.argv[2];
const nav = await chromium.launch({ channel: "chrome" });
const p = await nav.newPage({ deviceScaleFactor: 2, viewport: { width: 1400, height: 1000 } });
await p.setContent(`<html><body style="margin:0;background:#fff"><div id="d" style="display:inline-block;padding:12px"></div></body></html>`);
await p.addScriptTag({ content: mermaid });
await p.evaluate(() => {
  window.mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    securityLevel: "loose",
    fontFamily: "Arial",
    themeVariables: {
      fontFamily: "Arial",
      fontSize: "15px",
      primaryColor: "#EAF1F8",
      primaryBorderColor: "#1F4E79",
      primaryTextColor: "#1A2B3C",
      lineColor: "#1F4E79",
      secondaryColor: "#F6F9FC",
      tertiaryColor: "#FFFFFF",
      clusterBkg: "#F6F9FC",
      clusterBorder: "#7F8C9A",
      noteBkgColor: "#FFF8E6",
      noteBorderColor: "#C9A227",
      actorBkg: "#EAF1F8",
      actorBorder: "#1F4E79",
      labelBoxBkgColor: "#EAF1F8",
      labelBoxBorderColor: "#1F4E79",
      altSectionBkgColor: "#F6F9FC",
    },
    flowchart: { curve: "basis", padding: 12, nodeSpacing: 40, rankSpacing: 45 },
    sequence: { mirrorActors: false, actorMargin: 30, messageFontSize: 14, noteFontSize: 13 },
    er: { fontSize: 13 },
    class: { padding: 8 },
  });
});
for (const [nombre, fuente] of Object.entries(DIAGRAMAS)) {
  if (solo && !nombre.startsWith(solo)) continue;
  writeFileSync(`mmd/${nombre}.mmd`, fuente + "\n");
  const ok = await p.evaluate(async ({ nombre, fuente }) => {
    const d = document.getElementById("d");
    try {
      const { svg } = await window.mermaid.render("g" + nombre.replace(/\W/g, ""), fuente);
      d.innerHTML = svg;
      const s = d.querySelector("svg");
      s.style.maxWidth = "none"; const vb = s.viewBox.baseVal; s.setAttribute("width", vb.width); s.setAttribute("height", vb.height);
      return true;
    } catch (e) {
      return String(e.message || e);
    }
  }, { nombre, fuente });
  if (ok !== true) { console.log(`✖ ${nombre}: ${ok}`); continue; }
  await p.locator("#d").screenshot({ path: `png/${nombre}.png` });
  const t = await p.locator("#d").boundingBox();
  console.log(`✔ ${nombre} ${Math.round(t.width)}x${Math.round(t.height)}`);
}
await nav.close();
