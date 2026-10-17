(function () {
  const $ = id => document.getElementById(id);
  let text = "", name = "subtitles.srt";
  const enabled = Object.fromEntries(Satr.RULES.map(r => [r.id, true]));
  const esc = s => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  function render() {
    const r = Satr.analyze(text, enabled);
    $("s-fixes").textContent = r.total; $("s-cues").textContent = r.cueCount; $("s-warn").textContent = r.warnings.length;
    $("rules").innerHTML = Satr.RULES.map(x => `<span class="chip ${enabled[x.id] ? "" : "off"}" data-id="${x.id}" title="${x.ar}"><b>${r.counts[x.id]}</b> ${x.en}</span>`).join("");
    $("cues").innerHTML = r.rows.map(row => `
      <div class="cue"><div class="meta">#${esc(row.id)} · ${esc(row.timing)}
        ${row.hits.map(h => `<span class="tag">${h}</span>`).join("")}
        ${row.warnings.map(w => `<span class="tag w">${esc(w.en)}</span>`).join("")}</div>
        <div class="player before">${row.before.map(l => `<div>${esc(l)}</div>`).join("")}</div>
        <div class="player after">${row.after.map(l => `<div>${esc(l)}</div>`).join("")}</div></div>`).join("");
    $("download").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["\uFEFF" + r.output], { type: "text/plain;charset=utf-8" }));
      a.download = name.replace(/(\.\w+)$/, ".fixed$1"); a.click();
    };
    $("drop").hidden = true; $("results").hidden = false;
  }
  function load(t, n) { text = t; name = n || name; render(); }
  $("rules").onclick = e => { const c = e.target.closest(".chip"); if (c) { enabled[c.dataset.id] = !enabled[c.dataset.id]; render(); } };
  $("file").onchange = e => { const f = e.target.files[0]; if (f) f.text().then(t => load(t, f.name)); };
  $("sample").onclick = () => fetch("samples/sample_ar.srt").then(r => r.text()).then(t => load(t, "sample_ar.srt")).catch(() => alert("Serve the folder (npm start) to load the sample."));
  $("reset").onclick = () => { $("drop").hidden = false; $("results").hidden = true; $("file").value = ""; };
  const d = $("drop");
  ["dragenter", "dragover"].forEach(ev => d.addEventListener(ev, e => { e.preventDefault(); d.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => d.addEventListener(ev, e => { e.preventDefault(); d.classList.remove("over"); }));
  d.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) f.text().then(t => load(t, f.name)); });
  window.SatrApp = { load };
})();
