// routes.go
package web

import (
	"fmt"
	"gobackup/internal/backup"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

var sessionUploads = make(map[string]string) // sessionID -> folderName

// SetupRoutes define los endpoints principales
func SetupRoutes(r *gin.Engine) {
	// Endpoints de upload
	r.POST("/upload", handleUpload)
	r.POST("/upload-multiple", handleUploadMultiple)

	// Endpoints de backup
	r.POST("/backup", handleBackup)
	r.GET("/backup-info/:sessionId", handleBackupInfo)
	r.GET("/status", func(c *gin.Context) {
		status := backup.Status.Get()
		c.JSON(http.StatusOK, status)
	})

	// Endpoint de descarga
	r.GET("/download/:sessionId", handleDownload)

	// Endpoint para limpiar sesión
	r.POST("/cleanup/:sessionId", handleCleanup)

	// Listar backups
	r.GET("/backups", handleListBackups)

	// Endpoint de bienvenida
	r.GET("/api/welcome", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Welcome to Gobackup Web Server!"})
	})

	// Health check y estadísticas
	r.GET("/health", HealthCheck)
	r.GET("/stats", handleStats)
}

// -------------------- Upload --------------------

func generateSessionID() string {
	return fmt.Sprintf("session_%d", rand.Intn(1000000))
}

func handleUpload(c *gin.Context) {
	sessionID := c.PostForm("sessionId")
	if sessionID == "" {
		sessionID = generateSessionID()
	}

	sessionDir := filepath.Join(backup.UploadsDir, sessionID)
	if err := os.MkdirAll(sessionDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error creando directorio: %v", err)})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se recibió ningún archivo"})
		return
	}

	if file.Size > 100*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Archivo demasiado grande (máx. 100MB)"})
		return
	}

	filename := filepath.Base(file.Filename)
	fullPath := filepath.Join(sessionDir, filename)
	if err := c.SaveUploadedFile(file, fullPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error guardando archivo: %v", err)})
		return
	}

	sessionUploads[sessionID] = sessionDir

	c.JSON(http.StatusOK, gin.H{
		"message":    "Archivo subido correctamente",
		"sessionId":  sessionID,
		"filename":   filename,
		"size":       file.Size,
		"uploadPath": fullPath,
	})
}

func handleUploadMultiple(c *gin.Context) {
	sessionID := c.PostForm("sessionId")
	if sessionID == "" {
		sessionID = generateSessionID()
	}

	sessionDir := filepath.Join(backup.UploadsDir, sessionID)
	if err := os.MkdirAll(sessionDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error creando directorio: %v", err)})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Error procesando archivos"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se recibieron archivos"})
		return
	}

	var uploadedFiles []gin.H
	for _, file := range files {
		if file.Size > 100*1024*1024 {
			continue
		}
		filename := filepath.Base(file.Filename)
		fullPath := filepath.Join(sessionDir, filename)
		if err := c.SaveUploadedFile(file, fullPath); err != nil {
			continue
		}
		uploadedFiles = append(uploadedFiles, gin.H{"filename": filename, "size": file.Size, "path": fullPath})
	}

	sessionUploads[sessionID] = sessionDir

	c.JSON(http.StatusOK, gin.H{
		"message":       fmt.Sprintf("%d archivos subidos correctamente", len(uploadedFiles)),
		"sessionId":     sessionID,
		"uploadedFiles": uploadedFiles,
		"totalSize":     calculateTotalSize(uploadedFiles),
	})
}

func calculateTotalSize(files []gin.H) int64 {
	var total int64
	for _, file := range files {
		if size, ok := file["size"].(int64); ok {
			total += size
		}
	}
	return total
}

// -------------------- Backup --------------------

func handleBackup(c *gin.Context) {
	var request struct {
		SessionID string `json:"sessionId"`
	}

	if err := c.BindJSON(&request); err != nil || request.SessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Solicitud inválida o sessionId faltante"})
		return
	}

	sessionDir := filepath.Join(backup.UploadsDir, request.SessionID)
	if _, err := os.Stat(sessionDir); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sesión no encontrada"})
		return
	}

	files, err := os.ReadDir(sessionDir)
	if err != nil || len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La sesión no contiene archivos"})
		return
	}

	go func() {
		fmt.Printf("Iniciando backup para sesión: %s\n", request.SessionID)
		if err := backup.RunBackupWithSession(request.SessionID); err != nil {
			fmt.Printf("Error en backup: %v\n", err)
			backup.Status.SetError(err.Error())
		} else {
			fmt.Printf("Backup completado para sesión: %s\n", request.SessionID)
			backup.Status.SetDone()
		}
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"message":   "Backup iniciado",
		"sessionId": request.SessionID,
		"files":     len(files),
	})
}

