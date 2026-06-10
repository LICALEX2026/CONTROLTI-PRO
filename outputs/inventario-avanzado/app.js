const STORAGE_KEY = "inventario_avanzado_v2";

const seedState = {
  items: [],
  movements: [],
};
const state = loadState();
const filters = {
  search: "",
  status: "Todos",
  type: "Todos",
  category: "Todas",
};

const els = {
  totalRecords: document.getElementById("totalRecords"),
  totalUnits: document.getElementById("totalUnits"),
  lowStockCount: document.getElementById("lowStockCount"),
  assignedCount: document.getElementById("assignedCount"),
  statsGrid: document.getElementById("statsGrid"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  typeFilter: document.getElementById("typeFilter"),
  categoryFilter: document.getElementById("categoryFilter"),
  inventoryBody: document.getElementById("inventoryBody"),
  alertsList: document.getElementById("alertsList"),
  categoryChart: document.getElementById("categoryChart"),
  movementList: document.getElementById("movementList"),
  statusSummary: document.getElementById("statusSummary"),
  lastSync: document.getElementById("lastSync"),
  itemModal: document.getElementById("itemModal"),
  movementModal: document.getElementById("movementModal"),
  toast: document.getElementById("toast"),
  itemForm: document.getElementById("itemForm"),
  movementForm: document.getElementById("movementForm"),
  itemModalTitle: document.getElementById("itemModalTitle"),
  itemId: document.getElementById("itemId"),
  itemCode: document.getElementById("itemCode"),
  itemName: document.getElementById("itemName"),
  itemType: document.getElementById("itemType"),
  itemCategory: document.getElementById("itemCategory"),
  itemBrand: document.getElementById("itemBrand"),
  itemModel: document.getElementById("itemModel"),
  itemSerial: document.getElementById("itemSerial"),
  itemQuantity: document.getElementById("itemQuantity"),
  itemMinStock: document.getElementById("itemMinStock"),
  itemLocation: document.getElementById("itemLocation"),
  itemAssignedTo: document.getElementById("itemAssignedTo"),
  itemStatus: document.getElementById("itemStatus"),
  itemNotes: document.getElementById("itemNotes"),
  movementItemId: document.getElementById("movementItemId"),
  movementItemName: document.getElementById("movementItemName"),
  movementType: document.getElementById("movementType"),
  movementQuantity: document.getElementById("movementQuantity"),
  movementResponsible: document.getElementById("movementResponsible"),
  movementDestination: document.getElementById("movementDestination"),
  movementNotes: document.getElementById("movementNotes"),
};

init();

function init() {
  populateFilters();
  bindEvents();
  renderAll();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneState(seedState);
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.movements)) {
      return cloneState(seedState);
    }
    return sanitizeState(parsed);
  } catch {
    return cloneState(seedState);
  }
}

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeState(input) {
  const items = input.items.map((item) => ({
    id: item.id || crypto.randomUUID(),
    code: String(item.code || "").trim(),
    name: String(item.name || "").trim(),
    type: item.type === "Activo" ? "Activo" : "Consumible",
    category: String(item.category || "").trim(),
    brand: String(item.brand || "").trim(),
    model: String(item.model || "").trim(),
    serial: String(item.serial || "").trim(),
    quantity: Math.max(0, Number(item.quantity) || 0),
    minStock: Math.max(0, Number(item.minStock) || 0),
    location: String(item.location || "").trim(),
    assignedTo: String(item.assignedTo || "").trim(),
    status: String(item.status || "Disponible").trim(),
    notes: String(item.notes || "").trim(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  }));

  const movements = input.movements.map((movement) => ({
    id: movement.id || crypto.randomUUID(),
    date: movement.date || new Date().toISOString(),
    itemId: movement.itemId || null,
    itemName: String(movement.itemName || "Registro").trim(),
    type: String(movement.type || "Ajuste").trim(),
    quantity: Math.max(0, Number(movement.quantity) || 0),
    responsible: String(movement.responsible || "").trim(),
    destination: String(movement.destination || "").trim(),
    notes: String(movement.notes || "").trim(),
  }));

  return { items, movements };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  els.lastSync.textContent = `Sincronizado localmente: ${formatDateTime(new Date().toISOString())}`;
}

function bindEvents() {
  els.searchInput.addEventListener("input", (event) => {
    filters.search = event.target.value.toLowerCase();
    renderAll();
  });

  els.statusFilter.addEventListener("change", (event) => {
    filters.status = event.target.value;
    renderAll();
  });

  els.typeFilter.addEventListener("change", (event) => {
    filters.type = event.target.value;
    renderAll();
  });

  els.categoryFilter.addEventListener("change", (event) => {
    filters.category = event.target.value;
    renderAll();
  });

  document.getElementById("newItemBtn").addEventListener("click", () => openItemModal());
  document.getElementById("newMovementBtn").addEventListener("click", () => openMovementModal());
  document.getElementById("exportExcelBtn").addEventListener("click", exportExcel);
  document.getElementById("resetFiltersBtn").addEventListener("click", resetFilters);
  document.getElementById("seedBtn").addEventListener("click", resetToSeed);

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.close));
  });

  els.itemType.addEventListener("change", () => syncItemFormFields());

  els.itemForm.addEventListener("submit", saveItem);
  els.movementForm.addEventListener("submit", saveMovement);

  [els.itemModal, els.movementModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(modal.id);
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal("itemModal");
      closeModal("movementModal");
    }
  });
}

