import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BookOpen, Sparkle, Question, CaretLeft, CaretRight, House, X, MagnifyingGlass, ArrowSquareOut } from '@phosphor-icons/react'
import { MODULE_GUIDES, DEFAULT_GUIDE } from '../../data/moduleGuides'

type Tab = 'userGuide' | 'whatsNew' | 'help' | null

export function RightSidebar() {
  const [activeTab, setActiveTab] = useState<Tab>(null)
  const location = useLocation()

  // Find active guide based on URL
  let activeGuide = DEFAULT_GUIDE
  const matchedPrefix = Object.keys(MODULE_GUIDES)
    .filter(prefix => location.pathname.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0]
    
  if (matchedPrefix) {
    activeGuide = MODULE_GUIDES[matchedPrefix]
  }

  const handleTabClick = (tab: Tab) => {
    setActiveTab(activeTab === tab ? null : tab)
  }

  return (
    <div className="flex h-full flex-shrink-0 relative">
      {/* Expanded Panel */}
      {activeTab && (
        <div className="w-[380px] bg-surface border-l border-[hsl(var(--border))] shadow-[-4px_0_15px_rgba(0,0,0,0.05)] flex flex-col h-full absolute right-[40px] top-0 bottom-0 z-40 transition-transform">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border))] bg-surface flex-shrink-0">
            <div className="flex items-center gap-2 text-[hsl(var(--text-3))]">
              <button className="hover:bg-raised p-1 rounded transition-colors"><CaretLeft size={14} /></button>
              <button className="hover:bg-raised p-1 rounded transition-colors" disabled><CaretRight size={14} className="opacity-50" /></button>
              <button className="hover:bg-raised p-1 rounded transition-colors mx-1"><House size={14} /></button>
              <span className="text-[12px] font-medium text-[hsl(var(--text-1))]">
                {activeTab === 'userGuide' ? 'User guide' : activeTab === 'whatsNew' ? "What's new" : 'Help'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[hsl(var(--text-3))]">
              <button className="hover:bg-raised p-1 rounded transition-colors"><ArrowSquareOut size={14} /></button>
              <button className="hover:bg-raised p-1 rounded transition-colors"><MagnifyingGlass size={14} /></button>
              <button onClick={() => setActiveTab(null)} className="hover:bg-raised p-1 rounded transition-colors flex items-center gap-1 bg-raised px-2 border border-[hsl(var(--border))] ml-1">
                 <span className="text-[10px] font-medium">Close</span>
              </button>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-[hsl(var(--bg-page))] p-5">
            {activeTab === 'userGuide' && (
              <div>
                <h2 className="text-[18px] font-bold text-[hsl(var(--text-1))] mb-2">Browse by topic</h2>
                <p className="text-[13px] text-[hsl(var(--text-2))] mb-6 leading-relaxed bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] p-3 rounded border border-[hsl(var(--brand))/0.2]">
                  <strong>Current Module: {activeGuide.title}</strong><br/>
                  {activeGuide.overview}
                </p>
                
                <div className="space-y-4">
                  {activeGuide.features.map((feature, idx) => {
                     const Icon = feature.icon
                     return (
                       <div key={idx} className="bg-surface border border-[hsl(var(--border))] rounded-md p-4 hover:border-[hsl(var(--brand))] hover:shadow-[var(--shadow-sm)] transition-all">
                         <div className="flex items-start gap-3">
                           <div className="text-[hsl(var(--brand))] mt-0.5">
                             <Icon size={20} weight="duotone" />
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start mb-1">
                               <h3 className="text-[13px] font-bold text-[hsl(var(--text-1))]">{feature.title}</h3>
                             </div>
                             <p className="text-[12px] text-[hsl(var(--text-3))] leading-relaxed mb-3">{feature.description}</p>
                             <div className="bg-raised rounded p-2.5 text-[11.5px] text-[hsl(var(--text-2))] leading-relaxed border border-[hsl(var(--border))]">
                               <span className="font-semibold block mb-1 text-[hsl(var(--text-1))]">How it works:</span>
                               {feature.howItWorks}
                             </div>
                           </div>
                         </div>
                       </div>
                     )
                  })}
                </div>
              </div>
            )}
            
            {activeTab === 'whatsNew' && (
               <div className="flex flex-col items-center justify-center h-full text-[hsl(var(--text-4))]">
                  <Sparkle size={32} className="mb-2" />
                  <p className="text-sm">No new updates right now.</p>
               </div>
            )}
            
            {activeTab === 'help' && (
               <div className="flex flex-col items-center justify-center h-full text-[hsl(var(--text-4))]">
                  <Question size={32} className="mb-2" />
                  <p className="text-sm">Help center integration coming soon.</p>
               </div>
            )}
          </div>
        </div>
      )}

      {/* The Rail */}
      <div className="w-[40px] bg-surface border-l border-[hsl(var(--border))] flex flex-col items-center py-2 z-50 h-full relative">
        
        {/* User Guide Tab */}
        <button 
          onClick={() => handleTabClick('userGuide')}
          className={`w-full py-4 flex flex-col items-center justify-center gap-3 transition-colors border-l-2 ${activeTab === 'userGuide' ? 'border-[hsl(var(--brand))] text-[hsl(var(--brand))] bg-raised' : 'border-transparent text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))] hover:bg-raised'}`}
        >
          <BookOpen size={16} />
          <span 
            className="text-[11px] font-medium tracking-wide whitespace-nowrap" 
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            User guide
          </span>
        </button>

        <div className="w-[20px] border-b border-[hsl(var(--border))] my-1"></div>

        {/* What's New Tab */}
        <button 
          onClick={() => handleTabClick('whatsNew')}
          className={`w-full py-4 flex flex-col items-center justify-center gap-3 transition-colors border-l-2 ${activeTab === 'whatsNew' ? 'border-[hsl(var(--brand))] text-[hsl(var(--brand))] bg-raised' : 'border-transparent text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))] hover:bg-raised'}`}
        >
          <Sparkle size={16} />
          <span 
            className="text-[11px] font-medium tracking-wide whitespace-nowrap" 
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            What's new
          </span>
        </button>

        <div className="flex-1"></div>
        <div className="w-[20px] border-b border-[hsl(var(--border))] my-2"></div>

        {/* Help Tab */}
        <button 
          onClick={() => handleTabClick('help')}
          className={`w-full py-4 flex flex-col items-center justify-center gap-3 transition-colors border-l-2 ${activeTab === 'help' ? 'border-[hsl(var(--brand))] text-[hsl(var(--brand))] bg-raised' : 'border-transparent text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))] hover:bg-raised'}`}
        >
          <Question size={16} />
          <span 
            className="text-[11px] font-medium tracking-wide whitespace-nowrap" 
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Help
          </span>
        </button>

      </div>
    </div>
  )
}
