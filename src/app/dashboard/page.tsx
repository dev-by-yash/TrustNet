'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Activity, Users, FileKey, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NetworkTopology } from '@/components/dashboard/NetworkTopology'
import { StatsDisplay } from '@/components/dashboard/StatsDisplay'
import { AuthKeyInput } from '@/components/dashboard/AuthKeyInput'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0, filter: "blur(4px)" },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.5
    }
  }
}

export default function DashboardPage() {
  return (
    <motion.div 
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div variants={itemVariants}>
                <StatsDisplay label="Active Keys" value={0} trend="" encrypted />
            </motion.div>
            <motion.div variants={itemVariants}>
                <StatsDisplay label="Daily Transactions" value={0} unit="TXs" trend="" encrypted />
            </motion.div>
            <motion.div variants={itemVariants}>
                <StatsDisplay label="Network Traffic" value="0.0" unit="PB/s" />
            </motion.div>
            <motion.div variants={itemVariants}>
                <StatsDisplay label="Privacy Score" value="0.0" unit="%" trend="" />
            </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Visualization */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
                <Card className="h-full border-vault-slate/20 bg-vault-bg/40">
                    <CardHeader showTerminalDots>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2"><Activity size={16} /> NETWORK TOPOLOGY</span>
                            <Badge variant="outline" className="font-mono text-[10px]">LIVE FEED</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 relative min-h-[400px]">
                        <NetworkTopology />
                        
                        {/* Overlay Stats */}
                        <div className="absolute bottom-4 left-4 p-3 bg-vault-bg/90 border border-vault-slate/20 backdrop-blur rounded-sm text-xs font-mono text-vault-slate">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-vault-green animate-pulse" />
                                <span>NODE_STATUS: ONLINE</span>
                            </div>
                            <div>LATENCY: 12ms</div>
                            <div>ENCRYPTION: ZK-SNARK</div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Sidebar Controls */}
            <div className="space-y-6">
                <motion.div variants={itemVariants}>
                        <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2"><FileKey size={14} /> AUTHENTICATION</CardTitle>
                            <CardDescription>Verify employee node identity</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AuthKeyInput />
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Lock size={64} /></div>
                        <CardHeader>
                            <CardTitle className="text-sm">PRIVATE TRANSFER</CardTitle> 
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-vault-slate uppercase">Recipient ID</label>
                                <div className="flex bg-vault-slate/10 p-2 rounded-sm border border-vault-slate/20">
                                    <input className="bg-transparent w-full text-sm outline-none text-white font-mono" placeholder="SVIT-USER-..." />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-vault-slate uppercase">Amount</label>
                                <div className="flex bg-vault-slate/10 p-2 rounded-sm border border-vault-slate/20 justify-between items-center">
                                    <input className="bg-transparent w-full text-lg outline-none text-vault-green font-bold font-mono" placeholder="0.00" />
                                    <span className="text-xs text-vault-slate">DVPN</span>
                                </div>
                            </div>
                            <Button variant="cyber" className="w-full mt-2">
                                Initiate ZK Proof
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>

        {/* Bottom Ledger */}
            <motion.div variants={itemVariants}>
            <Card>
                <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2"><Users size={14} /> TRANSACTION LEDGER</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                            <thead>
                                <tr className="border-b border-vault-slate/20 text-vault-slate">
                                    <th className="py-3 font-normal">HASH ID</th>
                                    <th className="py-3 font-normal">TIMESTAMP</th>
                                    <th className="py-3 font-normal">FROM</th>
                                    <th className="py-3 font-normal">TO</th>
                                    <th className="py-3 font-normal">AMOUNT</th>
                                    <th className="py-3 font-normal">STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-vault-slate/50 text-sm">
                                        No transactions yet. Connect wallet to get started.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            </motion.div>
    </motion.div>
  )
}
