// stats.js - Funcionalidad para la página de estadísticas

// Variables globales para los charts
let sizeHistoryChartInstance = null;
let fileTypeChartInstance = null;

document.addEventListener('DOMContentLoaded', function() {
    loadStatsSummary();
    loadBackupHistory();
    loadFileTypeStats();

    // Configurar auto-actualización cada 30 segundos
    setInterval(() => {
        loadStatsSummary();
        loadBackupHistory();
        loadFileTypeStats();
    }, 30000);
});

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    if (bytes >= 1073741824) {
        return (bytes / 1073741824).toFixed(2) + ' GB';
    } else if (bytes >= 1048576) {
        return (bytes / 1048576).toFixed(2) + ' MB';
    } else if (bytes >= 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    } else {
        return bytes + ' B';
    }
}

function formatDuration(seconds) {
    if (seconds < 1) {
        return (seconds * 1000).toFixed(0) + 'ms';
    } else if (seconds < 60) {
        return seconds.toFixed(2) + 's';
    } else if (seconds < 3600) {
        return (seconds / 60).toFixed(1) + 'm';
    } else {
        return (seconds / 3600).toFixed(1) + 'h';
    }
}

function loadStatsSummary() {
    fetch('/api/stats/summary')
        .then(response => {
            if (!response.ok) throw new Error('Error en API stats/summary');
            return response.json();
        })
        .then(data => {
            document.getElementById('total-backups').textContent = data.total_backups || 0;
            document.getElementById('total-space').textContent = data.total_size_mb || '0 MB';
            document.getElementById('avg-size').textContent = data.avg_size_mb || '0 MB';
            document.getElementById('avg-duration').textContent = data.avg_duration || '0s';

            // Actualizar textos adicionales
            document.getElementById('backups-trend').textContent =
                data.backups_trend || '+0 en la última semana';
            document.getElementById('space-trend').textContent =
                data.space_trend || '+0 MB desde el último mes';
            document.getElementById('max-size').textContent =
                data.max_size || 'Máximo: 0 MB';
            document.getElementById('min-duration').textContent =
                data.min_duration || 'Más rápido: 0s';
        })
        .catch(error => {
            console.error('Error cargando resumen:', error);
            document.getElementById('total-backups').textContent = 'Error';
            document.getElementById('total-space').textContent = 'Error';
            document.getElementById('avg-size').textContent = 'Error';
            document.getElementById('avg-duration').textContent = 'Error';
        });
}

