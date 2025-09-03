const progressBar = document.getElementById("progressBar");
const logsDiv = document.getElementById("logs");
const startBtn = document.getElementById("startBackup");
const resetBtn = document.getElementById("resetApp");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const totalFilesEl = document.getElementById("totalFiles");
const copiedFilesEl = document.getElementById("copiedFiles");
const errorCountEl = document.getElementById("errorCount");
const progressPercentEl = document.getElementById("progressPercent");

// Elementos de drag & drop - NOMBRES CORREGIDOS
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput"); // Cambiado de folderInput
const selectedFolderDiv = document.getElementById("selectedFolder");
const folderPathEl = document.getElementById("folderPath");
const clearSelectionBtn = document.getElementById("clearSelection");
const selectButton = document.getElementById("selectButton"); // Nuevo botón con ID

// Elementos de estadísticas rápidas
const quickTotalBackups = document.getElementById("quick-total-backups");
const quickTotalSize = document.getElementById("quick-total-size");
const quickAvgSize = document.getElementById("quick-avg-size");
const quickAvgDuration = document.getElementById("quick-avg-duration");

// Variables para controlar el polling
let pollingInterval = null;
let isBackupInProgress = false;
let currentSessionId = null;
let uploadedFilesCount = 0;
let uploadedFiles = [];

// ================== FUNCIÓN DE DEBUG ==================
function debugLog(message) {
    console.log(`[DEBUG] ${message}`);
    // appendLog(`[DEBUG] ${message}`, "info"); // Descomenta si quieres ver debug en la UI
}

// ================== INICIALIZACIÓN DEL BOTÓN ==================
function initializeSelectButton() {
    debugLog("Inicializando botón de selección...");

    if (!selectButton) {
        debugLog("ERROR: Botón selectButton no encontrado");
        return;
    }

    if (!fileInput) {
        debugLog("ERROR: fileInput no encontrado");
        return;
    }

    // Remover cualquier event listener existente
    const newSelectButton = selectButton.cloneNode(true);
    selectButton.parentNode.replaceChild(newSelectButton, selectButton);

    // Agregar event listener al nuevo botón
    newSelectButton.addEventListener('click', function(e) {
        e.preventDefault();
        debugLog("🟢 Botón de selección clickeado");
        fileInput.click();
    });

    debugLog("✅ Botón de selección inicializado correctamente");
}

// ================== EVENTOS DRAG & DROP ==================
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
    debugLog("Drag over en zona de drop");
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
    debugLog("Drag leave de zona de drop");
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    debugLog("Archivos soltados en zona de drop");

    const files = e.dataTransfer.files;
    if (files.length === 0) {
        appendLog("[ERROR] No se soltaron archivos", "error");
        return;
    }

    await handleFileUpload(files);
});

// ================== EVENTO PARA SELECCIÓN MANUAL ==================
fileInput.addEventListener('change', async (e) => {
    debugLog("Evento change del file input disparado");
    const files = e.target.files;
    debugLog(`Archivos seleccionados: ${files.length}`);

    if (files.length > 0) {
        await handleFileUpload(files);
    }
});

// ================== FUNCIÓN PARA MANEJAR UPLOADS ==================
async function handleFileUpload(files) {
    startBtn.disabled = true;
    appendLog("[INFO] Subiendo archivos al servidor...", "info");
    statusText.textContent = "Subiendo archivos...";
    debugLog(`Subiendo ${files.length} archivos`);

    // Subir cada archivo
    for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
    }

    appendLog("[SUCCESS] Todos los archivos subidos correctamente", "success");
    startBtn.disabled = false;
    statusText.textContent = "Archivos subidos - Listo para backup";
}

// ================== EVENTO PARA LIMPIAR SELECCIÓN ==================
clearSelectionBtn.addEventListener('click', () => {
    uploadedFilesCount = 0;
    uploadedFiles = [];
    currentSessionId = null;
    selectedFolderDiv.style.display = 'none';
    dropZone.style.display = 'block';
    fileInput.value = '';
    statusText.textContent = "Arrastra archivos para comenzar";
    appendLog("[INFO] Sesión reiniciada", "info");
    updateFileCounter();
    debugLog("Selección limpiada");
});

