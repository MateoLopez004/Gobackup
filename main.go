package main

import (
	"fmt"
	"gobackup/cmd"
	"gobackup/internal/logger"
	"os"
)

func main() {
	// Inicializar logger global
	err := logger.Init("logs", 500, logger.LevelDebug)
	if err != nil {
		fmt.Println("Error iniciando logger:", err)
		os.Exit(1)
	}

	// Mensajes de prueba opcionales
	logger.Info("✅ Logger inicializado correctamente")
	logger.Debug("Logger en modo DEBUG activo")

	// Ejecutar Cobra (subcomandos CLI/web)
	cmd.Execute()
}
