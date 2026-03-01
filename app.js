import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyASzTA9EgJNoIf8FPzzkTHb4_8qtRgXclI",
  authDomain: "codesandbox-49019.firebaseapp.com",
  projectId: "codesandbox-49019",
  storageBucket: "codesandbox-49019.firebasestorage.app",
  messagingSenderId: "672911165995",
  appId: "1:672911165995:web:6639973f1f21729fc2f86e",
  measurementId: "G-PY0WV8J3ZN",
};

const app = initializeApp(firebaseConfig);
getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

const authSection = document.getElementById("authSection");
const dashboardSection = document.getElementById("dashboardSection");
const sandboxSection = document.getElementById("sandboxSection");
const userInfo = document.getElementById("userInfo");
const status = document.getElementById("status");

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const googleBtn = document.getElementById("googleBtn");
const logoutBtn = document.getElementById("logoutBtn");
const logoutBtn2 = document.getElementById("logoutBtn2");
const newSandboxBtn = document.getElementById("newSandboxBtn");
const sandboxList = document.getElementById("sandboxList");

const sandboxTitle = document.getElementById("sandboxTitle");
const sandboxMeta = document.getElementById("sandboxMeta");
const editorViewBtn = document.getElementById("editorViewBtn");
const previewViewBtn = document.getElementById("previewViewBtn");
const fullscreenViewBtn = document.getElementById("fullscreenViewBtn");
const renameSandboxBtn = document.getElementById("renameSandboxBtn");
const goDashboardBtn = document.getElementById("goDashboardBtn");
const deleteSandboxBtn = document.getElementById("deleteSandboxBtn");
const renameModal = document.getElementById("renameModal");
const renameInput = document.getElementById("renameInput");
const renameConfirmBtn = document.getElementById("renameConfirmBtn");
const renameCancelBtn = document.getElementById("renameCancelBtn");

const editorPane = document.getElementById("editorPane");
const previewPane = document.getElementById("previewPane");
const htmlInput = document.getElementById("htmlInput");
const cssInput = document.getElementById("cssInput");
const jsInput = document.getElementById("jsInput");
const saveBtn = document.getElementById("saveBtn");
const fileUpload = document.getElementById("fileUpload");
const previewFrame = document.getElementById("previewFrame");
const fullscreenPreviewSection = document.getElementById("fullscreenPreviewSection");
const fullscreenPreviewFrame = document.getElementById("fullscreenPreviewFrame");

let currentUser = null;
let activeSandbox = null;

const defaultSandboxContent = {
  title: "Untitled Sandbox",
  html: "<h1>Hello sandbox</h1>\n<p>Start editing your HTML.</p>",
  css: "body { font-family: system-ui, sans-serif; padding: 1rem; }",
  js: "console.log('Sandbox ready');",
};

function setStatus(message = "") {
  status.textContent = message;
}

function readRoute() {
  const params = new URLSearchParams(window.location.search);
  return {
    sandboxId: params.get("sb"),
    view: params.get("view") || "editor",
  };
}

function navigate({ sandboxId = null, view = null }) {
  const params = new URLSearchParams(window.location.search);
  if (!sandboxId) {
    params.delete("sb");
    params.delete("view");
  } else {
    params.set("sb", sandboxId);
    params.set("view", view || "editor");
  }
  const query = params.toString();
  history.pushState({}, "", query ? `?${query}` : window.location.pathname);
  renderApp();
}

function renderPreview() {
  const source = `<!doctype html>
<html>
<head>
<style>${cssInput.value}</style>
</head>
<body>
${htmlInput.value}
<script>
${jsInput.value}
<\/script>
</body>
</html>`;
  previewFrame.srcdoc = source;
  fullscreenPreviewFrame.srcdoc = source;
}

