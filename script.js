/* Elements */
const fileInput = document.getElementById("fileInput");
const fileButton = document.getElementById("fileButton");
const editor = document.getElementById("editor");
const editorContainer = document.getElementById("editorContainer");
const updateButton = document.getElementById("updateButton");
const saveButton = document.getElementById("saveButton");
const editButton = document.getElementById("editButton");
const closeButton = document.getElementById("closeButton");
const fechasDiv = document.getElementById("fechas");
const themeSelector = document.getElementById("theme");

/* State */
let contenidoOriginal = "";
let temaActual = "monokai";
let originalFileName = "UDC Fechas.txt";

/* Theme functions */
function aplicarTema(tema) {
  tema = (tema || "monokai").toLowerCase();
  // validate allowed themes
  const allowed = ["light","dark","neon","grayscale","monokai"];
  if (!allowed.includes(tema)) tema = "monokai";
  document.body.className = tema;
  themeSelector.value = tema;
  temaActual = tema;
}
themeSelector.addEventListener("change", () => aplicarTema(themeSelector.value));

/* Open file picker */
fileButton.addEventListener("click", () => fileInput.click());

/* Parse TXT and build UI */
function procesarContenido(contenido) {
  const secciones = {};
  let materiaActual = null;
  let inConfig = false;

  const lineas = contenido.split(/\r?\n/);
  for (let raw of lineas) {
    let linea = raw.trim();
    if (!linea) { continue; }
    if (linea.startsWith("#") || /^-+$/.test(linea)) { continue; }

    // [Config] block
    if (/^\[Config\]/i.test(linea)) {
      materiaActual = "Config";
      inConfig = true;
      if (!secciones[materiaActual]) secciones[materiaActual] = { data: {} };
      continue;
    }

    // new materia
    if (/^\[.*\]$/.test(linea)) {
      materiaActual = linea.replace(/^\[|\]$/g, "").trim();
      inConfig = false;
      secciones[materiaActual] = { links: {}, eventos: [] };
      continue;
    }

    if (materiaActual === "Config" || inConfig) {
      // look for Tema = ...
      const mTema = linea.match(/^Tema\s*=\s*(\w+)/i);
      if (mTema) {
        const tema = mTema[1].toLowerCase();
        if (tema !== temaActual) aplicarTema(tema);
        secciones["Config"].data["Tema"] = tema;
      }
      continue;
    }

    // inside a materia
    if (materiaActual) {
      // link detection: e.g. General = https://...
      const matchLink = linea.match(/^(\w+)\s*=\s*(https?:\/\/\S+)/i);
      if (matchLink) {
        secciones[materiaActual].links[matchLink[1]] = matchLink[2];
        continue;
      }

      // otherwise it's an event line
      let clase = "";
      const textoLower = linea.toLowerCase();
      if (textoLower.includes("tp") || textoLower.includes("trabajo")) {
        clase = (textoLower.includes("entregado") || textoLower.includes("finalizado")) ? "tp-entregado" : "tp";
      }
      if (textoLower.includes("parcial") || textoLower.includes("final") || textoLower.includes("examen")) {
        clase = (textoLower.includes("listo")) ? "examen-listo" : "examen";
      }
      secciones[materiaActual].eventos.push({ texto: linea, clase });
    }
  }

  // build HTML
  let html = "";
  for (const materia in secciones) {
    if (materia === "Config") continue;
    const node = secciones[materia];
    html += `<div class="materia"><h4>${materia}</h4>`;

    // determine dominant class for buttons (prefer green delivered, then tp, then exam-listo, then exam)
    let dominant = "";
    const eventos = node.eventos || [];
    if (eventos.some(e => e.clase === "tp-entregado")) dominant = "tp-entregado";
    else if (eventos.some(e => e.clase === "tp")) dominant = "tp";
    else if (eventos.some(e => e.clase === "examen-listo")) dominant = "examen-listo";
    else if (eventos.some(e => e.clase === "examen")) dominant = "examen";

    if (node.links && node.links.General) {
      html += `<a target="_blank" href="${node.links.General}" class="${dominant}">General</a>`;
    }
    if (node.links && node.links.Virtual) {
      html += `<a target="_blank" href="${node.links.Virtual}" class="${dominant}">Virtual</a>`;
    }

    html += `<div class="eventos"><ul>`;
    (node.eventos || []).forEach(ev => {
      const cls = ev.clase ? ev.clase : "";
      html += `<li class="${cls}">${ev.texto}</li>`;
    });
    html += `</ul></div></div>`;
  }

  fechasDiv.innerHTML = html;
}

/* File loaded */
fileInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    originalFileName = file.name || originalFileName;
    editor.value = text;
    contenidoOriginal = text;

    // reset editor UI: hide editor, show Edit button, hide update/save/close
    editorContainer.style.display = "none";
    editButton.style.display = "inline-block";
    editButton.disabled = false;

    updateButton.style.display = "none";
    updateButton.disabled = true;
    saveButton.style.display = "none";
    saveButton.disabled = true;
    closeButton.style.display = "none";
    closeButton.disabled = true;

    // process content (this will also pick up [Config] Tema = ...)
    procesarContenido(text);
  };
  reader.readAsText(file);
});

/* Edit - show editor and action buttons */
editButton.addEventListener("click", () => {
  editorContainer.style.display = "block";
  editButton.style.display = "none";

  updateButton.style.display = "inline-block";
  updateButton.disabled = false;

  saveButton.style.display = "inline-block";
  saveButton.disabled = false;

  closeButton.style.display = "inline-block";
  closeButton.disabled = false;

  // ensure theme selector reflects current theme
  themeSelector.value = temaActual;

  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* Close - warns if unsaved changes */
closeButton.addEventListener("click", () => {
  if (editor.value !== contenidoOriginal) {
    const ok = confirm("Hay cambios sin guardar. ¿Seguro que deseas cerrar y perder esos cambios?");
    if (!ok) return;
  }
  // hide editor and show Edit again
  editorContainer.style.display = "none";
  editButton.style.display = "inline-block";
  editButton.disabled = false;

  updateButton.style.display = "none";
  updateButton.disabled = true;

  saveButton.style.display = "none";
  saveButton.disabled = true;

  closeButton.style.display = "none";
  closeButton.disabled = true;
});

/* Update (apply changes to UI without downloading) */
updateButton.addEventListener("click", () => {
  procesarContenido(editor.value);
  contenidoOriginal = editor.value; // treat as applied
  alert("Contenido actualizado en la página.");
});

/* Save (download file). Also writes/updates [Config] Tema = ... in the text before saving */
saveButton.addEventListener("click", () => {
  let texto = editor.value || "";

  // Normalize line endings
  texto = texto.replace(/\r\n/g, "\n");

  // If [Config] exists -> replace or insert Tema line
  if (/\[Config\]/i.test(texto)) {
    // If Tema line exists, replace it
    if (/^Tema\s*=.*$/gim.test(texto)) {
      texto = texto.replace(/^Tema\s*=.*$/gim, `Tema = ${temaActual}`);
    } else {
      // inject Tema after [Config]
      texto = texto.replace(/\[Config\]/i, `[Config]\nTema = ${temaActual}`);
    }
  } else {
    // prepend config at top
    texto = `[Config]\nTema = ${temaActual}\n\n` + texto;
  }

  // Build filename for download (do not overwrite original automatically)
const downloadName = originalFileName || "UDC Fechas.txt";
  const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);

  // update originals
  contenidoOriginal = texto;
  editor.value = texto;

  alert(`Archivo listo para descargar: "${downloadName}"`);
});
