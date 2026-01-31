'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

interface Node {
  id: number
  x: number
  y: number
  status: 'active' | 'idle' | 'secure'
}

export function NetworkTopology() {
  const [nodes, setNodes] = useState<Node[]>([])
  
  // Generate random nodes on client side primarily to avoid hydration mismatch, 
  // but for design consistency we might want a seed.
  useEffect(() => {
    const newNodes: Node[] = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      status: Math.random() > 0.8 ? 'active' : Math.random() > 0.9 ? 'secure' : 'idle'
    }))
    setNodes(newNodes)
  }, [])

  return (
    <div className="relative w-full h-[300px] bg-vault-bg/50 overflow-hidden border border-vault-slate/20 rounded-md">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Connections */}
        {nodes.map((node, i) => {
            // Connect to nearest neighbors (simulated by index for performance)
             const nextNode = nodes[(i + 1) % nodes.length];
             const randomNode = nodes[(i + 5) % nodes.length];
             
             return (
               <g key={node.id}>
                 <motion.line
                    x1={`${node.x}%`}
                    y1={`${node.y}%`}
                    x2={`${nextNode.x}%`}
                    y2={`${nextNode.y}%`}
                    stroke={node.status === 'active' ? '#00ff88' : '#4a5568'}
                    strokeWidth="0.5"
                    strokeOpacity={0.2}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", delay: i * 0.05 }}
                 />
                 {node.status === 'active' && (
                     <line
                        x1={`${node.x}%`} y1={`${node.y}%`}
                        x2={`${randomNode.x}%`} y2={`${randomNode.y}%`}
                        stroke="#00ff88"
                        strokeWidth="0.5"
                        strokeOpacity="0.4"
                        strokeDasharray="2 2"
                        className="animate-pulse"
                     />
                 )}
               </g>
             )
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className={`absolute w-2 h-2 -ml-1 -mt-1`}
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: Math.random() * 1 }}
        >
          <div className={`w-full h-full ${
            node.status === 'active' ? 'bg-vault-green shadow-[0_0_8px_#00ff88]' : 
            node.status === 'secure' ? 'bg-vault-blue shadow-[0_0_8px_#0ea5e9]' :
            'bg-vault-slate'
          } rounded-full`} />
        </motion.div>
      ))}
    </div>
  )
}