function populateFilters() {
  const statuses = ["Todos", "Disponible", "Asignado", "Mantenimiento", "Baja", "Agotado"];
  const types = ["Todos", "Activo", "Consumible"];
  const categories = [
    "Todas",
    ...new Set([
      "Laptop",
      "CPU",
      "Teclado",
      "Mouse",
      "Cable HDMI",
      "Cable VGA",
      "Adaptador",
      "Pantalla",
      "Todo en uno",
      "Accesorio",
    ]),
  ];

  els.statusFilter.innerHTML = statuses.map((value) => `<option value="${value}">${value}</option>`).join("");
  els.typeFilter.innerHTML = types.map((value) => `<option value="${value}">${value}</option>`).join("");
  els.categoryFilter.innerHTML = categories.map((value) => `<option value="${value}">${value}</option>`).join("");
}

function renderAll() {
  const filteredItems = getFilteredItems();
  renderStats(filteredItems);
  renderTable(filteredItems);
  renderAlerts();
  renderCategoryChart();
  renderMovements();
  updateSummary(filteredItems);
}

function getFilteredItems() {
  return state.items
    .filter((item) => matchesSearch(item))
    .filter((item) => filters.status === "Todos" || item.status === filters.status)
    .filter((item) => filters.type === "Todos" || item.type === filters.type)
    .filter((item) => filters.category === "Todas" || item.category === filters.category)
    .sort((a, b) => {
      const lowA = isLowStock(a) ? 0 : 1;
      const lowB = isLowStock(b) ? 0 : 1;
      if (lowA !== lowB) return lowA - lowB;
      return a.name.localeCompare(b.name, "es");
    });
}

