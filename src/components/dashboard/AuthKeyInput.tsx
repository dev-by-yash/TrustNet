'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Check, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AuthKeyInput() {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'validating' | 'valid'>('idle')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (v.length > 12) v = v.slice(0, 12)
    
    // Add dashes
    const parts = v.match(/.{1,4}/g)
    setValue(parts ? parts.join('-') : v)
  }

  const handleSubmit = () => {
    if (value.length < 14) return
    setStatus('validating')
    setTimeout(() => setStatus('valid'), 1500)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative group">
        <div className={`absolute -inset-0.5 bg-gradient-to-r from-vault-slate to-vault-slate/50 rounded-sm opacity-50 blur transition duration-1000 group-hover:duration-200 ${status === 'valid' ? 'from-vault-green to-vault-blue opacity-100' : ''}`}></div>
        <div className="relative flex items-center bg-vault-bg rounded-sm border border-vault-slate/30 p-1">
          <div className="pl-3 text-vault-slate">
            {status === 'valid' ? <ShieldCheck size={18} className="text-vault-green" /> : <Lock size={18} />}
          </div>
          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="XXXX-XXXX-XXXX"
            className="w-full bg-transparent border-none focus:ring-0 text-vault-text font-mono tracking-[0.2em] px-3 py-2 uppercase placeholder:text-vault-slate/30"
            maxLength={14}
          />
        </div>
      </div>
      
      <Button 
        variant={status === 'valid' ? "default" : "secondary"} 
        className="w-full"
        onClick={handleSubmit}
        disabled={status === 'validating'}
      >
        {status === 'validating' ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                ⟳ Verifying Cryptography
            </motion.div>
        ) : status === 'valid' ? (
            <span className="flex items-center gap-2"> <Check size={14} /> Identity Verified</span>
        ) : (
            "Authenticate Node"
        )}
      </Button>
    </div>
  )
}
