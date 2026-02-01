'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Globe, Server, Activity, Radio } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { NetworkTopology } from '@/components/dashboard/NetworkTopology'

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

export default function NetworkPage() {
  return (
    <motion.div 
        className="space-y-6 h-full flex flex-col"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
        <div className="flex justify-between items-end border-b border-vault-slate/20 pb-4">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Globe className="text-vault-blue" /> 
                    GLOBAL NETWORK STATUS
                </h1>
                <p className="text-vault-slate text-sm font-mono mt-1">Decentralized Relay Node Infrastructure</p>
            </div>
                 <div className="flex items-center gap-4 text-xs font-mono text-vault-slate">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-vault-green animate-pulse" />
                    <span>SYSTEM NORMAL</span>
                </div>
                 <div className="flex items-center gap-1.5">
                    <Activity size={12} />
                    <span>TPS: 0</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            <motion.div variants={itemVariants} className="lg:col-span-2 flex flex-col">
                <Card className="flex-1 bg-vault-bg/50 border-vault-slate/20 h-[500px] lg:h-auto">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2"><Activity size={14}/> REAL-TIME TOPOLOGY</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 relative h-full min-h-[400px]">
                        <div className="absolute inset-0">
                             <NetworkTopology />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2"><Server size={14}/> ACTIVE RELAYS</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-8 text-center">
                            <p className="text-vault-slate/50 font-mono text-sm">No relay nodes active. Deploy nodes to see status.</p>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2"><Activity size={14}/> BANDWIDTH USAGE</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono text-vault-slate">
                                    <span>INGRESS</span>
                                    <span>0.0 GB/s</span>
                                </div>
                                <div className="h-1.5 w-full bg-vault-slate/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-vault-blue w-[0%]" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono text-vault-slate">
                                    <span>EGRESS</span>
                                    <span>0.0 GB/s</span>
                                </div>
                                <div className="h-1.5 w-full bg-vault-slate/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 w-[0%]" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                 </Card>
            </motion.div>
        </div>
    </motion.div>
  )
}