func handleDownload(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if !backup.BackupExists(sessionID) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Backup no encontrado"})
		return
	}

	zipPath := backup.GetBackupPath(sessionID)
	file, err := os.Open(zipPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error abriendo archivo: %v", err)})
		return
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error obteniendo info del archivo: %v", err)})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=\""+sessionID+".zip\"")
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Length", strconv.FormatInt(info.Size(), 10))
	c.Header("Cache-Control", "no-cache")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")

	http.ServeContent(c.Writer, c.Request, sessionID+".zip", info.ModTime(), file)
}

func handleBackupInfo(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if !backup.BackupExists(sessionID) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Backup no encontrado"})
		return
	}

	info, err := backup.GetBackupInfo(sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error obteniendo info: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sessionId":   sessionID,
		"filename":    info["filename"],
		"size":        info["size"],
		"sizeMB":      info["sizeMB"],
		"created":     info["created"],
		"downloadUrl": "/download/" + sessionID,
		"status":      "available",
	})
}

func handleCleanup(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if err := backup.CleanupSession(sessionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error limpiando sesión: %v", err)})
		return
	}

	delete(sessionUploads, sessionID)
	c.JSON(http.StatusOK, gin.H{"message": "Sesión limpiada correctamente", "sessionId": sessionID})
}

func handleListBackups(c *gin.Context) {
	backups, err := backup.ListBackups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error listando backups: %v", err)})
		return
	}

	var backupList []gin.H
	for _, backupFile := range backups {
		sessionID := backupFile[:len(backupFile)-4] // remove .zip
		info, err := os.Stat(filepath.Join(backup.BackupsDir, backupFile))
		if err != nil {
			continue
		}
		backupList = append(backupList, gin.H{
			"sessionId":   sessionID,
			"filename":    backupFile,
			"size":        info.Size(),
			"sizeMB":      fmt.Sprintf("%.2f MB", float64(info.Size())/1024/1024),
			"created":     info.ModTime().Format(time.RFC3339),
			"downloadUrl": "/download/" + sessionID,
		})
	}

	c.JSON(http.StatusOK, gin.H{"backups": backupList, "count": len(backupList)})
}

// -------------------- Stats / Health --------------------

func HealthCheck(c *gin.Context) {
	dirs := []string{backup.UploadsDir, backup.BackupsDir, backup.TempDir}
	for _, dir := range dirs {
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "down", "error": fmt.Sprintf("Directorio %s no existe", dir)})
			return
		}
		testFile := filepath.Join(dir, "test_write.tmp")
		if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "down", "error": fmt.Sprintf("Directorio %s no escribible", dir)})
			return
		}
		os.Remove(testFile)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "up",
		"timestamp": time.Now().Format(time.RFC3339),
		"uploads":   backup.UploadsDir,
		"backups":   backup.BackupsDir,
		"temp":      backup.TempDir,
	})
}

func handleStats(c *gin.Context) {
	uploadFiles, _ := countFilesInDir(backup.UploadsDir)
	backupFiles, backupTotalSize := countFilesInDir(backup.BackupsDir)
	diskFree, diskTotal := getDiskSpace()

	c.JSON(http.StatusOK, gin.H{
		"uploads":   gin.H{"files": uploadFiles, "dir": backup.UploadsDir},
		"backups":   gin.H{"files": backupFiles, "size": backupTotalSize, "dir": backup.BackupsDir},
		"disk":      gin.H{"free": diskFree, "total": diskTotal, "used": diskTotal - diskFree},
		"sessions":  len(sessionUploads),
		"timestamp": time.Now().Format(time.RFC3339),
	})
}
func getDiskSpace() (int64, int64) {
	return 0, 0
}

func countFilesInDir(dir string) (int, int64) {
	var count int
	var total int64
	filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() {
			count++
			total += info.Size()
		}
		return nil
	})
	return count, total
}
