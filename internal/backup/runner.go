package backup

import (
	"archive/zip"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
)

// Las variables globales serán inicializadas por el comando Cobra en cmd/root.go
var SourceDir string
var BackupDir string
var ModifiedMinutes int
var MaxConcurrency int

// Variables globales para el nuevo sistema
var UploadsDir string
var BackupsDir string
var TempDir string
var CurrentSessionID string

// RunBackup ejecuta el proceso completo de backup.
func RunBackup() error {
	// Validar que al menos BackupDir esté configurado
	if BackupDir == "" {
		return fmt.Errorf("BackupDir no está configurado")
	}

	// Si SourceDir está vacío, es porque se usará drag & drop
	if SourceDir == "" {
		return fmt.Errorf("no se ha seleccionado ninguna carpeta fuente")
	}

	log.Printf("Iniciando backup desde: %s hacia: %s", SourceDir, BackupDir)

	// Validar que el directorio fuente existe
	if _, err := os.Stat(SourceDir); os.IsNotExist(err) {
		return fmt.Errorf("el directorio fuente no existe: %s", SourceDir)
	}

	// Validar que es un directorio
	if info, err := os.Stat(SourceDir); err == nil && !info.IsDir() {
		return fmt.Errorf("la ruta fuente no es un directorio: %s", SourceDir)
	}

	files, err := ScanModifiedFiles(SourceDir, ModifiedMinutes)
	if err != nil {
		errMsg := fmt.Sprintf("Error escaneando archivos: %v", err)
		Status.SetError(errMsg)
		log.Println(errMsg)
		return err
	}

	Status.Reset(len(files))
	log.Printf("Archivos detectados para copiar: %d", len(files))

	if len(files) == 0 {
		log.Println("No hay archivos para copiar. Backup completado.")
		Status.SetDone()
		return nil
	}

	err = CopyFilesConcurrent(files, SourceDir, BackupDir, MaxConcurrency)
	if err != nil {
		errMsg := fmt.Sprintf("Error copiando archivos: %v", err)
		Status.SetError(errMsg)
		log.Println(errMsg)
		return err
	}

	Status.SetDone()
	log.Println("Backup finalizado correctamente.")
	return nil
}

// RunBackupWithSession ejecuta el proceso completo de backup con sistema de sesiones.
func RunBackupWithSession(sessionID string) error {
	CurrentSessionID = sessionID
	sourceDir := filepath.Join(UploadsDir, sessionID)
	backupDir := filepath.Join(BackupsDir, sessionID)

	// Validar directorios
	if sourceDir == "" || backupDir == "" {
		return fmt.Errorf("SourceDir o BackupDir no están configurados")
	}

	log.Printf("Iniciando backup desde: %s hacia: %s", sourceDir, backupDir)

	// Validar que el directorio fuente existe y tiene archivos
	if _, err := os.Stat(sourceDir); os.IsNotExist(err) {
		return fmt.Errorf("el directorio fuente no existe: %s", sourceDir)
	}

	files, err := ScanModifiedFiles(sourceDir, ModifiedMinutes)
	if err != nil {
		errMsg := fmt.Sprintf("Error escaneando archivos: %v", err)
		Status.SetError(errMsg)
		log.Println(errMsg)
		return err
	}

	Status.Reset(len(files))
	log.Printf("Archivos detectados para copiar: %d", len(files))

	if len(files) == 0 {
		log.Println("No hay archivos para copiar. Backup completado.")
		Status.SetDone()
		return nil
	}

	// Crear directorio de backup
	os.MkdirAll(backupDir, 0755)

	err = CopyFilesConcurrent(files, sourceDir, backupDir, MaxConcurrency)
	if err != nil {
		errMsg := fmt.Sprintf("Error copiando archivos: %v", err)
		Status.SetError(errMsg)
		log.Println(errMsg)
		return err
	}

	// Comprimir el directorio de backup
	zipPath := filepath.Join(BackupsDir, sessionID+".zip")
	err = ZipDirectory(backupDir, zipPath)
	if err != nil {
		errMsg := fmt.Sprintf("Error comprimiendo backup: %v", err)
		Status.SetError(errMsg)
		log.Println(errMsg)
		return err
	}

	log.Printf("Backup comprimido creado: %s", zipPath)

	// Opcional: Limpiar directorio sin comprimir después de comprimir
	os.RemoveAll(backupDir)

	Status.SetDone()
	log.Println("Backup finalizado correctamente.")
	return nil
}

