import { useEffect, useState } from "react"

export function useScrollState() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [showTopButton, setShowTopButton] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10)
            setShowTopButton(window.scrollY > 420)
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return { isScrolled, showTopButton }
}