function matchesSearch(item) {
  if (!filters.search) return true;
  const haystack = [
    item.code,
    item.name,
    item.category,
    item.brand,
    item.model,
    item.serial,
    item.location,
    item.assignedTo,
    item.notes,
    item.status,
    item.type,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(filters.search);
}

function renderStats(items) {
  const totals = getTotals();
  const cards = [
    { label: "Registros totales", value: totals.records, delta: "Inventario completo", tone: "info" },
    { label: "Unidades físicas", value: totals.units, delta: "Consumo y activos", tone: "success" },
    { label: "Bajo stock", value: totals.lowStock, delta: "Requiere reposición", tone: "warning" },
    { label: "Asignados", value: totals.assigned, delta: "Equipos en uso", tone: "info" },
  ];

  els.statsGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-card">
          <span class="label">${card.label}</span>
          <strong class="value">${card.value}</strong>
          <span class="delta">${card.delta}</span>
        </article>
      `
    )
    .join("");

  els.totalRecords.textContent = totals.records;
  els.totalUnits.textContent = totals.units;
  els.lowStockCount.textContent = totals.lowStock;
  els.assignedCount.textContent = totals.assigned;
}

function getTotals() {
  return {
    records: state.items.length,
    units: state.items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0),
    lowStock: state.items.filter((item) => isLowStock(item)).length,
    assigned: state.items.filter((item) => item.status === "Asignado").length,
  };
}

function isLowStock(item) {
  return item.type === "Consumible" && item.quantity <= item.minStock;
}

function renderTable(items) {
  if (!items.length) {
    els.inventoryBody.innerHTML = `
      <tr>
        <td colspan="10" style="padding: 24px; color: var(--muted); text-align: center;">
          No hay registros que coincidan con los filtros actuales.
        </td>
      </tr>
    `;
    return;
  }

  els.inventoryBody.innerHTML = items
    .map((item) => {
      const statusClass = statusTone(item);
      const meta = item.type === "Activo" ? item.serial || "Sin serial" : `${item.quantity} unidades`;
      const qty = item.type === "Activo" ? "1" : String(item.quantity);
      const assigned = item.assignedTo || "No asignado";
      return `
        <tr>
          <td>
            <div class="row-title">${escapeHtml(item.code)}</div>
            <div class="subtle">${escapeHtml(item.brand || "Sin marca")} ${escapeHtml(item.model || "")}</div>
          </td>
          <td>
            <div class="row-title">${escapeHtml(item.name)}</div>
            <div class="subtle">${escapeHtml(meta)}</div>
          </td>
          <td>${escapeHtml(item.category)}</td>
          <td><span class="pill info">${escapeHtml(item.type)}</span></td>
          <td>${qty}</td>
          <td>${item.minStock}</td>
          <td>${escapeHtml(item.location || "Sin ubicación")}</td>
          <td>${escapeHtml(assigned)}</td>
          <td><span class="pill ${statusClass}">${escapeHtml(item.status)}</span></td>
          <td>
            <div class="table-actions">
              <button class="mini-action" data-action="move" data-id="${item.id}">Movimiento</button>
              <button class="mini-action" data-action="edit" data-id="${item.id}">Editar</button>
              <button class="mini-action" data-action="delete" data-id="${item.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  els.inventoryBody.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", handleRowAction);
  });
}

function statusTone(item) {
  if (item.status === "Baja") return "danger";
  if (item.status === "Mantenimiento") return "warning";
  if (item.status === "Asignado") return "info";
  if (item.status === "Agotado" || isLowStock(item)) return "danger";
  return "success";
}

function renderAlerts() {
  const alerts = state.items.filter((item) => item.status === "Baja" || item.status === "Mantenimiento" || isLowStock(item));
  if (!alerts.length) {
    els.alertsList.innerHTML = `<div class="alert-card"><strong>Todo en orden</strong><p>No hay alertas activas en este momento.</p></div>`;
    return;
  }

  els.alertsList.innerHTML = alerts
    .slice(0, 8)
    .map((item) => {
      const tone = item.status === "Baja" ? "danger" : item.status === "Mantenimiento" ? "warning" : "danger";
      const message =
        item.status === "Baja"
          ? "El activo está dado de baja."
          : item.status === "Mantenimiento"
          ? "Requiere atención técnica."
          : "Requiere reposición.";
      return `
        <div class="alert-card">
          <span class="pill ${tone}">${escapeHtml(item.status)}</span>
          <strong>${escapeHtml(item.name)}</strong>
          <p>${escapeHtml(message)} ${escapeHtml(item.code)} · ${escapeHtml(item.location || "Sin ubicación")}</p>
        </div>
      `;
    })
    .join("");
}

