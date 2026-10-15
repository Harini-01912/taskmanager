const taskForm = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const descriptionInput = document.querySelector("#task-description");
const taskList = document.querySelector("#task-list");
const searchInput = document.querySelector("#task-search");
const statusFilter = document.querySelector("#status-filter");
const submitButton = document.querySelector("#submit-task");
const cancelButton = document.querySelector("#cancel-edit");

let editingTaskId = null;
let searchTimer = null;

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat(
  undefined,
  { weekday: "short", month: "short", day: "numeric", year: "numeric" },
).format(new Date());

descriptionInput.addEventListener("input", () => {
  document.querySelector("#description-count").textContent = descriptionInput.value.length;
});

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.classList.add("is-invalid");
    titleInput.focus();
    return;
  }
  titleInput.classList.remove("is-invalid");
  const editing = editingTaskId !== null;
  try {
    const response = await fetch(editing ? `/api/tasks/${editingTaskId}` : "/api/tasks", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: descriptionInput.value.trim() }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save your task.");
    resetForm();
    showToast(data.message, "success");
    await loadTasks();
  } catch (error) {
    showToast(error.message, "error");
  }
});

titleInput.addEventListener("input", () => titleInput.classList.remove("is-invalid"));
cancelButton.addEventListener("click", resetForm);
statusFilter.addEventListener("change", loadTasks);
searchInput.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(loadTasks, 180);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    loadTasks();
    searchInput.blur();
  }
});

async function loadTasks() {
  taskList.innerHTML = '<div class="loading-state"><span class="spinner-border spinner-border-sm" role="status"></span> Loading your tasks...</div>';
  const params = new URLSearchParams({
    search: searchInput.value.trim(),
    status: statusFilter.value,
  });
  try {
    const response = await fetch(`/api/tasks?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load tasks.");
    document.querySelector("#total-count").textContent = data.counts.total;
    document.querySelector("#completed-count").textContent = data.counts.completed;
    document.querySelector("#pending-count").textContent = data.counts.pending;
    document.querySelector("#visible-count").textContent = data.tasks.length;
    const remaining = data.counts.pending;
    document.querySelector("#footer-summary").textContent = data.counts.total === 0
      ? "A fresh start awaits."
      : remaining === 0 ? "Everything is checked off. Amazing!" : `${remaining} ${remaining === 1 ? "task" : "tasks"} left to go`;
    renderTasks(data.tasks);
  } catch (error) {
    taskList.innerHTML = '<div class="empty-state"><strong>We couldn’t load your tasks.</strong><p>Please check your connection and try again.</p><button class="btn btn-sm btn-outline-secondary" id="retry-load" type="button">Try again</button></div>';
    document.querySelector("#retry-load").addEventListener("click", loadTasks);
    showToast(error.message, "error");
  }
}

function renderTasks(tasks) {
  if (!tasks.length) {
    const filtered = searchInput.value.trim() || statusFilter.value !== "all";
    taskList.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="bi ${filtered ? "bi-search" : "bi-stars"}"></i></span><strong>${filtered ? "No tasks found" : "Your list is a blank canvas"}</strong><p>${filtered ? "Try another search or filter." : "Add your first task and get the ball rolling."}</p></div>`;
    return;
  }

  taskList.replaceChildren(...tasks.map((task) => {
    const row = document.createElement("article");
    row.className = `task-item${task.completed ? " is-completed" : ""}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `${task.completed ? "Mark pending" : "Complete"} ${task.title}`);
    checkbox.addEventListener("change", () => setTaskCompletion(task.id, checkbox.checked));

    const content = document.createElement("div");
    content.className = "task-content";
    const title = document.createElement("h3");
    title.className = "task-name";
    title.textContent = task.title;
    content.append(title);
    if (task.description) {
      const description = document.createElement("p");
      description.className = "task-description";
      description.textContent = task.description;
      content.append(description);
    }
    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.textContent = `Added ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(task.created_at))}`;
    content.append(meta);

    const actions = document.createElement("div");
    actions.className = "task-actions";
    const edit = makeIconButton("bi-pencil", `Edit ${task.title}`, () => beginEdit(task));
    const remove = makeIconButton("bi-trash3", `Delete ${task.title}`, () => deleteTask(task.id));
    remove.classList.add("delete");
    actions.append(edit, remove);
    row.append(checkbox, content, actions);
    return row;
  }));
}

function makeIconButton(icon, label, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.setAttribute("aria-label", label);
  button.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i>`;
  button.addEventListener("click", handler);
  return button;
}

async function setTaskCompletion(taskId, completed) {
  try {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not update task.");
    await loadTasks();
  } catch (error) {
    showToast(error.message, "error");
    await loadTasks();
  }
}

function beginEdit(task) {
  editingTaskId = task.id;
  titleInput.value = task.title;
  descriptionInput.value = task.description;
  document.querySelector("#description-count").textContent = task.description.length;
  document.querySelector("#form-heading").textContent = "Edit your task";
  submitButton.innerHTML = '<i class="bi bi-check-lg"></i><span>Save changes</span>';
  cancelButton.classList.remove("d-none");
  titleInput.focus();
  document.querySelector(".composer-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function deleteTask(taskId) {
  if (!window.confirm("Delete this task? This can’t be undone.")) return;
  try {
    const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not delete task.");
    if (editingTaskId === taskId) resetForm();
    showToast(data.message, "success");
    await loadTasks();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function resetForm() {
  taskForm.reset();
  editingTaskId = null;
  titleInput.classList.remove("is-invalid");
  document.querySelector("#description-count").textContent = "0";
  document.querySelector("#form-heading").textContent = "Add a task";
  submitButton.innerHTML = '<i class="bi bi-plus-lg"></i><span>Add task</span>';
  cancelButton.classList.add("d-none");
}

function showToast(message, type) {
  const toast = document.createElement("div");
  toast.className = `toast align-items-center toast-${type}`;
  toast.setAttribute("role", "status");
  toast.innerHTML = `<div class="d-flex"><div class="toast-body"></div><button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
  toast.querySelector(".toast-body").textContent = message;
  document.querySelector("#toast-container").append(toast);
  if (window.bootstrap?.Toast) {
    const instance = new window.bootstrap.Toast(toast, { delay: 3200 });
    instance.show();
    toast.addEventListener("hidden.bs.toast", () => toast.remove());
  } else {
    toast.classList.add("show");
    window.setTimeout(() => toast.remove(), 3200);
  }
}

loadTasks();
