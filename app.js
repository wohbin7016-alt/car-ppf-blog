const CONFIG_URL = 'config/synergy.json';
const EXAMPLES_URL = 'config/synergy_examples.json';
const TEMPLATE_URL = 'templates/ppf-blog.md';
let CONFIG = null;
let EXAMPLES = null;
let TEMPLATE = null;
const photos = { before: [], during: [], after: [] };

async function loadResources() {
  const [cfg, tpl, ex] = await Promise.all([
    fetch(CONFIG_URL).then(r => r.json()),
    fetch(TEMPLATE_URL).then(r => r.text()),
    fetch(EXAMPLES_URL).then(r => r.json()).catch(() => ({ examples: [] }))
  ]);
  CONFIG = cfg;
  TEMPLATE = tpl;
  EXAMPLES = ex;
  populateDropdowns();
}

function pickExamples(input, k = 2) {
  const all = (EXAMPLES && EXAMPLES.examples) || [];
  if (!all.length) return [];
  const score = (ex) => {
    let s = 0;
    if (ex.workType === input.workType) s += 5;
    else if (ex.workType && input.workType) {
      if (ex.workType.includes('유광') && input.workType.includes('유광')) s += 3;
      if (ex.workType.includes('무광') && input.workType.includes('무광')) s += 3;
      if (ex.workType.includes('전체') && input.workType.includes('전체')) s += 2;
      if (ex.workType.includes('프론트') && input.workType.includes('프론트')) s += 4;
      if (ex.workType.includes('랩핑') && input.workType.includes('랩핑')) s += 3;
      if (ex.workType.includes('PPF') && input.workType.includes('PPF')) s += 1;
    }
    if (ex.carBrand === input.carBrand) s += 2;
    return s;
  };
  return [...all].sort((a, b) => score(b) - score(a)).slice(0, k);
}

function formatExamples(picked) {
  if (!picked.length) return '(예시 없음 — 규칙만 따라 작성)';
  return picked.map((ex, i) => [
    `## 예시 ${i + 1}: ${ex.title}`,
    `- 차종: ${ex.carBrand} ${ex.carModel}`,
    `- 작업: ${ex.workType}`,
    '',
    '### 본문',
    ex.body,
  ].join('\n')).join('\n\n---\n\n');
}

function populateDropdowns() {
  const brandSel = document.getElementById('carBrand');
  CONFIG.carModels.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.brand;
    opt.textContent = b.brand;
    brandSel.appendChild(opt);
  });
  brandSel.addEventListener('change', updateModelSuggestions);

  const workSel = document.getElementById('workType');
  CONFIG.workTypes.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = w;
    workSel.appendChild(opt);
  });

  const filmSel = document.getElementById('filmBrand');
  CONFIG.filmBrands.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    filmSel.appendChild(opt);
  });

  const reasonsDiv = document.getElementById('visitReasons');
  CONFIG.visitReasons.forEach(r => {
    const lbl = document.createElement('label');
    lbl.innerHTML = `<input type="checkbox" name="visitReason" value="${r.label}"> ${r.label}`;
    reasonsDiv.appendChild(lbl);
  });

  updateModelSuggestions();
}

function updateModelSuggestions() {
  const brand = document.getElementById('carBrand').value;
  const entry = CONFIG.carModels.find(b => b.brand === brand);
  const modelInput = document.getElementById('carModel');
  if (entry && entry.models.length) {
    modelInput.setAttribute('list', 'modelList');
    let dl = document.getElementById('modelList');
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = 'modelList';
      document.body.appendChild(dl);
    }
    dl.innerHTML = entry.models.map(m => `<option value="${m}">`).join('');
  }
}

function setupPhotoZone(type) {
  const zone = document.getElementById(type + 'Zone');
  const input = document.getElementById(type + 'Input');
  const grid = document.getElementById(type + 'Grid');

  zone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') input.click();
  });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = '#0071e3'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = '#d2d2d7'; });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = '#d2d2d7';
    handleFiles(e.dataTransfer.files, type);
  });
  input.addEventListener('change', (e) => handleFiles(e.target.files, type));
}