function renderCategoryChart() {
  const groups = new Map();

  state.items.forEach((item) => {
    const current = groups.get(item.category) || { label: item.category, count: 0 };
    current.count += Math.max(0, Number(item.quantity) || 0);
    groups.set(item.category, current);
  });

  const ordered = [...groups.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  const max = ordered[0]?.count || 1;

  if (!ordered.length) {
    els.categoryChart.innerHTML = `<div class="chart-row"><strong>Sin datos</strong></div>`;
    return;
  }

  els.categoryChart.innerHTML = ordered
    .map(
      (row) => `
        <div class="chart-row">
          <header>
            <strong>${escapeHtml(row.label)}</strong>
            <span>${row.count}</span>
          </header>
          <div class="bar"><span style="width:${Math.max(8, (row.count / max) * 100)}%"></span></div>
        </div>
      `
    )
    .join("");
}

function renderMovements() {
  const list = [...state.movements].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!list.length) {
    els.movementList.innerHTML = `<div class="timeline-item"><strong>Sin movimientos</strong><p>Cuando registres entradas o salidas, aparecerán aquí.</p></div>`;
    return;
  }

  els.movementList.innerHTML = list
    .slice(0, 12)
    .map(
      (movement) => `
        <article class="timeline-item">
          <div class="timeline-meta">
            <span class="pill ${movementTone(movement.type)}">${escapeHtml(movement.type)}</span>
            <span>${escapeHtml(formatDateTime(movement.date))}</span>
          </div>
          <strong>${escapeHtml(movement.itemName)}</strong>
          <p>
            Cantidad: ${movement.quantity} · Responsable: ${escapeHtml(movement.responsible || "No registrado")}
            · Destino: ${escapeHtml(movement.destination || "Sin destino")}
          </p>
          ${movement.notes ? `<p>${escapeHtml(movement.notes)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function movementTone(type) {
  if (type === "Entrada") return "success";
  if (type === "Salida") return "danger";
  if (type === "Asignación") return "info";
  if (type === "Devolución") return "success";
  if (type === "Mantenimiento") return "warning";
  if (type === "Baja") return "danger";
  return "info";
}

function updateSummary(items) {
  const total = items.length;
  const visibleLow = items.filter((item) => isLowStock(item) || item.status === "Agotado").length;
  const assignedVisible = items.filter((item) => item.status === "Asignado").length;
  els.statusSummary.textContent = `${total} visibles · ${visibleLow} alertas · ${assignedVisible} asignados`;
}

function handleRowAction(event) {
  const id = event.currentTarget.dataset.id;
  const action = event.currentTarget.dataset.action;
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;

  if (action === "edit") openItemModal(item);
  if (action === "move") openMovementModal(item);
  if (action === "delete") deleteItem(item);
}

function openItemModal(item = null) {
  els.itemForm.reset();
  const isEdit = Boolean(item);
  els.itemModalTitle.textContent = isEdit ? "Editar registro" : "Nuevo registro";
  els.itemId.value = item?.id || "";
  els.itemCode.value = item?.code || "";
  els.itemName.value = item?.name || "";
  els.itemType.value = item?.type || "Activo";
  els.itemCategory.value = item?.category || "";
  els.itemBrand.value = item?.brand || "";
  els.itemModel.value = item?.model || "";
  els.itemSerial.value = item?.serial || "";
  els.itemQuantity.value = item?.quantity ?? 1;
  els.itemMinStock.value = item?.minStock ?? 1;
  els.itemLocation.value = item?.location || "";
  els.itemAssignedTo.value = item?.assignedTo || "";
  els.itemStatus.value = item?.status || "Disponible";
  els.itemNotes.value = item?.notes || "";
  syncItemFormFields();
  setStatusOptions(els.itemType.value, item?.status);
  openModal("itemModal");
}

function syncItemFormFields() {
  const type = els.itemType.value;
  const serialRequired = type === "Activo";
  els.itemSerial.required = serialRequired;
  els.itemQuantity.disabled = type === "Activo";
  els.itemQuantity.value = type === "Activo" ? 1 : Math.max(1, Number(els.itemQuantity.value) || 1);
  setStatusOptions(type, els.itemStatus.value);
}

function setStatusOptions(type, currentStatus) {
  const activeStatuses = ["Disponible", "Asignado", "Mantenimiento", "Baja"];
  const consumableStatuses = ["Disponible", "Agotado", "Baja"];
  const options = type === "Activo" ? activeStatuses : consumableStatuses;
  els.itemStatus.innerHTML = options.map((value) => `<option value="${value}">${value}</option>`).join("");
  els.itemStatus.value = options.includes(currentStatus) ? currentStatus : options[0];
}

function saveItem(event) {
  event.preventDefault();

  const item = {
    id: els.itemId.value || crypto.randomUUID(),
    code: els.itemCode.value.trim(),
    name: els.itemName.value.trim(),
    type: els.itemType.value,
    category: els.itemCategory.value.trim(),
    brand: els.itemBrand.value.trim(),
    model: els.itemModel.value.trim(),
    serial: els.itemSerial.value.trim(),
    quantity: els.itemType.value === "Activo" ? 1 : Math.max(1, Number(els.itemQuantity.value) || 1),
    minStock: Math.max(0, Number(els.itemMinStock.value) || 0),
    location: els.itemLocation.value.trim(),
    assignedTo: els.itemAssignedTo.value.trim(),
    status: els.itemStatus.value,
    notes: els.itemNotes.value.trim(),
    updatedAt: new Date().toISOString(),
  };

  if (!item.code || !item.name || !item.category) {
    showToast("Completa código, nombre y categoría.", "error");
    return;
  }

  const duplicateCode = state.items.find((entry) => entry.code.toLowerCase() === item.code.toLowerCase() && entry.id !== item.id);
  if (duplicateCode) {
    showToast("Ese código ya existe en otro registro.", "error");
    return;
  }

  if (item.type === "Activo") {
    item.quantity = 1;
  }

  const existingIndex = state.items.findIndex((entry) => entry.id === item.id);
  if (existingIndex >= 0) state.items[existingIndex] = item;
  else state.items.unshift(item);

  saveState();
  closeModal("itemModal");
  renderAll();
  showToast(existingIndex >= 0 ? "Registro actualizado." : "Registro creado.");
}

function openMovementModal(item = null) {
  els.movementForm.reset();
  const currentItem = item || state.items[0];
  if (!currentItem) {
    showToast("Primero crea un registro para moverlo.", "error");
    return;
  }

  els.movementItemId.value = currentItem.id;
  els.movementItemName.value = `${currentItem.code} · ${currentItem.name}`;
  els.movementType.value = currentItem.type === "Activo" ? "Asignación" : "Salida";
  els.movementQuantity.value = currentItem.type === "Activo" ? 1 : 1;
  els.movementQuantity.disabled = currentItem.type === "Activo" && ["Asignación", "Devolución", "Mantenimiento", "Baja"].includes(els.movementType.value);
  els.movementResponsible.value = currentItem.assignedTo || "";
  els.movementDestination.value = currentItem.location || "";
  els.movementNotes.value = "";
  syncMovementFields(currentItem);
  openModal("movementModal");
}

function syncMovementFields(item) {
  const type = els.movementType.value;
  const activeOnly = item.type === "Activo";
  if (activeOnly) {
    els.movementQuantity.value = 1;
    els.movementQuantity.disabled = true;
  } else {
    els.movementQuantity.disabled = false;
    els.movementQuantity.min = "1";
  }
  if (type === "Entrada") {
    els.movementQuantity.disabled = false;
    els.movementQuantity.value = 1;
  }
  if (type === "Ajuste" && !activeOnly) {
    els.movementQuantity.disabled = false;
  }
}

els.movementType.addEventListener("change", () => {
  const item = state.items.find((entry) => entry.id === els.movementItemId.value);
  if (item) syncMovementFields(item);
});

function saveMovement(event) {
  event.preventDefault();

  const item = state.items.find((entry) => entry.id === els.movementItemId.value);
  if (!item) {
    showToast("El registro seleccionado ya no existe.", "error");
    return;
  }

  const movement = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    itemId: item.id,
    itemName: item.name,
    type: els.movementType.value,
    quantity: Math.max(1, Number(els.movementQuantity.value) || 1),
    responsible: els.movementResponsible.value.trim(),
    destination: els.movementDestination.value.trim(),
    notes: els.movementNotes.value.trim(),
  };

  applyMovement(item, movement);
  state.movements.unshift(movement);
  saveState();
  closeModal("movementModal");
  renderAll();
  showToast("Movimiento registrado.");
}

function applyMovement(item, movement) {
  if (item.type === "Consumible") {
    if (movement.type === "Entrada") item.quantity += movement.quantity;
    if (movement.type === "Salida" || movement.type === "Asignación") item.quantity = Math.max(0, item.quantity - movement.quantity);
    if (movement.type === "Devolución") item.quantity += movement.quantity;
    if (movement.type === "Ajuste") item.quantity = movement.quantity;

    if (item.quantity === 0) item.status = "Agotado";
    else if (item.status === "Agotado") item.status = "Disponible";
    else if (item.quantity <= item.minStock) item.status = "Disponible";

    if (movement.destination) item.location = movement.destination;
    if (movement.responsible && movement.type === "Asignación") item.assignedTo = movement.responsible;
    if (movement.type === "Salida" || movement.type === "Devolución") item.assignedTo = "";
  } else {
    if (movement.type === "Asignación") {
      item.status = "Asignado";
      item.assignedTo = movement.responsible || item.assignedTo;
      if (movement.destination) item.location = movement.destination;
    }
    if (movement.type === "Devolución") {
      item.status = "Disponible";
      item.assignedTo = "";
      if (movement.destination) item.location = movement.destination;
    }
    if (movement.type === "Mantenimiento") item.status = "Mantenimiento";
    if (movement.type === "Baja") item.status = "Baja";
    if (movement.type === "Ajuste" || movement.type === "Entrada") {
      item.status = "Disponible";
    }
    item.quantity = 1;
  }

  item.updatedAt = new Date().toISOString();
}

function deleteItem(item) {
  const confirmed = window.confirm(`¿Eliminar ${item.code} - ${item.name}? Esta acción no se puede deshacer.`);
  if (!confirmed) return;

  state.items = state.items.filter((entry) => entry.id !== item.id);
  state.movements.unshift({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    itemId: item.id,
    itemName: item.name,
    type: "Baja",
    quantity: 0,
    responsible: "Sistema",
    destination: item.location,
    notes: "Registro eliminado manualmente.",
  });
  saveState();
  renderAll();
  showToast("Registro eliminado.");
}

function resetFilters() {
  filters.search = "";
  filters.status = "Todos";
  filters.type = "Todos";
  filters.category = "Todas";
  els.searchInput.value = "";
  els.statusFilter.value = "Todos";
  els.typeFilter.value = "Todos";
  els.categoryFilter.value = "Todas";
  renderAll();
}

function resetToSeed() {
  const confirmed = window.confirm("¿Recargar la muestra inicial? Se reemplazará el estado actual.");
  if (!confirmed) return;
  state.items = cloneState(seedState.items);
  state.movements = cloneState(seedState.movements);
  saveState();
  renderAll();
  showToast("Muestra inicial cargada.");
}

function exportJson() {
  const payload = JSON.stringify(state, null, 2);
  downloadFile(payload, "inventario-avanzado-backup.json", "application/json");
  showToast("Respaldo JSON exportado.");
}

function exportCsv() {
  const headers = ["codigo", "nombre", "tipo", "categoria", "marca", "modelo", "serial", "cantidad", "minimo", "ubicacion", "asignado_a", "estado", "observaciones"];
  const lines = [headers.join(",")];
  state.items.forEach((item) => {
    lines.push(
      [
        item.code,
        item.name,
        item.type,
        item.category,
        item.brand,
        item.model,
        item.serial,
        item.quantity,
        item.minStock,
        item.location,
        item.assignedTo,
        item.status,
        item.notes,
      ]
        .map(csvEscape)
        .join(",")
    );
  });
  downloadFile(lines.join("\n"), "inventario-avanzado.csv", "text/csv");
  showToast("CSV exportado.");
}

function exportExcel() {
  const timestamp = formatDateTime(new Date().toISOString());
  const totalUnits = state.items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
  const lowStock = state.items.filter((item) => isLowStock(item)).length;
  const assigned = state.items.filter((item) => item.status === "Asignado").length;

  const inventoryRows = state.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.code)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.type)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.brand)}</td>
          <td>${escapeHtml(item.model)}</td>
          <td>${escapeHtml(item.serial || "")}</td>
          <td>${Number(item.quantity) || 0}</td>
          <td>${item.minStock}</td>
          <td>${escapeHtml(item.location || "")}</td>
          <td>${escapeHtml(item.assignedTo || "")}</td>
          <td>${escapeHtml(item.status)}</td>
          <td>${escapeHtml(item.notes || "")}</td>
          <td>${escapeHtml(formatDateTime(item.updatedAt || new Date().toISOString()))}</td>
        </tr>
      `
    )
    .join("");

  const movementRows = [...state.movements]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(
      (movement) => `
        <tr>
          <td>${escapeHtml(formatDateTime(movement.date))}</td>
          <td>${escapeHtml(movement.itemName)}</td>
          <td>${escapeHtml(movement.type)}</td>
          <td>${movement.quantity}</td>
          <td>${escapeHtml(movement.responsible || "")}</td>
          <td>${escapeHtml(movement.destination || "")}</td>
          <td>${escapeHtml(movement.notes || "")}</td>
        </tr>
      `
    )
    .join("");

  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; color: #111827; }
        h1, h2, p { margin: 0 0 10px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; vertical-align: top; }
        th { background: #0f172a; color: #fff; }
      </style>
    </head>
    <body>
      <h1>ControlTI Pro</h1>
      <p>Reporte generado: ${escapeHtml(timestamp)}</p>
      <p>Registros: ${state.items.length} | Unidades: ${totalUnits} | Bajo stock: ${lowStock} | Asignados: ${assigned}</p>
      <h2>Inventario actual</h2>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Categoría</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Serial</th>
            <th>Cantidad</th>
            <th>Mínimo</th>
            <th>Ubicación</th>
            <th>Asignado a</th>
            <th>Estado</th>
            <th>Observaciones</th>
            <th>Actualizado</th>
          </tr>
        </thead>
        <tbody>${inventoryRows}</tbody>
      </table>
      <h2>Movimientos recientes</h2>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Registro</th>
            <th>Movimiento</th>
            <th>Cantidad</th>
            <th>Responsable</th>
            <th>Destino</th>
            <th>Notas</th>
          </tr>
        </thead>
        <tbody>${movementRows}</tbody>
      </table>
    </body>
    </html>
  `;

  downloadFile(workbook, `ControlTI-Pro-${formatFileStamp(new Date().toISOString())}.xls`, "application/vnd.ms-excel");
  showToast("Excel descargado con el estado actual.");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

function handleImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      const next = Array.isArray(parsed.items) && Array.isArray(parsed.movements) ? parsed : { items: parsed.items || parsed, movements: parsed.movements || [] };
      const normalized = sanitizeState({
        items: Array.isArray(next.items) ? next.items : [],
        movements: Array.isArray(next.movements) ? next.movements : [],
      });
      if (!normalized.items.length) {
        showToast("El archivo no contiene registros válidos.", "error");
        return;
      }
      state.items = normalized.items;
      state.movements = normalized.movements;
      saveState();
      renderAll();
      showToast("Respaldo importado correctamente.");
    } catch {
      showToast("No se pudo leer el archivo JSON.", "error");
    } finally {
      els.importFile.value = "";
    }
  };
  reader.readAsText(file);
}

function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function showToast(message, kind = "success") {
  els.toast.textContent = message;
  els.toast.style.borderColor =
    kind === "error" ? "rgba(255, 107, 122, 0.5)" : kind === "warning" ? "rgba(255, 202, 99, 0.5)" : "rgba(111, 199, 255, 0.45)";
  els.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.add("hidden"), 2600);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatFileStamp(value) {
  const date = new Date(value);
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}