// ================== FUNCIÓN PARA ACTUALIZAR CONTADOR ==================
function updateFileCounter() {
    if (uploadedFilesCount > 0) {
        folderPathEl.textContent = `${uploadedFilesCount} archivo(s) listos para backup`;
        selectedFolderDiv.style.display = 'block';
        dropZone.style.display = 'none';
        startBtn.disabled = false;
        debugLog(`Contador actualizado: ${uploadedFilesCount} archivos`);
    } else {
        selectedFolderDiv.style.display = 'none';
        dropZone.style.display = 'block';
        startBtn.disabled = true;
        debugLog("Contador actualizado: 0 archivos");
    }
}

// ================== FUNCIÓN PARA SUBIR ARCHIVOS ==================
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    if (currentSessionId) {
        formData.append('sessionId', currentSessionId);
    }

    try {
        debugLog(`Subiendo archivo: ${file.name}`);
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        debugLog(`Respuesta del servidor: ${JSON.stringify(data)}`);

        if (!currentSessionId && data.sessionId) {
            currentSessionId = data.sessionId;
            appendLog(`[INFO] Sesión creada: ${currentSessionId}`, "info");
            debugLog(`Nueva sesión: ${currentSessionId}`);
        }

        uploadedFilesCount++;
        uploadedFiles.push(file.name);
        updateFileCounter();

        appendLog(`[SUCCESS] Subido: ${file.name} (${formatFileSize(file.size)})`, "success");
    } catch (error) {
        debugLog(`Error subiendo archivo: ${error.message}`);
        appendLog(`[ERROR] Error subiendo ${file.name}: ${error.message}`, "error");
    }
}

// ================== FUNCIÓN PARA FORMATEAR TAMAÑO ==================
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ================== EVENTO PARA INICIAR BACKUP ==================
startBtn.addEventListener("click", async () => {
    if (uploadedFilesCount === 0) {
        appendLog("[ERROR] Primero sube algunos archivos", "error");
        return;
    }

    startBtn.disabled = true;
    resetBtn.style.display = "none";
    logsDiv.innerHTML = '';
    appendLog("[INFO] Iniciando proceso de backup...", "info");
    appendLog(`[INFO] ${uploadedFilesCount} archivos para procesar`, "info");
    debugLog("Iniciando backup...");

    statusDot.classList.remove("active");
    statusText.textContent = "Iniciando backup...";

    totalFilesEl.textContent = "0";
    copiedFilesEl.textContent = "0";
    errorCountEl.textContent = "0";
    progressPercentEl.textContent = "0%";

    try {
        const response = await fetch('/backup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: currentSessionId || 'default_session'
            })
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        appendLog("[INFO] " + data.message, "info");
        isBackupInProgress = true;
        startPolling();
        debugLog("Backup iniciado correctamente");
    } catch (error) {
        debugLog(`Error iniciando backup: ${error.message}`);
        appendLog("[ERROR] Error al iniciar el backup: " + error.message, "error");
        startBtn.disabled = false;
        statusText.textContent = "Error al iniciar";
        isBackupInProgress = false;
    }
});

// ================== EVENTO PARA REINICIAR ==================
resetBtn.addEventListener("click", () => {
    stopPolling();
    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
    logsDiv.innerHTML = '';
    startBtn.disabled = false;
    resetBtn.style.display = "none";
    statusDot.classList.remove("active");
    statusText.textContent = "Arrastra archivos para comenzar";
    progressPercentEl.textContent = "0%";
    isBackupInProgress = false;
    currentSessionId = null;
    uploadedFilesCount = 0;
    uploadedFiles = [];
    updateFileCounter();
    appendLog("[INFO] Aplicación reiniciada. Lista para el próximo backup.", "info");
    debugLog("Aplicación reiniciada");
});

// ================== FUNCIÓN PARA AGREGAR LOGS ==================
function appendLog(msg, type = "info") {
    const p = document.createElement("p");
    p.textContent = msg;
    p.setAttribute("data-type", type);
    logsDiv.appendChild(p);
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

// ================== FUNCIÓN PARA POLLING ==================
function startPolling() {
    stopPolling();
    debugLog("Iniciando polling de estado");

    let pollingCount = 0;
    const maxPolls = 300;

    pollingInterval = setInterval(() => {
        pollingCount++;

        if (pollingCount > maxPolls) {
            appendLog("[ERROR] Timeout: El backup tardó demasiado", "error");
            stopPolling();
            startBtn.disabled = false;
            statusText.textContent = "Timeout error";
            debugLog("Timeout en polling");
            return;
        }

        updateStatus();
    }, 2000);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        debugLog("Polling detenido");
    }
}

