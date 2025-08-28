// internal/logger/logger.go
package logger

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type LogEntry struct {
	Time    time.Time
	Level   string
	Message string
}

type Logger struct {
	mu       sync.Mutex
	entries  []LogEntry
	file     *os.File
	maxLines int
	minLevel int
}

var (
	instance *Logger
	once     sync.Once
)

// Niveles de log para filtrar
const (
	LevelDebug = iota
	LevelInfo
	LevelWarn
	LevelError
)

func levelToString(level int) string {
	switch level {
	case LevelDebug:
		return "DEBUG"
	case LevelInfo:
		return "INFO"
	case LevelWarn:
		return "WARN"
	case LevelError:
		return "ERROR"
	default:
		return "UNKNOWN"
	}
}

// Init inicializa el logger global y permite configurar nivel mínimo de logs
func Init(logDir string, maxLines int, minLevel int) error {
	var err error
	once.Do(func() {
		if err = os.MkdirAll(logDir, 0755); err != nil {
			return
		}
		logPath := filepath.Join(logDir, "gobackup.log")
		var f *os.File
		f, err = os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err != nil {
			return
		}
		instance = &Logger{
			file:     f,
			maxLines: maxLines,
			minLevel: minLevel,
		}
	})
	return err
}

func logMessage(level int, msg string) {
	if instance == nil {
		fmt.Println("[LOGGER] Logger no inicializado")
		return
	}
	if level < instance.minLevel {
		return
	}

	entry := LogEntry{
		Time:    time.Now(),
		Level:   levelToString(level),
		Message: msg,
	}

	instance.mu.Lock()
	defer instance.mu.Unlock()

	instance.entries = append(instance.entries, entry)
	if instance.maxLines > 0 && len(instance.entries) > instance.maxLines {
		instance.entries = instance.entries[len(instance.entries)-instance.maxLines:]
	}

	line := fmt.Sprintf("%s [%s] %s\n", entry.Time.Format("2006-01-02 15:04:05"), entry.Level, msg)
	if _, err := instance.file.WriteString(line); err != nil {
		log.Println("Error escribiendo en log:", err)
	}

	fmt.Print(line)
}

// Métodos con nivel específico
func Info(msg string) {
	logMessage(LevelInfo, msg)
}

func Error(msg string) {
	logMessage(LevelError, msg)
}

func Warn(msg string) {
	logMessage(LevelWarn, msg)
}

func Debug(msg string) {
	logMessage(LevelDebug, msg)
}

func Infof(format string, args ...interface{}) {
	Info(fmt.Sprintf(format, args...))
}

func Errorf(format string, args ...interface{}) {
	Error(fmt.Sprintf(format, args...))
}

func Warnf(format string, args ...interface{}) {
	Warn(fmt.Sprintf(format, args...))
}

func Debugf(format string, args ...interface{}) {
	Debug(fmt.Sprintf(format, args...))
}

func GetLogs() []LogEntry {
	if instance == nil {
		return nil
	}
	instance.mu.Lock()
	defer instance.mu.Unlock()
	return append([]LogEntry(nil), instance.entries...)
}
