package web

import (
	"log"

	"github.com/gin-gonic/gin"
)

// StartServer inicia el servidor web de Gobackup
func StartServer() {
	router := gin.Default()

	RegisterAllRoutes(router)

	log.Println("Servidor iniciado en http://localhost:8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}

// RegisterAllRoutes registra todas las rutas en el router principal