// ================== FUNCIÓN PARA DESCARGAR BACKUP ==================
async function downloadBackup(sessionId) {
    try {
        debugLog(`Iniciando descarga para sesión: ${sessionId}`);

        // Crear enlace de descarga automática
        const downloadLink = document.createElement('a');
        downloadLink.href = `/download/${sessionId}`;
        downloadLink.download = `${sessionId}.zip`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        appendLog("[SUCCESS] Descarga iniciada automáticamente", "success");
        resetBtn.style.display = "inline-block";
        debugLog("Descarga iniciada");

    } catch (error) {
        debugLog(`Error en descarga: ${error.message}`);
        appendLog(`[ERROR] Error al descargar: ${error.message}`, "error");
    }
}

// ================== FUNCIÓN PARA ACTUALIZAR ESTADO ==================
function updateStatus() {
    fetch("/status")
        .then(res => {
            if (!res.ok) throw new Error("Error obteniendo estado");
            return res.json();
        })
        .then(data => {
            const TotalFiles = data.TotalFiles || uploadedFilesCount;
            const FilesCopied = data.FilesCopied || 0;
            const Errors = data.Errors || [];
            const InProgress = data.InProgress || false;

            totalFilesEl.textContent = TotalFiles;
            copiedFilesEl.textContent = FilesCopied;
            errorCountEl.textContent = Errors.length;

            let percent = 0;
            if (TotalFiles > 0) {
                percent = Math.round((FilesCopied / TotalFiles) * 100);
            } else if (!InProgress && isBackupInProgress) {
                percent = 100;
            }

            progressBar.style.width = percent + "%";
            progressBar.textContent = percent + "%";
            progressPercentEl.textContent = percent + "%";

            if (Errors && Errors.length > 0) {
                Errors.forEach(err => appendLog("[ERROR] " + err, "error"));
            }

            if (InProgress) {
                appendLog(`[INFO] Backup en progreso: ${FilesCopied}/${TotalFiles} archivos`, "info");
                statusDot.classList.add("active");
                statusText.textContent = "Backup en progreso";
            } else if (TotalFiles > 0 && FilesCopied === TotalFiles) {
                appendLog("[SUCCESS] Backup completado correctamente!", "success");
                statusDot.classList.remove("active");
                statusText.textContent = "Backup completado";
                isBackupInProgress = false;
                stopPolling();
                setTimeout(() => downloadBackup(currentSessionId), 1000);
            } else if (!InProgress && isBackupInProgress) {
                appendLog("[INFO] Backup completado", "info");
                startBtn.disabled = false;
                resetBtn.style.display = "inline-block";
                statusDot.classList.remove("active");
                statusText.textContent = "Backup completado";
                isBackupInProgress = false;
                stopPolling();
            }
        })
        .catch(err => {
            console.error(err);
            appendLog("[ERROR] No se pudo obtener el estado del backup", "error");
        });
}

// ================== FUNCIÓN PARA CARGAR ESTADÍSTICAS ==================
function loadQuickStats() {
    fetch('/api/stats/summary')
        .then(response => response.json())
        .then(data => {
            quickTotalBackups.textContent = data.total_backups;
            quickTotalSize.textContent = data.total_size_mb;
            quickAvgSize.textContent = data.avg_size_mb;
            quickAvgDuration.textContent = data.avg_duration;
        })
        .catch(error => {
            console.error('Error cargando estadísticas:', error);
        });
}

// ================== INICIALIZACIÓN ==================
document.addEventListener('DOMContentLoaded', function() {
    debugLog("DOM completamente cargado");
    initializeSelectButton();
    updateFileCounter();
    appendLog("[INFO] Aplicación cargada. Arrastra archivos o haz clic para seleccionarlos.", "info");
    appendLog("[INFO] Los archivos se subirán al servidor y se comprimirán en un ZIP.", "info");
    debugLog("Inicialización completada");

    // Cargar estadísticas rápidas
    loadQuickStats();
});