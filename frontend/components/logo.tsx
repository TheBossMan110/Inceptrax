import Image from "next/image"
import { cn } from "@/lib/utils"

export function Logo({ className, size = 32, src = "/logo.png" }: { className?: string; size?: number; src?: string }) {
  return (
    <Image
      src={src}
      alt="Inceptrax"
      width={size}
      height={size}
      className={cn("rounded-lg object-contain", className)}
      priority
    />
  )
}
