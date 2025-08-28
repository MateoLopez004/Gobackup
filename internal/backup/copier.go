package backup

import (
	"fmt"
	"gobackup/internal/logger"
	"io"
	"os"
	"path/filepath"
	"sync"
)

// CopyFilesConcurrent copia archivos usando concurrencia y verifica el checksum.
func CopyFilesConcurrent(files []string, sourceBaseDir, destBaseDir string, concurrency int) error {
	sourceBaseDir = filepath.Clean(sourceBaseDir)
	destBaseDir = filepath.Clean(destBaseDir)

	var wg sync.WaitGroup
	limiter := NewLimiter(concurrency)
	var firstErr error
	var errMu sync.Mutex

	for _, file := range files {
		wg.Add(1)
		go func(file string) {
			defer wg.Done()
			limiter.Acquire()
			defer limiter.Release()

			relPath, err := filepath.Rel(sourceBaseDir, file)
			if err != nil {
				logger.Errorf("Error obteniendo ruta relativa: %v", err)
				setFirstError(err, &firstErr, &errMu)
				return
			}

			destPath := filepath.Join(destBaseDir, relPath)
			if err := os.MkdirAll(filepath.Dir(destPath), os.ModePerm); err != nil {
				logger.Errorf("Error creando directorio destino: %v", err)
				setFirstError(err, &firstErr, &errMu)
				return
			}

			if err := copyFileAndVerify(file, destPath); err != nil {
				logger.Errorf("Error copiando %s: %v", file, err)
				setFirstError(err, &firstErr, &errMu)
				return
			}

			logger.Infof("Archivo copiado y verificado: %s", relPath)
			Status.IncrementFilesCopied()
		}(file)
	}

	wg.Wait()
	return firstErr
}

// copyFileAndVerify copia el archivo y verifica el checksum.
func copyFileAndVerify(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	info, err := in.Stat()
	if err != nil {
		return err
	}

	// Crea el archivo de destino con los permisos de origen
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, info.Mode())
	if err != nil {
		return err
	}
	defer out.Close()

	// Copia el contenido del archivo
	if _, err := io.Copy(out, in); err != nil {
		return err
	}

	// Verifica el checksum del archivo de origen y destino
	if equal, err := VerifyChecksum(src, dst); err != nil {
		return err
	} else if !equal {
		return fmt.Errorf("checksum no coincide para %s", src)
	}

	return nil
}

// setFirstError asegura que solo se guarde el primer error
func setFirstError(err error, firstErr *error, mu *sync.Mutex) {
	mu.Lock()
	defer mu.Unlock()
	if *firstErr == nil {
		*firstErr = err
	}
}