async function createSandbox() {
  if (!currentUser) return;
  const created = await addDoc(collection(db, "sandboxes"), {
    ownerId: currentUser.uid,
    ...defaultSandboxContent,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  navigate({ sandboxId: created.id, view: "editor" });
}

async function deleteSandbox(id) {
  if (!id || !currentUser) return;
  await deleteDoc(doc(db, "sandboxes", id));
  if (activeSandbox?.id === id) {
    activeSandbox = null;
    navigate({ sandboxId: null });
  } else {
    await loadSandboxList();
  }
}

function renderSandboxList(items) {
  if (!items.length) {
    sandboxList.innerHTML = "<p>No sandboxes yet. Create one to get started.</p>";
    return;
  }
  sandboxList.innerHTML = "";
  for (const item of items) {
    const wrap = document.createElement("div");
    wrap.className = "list-item";
    wrap.innerHTML = `
      <div>
        <strong>${item.title || "Untitled Sandbox"}</strong><br />
        <small>ID: ${item.id}</small>
      </div>
      <div class="row">
        <button data-open="${item.id}">Open</button>
        <button data-delete="${item.id}" class="danger">Delete</button>
      </div>
    `;
    sandboxList.appendChild(wrap);
  }

  sandboxList.querySelectorAll("button[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => navigate({ sandboxId: btn.dataset.open, view: "editor" }));
  });
  sandboxList.querySelectorAll("button[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.delete;
      if (confirm("Delete this sandbox?")) {
        await deleteSandbox(id);
      }
    });
  });
}

async function loadSandboxList() {
  if (!currentUser) return;
  const q = query(
    collection(db, "sandboxes"),
    where("ownerId", "==", currentUser.uid),
    orderBy("updatedAt", "desc"),
  );
  const snap = await getDocs(q);
  renderSandboxList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

async function loadActiveSandbox(sandboxId) {
  if (!sandboxId || !currentUser) return null;
  const snap = await getDoc(doc(db, "sandboxes", sandboxId));
  if (!snap.exists()) {
    throw new Error("Sandbox not found.");
  }
  const data = snap.data();
  if (data.ownerId !== currentUser.uid) {
    throw new Error("You do not have access to this sandbox.");
  }
  return { id: snap.id, ...data };
}

function populateEditor(sandbox) {
  sandboxTitle.textContent = sandbox.title || "Untitled Sandbox";
  sandboxMeta.textContent = `Sandbox ID: ${sandbox.id}`;
  htmlInput.value = sandbox.html || "";
  cssInput.value = sandbox.css || "";
  jsInput.value = sandbox.js || "";
  renderPreview();
}

async function saveSandbox() {
  if (!activeSandbox || !currentUser) return;
  await updateDoc(doc(db, "sandboxes", activeSandbox.id), {
    html: htmlInput.value,
    css: cssInput.value,
    js: jsInput.value,
    updatedAt: serverTimestamp(),
  });
  setStatus("Saved.");
}

function openRenameModal() {
  if (!activeSandbox || !currentUser) {
    setStatus("Open a sandbox before renaming.");
    return;
  }

  renameInput.value = activeSandbox.title || "Untitled Sandbox";
  renameModal.classList.remove("hidden");
  renameInput.focus();
  renameInput.select();
}

function closeRenameModal() {
  renameModal.classList.add("hidden");
}

async function confirmRenameSandbox() {
  if (!activeSandbox || !currentUser) return;

  const trimmed = renameInput.value.trim();
  if (!trimmed) {
    setStatus("Sandbox name cannot be empty.");
    renameInput.focus();
    return;
  }

  await updateDoc(doc(db, "sandboxes", activeSandbox.id), {
    title: trimmed,
    updatedAt: serverTimestamp(),
  });

  activeSandbox.title = trimmed;
  sandboxTitle.textContent = trimmed;
  closeRenameModal();
  setStatus("Sandbox renamed.");
}
async function renderApp() {
  const { sandboxId, view } = readRoute();
  document.body.classList.remove("fullscreen-preview");
  fullscreenPreviewSection.classList.add("hidden");
  closeRenameModal();
  authSection.classList.toggle("hidden", !!currentUser);
  dashboardSection.classList.add("hidden");
  sandboxSection.classList.add("hidden");
  userInfo.classList.toggle("hidden", !currentUser);

  if (!currentUser) {
    userInfo.textContent = "";
    return;
  }

  userInfo.textContent = `Signed in as ${currentUser.email || currentUser.displayName}`;

  if (!sandboxId) {
    dashboardSection.classList.remove("hidden");
    await loadSandboxList();
    return;
  }

  sandboxSection.classList.remove("hidden");
  activeSandbox = await loadActiveSandbox(sandboxId);
  populateEditor(activeSandbox);

  const fullscreenMode = view === "fspv";
  if (fullscreenMode) {
    document.body.classList.add("fullscreen-preview");
    fullscreenPreviewSection.classList.remove("hidden");
    previewPane.classList.add("hidden");
    editorPane.classList.add("hidden");
    return;
  }

  const previewMode = view === "preview";
  editorPane.classList.toggle("hidden", previewMode);
  previewPane.classList.toggle("hidden", !previewMode);
}

function getFullscreenPreviewUrl(sandboxId) {
  const params = new URLSearchParams();
  params.set("sb", sandboxId);
  params.set("view", "fspv");
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

async function handleUpload(file) {
  if (!file) return;
  const text = await file.text();
  const name = file.name.toLowerCase();
  if (name.endsWith(".html")) {
    htmlInput.value = text;
  } else if (name.endsWith(".css")) {
    cssInput.value = text;
  } else if (name.endsWith(".js")) {
    jsInput.value = text;
  } else {
    setStatus("Unsupported file type. Upload .html, .css, or .js files.");
    return;
  }
  renderPreview();
  setStatus(`Loaded ${file.name}. Click Save to persist.`);
}

signInBtn.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    setStatus("Signed in.");
  } catch (error) {
    setStatus(error.message);
  }
});

