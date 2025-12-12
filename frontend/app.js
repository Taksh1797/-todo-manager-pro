/* ============================================================================
   TODO MANAGER PRO - PROFESSIONAL EDITION
   Production-grade JavaScript with all features working perfectly
   ============================================================================ */

'use strict';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const CONFIG = {
  API_BASE_URL: '/api',
  TOAST_DURATION: 3000,
  UNDO_DURATION: 5000,
  ANIMATION_DURATION: 300,
  LOCAL_STORAGE_KEYS: {
    THEME: 'todo-theme',
    COLOR_THEME: 'todo-color-theme'
  }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  todos: [],
  currentFilter: 'all',
  currentSort: 'newest',
  searchQuery: '',
  deletedTodo: null,
  isLoading: false,
  undoTimeout: null
};

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

const elements = {
  // Input elements
  todoInput: document.getElementById('todoInput'),
  prioritySelect: document.getElementById('prioritySelect'),
  categorySelect: document.getElementById('categorySelect'),
  dueDateInput: document.getElementById('dueDateInput'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  
  // Buttons
  addBtn: document.getElementById('addBtn'),
  themeToggle: document.getElementById('themeToggle'),
  exportBtn: document.getElementById('exportBtn'),
  importBtn: document.getElementById('importBtn'),
  clearDbBtn: document.getElementById('clearDbBtn'),
  fileInput: document.getElementById('fileInput'),
  
  // Lists and containers
  todoList: document.getElementById('todoList'),
  filterTabs: document.querySelectorAll('.filter-tab'),
  colorThemeBtns: document.querySelectorAll('.color-theme-btn'),
  
  // Stats
  totalCount: document.getElementById('totalCount'),
  todoCount: document.getElementById('todoCount'),
  progressCount: document.getElementById('progressCount'),
  completedCount: document.getElementById('completedCount'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  
  // Notifications
  toastContainer: document.getElementById('toastContainer'),
  undoSnackbar: document.getElementById('undoSnackbar'),
  undoMessage: document.getElementById('undoMessage'),
  undoBtn: document.getElementById('undoBtn'),
  
  // Modal
  confirmModal: document.getElementById('confirmModal'),
  modalTitle: document.getElementById('modalTitle'),
  modalMessage: document.getElementById('modalMessage'),
  modalCancel: document.getElementById('modalCancel'),
  modalConfirm: document.getElementById('modalConfirm'),
  
  // Confetti
  confetti: document.getElementById('confetti')
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  try {
    loadTheme();
    loadColorTheme();
    setupEventListeners();
    await fetchTodos();
    showToast('Welcome to Todo Manager Pro! 🎉', 'success');
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('Failed to initialize app', 'error');
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Add task
  elements.addBtn.addEventListener('click', handleAddTodo);
  elements.todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddTodo();
  });
  
  // Search and filter
  elements.searchInput.addEventListener('input', handleSearch);
  elements.sortSelect.addEventListener('change', handleSort);
  
  // Filter tabs
  elements.filterTabs.forEach(tab => {
    tab.addEventListener('click', () => handleFilterChange(tab.dataset.filter));
  });
  
  // Theme controls
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.colorThemeBtns.forEach(btn => {
    btn.addEventListener('click', () => changeColorTheme(btn.dataset.theme));
  });
  
  // Export/Import/Clear
  elements.exportBtn.addEventListener('click', handleExport);
  elements.importBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', handleImport);
  elements.clearDbBtn.addEventListener('click', handleClearDatabase);
  
  // Undo
  elements.undoBtn.addEventListener('click', handleUndo);
  
  // Modal
  elements.modalCancel.addEventListener('click', hideModal);
  elements.confirmModal.querySelector('.modal-overlay').addEventListener('click', hideModal);
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

async function fetchTodos() {
  try {
    state.isLoading = true;
    const data = await apiRequest('/todos');
    state.todos = Array.isArray(data) ? data : [];
    renderTodos();
    updateStats();
  } catch (error) {
    showToast('Failed to load tasks', 'error');
    state.todos = [];
  } finally {
    state.isLoading = false;
  }
}

async function createTodo(todoData) {
  try {
    const newTodo = await apiRequest('/todos', {
      method: 'POST',
      body: JSON.stringify(todoData)
    });
    state.todos.unshift(newTodo);
    renderTodos();
    updateStats();
    showToast('Task added successfully! 🎯', 'success');
  } catch (error) {
    showToast('Failed to add task', 'error');
    throw error;
  }
}

async function updateTodo(id, updates) {
  try {
    const updatedTodo = await apiRequest(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    
    const index = state.todos.findIndex(todo => todo._id === id);
    if (index !== -1) {
      state.todos[index] = updatedTodo;
      renderTodos();
      updateStats();
    }
    
    return updatedTodo;
  } catch (error) {
    showToast('Failed to update task', 'error');
    throw error;
  }
}

async function deleteTodo(id) {
  try {
    await apiRequest(`/todos/${id}`, { method: 'DELETE' });
    
    const index = state.todos.findIndex(todo => todo._id === id);
    if (index !== -1) {
      state.deletedTodo = { ...state.todos[index] };
      state.todos.splice(index, 1);
      renderTodos();
      updateStats();
      showUndoSnackbar('Task deleted');
    }
  } catch (error) {
    showToast('Failed to delete task', 'error');
    throw error;
  }
}

async function clearAllTodos() {
  try {
    await apiRequest('/todos', { method: 'DELETE' });
    state.todos = [];
    renderTodos();
    updateStats();
    showToast('All tasks cleared! 🗑️', 'success');
  } catch (error) {
    showToast('Failed to clear tasks', 'error');
    throw error;
  }
}

// ============================================================================
// TASK MANAGEMENT
// ============================================================================

async function handleAddTodo() {
  const title = elements.todoInput.value.trim();
  
  if (!title) {
    elements.todoInput.classList.add('shake');
    setTimeout(() => elements.todoInput.classList.remove('shake'), 500);
    showToast('Please enter a task title', 'error');
    return;
  }
  
  const todoData = {
    title,
    status: 'todo',
    priority: elements.prioritySelect.value,
    category: elements.categorySelect.value,
    dueDate: elements.dueDateInput.value || null
  };
  
  try {
    await createTodo(todoData);
    resetForm();
  } catch (error) {
    console.error('Add todo error:', error);
  }
}

async function handleToggleComplete(id, currentStatus) {
  const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';
  
  try {
    await updateTodo(id, { status: newStatus });
    
    if (newStatus === 'completed') {
      triggerConfetti();
      showToast('Task completed! 🎉', 'success');
    }
  } catch (error) {
    console.error('Toggle complete error:', error);
  }
}

async function handleEditTodo(id, currentTitle) {
  const todoItem = document.querySelector(`[data-id="${id}"]`);
  if (!todoItem) return;
  
  const titleElement = todoItem.querySelector('.todo-title');
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentTitle;
  input.className = 'edit-input';
  
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'btn-save';
  
  titleElement.innerHTML = '';
  titleElement.appendChild(input);
  titleElement.appendChild(saveBtn);
  
  input.focus();
  input.select();
  
  const saveEdit = async () => {
    const newTitle = input.value.trim();
    
    if (!newTitle) {
      showToast('Title cannot be empty', 'error');
      return;
    }
    
    try {
      await updateTodo(id, { title: newTitle });
      showToast('Task updated! ✏️', 'success');
    } catch (error) {
      console.error('Edit todo error:', error);
    }
  };
  
  saveBtn.addEventListener('click', saveEdit);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveEdit();
  });
}

async function handleDeleteTodo(id) {
  try {
    await deleteTodo(id);
  } catch (error) {
    console.error('Delete todo error:', error);
  }
}

async function handleUndo() {
  if (!state.deletedTodo) return;
  
  try {
    const todoData = {
      title: state.deletedTodo.title,
      status: state.deletedTodo.status,
      priority: state.deletedTodo.priority,
      category: state.deletedTodo.category,
      dueDate: state.deletedTodo.dueDate
    };
    
    await createTodo(todoData);
    state.deletedTodo = null;
    hideUndoSnackbar();
    showToast('Task restored! ↩️', 'success');
  } catch (error) {
    console.error('Undo error:', error);
  }
}

async function handleStatusChange(id, newStatus) {
  try {
    await updateTodo(id, { status: newStatus });
    
    if (newStatus === 'completed') {
      triggerConfetti();
      showToast('Task completed! 🎉', 'success');
    } else {
      showToast('Status updated! 📊', 'success');
    }
  } catch (error) {
    console.error('Status change error:', error);
  }
}

// ============================================================================
// EXPORT/IMPORT/CLEAR FUNCTIONALITY
// ============================================================================

function handleExport() {
  try {
    if (state.todos.length === 0) {
      showToast('No tasks to export', 'error');
      return;
    }
    
    const dataStr = JSON.stringify(state.todos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.download = `todo-backup-${timestamp}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(`Exported ${state.todos.length} tasks! 💾`, 'success');
  } catch (error) {
    console.error('Export error:', error);
    showToast('Failed to export tasks', 'error');
  }
}

async function handleImport(event) {
  const file = event.target.files[0];
  
  if (!file) return;
  
  if (file.type !== 'application/json') {
    showToast('Please select a valid JSON file', 'error');
    return;
  }
  
  try {
    const text = await file.text();
    const importedTodos = JSON.parse(text);
    
    if (!Array.isArray(importedTodos)) {
      throw new Error('Invalid data format');
    }
    
    const isValidFormat = importedTodos.every(todo => 
      todo.title && typeof todo.title === 'string'
    );
    
    if (!isValidFormat) {
      throw new Error('Invalid todo format');
    }
    
    showConfirmModal(
      'Import Tasks',
      `Import ${importedTodos.length} tasks? This will add them to your existing tasks.`,
      async () => {
        await importTodos(importedTodos);
      }
    );
    
  } catch (error) {
    console.error('Import error:', error);
    showToast('Failed to import tasks. Invalid file format.', 'error');
  } finally {
    elements.fileInput.value = '';
  }
}

async function importTodos(importedTodos) {
  try {
    let successCount = 0;
    let errorCount = 0;
    
    for (const todo of importedTodos) {
      try {
        const todoData = {
          title: todo.title,
          status: todo.status || 'todo',
          priority: todo.priority || 'medium',
          category: todo.category || 'general',
          dueDate: todo.dueDate || null
        };
        
        await createTodo(todoData);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Failed to import todo:', error);
      }
    }
    
    if (successCount > 0) {
      showToast(`Imported ${successCount} tasks! 📂`, 'success');
    }
    
    if (errorCount > 0) {
      showToast(`Failed to import ${errorCount} tasks`, 'error');
    }
    
  } catch (error) {
    console.error('Import todos error:', error);
    showToast('Failed to import tasks', 'error');
  }
}

function handleClearDatabase() {
  if (state.todos.length === 0) {
    showToast('Database is already empty', 'error');
    return;
  }
  
  showConfirmModal(
    'Clear All Tasks',
    `Are you sure you want to delete all ${state.todos.length} tasks? This action cannot be undone.`,
    async () => {
      await clearAllTodos();
    }
  );
}

// ============================================================================
// MODAL SYSTEM
// ============================================================================

function showConfirmModal(title, message, onConfirm) {
  elements.modalTitle.textContent = title;
  elements.modalMessage.textContent = message;
  elements.confirmModal.classList.add('show');
  
  const confirmHandler = async () => {
    hideModal();
    await onConfirm();
    elements.modalConfirm.removeEventListener('click', confirmHandler);
  };
  
  elements.modalConfirm.addEventListener('click', confirmHandler);
}

function hideModal() {
  elements.confirmModal.classList.remove('show');
}

// ============================================================================
// FILTERING & SORTING
// ============================================================================

function handleFilterChange(filter) {
  state.currentFilter = filter;
  
  elements.filterTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
    tab.setAttribute('aria-selected', tab.dataset.filter === filter);
  });
  
  renderTodos();
}

function handleSearch(e) {
  state.searchQuery = e.target.value.toLowerCase();
  renderTodos();
}

function handleSort() {
  state.currentSort = elements.sortSelect.value;
  renderTodos();
}

function getFilteredTodos() {
  let filtered = [...state.todos];
  
  // Apply status filter
  if (state.currentFilter !== 'all') {
    filtered = filtered.filter(todo => todo.status === state.currentFilter);
  }
  
  // Apply search
  if (state.searchQuery) {
    filtered = filtered.filter(todo =>
      todo.title.toLowerCase().includes(state.searchQuery) ||
      todo.category.toLowerCase().includes(state.searchQuery)
    );
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    switch (state.currentSort) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'dueDate':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      default:
        return 0;
    }
  });
  
  return filtered;
}

// ============================================================================
// RENDERING
// ============================================================================

function renderTodos() {
  const filtered = getFilteredTodos();
  
  if (filtered.length === 0) {
    const message = state.searchQuery
      ? 'No tasks found matching your search'
      : state.currentFilter === 'all'
        ? 'No tasks yet. Add one to get started!'
        : `No ${state.currentFilter} tasks`;
    
    elements.todoList.innerHTML = `<li class="empty-state">${message}</li>`;
    return;
  }
  
  elements.todoList.innerHTML = filtered.map(todo => createTodoHTML(todo)).join('');
  
  // Attach event listeners
  filtered.forEach(todo => {
    const item = document.querySelector(`[data-id="${todo._id}"]`);
    if (!item) return;
    
    const checkbox = item.querySelector('.todo-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        handleToggleComplete(todo._id, todo.status);
      });
    }
    
    const editBtn = item.querySelector('.btn-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        handleEditTodo(todo._id, todo.title);
      });
    }
    
    const deleteBtn = item.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        handleDeleteTodo(todo._id);
      });
    }
    
    const statusBadge = item.querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.addEventListener('click', () => {
        cycleStatus(todo._id, todo.status);
      });
    }
  });
}

function createTodoHTML(todo) {
  const isCompleted = todo.status === 'completed';
  const dueDateInfo = getDueDateInfo(todo.dueDate);
  const priorityClass = `priority-${todo.priority}`;
  const statusClass = `status-${todo.status}`;
  
  const categoryIcons = {
    general: '📋',
    work: '💼',
    personal: '👤',
    shopping: '🛒',
    health: '💪',
    study: '📚'
  };
  
  return `
    <li class="todo-item ${statusClass} ${priorityClass}" data-id="${todo._id}">
      <div class="todo-content">
        <input 
          type="checkbox" 
          class="todo-checkbox" 
          ${isCompleted ? 'checked' : ''}
          aria-label="Mark as complete"
        >
        <div class="todo-main">
          <div class="todo-title">${escapeHtml(todo.title)}</div>
          <div class="todo-meta">
            <span class="status-badge ${todo.status}" title="Click to change status">
              ${getStatusLabel(todo.status)}
            </span>
            <span class="category-badge" title="${todo.category}">
              ${categoryIcons[todo.category]} ${capitalize(todo.category)}
            </span>
            ${dueDateInfo.html}
          </div>
        </div>
        <div class="todo-actions">
          <button class="btn-edit" aria-label="Edit task">Edit</button>
          <button class="btn-delete" aria-label="Delete task">Delete</button>
        </div>
      </div>
    </li>
  `;
}

function cycleStatus(id, currentStatus) {
  const statusCycle = {
    'todo': 'progress',
    'progress': 'completed',
    'completed': 'todo'
  };
  
  const newStatus = statusCycle[currentStatus];
  handleStatusChange(id, newStatus);
}

function getStatusLabel(status) {
  const labels = {
    todo: '📝 To Do',
    progress: '⚙️ In Progress',
    completed: '✅ Completed'
  };
  return labels[status] || status;
}

function getDueDateInfo(dueDate) {
  if (!dueDate) return { html: '', class: '' };
  
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  
  let className = 'due-date';
  let prefix = '📅';
  
  if (diffDays < 0) {
    className += ' overdue';
    prefix = '⚠️';
  } else if (diffDays === 0) {
    className += ' today';
    prefix = '⏰';
  }
  
  const formatted = new Date(dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  return {
    html: `<span class="${className}">${prefix} ${formatted}</span>`,
    class: className
  };
}

// ============================================================================
// STATISTICS & PROGRESS
// ============================================================================

function updateStats() {
  const total = state.todos.length;
  const todoCount = state.todos.filter(t => t.status === 'todo').length;
  const progressCount = state.todos.filter(t => t.status === 'progress').length;
  const completedCount = state.todos.filter(t => t.status === 'completed').length;
  
  animateValue(elements.totalCount, parseInt(elements.totalCount.textContent) || 0, total);
  animateValue(elements.todoCount, parseInt(elements.todoCount.textContent) || 0, todoCount);
  animateValue(elements.progressCount, parseInt(elements.progressCount.textContent) || 0, progressCount);
  animateValue(elements.completedCount, parseInt(elements.completedCount.textContent) || 0, completedCount);
  
  const percentage = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  elements.progressBar.style.width = `${percentage}%`;
  elements.progressBar.setAttribute('aria-valuenow', percentage);
  elements.progressText.textContent = `${percentage}% Complete`;
}

function animateValue(element, start, end) {
  const duration = 500;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const value = Math.floor(start + (end - start) * easeOutQuad(progress));
    element.textContent = value;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

function easeOutQuad(t) {
  return t * (2 - t);
}

// ============================================================================
// THEME SYSTEM
// ============================================================================

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(CONFIG.LOCAL_STORAGE_KEYS.THEME, newTheme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEYS.THEME);
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
}

function changeColorTheme(theme) {
  document.documentElement.setAttribute('data-color-theme', theme);
  localStorage.setItem(CONFIG.LOCAL_STORAGE_KEYS.COLOR_THEME, theme);
  
  elements.colorThemeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

function loadColorTheme() {
  const savedColorTheme = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEYS.COLOR_THEME);
  if (savedColorTheme) {
    changeColorTheme(savedColorTheme);
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : '❌';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;
  
  elements.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), CONFIG.ANIMATION_DURATION);
  }, CONFIG.TOAST_DURATION);
}

function showUndoSnackbar(message) {
  if (state.undoTimeout) {
    clearTimeout(state.undoTimeout);
  }
  
  elements.undoMessage.textContent = message;
  elements.undoSnackbar.classList.add('show');
  
  state.undoTimeout = setTimeout(hideUndoSnackbar, CONFIG.UNDO_DURATION);
}

function hideUndoSnackbar() {
  elements.undoSnackbar.classList.remove('show');
  if (state.undoTimeout) {
    clearTimeout(state.undoTimeout);
    state.undoTimeout = null;
  }
  setTimeout(() => {
    state.deletedTodo = null;
  }, CONFIG.ANIMATION_DURATION);
}

// ============================================================================
// CONFETTI ANIMATION
// ============================================================================

function triggerConfetti() {
  const canvas = elements.confetti;
  const ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const particles = [];
  const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];
  
  for (let i = 0; i < 100; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 6 + 4,
      speedY: Math.random() * 3 + 2,
      speedX: Math.random() * 2 - 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 10 - 5
    });
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let activeParticles = 0;
    
    particles.forEach(p => {
      if (p.y < canvas.height) {
        activeParticles++;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
        
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;
      }
    });
    
    if (activeParticles > 0) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  
  animate();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function resetForm() {
  elements.todoInput.value = '';
  elements.prioritySelect.value = 'medium';
  elements.categorySelect.value = 'general';
  elements.dueDateInput.value = '';
  elements.todoInput.focus();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// ============================================================================
// RESPONSIVE CANVAS
// ============================================================================

window.addEventListener('resize', () => {
  const canvas = elements.confetti;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

console.log('✨ Todo Manager Pro - Loaded Successfully!');
