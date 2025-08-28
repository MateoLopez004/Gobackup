package backup

import (
	"crypto/sha256"
	"fmt"
	"io"
	"os"
)

// FileChecksum calcula el checksum SHA256 del archivo en la ruta dada.
func FileChecksum(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		return "", err
	}

	sum := fmt.Sprintf("%x", hasher.Sum(nil))
	return sum, nil
}

// VerifyChecksum compara el checksum SHA256 de dos archivos y retorna true si son iguales.
func VerifyChecksum(srcPath, destPath string) (bool, error) {
	srcSum, err := FileChecksum(srcPath)
	if err != nil {
		return false, err
	}

	destSum, err := FileChecksum(destPath)
	if err != nil {
		return false, err
	}

	return srcSum == destSum, nil
}
