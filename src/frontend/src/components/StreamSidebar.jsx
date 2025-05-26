import React, { useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';

const StreamSidebar = ({ 
  isOpen, 
  onToggle, 
  streams, 
  selectedStream,
  onSelectStream,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onContainerDragOver,
  onContainerDrop,
  draggedStreamId,
  dragOverStreamId,
  dragInsertionIndex,
  onCreateNew,
  onDeleteStream,
  onUpdateNow
}) => {
  const sidebarRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e, streamId) => {
    setIsDragging(true);
    onDragStart(e, streamId);
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);
    onDragEnd(e);
  };

  const formatLastUpdated = (dateString) => {
    if (!dateString) return 'Never';
    try {
      return format(parseISO(dateString), 'MMM dd, HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  const getStreamStatus = (stream) => {
    if (!stream.last_updated) return 'pending';
    const lastUpdate = new Date(stream.last_updated);
    const now = new Date();
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate < 1) return 'fresh';
    if (hoursSinceUpdate < 24) return 'recent';
    return 'stale';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'fresh': return 'text-emerald-500';
      case 'recent': return 'text-amber-500';
      case 'stale': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <>
      {/* Backdrop - Apple-style with smooth fade */}
      <div 
        className={`
          fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden
          transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]
          ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}
        `}
        onClick={onToggle}
      />
      
      {/* Sidebar Container - Fixed width, slides in/out */}
      <div 
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 h-full w-80 bg-card/95 backdrop-blur-xl border-r border-border/50
          z-50 md:relative md:z-0
          flex flex-col
          transition-transform duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:transition-all md:duration-300 md:ease-[cubic-bezier(0.4,0.0,0.2,1)]
          ${isOpen ? 'md:w-80' : 'md:w-0'}
        `}
        style={{
          // Prevent content overflow during desktop collapse
          overflow: isOpen ? 'visible' : 'hidden'
        }}
      >
        {/* Content Container - Fades in/out with stagger */}
        <div 
          className={`
            h-full flex flex-col
            transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]
            ${isOpen 
              ? 'opacity-100 translate-x-0 delay-75' 
              : 'opacity-0 translate-x-4 md:translate-x-0'
            }
          `}
        >
          {/* Header */}
          <div className="p-6 border-b border-border/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Streams</h2>
              <button
                onClick={onToggle}
                className="p-2 rounded-lg hover:bg-muted/50 transition-all duration-200 ease-[cubic-bezier(0.4,0.0,0.2,1)]
                         active:scale-95 hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <button
              onClick={onCreateNew}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium
                       hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 ease-[cubic-bezier(0.4,0.0,0.2,1)]
                       focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
                       shadow-sm hover:shadow-md hover:scale-[1.02]"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Stream
              </div>
            </button>
          </div>

          {/* Stream List - Staggered animations */}
          <div 
            className={`
              flex-1 overflow-y-auto p-4 space-y-2
              transition-all duration-400 ease-[cubic-bezier(0.4,0.0,0.2,1)]
              ${isOpen 
                ? 'opacity-100 translate-y-0 delay-150' 
                : 'opacity-0 translate-y-2'
              }
            `}
            onDragOver={onContainerDragOver}
            onDrop={onContainerDrop}
          >
            {streams.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center
                              transition-all duration-500 ease-[cubic-bezier(0.4,0.0,0.2,1)]
                              hover:scale-110 hover:bg-muted/40">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-muted-foreground">No streams yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Create your first stream to get started</p>
              </div>
            ) : (
              <>
                {streams.map((stream, index) => {
                  const status = getStreamStatus(stream);
                  const isSelected = selectedStream?.id === stream.id;
                  const isDraggedOver = dragOverStreamId === stream.id;
                  const isBeingDragged = draggedStreamId === stream.id;
                  const showInsertionBefore = dragInsertionIndex === index && draggedStreamId;

                  return (
                    <div key={stream.id}>
                      {/* Insertion indicator before this stream */}
                      {showInsertionBefore && (
                        <div className="h-0.5 bg-white rounded-full shadow-lg mx-4 mb-2 opacity-90
                                      animate-pulse transition-all duration-200 ease-[cubic-bezier(0.4,0.0,0.2,1)]">
                          <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent"></div>
                        </div>
                      )}
                      
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, stream.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => onDragOver(e, stream.id)}
                        onDrop={(e) => onDrop(e, stream.id)}
                        data-stream-id={stream.id}
                        className={`
                          group relative p-4 rounded-xl border cursor-pointer
                          transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]
                          transform-gpu
                          ${isSelected 
                            ? 'bg-primary/10 border-primary/30 shadow-sm scale-[1.02]' 
                            : 'bg-card/50 border-border/30 hover:bg-muted/30 hover:border-border/50 hover:scale-[1.01]'
                          }
                          ${isDraggedOver ? 'border-primary border-2 bg-primary/5 scale-105' : ''}
                          ${isBeingDragged ? 'opacity-50 scale-95' : ''}
                          ${isDragging ? 'cursor-grabbing' : 'cursor-grab hover:cursor-grab active:cursor-grabbing'}
                          hover:shadow-lg active:scale-[0.99]
                        `}
                        style={{
                          // Stagger animation delay based on index
                          transitionDelay: isOpen ? `${200 + index * 50}ms` : '0ms'
                        }}
                        onClick={() => onSelectStream(stream)}
                      >
                        {/* Drag Handle - Smooth fade */}
                        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 
                                      opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]
                                      group-hover:translate-x-1">
                          <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 6h2v2H8zM8 10h2v2H8zM8 14h2v2H8zM14 6h2v2h-2zM14 10h2v2h-2zM14 14h2v2h-2z"/>
                          </svg>
                        </div>

                        {/* Stream Content */}
                        <div className="ml-6">
                          {/* Query and Status */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-medium text-foreground leading-tight line-clamp-2 text-sm
                                         transition-colors duration-200 ease-[cubic-bezier(0.4,0.0,0.2,1)]">
                              {stream.query}
                            </h3>
                            <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 
                                           transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]
                                           group-hover:scale-125 ${
                              status === 'fresh' ? 'bg-emerald-500 shadow-emerald-500/50' :
                              status === 'recent' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-gray-400'
                            }`} 
                            style={{
                              boxShadow: status !== 'stale' ? '0 0 8px currentColor' : 'none'
                            }}
                            />
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="transition-colors duration-200 ease-[cubic-bezier(0.4,0.0,0.2,1)]">
                              {stream.auto_update ? 'Auto' : 'Manual'} • 
                              {stream.frequency ? ` ${stream.frequency}h` : ' On demand'}
                            </span>
                            <span className={`${getStatusColor(status)} transition-colors duration-200 ease-[cubic-bezier(0.4,0.0,0.2,1)]`}>
                              {formatLastUpdated(stream.last_updated)}
                            </span>
                          </div>

                          {/* Action buttons - Staggered slide-up animation */}
                          <div className="flex items-center gap-1 mt-3 
                                        opacity-0 group-hover:opacity-100 
                                        translate-y-2 group-hover:translate-y-0
                                        transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateNow(stream.id);
                              }}
                              className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-md 
                                       hover:bg-primary/20 active:scale-95 
                                       transition-all duration-200 ease-[cubic-bezier(0.4,0.0,0.2,1)]
                                       hover:scale-105 hover:shadow-md"
                              style={{ transitionDelay: '50ms' }}
                            >
                              Update
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteStream(stream.id);
                              }}
                              className="px-2 py-1 text-xs bg-red-500/10 text-red-600 rounded-md 
                                       hover:bg-red-500/20 active:scale-95
                                       transition-all duration-200 ease-[cubic-bezier(0.4,0.0,0.2,1)]
                                       hover:scale-105 hover:shadow-md"
                              style={{ transitionDelay: '100ms' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Insertion indicator at the end of the list */}
                {dragInsertionIndex === streams.length && draggedStreamId && (
                  <div className="h-0.5 bg-white rounded-full shadow-lg mx-4 mt-2 opacity-90
                                animate-pulse transition-all duration-200 ease-[cubic-bezier(0.4,0.0,0.2,1)]">
                    <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent"></div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer - Delayed fade-in */}
          <div 
            className={`
              p-4 border-t border-border/30
              transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]
              ${isOpen 
                ? 'opacity-100 translate-y-0 delay-300' 
                : 'opacity-0 translate-y-2'
              }
            `}
          >
            <div className="text-xs text-muted-foreground text-center">
              {streams.length} stream{streams.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StreamSidebar; 