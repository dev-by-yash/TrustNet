'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, MoreHorizontal, UserPlus, Shield, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const employees = [
  { id: 'SV-001', name: 'Alex Chen', role: 'SysAdmin', department: 'Infrastructure', status: 'online', vpn: 'connected', ip: '10.0.4.55' },
  { id: 'SV-002', name: 'Sarah Miller', role: 'DevOps', department: 'Engineering', status: 'online', vpn: 'connected', ip: '10.0.4.58' },
  { id: 'SV-003', name: 'James Wilson', role: 'Security', department: 'InfoSec', status: 'offline', vpn: 'disconnected', ip: '---' },
  { id: 'SV-004', name: 'Emma Davis', role: 'Analyst', department: 'Data', status: 'online', vpn: 'connecting', ip: '10.0.4.62' },
  { id: 'SV-005', name: 'Michael Brown', role: 'Developer', department: 'Frontend', status: 'online', vpn: 'connected', ip: '10.0.4.12' },
  { id: 'SV-006', name: 'Lisa Wang', role: 'Manager', department: 'Product', status: 'offline', vpn: 'disconnected', ip: '---' },
  { id: 'SV-007', name: 'David Lee', role: 'QA', department: 'Engineering', status: 'online', vpn: 'connected', ip: '10.0.4.89' },
  { id: 'SV-008', name: 'Robert Taylor', role: 'Designer', department: 'Product', status: 'online', vpn: 'encrypted', ip: '10.0.4.44' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
}

export default function EmployeesPage() {
  return (
    <motion.div 
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-vault-slate/20 pb-4">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">EMPLOYEE NODE GRID</h1>
                <p className="text-vault-slate text-sm font-mono mt-1">Manage network access and identity verification</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" className="gap-2">
                    <Filter size={14} /> Filter
                </Button>
                <Button className="gap-2 bg-vault-green text-black hover:bg-vault-green/90">
                    <UserPlus size={16} /> Deploy New Node
                </Button>
            </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
            <Search className="absolute left-3 top-3 text-vault-slate w-5 h-5" />
            <input 
                className="w-full bg-vault-slate/5 border border-vault-slate/10 rounded-md p-3 pl-10 font-mono text-sm text-white focus:border-vault-slate/30 outline-none transition-colors"
                placeholder="Search by ID, Name, or IP Hash..."
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {employees.map((emp) => (
                <motion.div key={emp.id} variants={itemVariants}>
                    <Card className="hover:border-vault-green/30 transition-colors group cursor-pointer border-vault-slate/10 bg-vault-bg">
                        <CardContent className="p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-md flex items-center justify-center text-xs font-bold ${
                                        emp.status === 'online' ? 'bg-vault-green/10 text-vault-green border border-vault-green/20' : 'bg-vault-slate/10 text-vault-slate border border-vault-slate/20'
                                    }`}>
                                        {emp.id.split('-')[1]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-sm">{emp.name}</div>
                                        <div className="text-[10px] text-vault-slate uppercase font-mono">{emp.role}</div>
                                    </div>
                                </div>
                                <div className="p-1 hover:bg-vault-slate/10 rounded">
                                    <MoreHorizontal size={14} className="text-vault-slate" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-b border-vault-slate/10 py-3 my-2">
                                <div className="text-vault-slate">DEPT</div>
                                <div className="text-right text-white">{emp.department}</div>
                                <div className="text-vault-slate">IP ADDR</div>
                                <div className="text-right text-vault-blue">{emp.ip}</div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    {emp.status === 'online' ? (
                                        <Wifi size={14} className="text-vault-green" />
                                    ) : (
                                        <WifiOff size={14} className="text-vault-red" />
                                    )}
                                    <span className={`text-xs font-bold ${
                                        emp.status === 'online' ? 'text-vault-green' : 'text-vault-red'
                                    }`}>
                                        {emp.vpn.toUpperCase()}
                                    </span>
                                </div>
                                {emp.status === 'online' && (
                                    <Shield size={14} className="text-vault-blue" />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    </motion.div>
  )
}
