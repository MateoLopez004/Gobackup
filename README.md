# Gobackup — Respaldo sencillo de archivos (CLI + Web)

**Gobackup** es una herramienta en Go para **respaldar (copiar) archivos modificados** desde una carpeta de origen a una carpeta de respaldo. Puede usarse de dos formas:

1. **CLI (por terminal):** escanea los archivos cambiados y los copia al destino.  
2. **Servidor Web local:** abre un **panel** donde puedes iniciar el respaldo con un botón y ver el progreso y el registro de actividad.

## Características

- **Detección de cambios** por “archivos modificados” (en los últimos N minutos configurables).
- **Copia concurrente** (varios archivos a la vez) con un límite configurable.
- **Panel Web moderno** con barra de progreso, estadísticas y logs en vivo.
- **Bitácora (logs) a archivo** y en consola, con niveles de detalle (DEBUG/INFO/WARN/ERROR).
- **Configuración por JSON** (rutas, concurrencia, puerto, etc.).

---

## Arquitectura del proyecto

Gobackup/
├─ cmd/ # Comandos de la app (Cobra)
│ ├─ root.go # Carga la configuración y parámetros globales
│ ├─ cli.go # Modo línea de comandos (respaldo por terminal)
│ └─ web.go # Modo servidor web (panel en el navegador)
├─ internal/
│ ├─ backup/ # Lógica de negocio del respaldo
│ │ ├─ status.go # Estado del respaldo (progreso/errores)
│ │ └─ ...
│ ├─ config/
│ │ └─ config.go # Carga/valida config JSON
│ ├─ logger/
│ │ └─ logger.go # Logger global con niveles y archivo de log
│ └─ web/
│ ├─ server.go # Arranque del servidor Gin
│ ├─ routes.go # Endpoints REST (/status, /backup)
│ └─ static/ # Frontend del panel (HTML/CSS)
├─ config/
│ └─ default.json # Ejemplo de configuración
├─ logs/ # Salida de logs (se crea al ejecutar)
├─ main.go # Punto de entrada
├─ go.mod / go.sum # Dependencias
└─ testdata/ # Datos de prueba

markdown
Copiar
Editar

### Flujo de ejecución

- **main.go** inicializa el logger y ejecuta **Cobra** para despachar a `cli` o `web`.
- **root.go** carga la configuración JSON.
- **cli.go**:
  - Escanea archivos modificados.
  - Muestra la lista a copiar.
  - Copia concurrentemente al destino.
- **web.go / server.go / routes.go**:
  - Inician servidor **Gin**.
  - Sirven el dashboard (HTML/CSS).
  - Endpoints: `/status` y `POST /backup`.
- **logger** guarda en `logs/gobackup.log` y filtra por nivel mínimo.

---

## Tecnologías

- **Go 1.24**
- **[Gin](https://github.com/gin-gonic/gin)** (servidor web y API)
- **[Cobra](https://github.com/spf13/cobra)** (CLI)
- **Frontend estático** (HTML + CSS) para el panel
- **Config JSON** para personalizar rutas y parámetros
- **Logs** con escritura a archivo

---

## Requisitos

- **Windows, Linux o macOS**.
- **Go instalado** (versión 1.20+ recomendada; el módulo declara 1.24).
- **Dependencias Go necesarias**:
  - [Gin](https://github.com/gin-gonic/gin) → Framework web.
  - [Cobra](https://github.com/spf13/cobra) → Framework CLI.

Instálalas con:

go get github.com/gin-gonic/gin
go get github.com/spf13/cobra
Instalación (paso a paso, sin saber programar)
Descargar el proyecto

Opción A: botón verde Code en GitHub → “Download ZIP” → descomprimir.

Opción B: con Git

bash
Copiar
Editar
git clone https://github.com/Henry-Lopez/Gobackup.git
cd Gobackup
Instalar Go:
https://go.dev/dl/

Instalar dependencias:

bash
Copiar
Editar
go get github.com/gin-gonic/gin
go get github.com/spf13/cobra
Configurar rutas
Edita config/default.json:

source_dir: carpeta origen.

backup_dir: carpeta respaldo.

modified_minutes: minutos hacia atrás para detectar cambios (0 = todos).

max_concurrency: número de copias simultáneas.

server_port: puerto del panel web.

Uso 1: Ejecutar por Terminal (CLI)
Windows
powershell
Copiar
Editar
cd Ruta\al\proyecto\Gobackup
go run . cli -c config/default.json
Linux / macOS
bash
Copiar
Editar
cd /ruta/al/proyecto/Gobackup
go run . cli -c config/default.json
Uso 2: Panel Web
Ejecutar el servidor:

bash
Copiar
Editar
go run . web -c config/default.json
Abrir en navegador:
http://localhost:8080/

En el panel podrás:

Iniciar un backup con un botón.

Ver progreso y estadísticas.

Ver registro de actividad.

Archivos importantes
config/default.json: configuración del proyecto.

logs/gobackup.log: bitácora con detalles de ejecución.

internal/web/static/: interfaz del panel.

FAQ
1) El panel abre pero no copia nada

Verifica source_dir y backup_dir.

Si modified_minutes es muy bajo, puede que no haya archivos nuevos.

2) ¿Dónde veo qué pasó?

Panel → sección “Registro de actividad”.

Archivo logs/gobackup.log.

3) Cambiar el puerto

Edita server_port en config/default.json.
