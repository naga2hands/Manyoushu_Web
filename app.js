const DATA_URL = "manyoushu_dataset/manyoshu_complete_spaced.csv";
const detailFields = ["Poem_Sub_Ctgry", "Matter", "Notes", "Textual_Varients", "Reading_Varient"];
const detailLabels = { Poem_Sub_Ctgry: "Poem Number" };
let poems = [];
let selectedChapter = 1;
let selectedPoem = null;

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index], next = text[index + 1];
    if (character === '"' && quoted && next === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && next === "\n") index += 1; row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
    else cell += character;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift();
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function displayText(value, reading = false) {
  if (!value || !value.trim()) return "No entry recorded.";
  return reading ? value.replace(/\s+/g, "\n") : value;
}

function chapterPoems(chapter) { return poems.filter(poem => Number(poem.Chapter) === chapter); }

function renderChapters() {
  const grid = document.querySelector("#chapter-grid");
  grid.innerHTML = Array.from({ length: 20 }, (_, index) => {
    const chapter = index + 1;
    return `<button class="chapter-tile ${chapter === selectedChapter ? "active" : ""}" data-chapter="${chapter}"><span class="tile-label">CHAPTER</span><span class="tile-number">${chapter}</span><span class="tile-label">${chapterPoems(chapter).length} songs</span></button>`;
  }).join("");
  document.querySelector("#chapter-summary").textContent = `${poems.length.toLocaleString()} songs across 20 chapters`;
  grid.querySelectorAll("button").forEach(button => button.addEventListener("click", () => selectChapter(Number(button.dataset.chapter))));
}

function renderPoems() {
  const query = document.querySelector("#poem-search").value.trim();
  const visible = query ? poems.filter(poem => poem.Poem.includes(query)) : chapterPoems(selectedChapter);
  const grid = document.querySelector("#poem-grid");
  grid.innerHTML = visible.length ? visible.map(poem => `<button class="poem-tile ${selectedPoem === poem ? "active" : ""}" data-poem="${poem.Poem}">${poem.Poem}</button>`).join("") : '<span class="no-results">No song numbers match that filter.</span>';
  grid.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    const poem = poems.find(record => record.Poem === button.dataset.poem);
    selectedChapter = Number(poem.Chapter);
    renderChapters();
    showPoem(poem);
  }));
}

function selectChapter(chapter, scrollToPoem = true) {
  selectedChapter = chapter;
  selectedPoem = null;
  document.querySelector("#poem-search").value = "";
  renderChapters();
  renderPoems();
  showPoem(chapterPoems(chapter)[0], scrollToPoem);
}

function showPoem(poem, scrollToPoem = true) {
  if (!poem) return;
  selectedPoem = poem;
  renderPoems();
  const songs = chapterPoems(selectedChapter);
  const position = songs.indexOf(poem);
  const sideContent = detailFields.map(field => `<div class="text-block"><h3>${detailLabels[field] || field.replaceAll("_", " ")}</h3><p class="${!poem[field] || !poem[field].trim() ? "placeholder" : ""}">${displayText(poem[field])}</p></div>`).join("");
  document.querySelector("#poem-view").innerHTML = `<div class="poem-topline"><div><div class="poem-id">CHAPTER ${poem.Chapter} / SONG ${poem.Poem} / ${position + 1} OF ${songs.length}</div><h2 class="poem-title">${displayText(poem.Poem_Title)}</h2></div><div class="poem-controls"><button id="prev-poem" ${position === 0 ? "disabled" : ""}>← Previous</button><button id="next-poem" ${position === songs.length - 1 ? "disabled" : ""}>Next →</button></div></div><div class="poem-content"><div><div class="text-block original"><h3>Original text</h3><p>${displayText(poem.Original_Text)}</p></div><div class="reading-grid"><div class="text-block"><h3>Kunyomi reading</h3><p>${displayText(poem.Kunyomi_Reading, true)}</p></div><div class="text-block"><h3>Kana transcription</h3><p>${displayText(poem.Kana_Transcription, true)}</p></div></div></div><aside class="side-column">${sideContent}</aside></div>`;
  document.querySelector("#prev-poem").addEventListener("click", () => position > 0 && showPoem(songs[position - 1]));
  document.querySelector("#next-poem").addEventListener("click", () => position < songs.length - 1 && showPoem(songs[position + 1]));
  if (scrollToPoem) document.querySelector("#poem-view").scrollIntoView({ behavior: "smooth", block: "start" });
}

fetch(DATA_URL).then(response => { if (!response.ok) throw new Error("Dataset could not be loaded"); return response.text(); }).then(text => {
  poems = parseCSV(text);
  selectChapter(1, false);
  document.querySelector("#footer-count").textContent = `${poems.length.toLocaleString()} RECORDS`;
}).catch(error => { document.querySelector("#poem-view").innerHTML = `<div class="empty-state"><span class="empty-number">ERROR</span><h2>Dataset unavailable</h2><p>${error.message}. Open this page through a local web server so the browser can load the CSV.</p></div>`; });
document.querySelector("#poem-search").addEventListener("input", renderPoems);