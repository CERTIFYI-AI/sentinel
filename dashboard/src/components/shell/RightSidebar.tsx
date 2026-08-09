import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { BookOpen, Sparkle, Question, CaretLeft, CaretRight, House, MagnifyingGlass, ArrowSquareOut, FileText, ArrowRight } from '@phosphor-icons/react'
import { COLLECTIONS, ROUTE_TO_COLLECTION_MAP, Collection, Article } from '../../data/moduleGuides'

type Tab = 'userGuide' | 'whatsNew' | 'help' | null

type NavState =
  | { type: 'home' }
  | { type: 'collection'; collectionId: string }
  | { type: 'article'; collectionId: string; articleId: string }

export function RightSidebar() {
  const [activeTab, setActiveTab] = useState<Tab>(null)
  const [navState, setNavState] = useState<NavState>({ type: 'home' })
  const location = useLocation()

  // When opening the user guide, try to contextually navigate based on route
  useEffect(() => {
    if (activeTab === 'userGuide' && navState.type === 'home') {
      const matchedPrefix = Object.keys(ROUTE_TO_COLLECTION_MAP)
        .filter(prefix => location.pathname.startsWith(prefix))
        .sort((a, b) => b.length - a.length)[0]
        
      if (matchedPrefix) {
        setNavState({ type: 'collection', collectionId: ROUTE_TO_COLLECTION_MAP[matchedPrefix] })
      }
    }
  }, [activeTab, location.pathname])

  const handleTabClick = (tab: Tab) => {
    if (activeTab === tab) {
      setActiveTab(null)
    } else {
      setActiveTab(tab)
      if (tab === 'userGuide') {
         // Reset navigation to context-aware collection on open
         const matchedPrefix = Object.keys(ROUTE_TO_COLLECTION_MAP)
          .filter(prefix => location.pathname.startsWith(prefix))
          .sort((a, b) => b.length - a.length)[0]
         if (matchedPrefix) {
           setNavState({ type: 'collection', collectionId: ROUTE_TO_COLLECTION_MAP[matchedPrefix] })
         } else {
           setNavState({ type: 'home' })
         }
      }
    }
  }

  const navigateHome = () => setNavState({ type: 'home' })
  const navigateBack = () => {
    if (navState.type === 'article') {
      setNavState({ type: 'collection', collectionId: navState.collectionId })
    } else if (navState.type === 'collection') {
      setNavState({ type: 'home' })
    }
  }

  const renderBreadcrumbs = () => {
    if (navState.type === 'home') {
      return <span className="text-[12px] font-medium text-[hsl(var(--text-1))]">Browse by topic</span>
    }
    
    if (navState.type === 'collection') {
      const collection = COLLECTIONS.find(c => c.id === navState.collectionId)
      return (
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-medium text-[hsl(var(--text-1))] bg-raised px-2 py-0.5 rounded border border-[hsl(var(--border))]">
            {collection?.title} <span className="text-[hsl(var(--text-4))] ml-1">▼</span>
          </span>
        </div>
      )
    }

    if (navState.type === 'article') {
      const collection = COLLECTIONS.find(c => c.id === navState.collectionId)
      const article = collection?.articles.find(a => a.id === navState.articleId)
      return (
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-medium text-[hsl(var(--text-1))] truncate max-w-[150px]">
            {article?.title}
          </span>
          <span className="text-[hsl(var(--text-4))] ml-1">▼</span>
        </div>
      )
    }
  }

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`article-section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <div className="flex h-full flex-shrink-0 relative">
      {/* Expanded Panel */}
      {activeTab && (
        <div className="w-[380px] bg-surface border-l border-[hsl(var(--border))] shadow-[-4px_0_15px_rgba(0,0,0,0.05)] flex flex-col h-full absolute right-[40px] top-0 bottom-0 z-40 transition-transform">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border))] bg-surface flex-shrink-0">
            <div className="flex items-center gap-1 text-[hsl(var(--text-3))]">
              <button onClick={navigateBack} disabled={navState.type === 'home'} className={`p-1 rounded transition-colors ${navState.type === 'home' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-raised'}`}>
                <CaretLeft size={14} />
              </button>
              <button className="hover:bg-raised p-1 rounded transition-colors" disabled><CaretRight size={14} className="opacity-50" /></button>
              <button onClick={navigateHome} className="hover:bg-raised p-1 rounded transition-colors mx-1">
                <House size={14} />
              </button>
              {renderBreadcrumbs()}
            </div>
            <div className="flex items-center gap-1 text-[hsl(var(--text-3))]">
              <button className="hover:bg-raised p-1 rounded transition-colors"><ArrowSquareOut size={14} /></button>
              <button className="hover:bg-raised p-1 rounded transition-colors"><MagnifyingGlass size={14} /></button>
              <button onClick={() => setActiveTab(null)} className="hover:bg-raised p-1 rounded transition-colors flex items-center gap-1">
                 <span className="sr-only">Close</span>
                 <svg width="14" height="14" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
              </button>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-[hsl(var(--bg-page))]">
            
            {/* HOME VIEW (Browse by Topic) */}
            {activeTab === 'userGuide' && navState.type === 'home' && (
              <div className="p-5">
                <h2 className="text-[18px] font-bold text-[hsl(var(--text-1))] mb-4">Browse by topic</h2>
                <div className="space-y-3">
                  {COLLECTIONS.map(collection => {
                    const Icon = collection.icon;
                    return (
                      <div 
                        key={collection.id} 
                        onClick={() => setNavState({ type: 'collection', collectionId: collection.id })}
                        className="bg-surface border border-[hsl(var(--border))] rounded-md p-4 hover:border-[hsl(var(--brand))] hover:shadow-[var(--shadow-sm)] transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-2">
                           <div className="flex items-center gap-2">
                              <Icon size={18} className="text-[hsl(var(--brand))]" weight="duotone" />
                              <h3 className="text-[14px] font-bold text-[hsl(var(--text-1))]">{collection.title}</h3>
                           </div>
                           <span className="text-[11px] bg-raised px-2 py-0.5 rounded-full text-[hsl(var(--text-3))] border border-[hsl(var(--border))] group-hover:bg-[hsl(var(--brand-subtle))] group-hover:text-[hsl(var(--brand))] group-hover:border-[hsl(var(--brand))/0.3] transition-colors">
                              {collection.articles.length} articles
                           </span>
                        </div>
                        <p className="text-[13px] text-[hsl(var(--text-3))] leading-relaxed ml-7">
                          {collection.description}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* COLLECTION VIEW */}
            {activeTab === 'userGuide' && navState.type === 'collection' && (
              <div>
                {(() => {
                  const collection = COLLECTIONS.find(c => c.id === navState.collectionId);
                  if (!collection) return null;
                  const Icon = collection.icon;
                  return (
                    <>
                      <div className="p-6 border-b border-[hsl(var(--border))] bg-surface text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] mb-3">
                          <Icon size={24} weight="duotone" />
                        </div>
                        <h2 className="text-[20px] font-bold text-[hsl(var(--text-1))] mb-2">{collection.title}</h2>
                        <p className="text-[13px] text-[hsl(var(--text-2))] leading-relaxed mb-4 max-w-[90%] mx-auto">{collection.description}</p>
                        <p className="text-[12px] text-[hsl(var(--text-4))]">{collection.articles.length} articles in this collection</p>
                      </div>
                      
                      <div className="p-4 bg-[hsl(var(--bg-page))] space-y-3">
                        {collection.articles.map(article => (
                          <div 
                            key={article.id}
                            onClick={() => setNavState({ type: 'article', collectionId: collection.id, articleId: article.id })}
                            className="bg-surface border border-[hsl(var(--border))] rounded-md p-4 hover:border-[hsl(var(--brand))] hover:shadow-[var(--shadow-sm)] transition-all cursor-pointer flex items-center justify-between group"
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                               <FileText size={18} className="text-[hsl(var(--text-4))] mt-0.5 group-hover:text-[hsl(var(--brand))] transition-colors" />
                               <div className="flex-1 min-w-0">
                                  <h4 className="text-[14px] font-semibold text-[hsl(var(--text-1))] mb-1 group-hover:text-[hsl(var(--brand))] transition-colors">{article.title}</h4>
                                  <p className="text-[12px] text-[hsl(var(--text-3))] truncate">{article.description}</p>
                               </div>
                            </div>
                            <ArrowRight size={14} className="text-[hsl(var(--text-4))] group-hover:text-[hsl(var(--brand))] transition-colors ml-2 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </div>
            )}

            {/* ARTICLE VIEW */}
            {activeTab === 'userGuide' && navState.type === 'article' && (
              <div className="p-6 pb-20">
                {(() => {
                  const collection = COLLECTIONS.find(c => c.id === navState.collectionId);
                  const article = collection?.articles.find(a => a.id === navState.articleId);
                  if (!article) return null;
                  
                  return (
                    <>
                      <h1 className="text-[22px] font-bold text-[hsl(var(--text-1))] mb-3 leading-tight">{article.title}</h1>
                      <p className="text-[14px] text-[hsl(var(--text-2))] leading-relaxed mb-6">{article.description}</p>
                      
                      {/* IN THIS ARTICLE Table of Contents */}
                      <div className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] rounded-md p-4 mb-8">
                        <h3 className="text-[11px] font-bold text-[hsl(var(--text-4))] uppercase tracking-wider mb-3">In this article</h3>
                        <ul className="space-y-2">
                          {article.sections.map((section) => (
                            <li key={section.id}>
                              <button 
                                onClick={() => scrollToSection(section.id)}
                                className="text-[13px] text-[hsl(var(--brand))] hover:underline text-left"
                              >
                                {section.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Article Content */}
                      <div className="space-y-8">
                        {article.sections.map((section) => (
                          <div key={section.id} id={`article-section-${section.id}`} className="scroll-mt-6">
                            <h2 className="text-[18px] font-bold text-[hsl(var(--text-1))] mb-4 border-b border-[hsl(var(--border))] pb-2">{section.title}</h2>
                            <div className="text-[hsl(var(--text-2))] prose prose-sm max-w-none prose-headings:text-[hsl(var(--text-1))] prose-a:text-[hsl(var(--brand))]">
                              {section.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </div>
            )}

            {/* OTHER TABS */}
            {activeTab === 'whatsNew' && (
               <div className="flex flex-col items-start p-6 pb-20">
                  <h3 className="text-lg font-semibold text-[hsl(var(--text-1))] mb-6 flex items-center gap-2">
                    <Sparkle size={20} className="text-[hsl(var(--brand))]" /> What's New
                  </h3>
                  <div className="space-y-4 w-full">
                    <div className="bg-surface border border-[hsl(var(--border))] p-5 rounded-lg w-full shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-semibold text-[hsl(var(--text-1))] text-base">Sentinel v1.43.0</span>
                        <span className="text-xs text-[hsl(var(--text-3))] font-mono bg-raised px-2 py-1 rounded">2 hours ago</span>
                      </div>
                      <p className="text-sm text-[hsl(var(--text-2))] mb-4 leading-relaxed">
                        We've just rolled out version 1.43.0 (Release 57). Check out the release notes to see all the latest platform updates, UI improvements, and new AI governance capabilities.
                      </p>
                      <a href="https://github.com/CERTIFYI-AI/sentinel/releases/tag/v1.43.0" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--brand))] hover:underline">
                        View Release Notes <ArrowSquareOut size={14} weight="bold" />
                      </a>
                    </div>
                  </div>
               </div>
            )}
            
            {activeTab === 'help' && (
               <div className="flex flex-col items-start p-6 pb-20">
                  <h3 className="text-lg font-semibold text-[hsl(var(--text-1))] mb-6 flex items-center gap-2">
                    <Question size={20} className="text-[hsl(var(--brand))]" /> Help Center
                  </h3>
                  <div className="space-y-6 w-full">
                    
                    {/* Platform Info */}
                    <div className="bg-surface border border-[hsl(var(--border))] p-5 rounded-lg w-full shadow-sm">
                      <h4 className="font-semibold text-[hsl(var(--text-1))] mb-2 text-base">Certifyi AI GRC Platform</h4>
                      <p className="text-sm text-[hsl(var(--text-2))] mb-4 leading-relaxed">
                        Achieve ISO 42001 & SOC 2 compliance in 8-12 Weeks. Turn AI and compliance risk into audit-ready trust with our done-with-you automation.
                      </p>
                      <a href="https://certifyi.ai/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--brand))] hover:underline">
                        Visit Certifyi.ai <ArrowSquareOut size={14} weight="bold" />
                      </a>
                    </div>

                    {/* Contact Info */}
                    <div className="bg-surface border border-[hsl(var(--border))] p-5 rounded-lg w-full shadow-sm">
                      <h4 className="font-semibold text-[hsl(var(--text-1))] mb-4 text-base">Contact Us</h4>
                      <p className="text-sm text-[hsl(var(--text-2))] mb-4">
                        For questions, requests, or complaints:
                      </p>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wider mb-1">Phone</span>
                          <a href="tel:+9779851334787" className="text-sm text-[hsl(var(--text-1))] hover:text-[hsl(var(--brand))]">+977-9851334787</a>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wider mb-1">Email</span>
                          <a href="mailto:get@certifyi.ai" className="text-sm text-[hsl(var(--text-1))] hover:text-[hsl(var(--brand))]">get@certifyi.ai</a>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[hsl(var(--border))]">
                        <p className="text-xs text-[hsl(var(--text-3))] leading-relaxed">
                          <strong>Note:</strong> This policy complies with Nepal's data protection framework. If you are subject to other jurisdictions (e.g., GDPR for EU users), additional terms may apply.
                        </p>
                      </div>
                    </div>

                  </div>
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