async function handleFiles(files, type) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const resized = await resizeImage(file, 1200);
    photos[type].push({ name: file.name, dataUrl: resized });
  }
  renderPhotos(type);
}

function resizeImage(file, maxDim) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = (height * maxDim) / width; width = maxDim; }
          else { width = (width * maxDim) / height; height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotos(type) {
  const zone = document.getElementById(type + 'Zone');
  const grid = document.getElementById(type + 'Grid');
  const p = zone.querySelector('p');

  if (photos[type].length === 0) {
    grid.style.display = 'none';
    p.style.display = 'block';
    zone.classList.remove('has-photos');
    grid.innerHTML = '';
    return;
  }

  zone.classList.add('has-photos');
  p.style.display = 'none';
  grid.style.display = 'grid';
  grid.innerHTML = photos[type].map((ph, i) =>
    `<div class="photo-item"><img src="${ph.dataUrl}"><button onclick="removePhoto('${type}', ${i})">×</button></div>`
  ).join('');
}

window.removePhoto = (type, i) => {
  photos[type].splice(i, 1);
  renderPhotos(type);
};

function initKeySave() {
  const apiKeyInput = document.getElementById('apiKey');
  const saved = localStorage.getItem('gemini_api_key');
  if (saved) apiKeyInput.value = saved;

  document.getElementById('saveKey').addEventListener('click', () => {
    const v = apiKeyInput.value.trim();
    if (!v) return;
    localStorage.setItem('gemini_api_key', v);
    showStatus('keyStatus', 'ok', '저장됨. 이 브라우저에만 저장됩니다.');
  });
}

function showStatus(id, type, msg) {
  const el = document.getElementById(id);
  el.className = 'status ' + type;
  el.textContent = msg;
}

function buildInputJson() {
  const visitReasons = Array.from(document.querySelectorAll('input[name="visitReason"]:checked')).map(c => c.value);
  return {
    region: document.getElementById('region').value,
    carBrand: document.getElementById('carBrand').value,
    carModel: document.getElementById('carModel').value,
    carColor: document.getElementById('carColor').value,
    workType: document.getElementById('workType').value,
    filmBrand: document.getElementById('filmBrand').value,
    visitReasons,
    notes: document.getElementById('notes').value,
    photoCount: { before: photos.before.length, during: photos.during.length, after: photos.after.length }
  };
}

async function callGemini(apiKey, prompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.85, maxOutputTokens: 32768, responseMimeType: 'application/json' }
  };
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const cand = data.candidates?.[0];
  const text = cand?.content?.parts?.[0]?.text;
  const finish = cand?.finishReason;
  if (!text) throw new Error(`Empty response (finishReason=${finish || 'unknown'})`);
  try {
    return JSON.parse(text);
  } catch (e) {
    const repaired = repairJson(text);
    if (repaired) return repaired;
    if (finish && finish !== 'STOP') {
      throw new Error(`응답이 잘렸습니다 (${finish}). 사진/메모 줄이거나 다시 시도하세요.`);
    }
    throw new Error(`JSON 파싱 실패: ${e.message}`);
  }
}

function repairJson(text) {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) t = fence[1].trim();
  try { return JSON.parse(t); } catch (_) {}
  const start = t.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false, lastGood = -1;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { lastGood = i; break; } }
  }
  if (lastGood > 0) {
    try { return JSON.parse(t.slice(start, lastGood + 1)); } catch (_) {}
  }
  if (inStr) {
    const truncated = t.slice(start) + '"}';
    try { return JSON.parse(truncated); } catch (_) {}
  }
  return null;
}

