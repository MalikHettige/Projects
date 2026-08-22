// ---------- progress persistence ----------
const STORAGE_KEY = "vulnQueueProgress";

function loadProgress(){
  let saved = {};
  try{
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  }catch(e){
    saved = {};
  }
  WORDS.forEach(w => {
    if(!saved[w.id]){
      saved[w.id] = { status: "new", box: 0 };
    }
  });
  return saved;
}

function saveProgress(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

let progress = loadProgress();
let streak = Number(localStorage.getItem("vulnQueueStreak") || 0);
let currentWord = null;
let flipped = false;

// ---------- stats ----------
function renderStats(){
  let counts = { new: 0, retest: 0, resolved: 0 };
  WORDS.forEach(w => counts[progress[w.id].status]++);

  document.getElementById("stat-new").textContent = counts.new;
  document.getElementById("stat-retest").textContent = counts.retest;
  document.getElementById("stat-resolved").textContent = counts.resolved;

  const pct = Math.round((counts.resolved / WORDS.length) * 100);
  document.getElementById("progressFill").style.width = pct + "%";

  document.getElementById("streak").textContent = "streak: " + streak;
  document.getElementById("quizStreak").textContent = "streak: " + streak;
}

// ---------- weighted word picker ----------
function pickNextWord(excludeId){
  let pool = [];
  WORDS.forEach(w => {
    const status = progress[w.id].status;
    let weight = 1;
    if(status === "new") weight = 4;
    else if(status === "retest") weight = 5;
    else weight = 1; // resolved still shows up sometimes to keep it fresh
    if(w.id === excludeId) weight = Math.max(1, Math.floor(weight / 3));
    for(let i = 0; i < weight; i++) pool.push(w);
  });
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------- flashcard mode ----------
function renderCard(){
  currentWord = pickNextWord(currentWord ? currentWord.id : null);
  flipped = false;
  document.getElementById("card").classList.remove("flipped");

  const status = progress[currentWord.id].status;

  document.getElementById("frontId").textContent = currentWord.id;
  document.getElementById("frontTerm").textContent = currentWord.term;
  const badge = document.getElementById("frontStatus");
  badge.textContent = status;
  badge.className = "statusBadge " + status;

  document.getElementById("backId").textContent = currentWord.id;
  document.getElementById("backDefinition").textContent = currentWord.definition;
  document.getElementById("backExample").textContent = currentWord.example;

  renderStats();
}

function flipCard(){
  flipped = !flipped;
  document.getElementById("card").classList.toggle("flipped", flipped);
}

function markWord(newStatus){
  progress[currentWord.id].status = newStatus;
  progress[currentWord.id].box = newStatus === "resolved" ? progress[currentWord.id].box + 1 : 0;
  saveProgress();

  if(newStatus === "resolved"){
    streak++;
    const stamp = document.getElementById("stamp");
    stamp.classList.remove("play");
    void stamp.offsetWidth; // restart animation
    stamp.classList.add("play");
  } else {
    streak = 0;
  }
  localStorage.setItem("vulnQueueStreak", streak);

  setTimeout(renderCard, newStatus === "resolved" ? 550 : 150);
}

// ---------- quiz mode ----------
function renderQuiz(){
  currentWord = pickNextWord(currentWord ? currentWord.id : null);
  document.getElementById("quizId").textContent = currentWord.id;
  document.getElementById("quizTerm").textContent = currentWord.term;
  document.getElementById("quizFeedback").textContent = "";

  let distractors = WORDS.filter(w => w.id !== currentWord.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(w => w.definition);

  let options = [...distractors, currentWord.definition].sort(() => Math.random() - 0.5);

  const wrap = document.getElementById("quizOptions");
  wrap.innerHTML = "";
  options.forEach(optionText => {
    const btn = document.createElement("button");
    btn.className = "quizOption";
    btn.textContent = optionText;
    btn.onclick = () => handleQuizAnswer(btn, optionText, options);
    wrap.appendChild(btn);
  });

  renderStats();
}

function handleQuizAnswer(button, chosenText, allOptions){
  const isCorrect = chosenText === currentWord.definition;
  const buttons = document.querySelectorAll(".quizOption");
  buttons.forEach(b => b.disabled = true);

  buttons.forEach(b => {
    if(b.textContent === currentWord.definition) b.classList.add("correct");
  });
  if(!isCorrect) button.classList.add("wrong");

  const feedback = document.getElementById("quizFeedback");

  if(isCorrect){
    progress[currentWord.id].status = "resolved";
    progress[currentWord.id].box += 1;
    streak++;
    feedback.textContent = "Resolved.";
  } else {
    progress[currentWord.id].status = "retest";
    progress[currentWord.id].box = 0;
    streak = 0;
    feedback.textContent = "Marked for retest.";
  }
  saveProgress();
  localStorage.setItem("vulnQueueStreak", streak);

  setTimeout(renderQuiz, 900);
}

// ---------- mode switching ----------
function setMode(mode){
  const isFlash = mode === "flash";
  document.getElementById("flashMode").classList.toggle("hidden", !isFlash);
  document.getElementById("quizMode").classList.toggle("hidden", isFlash);
  document.getElementById("tab-flash").classList.toggle("active", isFlash);
  document.getElementById("tab-quiz").classList.toggle("active", !isFlash);
  document.getElementById("tab-flash").setAttribute("aria-selected", isFlash);
  document.getElementById("tab-quiz").setAttribute("aria-selected", !isFlash);

  if(isFlash) renderCard(); else renderQuiz();
}

// ---------- reset ----------
function resetProgress(){
  if(!confirm("Reset all progress back to New?")) return;
  progress = {};
  WORDS.forEach(w => progress[w.id] = { status: "new", box: 0 });
  saveProgress();
  streak = 0;
  localStorage.setItem("vulnQueueStreak", 0);
  const isFlash = !document.getElementById("flashMode").classList.contains("hidden");
  if(isFlash) renderCard(); else renderQuiz();
}

// ---------- wire up events ----------
document.getElementById("card").addEventListener("click", flipCard);
document.getElementById("card").addEventListener("keydown", e => {
  if(e.key === "Enter" || e.key === " "){ e.preventDefault(); flipCard(); }
});
document.getElementById("btnRetest").addEventListener("click", e => { e.stopPropagation(); markWord("retest"); });
document.getElementById("btnResolve").addEventListener("click", e => { e.stopPropagation(); markWord("resolved"); });
document.getElementById("resetBtn").addEventListener("click", resetProgress);
document.getElementById("resetBtnQuiz").addEventListener("click", resetProgress);
document.getElementById("tab-flash").addEventListener("click", () => setMode("flash"));
document.getElementById("tab-quiz").addEventListener("click", () => setMode("quiz"));

// stop clicks inside the back-face buttons from also triggering the flip
document.querySelectorAll(".actions").forEach(el => el.addEventListener("click", e => e.stopPropagation()));

// ---------- init ----------
renderCard();
