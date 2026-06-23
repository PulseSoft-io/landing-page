import { useEffect } from "react"

export function useAutoRotate(setter, itemsLength, delayMs) {
    useEffect(() => {
        const interval = setInterval(() => {
            setter((prev) => (prev + 1) % itemsLength)
        }, delayMs)

        return () => clearInterval(interval)
    }, [setter, itemsLength, delayMs])
}