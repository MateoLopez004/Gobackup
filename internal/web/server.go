package web

import (
	"log"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

// StartServer inicia el servidor web de Gobackup
func StartServer() {
	router := gin.Default()

	// Sirve archivos estáticos (JS, CSS, imágenes, etc.)
	// Se podrán acceder en /static/...
	router.Static("/static", "./internal/web/static/")

	// Sirve el index.html en la raíz
	router.GET("/", func(c *gin.Context) {
		c.File(filepath.Join("internal", "web", "static", "index.html"))
	})

	// Sirve stats.html
	router.GET("/stats.html", func(c *gin.Context) {
		c.File(filepath.Join("internal", "web", "static", "stats.html"))
	})

	// Registrar endpoints API (están en routes.go)
	SetupRoutes(router)

	// Arrancar servidor en puerto 8080
	log.Println("Servidor iniciado en http://localhost:8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
