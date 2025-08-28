package web

import (
	"log"

	"github.com/gin-gonic/gin"
)

// StartServer inicia el servidor web de Gobackup
func StartServer() {
	router := gin.Default()

	// Sirve archivos estáticos (JS, CSS, imágenes, etc.)
	router.Static("/static", "./internal/web/static")

	// Sirve el index.html en la raíz
	router.GET("/", func(c *gin.Context) {
		c.File("./internal/web/static/index.html")
	})

	// ✅ Registrar endpoints API (están en routes.go)
	SetupRoutes(router)

	// ✅ Arrancar servidor en puerto 8080
	log.Println("Servidor iniciado en http://localhost:8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
