"use client"

import { createContext, useContext } from "react"

interface RefineContextType {
    originalData: any | null
    currentData: any | null
    isPending: boolean
    confirmChanges: () => void
    rejectChanges: () => void
}

export const RefineContext = createContext<RefineContextType>({
    originalData: null,
    currentData: null,
    isPending: false,
    confirmChanges: () => { },
    rejectChanges: () => { }
})

export function useRefineContext() {
    return useContext(RefineContext)
}
