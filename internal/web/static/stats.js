// stats.js - Funcionalidad para la página de estadísticas

document.addEventListener('DOMContentLoaded', function() {
    loadStatsSummary();
    loadBackupHistory();
    loadFileTypeStats();
});

function formatFileSize(bytes) {
    if (bytes >= 1073741824) {
        return (bytes / 1073741824).toFixed(2) + ' GB';
    } else if (bytes >= 1048576) {
        return (bytes / 1048576).toFixed(2) + ' MB';
    } else if (bytes >= 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    } else {
        return bytes + ' bytes';
    }
}

function formatDuration(seconds) {
    if (seconds < 60) {
        return seconds.toFixed(1) + 's';
    } else if (seconds < 3600) {
        return (seconds / 60).toFixed(1) + 'm';
    } else {
        return (seconds / 3600).toFixed(1) + 'h';
    }
}

function loadStatsSummary() {
    fetch('/api/stats/summary')
        .then(response => response.json())
        .then(data => {
            document.getElementById('total-backups').textContent = data.total_backups;
            document.getElementById('total-space').textContent = data.total_size_mb;
            document.getElementById('avg-size').textContent = data.avg_size_mb;
            document.getElementById('avg-duration').textContent = data.avg_duration;
        })
        .catch(error => {
            console.error('Error cargando resumen:', error);
        });
}

function loadBackupHistory() {
    fetch('/api/stats/history')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('history-table').querySelector('tbody');
            tableBody.innerHTML = '';

            data.backups.forEach(backup => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(backup.timestamp).toLocaleString()}</td>
                    <td>${backup.session_id || 'N/A'}</td>
                    <td>${formatFileSize(backup.total_size)}</td>
                    <td>${backup.files_count}</td>
                    <td>${formatDuration(backup.duration_seconds)}</td>
                    <td>${backup.status}</td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error cargando historial:', error);
        });
}

function loadFileTypeStats() {
    fetch('/api/stats/files')
        .then(response => response.json())
        .then(data => {
            renderSizeHistoryChart(data);
            renderFileTypeChart(data);
        })
        .catch(error => {
            console.error('Error cargando stats de archivos:', error);
        });
}

function renderSizeHistoryChart(data) {
    const ctx = document.getElementById('sizeHistoryChart').getContext('2d');

    // Datos de ejemplo - se reemplazarán con datos reales
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo'],
            datasets: [{
                label: 'Tamaño de Backup (MB)',
                data: [120, 150, 180, 200, 250],
                borderColor: '#2a5ee8',
                backgroundColor: 'rgba(42, 94, 232, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Evolución del tamaño de backups'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderFileTypeChart(data) {
    const ctx = document.getElementById('fileTypeChart').getContext('2d');

    // Datos de ejemplo - se reemplazarán con datos reales
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['PDF', 'Imágenes', 'Documentos', 'Otros'],
            datasets: [{
                data: [30, 25, 35, 10],
                backgroundColor: [
                    '#2a5ee8',
                    '#f0a500',
                    '#4CAF50',
                    '#666666'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución por tipo de archivo'
                }
            }
        }
    });
}