package config

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
)

type Config struct {
	// Campos antiguos (para compatibilidad)
	SourceDir string `json:"source_dir"`
	BackupDir string `json:"backup_dir"`

	// Campos nuevos
	UploadsDir      string `json:"uploads_dir"`
	BackupsDir      string `json:"backups_dir"`
	TempDir         string `json:"temp_dir"`
	ModifiedMinutes int    `json:"modified_minutes"`
	MaxConcurrency  int    `json:"max_concurrency"`
	ServerPort      int    `json:"server_port"`
}

func LoadConfig(path string) (*Config, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := json.Unmarshal(bytes, &cfg); err != nil {
		return nil, err
	}

	// MANTENER COMPATIBILIDAD: Si usan los campos viejos, mapear a los nuevos
	if cfg.SourceDir != "" && cfg.UploadsDir == "" {
		cfg.UploadsDir = cfg.SourceDir
	}
	if cfg.BackupDir != "" && cfg.BackupsDir == "" {
		cfg.BackupsDir = cfg.BackupDir
	}

	// Establecer valores por defecto para nuevos campos
	if cfg.UploadsDir == "" {
		cfg.UploadsDir = "uploads"
	}
	if cfg.BackupsDir == "" {
		cfg.BackupsDir = "backups"
	}
	if cfg.TempDir == "" {
		cfg.TempDir = "temp"
	}
	if cfg.MaxConcurrency <= 0 {
		cfg.MaxConcurrency = 5
	}
	if cfg.ServerPort == 0 {
		cfg.ServerPort = 8080
	}
	if cfg.ModifiedMinutes < 0 {
		cfg.ModifiedMinutes = 0
	}

	// Validaciones
	if cfg.BackupsDir == "" {
		return nil, fmt.Errorf("backups_dir no puede estar vacío")
	}

	// Crear directorios si no existen
	os.MkdirAll(cfg.UploadsDir, 0755)
	os.MkdirAll(cfg.BackupsDir, 0755)
	os.MkdirAll(cfg.TempDir, 0755)

	return &cfg, nil
}
