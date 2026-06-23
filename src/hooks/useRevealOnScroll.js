import { useEffect } from "react"

export function useRevealOnScroll() {
    useEffect(() => {
        const elements = document.querySelectorAll('[data-reveal]')
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('reveal-visible')
                    }
                })
            },
            { threshold: 0.16 }
        )

        elements.forEach((element) => observer.observe(element))
        return () => observer.disconnect()
    }, [])
}