function loadBackupHistory() {
    fetch('/api/stats/history')
        .then(response => {
            if (!response.ok) throw new Error('Error en API stats/history');
            return response.json();
        })
        .then(data => {
            const tableBody = document.getElementById('history-table').querySelector('tbody');
            tableBody.innerHTML = '';

            if (data.backups && data.backups.length > 0) {
                // Ordenar por fecha más reciente primero
                data.backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                data.backups.forEach(backup => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${new Date(backup.timestamp).toLocaleString()}</td>
                        <td>${backup.session_id || backup.sessionID || 'N/A'}</td>
                        <td>${formatFileSize(backup.total_size)}</td>
                        <td>${backup.files_count || backup.FilesCount || 0}</td>
                        <td>${formatDuration(backup.duration_seconds || backup.duration_seconds)}</td>
                        <td class="status-${backup.status}">${backup.status}</td>
                    `;
                    tableBody.appendChild(row);
                });

                // También actualizar el gráfico de historial
                renderSizeHistoryChart(data);
            } else {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay historial de backups</td></tr>';
                renderEmptyCharts();
            }
        })
        .catch(error => {
            console.error('Error cargando historial:', error);
            const tableBody = document.getElementById('history-table').querySelector('tbody');
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ff4444;">Error cargando historial</td></tr>';
            renderErrorCharts();
        });
}

function loadFileTypeStats() {
    fetch('/api/stats/filetypes')
        .then(response => {
            if (!response.ok) throw new Error('Error en API stats/filetypes');
            return response.json();
        })
        .then(data => {
            renderFileTypeChart(data);
            updateFileTypeList(data);
        })
        .catch(error => {
            console.error('Error cargando stats de archivos:', error);
            renderErrorCharts();
        });
}

function renderSizeHistoryChart(data) {
    const ctx = document.getElementById('sizeHistoryChart').getContext('2d');

    // Destruir chart anterior si existe
    if (sizeHistoryChartInstance) {
        sizeHistoryChartInstance.destroy();
    }

    const backups = data.backups || [];

    if (backups.length > 0) {
        // Ordenar por fecha (más antiguo primero para el gráfico)
        const sortedBackups = [...backups].sort((a, b) =>
            new Date(a.timestamp) - new Date(b.timestamp)
        );

        const labels = sortedBackups.map(backup =>
            new Date(backup.timestamp).toLocaleDateString()
        );

        const sizes = sortedBackups.map(backup =>
            parseFloat(((backup.total_size || 0) / 1048576).toFixed(2)) // Convertir a MB
        );

        sizeHistoryChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tamaño de Backup (MB)',
                    data: sizes,
                    borderColor: '#2a5ee8',
                    backgroundColor: 'rgba(42, 94, 232, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#2a5ee8',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'MB'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Fecha'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } else {
        renderEmptySizeChart();
    }
}

function renderFileTypeChart(data) {
    const ctx = document.getElementById('fileTypeChart').getContext('2d');

    // Destruir chart anterior si existe
    if (fileTypeChartInstance) {
        fileTypeChartInstance.destroy();
    }

    const fileTypes = data.file_types || [];
    const totalSize = data.total_size || 0;

    if (fileTypes.length > 0) {
        const labels = fileTypes.map(item => item.type || 'Desconocido');
        const sizes = fileTypes.map(item =>
            parseFloat(((item.size || 0) / 1048576).toFixed(2)) // Convertir a MB
        );

        // Colores para los segmentos
        const backgroundColors = [
            '#3498db', '#e74c3c', '#f39c12', '#2ecc71', '#9b59b6',
            '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad',
            '#f1c40f', '#27ae60', '#e67e22', '#2980b9', '#8e44ad'
        ];

        fileTypeChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: sizes,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const percentage = totalSize > 0 ?
                                    ((value * 1048576 / totalSize) * 100).toFixed(1) : 0;
                                return `${label}: ${value} MB (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    } else {
        renderEmptyFileTypeChart();
    }
}

function updateFileTypeList(data) {
    const fileTypesList = document.getElementById('file-types-list');
    const fileTypes = data.file_types || [];
    const totalSize = data.total_size || 0;

    fileTypesList.innerHTML = '';

    if (fileTypes.length > 0) {
        fileTypes.forEach((item, index) => {
            const sizeMB = parseFloat(((item.size || 0) / 1048576).toFixed(2));
            const percentage = totalSize > 0 ?
                ((item.size / totalSize) * 100).toFixed(1) : 0;

            const fileTypeItem = document.createElement('div');
            fileTypeItem.className = 'file-type-item';
            fileTypeItem.innerHTML = `
                <div class="file-type-color" style="background-color: ${getColorForIndex(index)}"></div>
                <div class="file-type-info">
                    <div class="file-type-name">${item.type || 'Desconocido'}</div>
                    <div class="file-type-size">${sizeMB} MB (${percentage}%)</div>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${percentage}%; background-color: ${getColorForIndex(index)}"></div>
                    </div>
                </div>
            `;
            fileTypesList.appendChild(fileTypeItem);
        });
    } else {
        fileTypesList.innerHTML = `
            <div class="no-data">
                <i class="fas fa-folder-open"></i>
                <p>No hay datos de tipos de archivo</p>
            </div>
        `;
    }
}

function getColorForIndex(index) {
    const colors = [
        '#3498db', '#e74c3c', '#f39c12', '#2ecc71', '#9b59b6',
        '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad'
    ];
    return colors[index % colors.length];
}

function renderEmptyCharts() {
    renderEmptySizeChart();
    renderEmptyFileTypeChart();
}

function renderEmptySizeChart() {
    const ctx = document.getElementById('sizeHistoryChart').getContext('2d');
    if (sizeHistoryChartInstance) sizeHistoryChartInstance.destroy();

    sizeHistoryChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['No hay datos'],
            datasets: [{
                label: 'Tamaño de Backup (MB)',
                data: [0],
                borderColor: '#666',
                backgroundColor: 'rgba(102, 102, 102, 0.1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: 10
                }
            }
        }
    });
}

function renderEmptyFileTypeChart() {
    const ctx = document.getElementById('fileTypeChart').getContext('2d');
    if (fileTypeChartInstance) fileTypeChartInstance.destroy();

    fileTypeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['No hay datos'],
            datasets: [{
                data: [1],
                backgroundColor: ['#666']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderErrorCharts() {
    const sizeCtx = document.getElementById('sizeHistoryChart').getContext('2d');
    const typeCtx = document.getElementById('fileTypeChart').getContext('2d');

    if (sizeHistoryChartInstance) sizeHistoryChartInstance.destroy();
    if (fileTypeChartInstance) fileTypeChartInstance.destroy();

    sizeHistoryChartInstance = new Chart(sizeCtx, {
        type: 'bar',
        data: {
            labels: ['Error'],
            datasets: [{
                label: 'Error cargando datos',
                data: [0],
                backgroundColor: 'rgba(255, 68, 68, 0.6)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });

    fileTypeChartInstance = new Chart(typeCtx, {
        type: 'doughnut',
        data: {
            labels: ['Error'],
            datasets: [{
                data: [1],
                backgroundColor: ['rgba(255, 68, 68, 0.6)']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}