package utils

import (
	"fmt"
)

// MaxFileSize define el tamaño máximo permitido (100 MB)
const MaxFileSize int64 = 100 * 1024 * 1024 // 100 MB

// IsFileSizeAllowed retorna true si el tamaño es menor o igual a 100 MB
func IsFileSizeAllowed(bytes int64) bool {
	return bytes <= MaxFileSize
}

func FormatFileSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