signUpBtn.addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    setStatus("Account created.");
  } catch (error) {
    setStatus(error.message);
  }
});

googleBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
    setStatus("Signed in with Google.");
  } catch (error) {
    setStatus(error.message);
  }
});

for (const btn of [logoutBtn, logoutBtn2]) {
  btn.addEventListener("click", async () => {
    await signOut(auth);
    navigate({ sandboxId: null });
  });
}

newSandboxBtn.addEventListener("click", async () => {
  try {
    await createSandbox();
    setStatus("Sandbox created.");
  } catch (error) {
    setStatus(error.message);
  }
});

goDashboardBtn.addEventListener("click", () => navigate({ sandboxId: null }));
editorViewBtn.addEventListener("click", () => navigate({ sandboxId: activeSandbox?.id, view: "editor" }));
previewViewBtn.addEventListener("click", () => navigate({ sandboxId: activeSandbox?.id, view: "preview" }));
fullscreenViewBtn.addEventListener("click", () => {
  if (!activeSandbox?.id) return;
  window.open(getFullscreenPreviewUrl(activeSandbox.id), "_blank", "noopener,noreferrer");
});

renameSandboxBtn.addEventListener("click", () => {
  openRenameModal();
});

renameCancelBtn.addEventListener("click", () => {
  closeRenameModal();
});

renameConfirmBtn.addEventListener("click", async () => {
  try {
    await confirmRenameSandbox();
  } catch (error) {
    setStatus(error.message);
  }
});

renameInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    try {
      await confirmRenameSandbox();
    } catch (error) {
      setStatus(error.message);
    }
  }

  if (event.key === "Escape") {
    closeRenameModal();
  }
});

deleteSandboxBtn.addEventListener("click", async () => {
  if (!activeSandbox) return;
  if (confirm("Delete this sandbox?")) {
    await deleteSandbox(activeSandbox.id);
  }
});

saveBtn.addEventListener("click", async () => {
  try {
    await saveSandbox();
  } catch (error) {
    setStatus(error.message);
  }
});

[htmlInput, cssInput, jsInput].forEach((el) => {
  el.addEventListener("input", () => {
    renderPreview();
    setStatus("Unsaved changes.");
  });
});

fileUpload.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  await handleUpload(file);
  event.target.value = "";
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  try {
    await renderApp();
  } catch (error) {
    setStatus(error.message);
    navigate({ sandboxId: null });
  }
});

window.addEventListener("popstate", () => {
  renderApp().catch((error) => setStatus(error.message));
});
