'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Settings, Shield, Bell, Key, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
}

export default function SettingsPage() {
  return (
    <motion.div 
        className="space-y-6 max-w-4xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
        <div className="border-b border-vault-slate/20 pb-4">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Settings className="text-vault-slate" /> 
                SYSTEM CONFIGURATION
            </h1>
            <p className="text-vault-slate text-sm font-mono mt-1">Adjust local node parameters and security preferences</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="md:col-span-1 space-y-2">
               {['General', 'Security', 'Notifications', 'API Keys', 'Billing'].map((item, i) => (
                   <button 
                        key={item}
                        className={`w-full text-left px-4 py-2 text-sm font-mono rounded-md transition-colors ${i === 0 ? 'bg-vault-green/10 text-vault-green border border-vault-green/20' : 'text-vault-slate hover:bg-vault-slate/10 hover:text-white'}`}
                    >
                       {item}
                   </button>
               ))}
               <div className="pt-8">
                   <Button variant="destructive" className="w-full gap-2 bg-red-950/20 text-red-500 border border-red-900 hover:bg-red-950/40">
                       <LogOut size={14} /> Disconnect Node
                   </Button>
               </div>
            </motion.div>

            <motion.div variants={itemVariants} className="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2"><Shield size={14}/> ENCRYPTION PROTOCOLS</CardTitle>
                        <CardDescription>Configure how your data is obfuscated before transport</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-vault-slate/5 rounded border border-vault-slate/10">
                            <div>
                                <div className="text-white font-bold text-sm">Zero-Knowledge Proofs (ZK-SNARKs)</div>
                                <div className="text-xs text-vault-slate">Maximum privacy, higher computational cost</div>
                            </div>
                            <div className="h-6 w-11 bg-vault-green rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 h-4 w-4 bg-black rounded-full shadow-sm" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-vault-slate/5 rounded border border-vault-slate/10">
                            <div>
                                <div className="text-white font-bold text-sm">On-Chain Obfuscation</div>
                                <div className="text-xs text-vault-slate">Mix transactions with random noise</div>
                            </div>
                            <div className="h-6 w-11 bg-vault-slate/20 rounded-full relative cursor-pointer">
                                <div className="absolute left-1 top-1 h-4 w-4 bg-vault-slate rounded-full shadow-sm" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2"><Bell size={14}/> SYSTEM ALERTS</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="accent-vault-green h-4 w-4 bg-transparent border-vault-slate/20" />
                            <label className="text-sm text-white">Notify on critical security events</label>
                        </div>
                         <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="accent-vault-green h-4 w-4 bg-transparent border-vault-slate/20" />
                            <label className="text-sm text-white">Notify on incoming transfers</label>
                        </div>
                         <div className="flex items-center gap-2">
                            <input type="checkbox" className="accent-vault-green h-4 w-4 bg-transparent border-vault-slate/20" />
                            <label className="text-sm text-white">Weekly detailed audit reports</label>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2"><Key size={14}/> API ACCESS</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-xs font-mono text-vault-slate uppercase">Public Key</label>
                            <div className="flex gap-2">
                                <input className="bg-vault-slate/5 border border-vault-slate/20 rounded w-full p-2 text-xs font-mono text-vault-slate" value="0x7a8...9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c" readOnly />
                                <Button variant="outline" size="sm">Copy</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    </motion.div>
  )
}
