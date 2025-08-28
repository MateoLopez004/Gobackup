// internal/backup/scanner.go
package backup

import (
	"fmt"
	"gobackup/internal/logger"
	"os"
	"path/filepath"
	"time"
)

// ScanModifiedFiles escanea rootDir recursivamente y devuelve las rutas
// de archivos modificados en los últimos modifiedMinutes minutos.
func ScanModifiedFiles(rootDir string, modifiedMinutes int) ([]string, error) {
	var files []string

	logger.Infof("Escaneando directorio: %s (últimos %d minutos)", rootDir, modifiedMinutes)
	if _, err := os.Stat(rootDir); os.IsNotExist(err) {
		logger.Errorf("EL DIRECTORIO NO EXISTE: %s", rootDir)
		return nil, fmt.Errorf("directorio no existe: %s", rootDir)
	}
	// FIN DE VERIFICACIÓN
	if _, err := os.Stat(rootDir); os.IsNotExist(err) {
		logger.Errorf("EL DIRECTORIO NO EXISTE: %s", rootDir)
		return nil, fmt.Errorf("directorio no existe: %s", rootDir)
	}

	err := filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			logger.Warnf("No se puede acceder a %s: %v", path, err)
			return nil // ignoramos error pero continuamos
		}

		if info.IsDir() {
			return nil // ignoramos directorios
		}

		// Si modifiedMinutes es 0, incluimos todos los archivos.
		if modifiedMinutes == 0 {
			files = append(files, path)
			logger.Debugf("Archivo detectado (sin filtro de tiempo): %s", path)
			return nil
		}

		// Si modifiedMinutes es mayor a 0, aplicamos el filtro de tiempo.
		cutoff := time.Now().Add(-time.Duration(modifiedMinutes) * time.Minute)
		if info.ModTime().After(cutoff) {
			files = append(files, path)
			logger.Debugf("Archivo modificado detectado: %s", path)
		}

		return nil
	})

	if err != nil {
		logger.Errorf("Error escaneando directorio %s: %v", rootDir, err)
		return nil, err
	}

	logger.Infof("Escaneo completado. Archivos encontrados: %d", len(files))
	return files, nil
}