async function generate() {
  const apiKey = localStorage.getItem('gemini_api_key') || document.getElementById('apiKey').value.trim();
  if (!apiKey) { alert('Gemini API 키를 먼저 입력/저장하세요.'); return; }

  const input = buildInputJson();
  if (!input.carModel) { alert('차종 모델을 입력하세요.'); return; }

  const btn = document.getElementById('generate');
  btn.disabled = true;
  btn.textContent = '⏳ 생성 중... (15~30초)';

  try {
    const picked = pickExamples(input, 2);
    const examplesText = formatExamples(picked);
    const prompt = TEMPLATE
      .replace('{{EXAMPLES}}', examplesText)
      .replace('{{INPUT_JSON}}', JSON.stringify(input, null, 2));
    console.log('[few-shot] 사용 예시:', picked.map(p => p.title));
    const result = await callGemini(apiKey, prompt);
    renderResult(result);
  } catch (err) {
    alert('생성 실패: ' + err.message);
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = '▶ 블로그 글 생성하기';
  }
}

function renderResult(result) {
  document.getElementById('resultCard').style.display = 'block';
  document.getElementById('rTitle').textContent = result.title;
  document.getElementById('rBody').textContent = result.body;
  document.getElementById('rHashtags').textContent = result.hashtags;
  window.__lastResult = result;
  document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth' });
}

function setupActions() {
  document.getElementById('generate').addEventListener('click', generate);
  document.getElementById('copyTitle').addEventListener('click', () => {
    navigator.clipboard.writeText(window.__lastResult.title);
    toastCopied();
  });
  document.getElementById('copyBody').addEventListener('click', () => {
    navigator.clipboard.writeText(window.__lastResult.body);
    toastCopied();
  });
  document.getElementById('copyAll').addEventListener('click', () => {
    const r = window.__lastResult;
    navigator.clipboard.writeText(`${r.title}\n\n${r.body}\n\n${r.hashtags}`);
    toastCopied();
  });
  document.getElementById('downloadMd').addEventListener('click', () => {
    const r = window.__lastResult;
    const md = `# ${r.title}\n\n${r.body}\n\n${r.hashtags}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${r.title.replace(/[/\\?*:|"<>]/g, '-')}.md`;
    a.click();
  });
  document.getElementById('regenerate').addEventListener('click', generate);
  document.getElementById('downloadZip').addEventListener('click', downloadPhotosZip);
  document.getElementById('exportNaver').addEventListener('click', exportToNaver);
}

function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function downloadPhotosZip() {
  const all = [...photos.before, ...photos.during, ...photos.after];
  if (!all.length) { alert('업로드된 사진이 없습니다.'); return; }
  if (typeof JSZip === 'undefined') { alert('JSZip 로드 실패 — 새로고침 후 다시 시도하세요.'); return; }
  const zip = new JSZip();
  photos.before.forEach((ph, i) => {
    zip.file(`01_before_${String(i+1).padStart(2,'0')}.jpg`, dataUrlToBlob(ph.dataUrl));
  });
  photos.during.forEach((ph, i) => {
    zip.file(`02_during_${String(i+1).padStart(2,'0')}.jpg`, dataUrlToBlob(ph.dataUrl));
  });
  photos.after.forEach((ph, i) => {
    zip.file(`03_after_${String(i+1).padStart(2,'0')}.jpg`, dataUrlToBlob(ph.dataUrl));
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ppf-photos-${Date.now()}.zip`;
  a.click();
}

async function exportToNaver() {
  const r = window.__lastResult;
  if (!r) { alert('먼저 글을 생성하세요.'); return; }
  await navigator.clipboard.writeText(`${r.title}\n\n${r.body}\n\n${r.hashtags}`);
  if (photos.before.length || photos.during.length || photos.after.length) {
    await downloadPhotosZip();
  }
  toastCopied();
  setTimeout(() => {
    window.open('https://blog.naver.com/GoBlogWrite.naver', '_blank');
  }, 400);
}

function toastCopied() {
  const t = document.createElement('div');
  t.textContent = '✓ 복사됨';
  t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#000;color:#fff;padding:10px 20px;border-radius:20px;z-index:9999;';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1500);
}

(async () => {
  await loadResources();
  setupPhotoZone('before');
  setupPhotoZone('during');
  setupPhotoZone('after');
  initKeySave();
  setupActions();
})();