// ZipDirectory comprime un directorio completo a un archivo ZIP
func ZipDirectory(sourceDir, zipPath string) error {
	// Crear archivo ZIP
	zipFile, err := os.Create(zipPath)
	if err != nil {
		return fmt.Errorf("error creando archivo ZIP: %v", err)
	}
	defer zipFile.Close()

	zipWriter := zip.NewWriter(zipFile)
	defer zipWriter.Close()

	// Función para caminar por el directorio y agregar archivos al ZIP
	err = filepath.Walk(sourceDir, func(filePath string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Omitir directorios
		if info.IsDir() {
			return nil
		}

		// Crear path relativo para el archivo en el ZIP
		relPath, err := filepath.Rel(sourceDir, filePath)
		if err != nil {
			return err
		}

		// Crear header para el archivo en el ZIP
		zipHeader, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}

		// Usar path relativo en el ZIP
		zipHeader.Name = relPath

		// Mantener la estructura de directorios
		zipHeader.Name = filepath.ToSlash(zipHeader.Name)

		// Usar método de compresión estándar
		zipHeader.Method = zip.Deflate

		// Crear writer para el archivo en el ZIP
		zipFileWriter, err := zipWriter.CreateHeader(zipHeader)
		if err != nil {
			return err
		}

		// Abrir archivo original
		file, err := os.Open(filePath)
		if err != nil {
			return err
		}
		defer file.Close()

		// Copiar contenido del archivo al ZIP
		_, err = io.Copy(zipFileWriter, file)
		if err != nil {
			return err
		}

		log.Printf("Comprimido: %s -> %s", filePath, relPath)
		return nil
	})

	if err != nil {
		return fmt.Errorf("error recorriendo directorio: %v", err)
	}

	return nil
}

// GetBackupSize obtiene el tamaño del archivo de backup
func GetBackupSize(sessionID string) (int64, error) {
	zipPath := filepath.Join(BackupsDir, sessionID+".zip")
	info, err := os.Stat(zipPath)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}

// BackupExists verifica si existe un backup para la sesión
func BackupExists(sessionID string) bool {
	zipPath := filepath.Join(BackupsDir, sessionID+".zip")
	_, err := os.Stat(zipPath)
	return err == nil
}

// GetBackupPath obtiene la ruta del archivo de backup
func GetBackupPath(sessionID string) string {
	return filepath.Join(BackupsDir, sessionID+".zip")
}

// CleanupSession limpia los archivos temporales de una sesión
func CleanupSession(sessionID string) error {
	sourceDir := filepath.Join(UploadsDir, sessionID)
	backupDir := filepath.Join(BackupsDir, sessionID)
	zipPath := filepath.Join(BackupsDir, sessionID+".zip")

	// Limpiar todos los archivos de la sesión
	os.RemoveAll(sourceDir)
	os.RemoveAll(backupDir)
	os.Remove(zipPath)

	log.Printf("Sesión limpiada: %s", sessionID)
	return nil
}

// ListBackups lista todos los backups disponibles
func ListBackups() ([]string, error) {
	files, err := os.ReadDir(BackupsDir)
	if err != nil {
		return nil, err
	}

	var backups []string
	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".zip") && !file.IsDir() {
			backups = append(backups, file.Name())
		}
	}

	return backups, nil
}

// GetBackupInfo obtiene información detallada del backup
func GetBackupInfo(sessionID string) (map[string]interface{}, error) {
	zipPath := GetBackupPath(sessionID)
	info, err := os.Stat(zipPath)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"sessionId":   sessionID,
		"filename":    sessionID + ".zip",
		"size":        info.Size(),
		"sizeMB":      fmt.Sprintf("%.2f MB", float64(info.Size())/1024/1024),
		"created":     info.ModTime(),
		"downloadUrl": "/download/" + sessionID,
	}, nil
}
