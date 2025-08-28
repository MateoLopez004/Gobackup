package cmd

import (
	"fmt"
	"gobackup/internal/backup"
	"gobackup/internal/logger"
	"os"

	"github.com/spf13/cobra"
)

var cliCmd = &cobra.Command{
	Use:   "cli",
	Short: "Run backup from command line",
	Long:  `Run a backup operation using the configured source and backup directories.`,
	Run: func(cmd *cobra.Command, args []string) {
		logger.Infof("Starting CLI backup operation")

		// MODO COMPATIBILIDAD: Usar sistema antiguo si está configurado
		if Cfg.SourceDir != "" && Cfg.BackupDir != "" {
			fmt.Printf("Source directory: %s\n", Cfg.SourceDir)
			fmt.Printf("Backup directory: %s\n", Cfg.BackupDir)
			fmt.Printf("Modified minutes: %d\n", Cfg.ModifiedMinutes)
			fmt.Printf("Max concurrency: %d\n", Cfg.MaxConcurrency)

			// Ejecutar backup en modo legacy
			if err := backup.RunBackup(); err != nil {
				fmt.Printf("Error: %v\n", err)
				os.Exit(1)
			}
			fmt.Println("Backup completed successfully!")
			return
		}

		// MODO NUEVO: Usar sistema de uploads/backups
		fmt.Printf("Uploads directory: %s\n", Cfg.UploadsDir)
		fmt.Printf("Backups directory: %s\n", Cfg.BackupsDir)
		fmt.Printf("Temp directory: %s\n", Cfg.TempDir)
		fmt.Printf("Modified minutes: %d\n", Cfg.ModifiedMinutes)
		fmt.Printf("Max concurrency: %d\n", Cfg.MaxConcurrency)

		fmt.Println("\nNote: CLI mode with uploads requires files to be uploaded first.")
		fmt.Println("Please use the web interface for drag-and-drop functionality.")
		fmt.Println("Starting web server...")

		// Iniciar servidor web en modo CLI
		startWebServer()
	},
}

func init() {
	rootCmd.AddCommand(cliCmd)
}

func startWebServer() {
	// Iniciar servidor web
	fmt.Printf("Starting web server on port %d...\n", Cfg.ServerPort)
	fmt.Printf("Open http://localhost:%d in your browser\n", Cfg.ServerPort)

	// Aquí deberías llamar a tu función para iniciar el servidor web
	// Por ahora mostramos un mensaje
	fmt.Println("Web server functionality would start here")
	fmt.Println("Use 'gobackup web' for full web server")
}
