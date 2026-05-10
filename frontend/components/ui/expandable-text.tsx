"use client"
import { useState } from "react"

export function ExpandableText({
  text,
  lines = 2,
}: {
  text: string
  lines?: number
}) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <p className={`${!open ? `line-clamp-${lines}` : ""}`}>
        {text || ""}
      </p>

      {text && text.length > 120 && (
        <button
          onClick={() => setOpen(!open)}
          className="text-xs text-primary mt-1"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  )
}
