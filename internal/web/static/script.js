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

// Elementos de drag & drop
const dropZone = document.getElementById("dropZone");
const folderInput = document.getElementById("folderInput");
const selectedFolderDiv = document.getElementById("selectedFolder");
const folderPathEl = document.getElementById("folderPath");
const clearSelectionBtn = document.getElementById("clearSelection");

// Variables para controlar el polling
let pollingInterval = null;
let isBackupInProgress = false;
let currentSessionId = null;
let uploadedFilesCount = 0;
let uploadedFiles = [];

// Eventos de Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length === 0) {
        appendLog("[ERROR] No se soltaron archivos", "error");
        return;
    }

    startBtn.disabled = true;
    appendLog("[INFO] Subiendo archivos al servidor...", "info");
    statusText.textContent = "Subiendo archivos...";

    // Subir cada archivo
    for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
    }

    appendLog("[SUCCESS] Todos los archivos subidos correctamente", "success");
    startBtn.disabled = false;
    statusText.textContent = "Archivos subidos - Listo para backup";
});

// Evento para selección manual de archivos
folderInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
        startBtn.disabled = true;
        appendLog("[INFO] Subiendo archivos al servidor...", "info");
        statusText.textContent = "Subiendo archivos...";

        for (let i = 0; i < files.length; i++) {
            await uploadFile(files[i]);
        }

        appendLog("[SUCCESS] Todos los archivos subidos correctamente", "success");
        startBtn.disabled = false;
        statusText.textContent = "Archivos subidos - Listo para backup";
    }
});

// Evento para limpiar selección
clearSelectionBtn.addEventListener('click', () => {
    uploadedFilesCount = 0;
    uploadedFiles = [];
    currentSessionId = null;
    selectedFolderDiv.style.display = 'none';
    dropZone.style.display = 'block';
    folderInput.value = '';
    statusText.textContent = "Arrastra archivos para comenzar";
    appendLog("[INFO] Sesión reiniciada", "info");
    updateFileCounter();
});

// Función para actualizar el contador de archivos
function updateFileCounter() {
    if (uploadedFilesCount > 0) {
        folderPathEl.textContent = `${uploadedFilesCount} archivo(s) listos para backup`;
        selectedFolderDiv.style.display = 'block';
        dropZone.style.display = 'none';
        startBtn.disabled = false;
    } else {
        selectedFolderDiv.style.display = 'none';
        dropZone.style.display = 'block';
        startBtn.disabled = true;
    }
}

// Función para subir archivos al servidor
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    if (currentSessionId) {
        formData.append('sessionId', currentSessionId);
    }

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        if (!currentSessionId && data.sessionId) {
            currentSessionId = data.sessionId;
            appendLog(`[INFO] Sesión creada: ${currentSessionId}`, "info");
        }

        uploadedFilesCount++;
        uploadedFiles.push(file.name);
        updateFileCounter();

        appendLog(`[SUCCESS] Subido: ${file.name} (${formatFileSize(file.size)})`, "success");
    } catch (error) {
        appendLog(`[ERROR] Error subiendo ${file.name}: ${error.message}`, "error");
    }
}

// Función para formatear tamaño de archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Modificar el evento click del botón de inicio
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

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        appendLog("[INFO] " + data.message, "info");
        isBackupInProgress = true;
        startPolling();
    } catch (error) {
        appendLog("[ERROR] Error al iniciar el backup: " + error.message, "error");
        startBtn.disabled = false;
        statusText.textContent = "Error al iniciar";
        isBackupInProgress = false;
    }
});

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
});

function appendLog(msg, type = "info") {
    const p = document.createElement("p");
    p.textContent = msg;
    p.setAttribute("data-type", type);
    logsDiv.appendChild(p);
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

// Función para iniciar el polling controlado
function startPolling() {
    stopPolling();

    let pollingCount = 0;
    const maxPolls = 300;

    pollingInterval = setInterval(() => {
        pollingCount++;

        if (pollingCount > maxPolls) {
            appendLog("[ERROR] Timeout: El backup tardó demasiado", "error");
            stopPolling();
            startBtn.disabled = false;
            statusText.textContent = "Timeout error";
            return;
        }

        updateStatus();
    }, 2000);
}

// Función para detener el polling
function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// Función para descargar el backup
async function downloadBackup(sessionId) {
    try {
        // Primero verificar información del backup
        const infoResponse = await fetch(`/backup-info/${sessionId}`);
        if (!infoResponse.ok) throw new Error("No se pudo obtener información del backup");

        const info = await infoResponse.json();

        appendLog(`[INFO] Backup listo: ${info.sizeMB}`, "info");
        appendLog("[INFO] Iniciando descarga...", "info");

        // Crear enlace de descarga automática
        const downloadLink = document.createElement('a');
        downloadLink.href = `/download/${sessionId}`;
        downloadLink.download = `${sessionId}.zip`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        appendLog("[SUCCESS] Descarga iniciada automáticamente", "success");

        // Mostrar botón de reinicio
        resetBtn.style.display = "inline-block";

    } catch (error) {
        appendLog(`[ERROR] Error al descargar: ${error.message}`, "error");
    }
}

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

                // Iniciar descarga automática
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

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    updateFileCounter();
    appendLog("[INFO] Aplicación cargada. Arrastra archivos o haz clic para seleccionarlos.", "info");
    appendLog("[INFO] Los archivos se subirán al servidor y se comprimirán en un ZIP.", "info");
});