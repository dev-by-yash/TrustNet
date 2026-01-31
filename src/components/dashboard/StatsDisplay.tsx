'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { cn } from '@/lib/utils'

interface StatsProps {
  label: string
  value: string | number
  unit?: string
  trend?: string
  encrypted?: boolean
}

export function StatsDisplay({ label, value, unit, trend, encrypted }: StatsProps) {
  const [displayValue, setDisplayValue] = useState(encrypted ? "000000" : value.toString())
  const ref = useRef(null)
  const isInView = useInView(ref)

  useEffect(() => {
    if (isInView && encrypted) {
      const chars = "0123456789ABCDEFX"
      let iteration = 0
      const finalValue = value.toString()
      const interval = setInterval(() => {
        setDisplayValue(
          finalValue
            .split("")
            .map((v, index) => {
              if (index < iteration) {
                return finalValue[index]
              }
              return chars[Math.floor(Math.random() * chars.length)]
            })
            .join("")
        )
        if (iteration >= finalValue.length) {
          clearInterval(interval)
        }
        iteration += 1 / 2 // Slow down reveal
      }, 50)
      return () => clearInterval(interval)
    }
  }, [isInView, value, encrypted])

  return (
    <div ref={ref} className="flex flex-col p-4 border border-vault-slate/10 bg-vault-slate/5 rounded-md backdrop-blur-sm hover:border-vault-green/30 transition-colors group">
      <span className="text-xs uppercase tracking-widest text-vault-slate font-mono mb-1">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-sans tracking-tight text-white group-hover:text-vault-green transition-colors">
          {displayValue}
        </span>
        {unit && <span className="text-sm text-vault-slate/70 font-mono">{unit}</span>}
      </div>
      {trend && (
          <div className="mt-2 text-xs font-mono text-vault-blue flex items-center gap-1">
              <span>↑</span> {trend}
          </div>
      )}
    </div>
  )
}
