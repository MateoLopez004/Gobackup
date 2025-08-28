package backup

import "sync"

type BackupStatus struct {
	mu          sync.Mutex
	TotalFiles  int
	FilesCopied int
	Errors      []string
	InProgress  bool
}

var Status = &BackupStatus{}

// Reset resetea el estado para un nuevo backup
func (s *BackupStatus) Reset(total int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.TotalFiles = total
	s.FilesCopied = 0
	s.Errors = nil
	s.InProgress = true
}

// IncrementFilesCopied aumenta el contador de archivos copiados
func (s *BackupStatus) IncrementFilesCopied() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.FilesCopied++
}

// AddError agrega un error al listado
func (s *BackupStatus) AddError(errMsg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Errors = append(s.Errors, errMsg)
}

// SetError agrega un error y marca el backup como no en progreso
func (s *BackupStatus) SetError(errMsg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Errors = append(s.Errors, errMsg)
	s.InProgress = false
}

// SetDone marca el backup como finalizado exitosamente
func (s *BackupStatus) SetDone() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.InProgress = false
}

// Get devuelve el estado actual copiando la información
func (s *BackupStatus) Get() BackupStatus {
	s.mu.Lock()
	defer s.mu.Unlock()
	errorsCopy := make([]string, len(s.Errors))
	copy(errorsCopy, s.Errors)
	return BackupStatus{
		TotalFiles:  s.TotalFiles,
		FilesCopied: s.FilesCopied,
		Errors:      errorsCopy,
		InProgress:  s.InProgress,
	}
}
