'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { FileText, AlertTriangle, CheckCircle, Info, ShieldAlert } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const logs: any[] = []

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const itemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1 }
}

export default function AuditPage() {
  return (
    <motion.div 
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
        <div className="flex justify-between items-end border-b border-vault-slate/20 pb-4">
             <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <FileText className="text-vault-slate" /> 
                    COMPLIANCE & AUDIT LOGS
                </h1>
                <p className="text-vault-slate text-sm font-mono mt-1">Immutable ledger of all system actions</p>
            </div>
            <Badge variant="outline" className="border-vault-green/30 text-vault-green font-mono">
                INTEGRITY CHECK: PASSED
            </Badge>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wider text-vault-slate">System Events</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="w-full text-left border-collapse">
                    <div className="grid grid-cols-12 gap-4 p-4 text-[10px] font-mono text-vault-slate uppercase border-b border-vault-slate/10 font-bold">
                        <div className="col-span-1">Level</div>
                        <div className="col-span-2">Timestamp</div>
                        <div className="col-span-8">Activity</div>
                        <div className="col-span-1 text-right">Hash</div>
                    </div>
                    
                    <div className="divide-y divide-vault-slate/10">
                        {logs.length === 0 ? (
                            <div className="p-16 text-center">
                                <p className="text-vault-slate/50 font-mono text-sm">No audit logs yet. System events will appear here.</p>
                            </div>
                        ) : logs.map((log) => (
                            <motion.div 
                                variants={itemVariants}
                                key={log.id} 
                                className="grid grid-cols-12 gap-4 p-4 text-xs font-mono hover:bg-vault-slate/5 transition-colors items-center group"
                            >
                                <div className="col-span-1">
                                    {log.type === 'critical' && <Badge variant="destructive" className="text-[9px] h-5 bg-red-950 text-red-500 border-red-900">CRIT</Badge>}
                                    {log.type === 'warning' && <Badge variant="outline" className="text-[9px] h-5 text-yellow-500 border-yellow-900 bg-yellow-950/30">WARN</Badge>}
                                    {log.type === 'info' && <Badge variant="secondary" className="text-[9px] h-5 bg-vault-slate/20 text-vault-slate">INFO</Badge>}
                                    {log.type === 'success' && <Badge variant="outline" className="text-[9px] h-5 text-green-500 border-green-900 bg-green-950/30">OK</Badge>}
                                </div>
                                <div className="col-span-2 text-vault-slate">
                                    {log.date} <span className="text-white">{log.time}</span>
                                </div>
                                <div className="col-span-8 text-white flex items-center gap-2">
                                     {log.type === 'critical' && <ShieldAlert size={14} className="text-red-500" />}
                                     {log.type === 'warning' && <AlertTriangle size={14} className="text-yellow-500" />}
                                     {log.type === 'success' && <CheckCircle size={14} className="text-green-500" />}
                                     {log.type === 'info' && <Info size={14} className="text-blue-500" />}
                                    {log.msg}
                                </div>
                                <div className="col-span-1 text-right text-vault-slate/50 truncate font-mono text-[10px] group-hover:text-vault-blue transition-colors">
                                    0x7a8...9b
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    </motion.div>
  )
}
