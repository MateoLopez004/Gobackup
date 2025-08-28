package backup

type Limiter struct {
	sem chan struct{}
}

func NewLimiter(maxConcurrency int) *Limiter {
	return &Limiter{
		sem: make(chan struct{}, maxConcurrency),
	}
}

func (l *Limiter) Acquire() {
	l.sem <- struct{}{}
}

func (l *Limiter) Release() {
	<-l.sem
}
