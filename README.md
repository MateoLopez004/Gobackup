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
````
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
````

---

## ⚙️ Requisitos

- **Go 1.20+** (recomendado 1.24)
- Compatible con **Windows, Linux y macOS**

---

🚀 Guía de Instalación Paso a Paso - Gobackup Web
📋 Prerrequisitos
Antes de comenzar, asegúrate de tener instalado:

Go 1.18 o superior - Descargar Go

Git - Descargar Git

🔧 Paso 1: Clonar el Proyecto
bash
# Abre tu terminal o línea de comandos
```
git clone https://github.com/MateoLopez004/Gobackup.git
cd Gobackup
```
📦 Paso 2: Instalar Dependencias
Opción A: Instalación Automática (Recomendada)
```
# Este comando instala TODAS las dependencias necesarias
go mod download && go mod tidy
```
Opción B: Instalación Manual (Si falla la automática)
```
# Instalar Gin Web Framework
go get -u github.com/gin-gonic/gin

# Instalar Cobra CLI
go get -u github.com/spf13/cobra
```
Verificar instalación
```
go list -m github.com/gin-gonic/gin
go list -m github.com/spf13/cobra
```
🏗️ Paso 3: Compilar el Programa
Compilar para tu sistema operativo
```
go build -o gobackup .
```
Verificar que se creó el ejecutable
```
ls -la gobackup*  # Linux/Mac
dir gobackup*     # Windows
```

🚀 Paso 4: Ejecutar el Servidor Web
Ejecución Básica
Ejecutar en primer plano (verás los logs)
```
./gobackup web
```
Ejecución con Opciones
Usar puerto diferente (útil si el 8080 está ocupado)
```
./gobackup web --port 8081
```
# Usar archivo de configuración personalizado
```
./gobackup web --config config/custom.json
```
🌐 Paso 6: Acceder a la Aplicación
Abre tu navegador web

Ve a la dirección: http://localhost:8080

Deberías ver la interfaz de Gobackup

URLs importantes:
Interfaz principal: http://localhost:8080

Estadísticas: http://localhost:8080/stats.html

Health check: http://localhost:8080/health

🐛 Paso 7: Solución de Problemas Comunes
Error: "Port already in use"
# Usar otro puerto
```
./gobackup web --port 8081
```
Error: "Access denied" en Windows
# Ejecutar como administrador
# 1. Abre CMD/PowerShell como administrador
# 2. Navega a la carpeta del proyecto
# 3. Ejecuta:
```
go build -o gobackup.exe .
./gobackup.exe web
```
Error: Dependencias faltantes
# Limpiar y reinstalar todo
```
go clean -modcache
go mod download
go mod tidy
go build -o gobackup .
```
📊 Paso 8: Verificar que Todo Funciona
Abre http://localhost:8080

Arrastra algún archivo a la zona de drop

Haz clic en "Iniciar Backup"

Deberías ver el progreso y luego poder descargar el ZIP

