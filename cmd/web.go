package cmd

import (
	"fmt"
	"github.com/spf13/cobra"
	"gobackup/internal/web"
)

var webCmd = &cobra.Command{
	Use:   "web",
	Short: "Run gobackup web server",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Starting web server on http://localhost:8080 ...")
		web.StartServer()
	},
}

func init() {
	rootCmd.AddCommand(webCmd)
}
