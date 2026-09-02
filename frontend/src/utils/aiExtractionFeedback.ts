let activeCount = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const ROOT_ID = 'medex-ai-extraction-overlay';

function ensureStyles() {
  const id = `${ROOT_ID}-styles`;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    @keyframes medex-ai-spin { to { transform: rotate(360deg); } }
    @keyframes medex-ai-pulse { 0%,100% { opacity:.55; } 50% { opacity:1; } }
    #${ROOT_ID} { position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; background:rgba(15,23,42,.38); backdrop-filter:blur(3px); padding:20px; }
    #${ROOT_ID} .medex-ai-card { width:min(430px,100%); border-radius:18px; background:#fff; border:1px solid #dbeafe; box-shadow:0 24px 70px rgba(15,23,42,.24); padding:24px; }
    #${ROOT_ID} .medex-ai-row { display:flex; gap:14px; align-items:flex-start; }
    #${ROOT_ID} .medex-ai-spinner { width:38px; height:38px; flex:0 0 auto; border:4px solid #dbeafe; border-top-color:#2563eb; border-radius:999px; animation:medex-ai-spin .8s linear infinite; }
    #${ROOT_ID} .medex-ai-title { margin:0; font-size:17px; font-weight:700; color:#0f172a; }
    #${ROOT_ID} .medex-ai-text { margin:5px 0 0; font-size:13px; line-height:1.5; color:#475569; }
    #${ROOT_ID} .medex-ai-track { height:7px; margin-top:18px; border-radius:999px; overflow:hidden; background:#eff6ff; }
    #${ROOT_ID} .medex-ai-bar { height:100%; width:34%; border-radius:999px; background:linear-gradient(90deg,#2563eb,#60a5fa); transition:width .55s ease; }
    #${ROOT_ID} .medex-ai-hint { margin-top:10px; font-size:12px; color:#64748b; animation:medex-ai-pulse 1.6s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
}

const messages = [
  'Reading the recruitment PDF…',
  'Identifying posts, departments and vacancies…',
  'Extracting qualifications, salary and dates…',
  'Structuring the data for review…',
];

export function beginAiExtractionFeedback(label = 'Extracting job data with Gemini') {
  if (typeof document === 'undefined') return;
  activeCount += 1;
  if (document.getElementById(ROOT_ID)) return;
  ensureStyles();
  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  root.innerHTML = `
    <div class="medex-ai-card">
      <div class="medex-ai-row">
        <div class="medex-ai-spinner"></div>
        <div>
          <p class="medex-ai-title">${label}</p>
          <p class="medex-ai-text" data-ai-message>${messages[0]}</p>
        </div>
      </div>
      <div class="medex-ai-track"><div class="medex-ai-bar" data-ai-bar></div></div>
      <div class="medex-ai-hint">This usually takes around 10–20 seconds. Please keep this page open.</div>
    </div>`;
  document.body.appendChild(root);

  let step = 0;
  timer = setInterval(() => {
    step = Math.min(step + 1, messages.length - 1);
    const message = root.querySelector<HTMLElement>('[data-ai-message]');
    const bar = root.querySelector<HTMLElement>('[data-ai-bar]');
    if (message) message.textContent = messages[step];
    if (bar) bar.style.width = `${34 + step * 18}%`;
  }, 3200);
}

export function endAiExtractionFeedback() {
  if (typeof document === 'undefined') return;
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount > 0) return;
  if (timer) clearInterval(timer);
  timer = null;
  document.getElementById(ROOT_ID)?.remove();
}
