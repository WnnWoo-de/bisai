let defaultObserver

function createObserver(opts) {
  const options = opts || { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  return new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const el = e.target
        el.classList.add('visible')
        const once = el.__revealOnce !== false
        if (once) obs?.unobserve(el)
      }
    })
  }, options)
}

function initObserver(opts) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return null
  if (!opts) {
    if (defaultObserver) return defaultObserver
    defaultObserver = createObserver()
    return defaultObserver
  }
  // custom options use a lightweight one-off observer
  return createObserver(opts)
}

function toTime(v) { return typeof v === 'number' ? `${v}ms` : String(v) }
function toDistance(v) { return typeof v === 'number' ? `${v}px` : String(v) }

export default {
  mounted(el, binding) {
    try {
      el.classList.add('reveal')
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) {
        el.classList.add('visible')
        return
      }
      const val = binding?.value
      const opts = (val && typeof val === 'object') ? val : {}

      // delay
      if (typeof val === 'number') {
        el.style.transitionDelay = toTime(val)
      } else if (typeof val === 'string') {
        el.style.transitionDelay = val
      } else if (opts.delay != null) {
        el.style.transitionDelay = toTime(opts.delay)
      } else if (el.dataset?.delay) {
        el.style.transitionDelay = el.dataset.delay
      }

      // duration & easing
      if (opts.duration != null) {
        el.style.setProperty('--reveal-duration', toTime(opts.duration))
      }
      if (opts.easing) {
        el.style.setProperty('--motion-easing', String(opts.easing))
      }

      // distance & direction
      if (opts.distance != null) {
        el.style.setProperty('--reveal-distance', toDistance(opts.distance))
      }
      const dist = opts.distance != null ? toDistance(opts.distance) : (el.style.getPropertyValue('--reveal-distance') || '12px')
      const direction = opts.direction || el.dataset?.direction
      if (direction && direction !== 'none') {
        let transform
        switch (direction) {
          case 'down': transform = `translateY(-${dist})`; break
          case 'left': transform = `translateX(${dist})`; break
          case 'right': transform = `translateX(-${dist})`; break
          default: transform = `translateY(${dist})`
        }
        el.style.setProperty('--reveal-transform-initial', transform)
      }

      // observer options
      const once = opts.once !== false // default true
      el.__revealOnce = once
      const threshold = opts.threshold ?? 0.15
      const rootMargin = opts.rootMargin ?? '0px 0px -40px 0px'
      const obs = initObserver({ threshold, rootMargin })
      obs?.observe(el)
    } catch {}
  },
  unmounted(el) {
    try { defaultObserver?.unobserve(el) } catch {}
  }
}