'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRightLeft, ShieldCheck, Zap, Lock, Scan, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WalletConnect } from '@/components/wallet/WalletConnect'

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

export default function TransferPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [complete, setComplete] = useState(false)

  const handleTransfer = () => {
    setIsProcessing(true)
    // Simulate ZK Proof generation time
    setTimeout(() => {
        setIsProcessing(false)
        setComplete(true)
    }, 3000)
  }

  const reset = () => {
      setComplete(false)
      setIsProcessing(false)
  }

  return (
    <motion.div 
        className="space-y-6 max-w-5xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
        <div className="flex justify-between items-end border-b border-vault-slate/20 pb-4">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <ArrowRightLeft className="text-vault-green" /> 
                    ZK-TRANSFER PROTOCOL
                </h1>
                <p className="text-vault-slate text-sm font-mono mt-1">Encrypted Layer 2 Node-to-Node Transmission</p>
            </div>
            <div className="flex gap-2">
                <Badge variant="outline" className="font-mono text-vault-blue border-vault-blue/30 bg-vault-blue/10">NET_ID: 0x99</Badge>
                <Badge variant="outline" className="font-mono text-vault-green border-vault-green/30 bg-vault-green/10">TUNNEL: SECURE</Badge>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Transfer Form */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
                <Card className="border-vault-slate/20 bg-vault-bg relative overflow-hidden">
                    {isProcessing && (
                         <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8">
                            <div className="relative w-24 h-24 mb-6">
                                <motion.div 
                                    className="absolute inset-0 border-4 border-vault-green rounded-full border-t-transparent"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                                <Lock className="absolute inset-0 m-auto text-white" />
                            </div>
                            <h3 className="text-lg font-mono text-vault-green animate-pulse">GENERATING ZK-SNARK PROOF...</h3>
                            <div className="w-full max-w-sm bg-vault-slate/20 h-1 mt-4 rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-vault-green" 
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 3 }}
                                />
                            </div>
                            <div className="font-mono text-xs text-vault-slate mt-2">Obfuscating transaction path...</div>
                        </div>
                    )}

                    {complete ? (
                        <div className="absolute inset-0 bg-vault-bg z-50 flex flex-col items-center justify-center p-8">
                            <motion.div 
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-20 h-20 bg-vault-green/10 rounded-full flex items-center justify-center text-vault-green mb-4"
                            >
                                <CheckCircle2 size={40} />
                            </motion.div>
                            <h2 className="text-2xl text-white font-bold mb-2">Transfer Complete</h2>
                            <p className="text-vault-slate font-mono text-center mb-6 max-w-md">Transaction hash 0x7a... verified on-chain. Zero-knowledge proof has been broadcast.</p>
                            <Button onClick={reset} variant="default">New Transfer</Button>
                        </div>
                    ) : null}

                    <CardHeader>
                        <CardTitle className="text-sm uppercase tracking-wider text-vault-slate">Transaction Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-vault-slate uppercase flex justify-between">
                                <span>Recipient Address</span>
                                <span className="text-vault-blue cursor-pointer hover:underline">Scan QR</span>
                            </label>
                            <div className="relative">
                                <Scan className="absolute left-3 top-3 text-vault-slate w-5 h-5" />
                                <input 
                                    className="w-full bg-vault-slate/5 border border-vault-slate/20 rounded-md p-3 pl-10 font-mono text-sm text-white focus:border-vault-green focus:ring-1 focus:ring-vault-green outline-none transition-all"
                                    placeholder="0x..."
                                />
                                <div className="absolute right-3 top-2.5">
                                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20">VALID</Badge>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-mono text-vault-slate uppercase flex justify-between">
                                <span>Amount</span>
                                <span className="text-vault-slate">Available: 4,028.00 DVPN</span>
                            </label>
                            <div className="relative">
                                <input 
                                    type="number"
                                    className="w-full bg-vault-slate/5 border border-vault-slate/20 rounded-md p-4 pr-24 font-mono text-2xl text-white focus:border-vault-green focus:ring-1 focus:ring-vault-green outline-none transition-all font-bold placeholder:text-vault-slate/20"
                                    placeholder="0.00"
                                />
                                <div className="absolute right-4 top-4 flex items-center gap-2">
                                    <div className="h-6 w-px bg-vault-slate/20"></div>
                                    <span className="font-bold text-vault-slate">DVPN</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                             <div className="p-3 bg-vault-slate/5 rounded-md border border-vault-slate/10">
                                <div className="text-[10px] text-vault-slate uppercase font-mono mb-1">Estimated Gas</div>
                                <div className="text-sm font-bold text-white flex items-center gap-1">
                                    <Zap size={12} className="text-yellow-500" />
                                    0.0004 ETH
                                </div>
                             </div>
                             <div className="p-3 bg-vault-slate/5 rounded-md border border-vault-slate/10">
                                <div className="text-[10px] text-vault-slate uppercase font-mono mb-1">Privacy Level</div>
                                <div className="text-sm font-bold text-white flex items-center gap-1">
                                    <ShieldCheck size={12} className="text-vault-green" />
                                    MAXIMUM
                                </div>
                             </div>
                        </div>

                        <div className="pt-4">
                             <Button onClick={handleTransfer} className="w-full bg-vault-green text-black hover:bg-vault-green/90 h-12 text-lg font-bold cyber-btn">
                                SIGN TRANSFER
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Right Column: Wallet & Recent */}
            <motion.div variants={itemVariants} className="space-y-6">
                 {/* Wallet Connect Component */}
                 <WalletConnect />

                 {/* Recent Transfers */}
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-vault-slate uppercase">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {[1,2,3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 border-b border-vault-slate/10 last:border-0 hover:bg-vault-slate/5 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-vault-slate/10 flex items-center justify-center text-vault-slate group-hover:bg-vault-green/20 group-hover:text-vault-green transition-colors">
                                        <ArrowRightLeft size={14} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-mono text-white">Sent to 0x8a...29c</div>
                                        <div className="text-[10px] text-vault-slate">2 mins ago</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-white">- 150.00 DVPN</div>
                                    <div className="text-[10px] text-green-500">Confirmed</div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter className="pt-2">
                        <Button variant="ghost" size="sm" className="w-full text-xs text-vault-slate hover:text-white">View Explorer</Button>
                    </CardFooter>
                 </Card>
            </motion.div>
        </div>
    </motion.div>
  )
}
