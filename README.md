# Gobackup — Respaldo sencillo de archivos (CLI + Web)

Gobackup es una herramienta escrita en Go para hacer respaldos de archivos modificados desde una carpeta de origen a una carpeta de respaldo. Ofrece dos modos de uso:

1. **CLI (línea de comandos)**: escanea los archivos modificados y los copia al destino.
2. **Servidor Web local**: abre un panel donde puedes iniciar el respaldo con un botón, ver el progreso y el registro de actividad.

---

## 🚀 Características

- Detección de archivos modificados en los últimos N minutos (configurable).
- Copia concurrente (varios archivos a la vez) con límite configurable.
- Panel Web moderno con barra de progreso, estadísticas en vivo y registros.
- Registro (logs) en consola y archivo, con niveles (DEBUG / INFO / WARN / ERROR).
- Configuración mediante archivo JSON (`config/default.json`).

---

## 📂 Arquitectura del proyecto
Gobackup/
├─ cmd/
│ ├─ root.go — Carga configuración y parámetros (Cobra)
│ ├─ cli.go — Modo CLI
│ └─ web.go — Modo Web
├─ internal/
│ ├─ backup/ — Lógica de respaldo
│ ├─ config/ — Carga configuración
│ ├─ logger/ — Sistema de logs
│ └─ web/ — Servidor y panel web
│ └─ static/ — HTML / CSS del frontend
├─ config/
│ └─ default.json — Configuración por defecto
├─ logs/
│ └─ gobackup.log — Logs generados
├─ main.go — Punto de entrada
└─ go.mod / go.sum — Dependencias


---

## ⚙️ Requisitos

- **Go 1.20+** (recomendado 1.24)
- Compatible con **Windows, Linux y macOS**

---

## 📥 Instalación

Clona el proyecto:

```bash
git clone https://github.com/MateoLopez004/Gobackup.git
cd Gobackup

```
Despues utiliza el siguiente comando para instalar dependencia
````
go mod tidy
````
Edita la configuracion en "default.json"" en base a este criterio
````
{
  "source_dir": "C:/ruta/origen",
  "backup_dir": "C:/ruta/respaldo",
  "modified_minutes": 60,
  "max_concurrency": 5,
  "server_port": 8080
}
`````

▶️ Uso
Modo CLI

Ejecuta el respaldo directamente desde la terminal:
````
go run main.go cli -c config/default.json
````
Modo Web

Inicia el servidor web:
````
go run main.go web -c config/default.json
````

Abre en tu navegador:

http://localhost:8080


(o el puerto que definas en config/default.json)

