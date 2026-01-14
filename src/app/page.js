'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, MessageSquare, X, Menu, Paperclip, Image, FileText, Trash2 } from 'lucide-react';

// Simple Markdown to HTML converter
const parseMarkdown = (text) => {
  if (!text) return '';
  
  let html = text;
  
  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Code: `code`
  html = html.replace(/`(.+?)`/g, '<code class="bg-neutral-700 px-1 py-0.5 rounded text-sm">$1</code>');
  
  // Links: [text](url)
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
};

// Component to render message with Markdown
const MessageContent = ({ content }) => {
  return (
    <div 
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
};

// Component to display image attachments
const ImageAttachment = ({ file }) => {
  if (!file.data) return null;

  // Construct proper data URL with base64 encoding
  const imageUrl = `data:${file.type};base64,${file.data}`;

  return (
    <div className="mb-3 rounded-lg overflow-hidden border border-neutral-700">
      <img 
        src={imageUrl} 
        alt={file.name}
        className="max-w-full h-auto max-h-96 object-contain bg-neutral-900"
      />
    </div>
  );
};

export default function ChatbotApp() {
  const [conversations, setConversations] = useState([
    { id: 1, title: 'New Conversation', messages: [] }
  ]);
  const [activeConvId, setActiveConvId] = useState(1);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeConv = conversations.find(c => c.id === activeConvId);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const loadConversations = () => {
      try {
        const saved = localStorage.getItem('chatbot-data');
        if (saved) {
          const data = JSON.parse(saved);
          if (Array.isArray(data.conversations) && data.conversations.length > 0) {
            setConversations(data.conversations);
            if (data.activeConvId && data.conversations.some(c => c.id === data.activeConvId)) {
              setActiveConvId(data.activeConvId);
            }
          }
        }
      } catch (error) {
        console.error('Error loading conversations from storage:', error);
        localStorage.removeItem('chatbot-data');
      } finally {
        setStorageLoaded(true);
      }
    };

    loadConversations();
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (!storageLoaded) return;

    try {
      localStorage.setItem('chatbot-data', JSON.stringify({
        conversations,
        activeConvId
      }));
    } catch (error) {
      console.error('Error saving conversations to storage:', error);
    }
  }, [conversations, activeConvId, storageLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

  const handleSend = async () => {
    if ((!input.trim() && files.length === 0) || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      files: files.map(f => ({ name: f.name, type: f.type, size: f.size, data: f.data })),
      timestamp: new Date().toISOString()
    };

    setConversations(prev => prev.map(conv =>
      conv.id === activeConvId
        ? {
            ...conv,
            messages: [...conv.messages, userMessage],
            title: conv.messages.length === 0 && input.trim() 
              ? input.slice(0, 30) + (input.length > 30 ? '...' : '') 
              : conv.title
          }
        : conv
    ));

    const currentInput = input;
    const currentFiles = files;
    setInput('');
    setFiles([]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          files: currentFiles,
          conversationHistory: activeConv.messages.slice(-10)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.response) {
        throw new Error('No response received from API');
      }

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setConversations(prev => prev.map(conv =>
        conv.id === activeConvId
          ? { ...conv, messages: [...conv.messages, aiMessage] }
          : conv
      ));
    } catch (error) {
      console.error('Error calling API:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        isError: true
      };

      setConversations(prev => prev.map(conv =>
        conv.id === activeConvId
          ? { ...conv, messages: [...conv.messages, errorMessage] }
          : conv
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = () => {
    const newConv = {
      id: Date.now(),
      title: 'New Conversation',
      messages: []
    };
    setConversations(prev => [...prev, newConv]);
    setActiveConvId(newConv.id);
  };

  const deleteConversation = (id) => {
    if (conversations.length === 1) return;
    
    const filtered = conversations.filter(c => c.id !== id);
    setConversations(filtered);
    
    if (activeConvId === id) {
      setActiveConvId(filtered[0].id);
    }
  };

  const clearAllConversations = () => {
    setShowClearModal(true);
  };

  const confirmClearAll = () => {
    const newConv = {
      id: Date.now(),
      title: 'New Conversation',
      messages: []
    };
    setConversations([newConv]);
    setActiveConvId(newConv.id);
    
    try {
      localStorage.removeItem('chatbot-data');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
    
    setShowClearModal(false);
  };

  const handleFileSelect = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    const validFiles = selected.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`${file.name} is not a supported file type. Only images are allowed.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      e.target.value = null;
      return;
    }

    const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });

    try {
      const filesWithData = await Promise.all(validFiles.map(async (file) => {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          const base64 = dataUrl.split(',')[1];
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64,
          };
        } catch (error) {
          console.error(`Error reading ${file.name}:`, error);
          return null;
        }
      }));

      const successfulFiles = filesWithData.filter(f => f !== null);
      if (successfulFiles.length > 0) {
        setFiles(prev => [...prev, ...successfulFiles]);
      }
      
      e.target.value = null;
    } catch (err) {
      console.error('Failed to process files:', err);
      alert('Failed to process some files. Please try again.');
      e.target.value = null;
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <Image className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  // Show loading state while storage loads
  if (!storageLoaded) {
    return (
      <div className="flex h-screen bg-neutral-900 items-center justify-center">
        <div className="text-neutral-400">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-900">
      {/* Clear All Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-800 rounded-xl shadow-2xl max-w-md w-full border border-neutral-700 animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-100 mb-2">
                    Clear All Conversations?
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    This will permanently delete all your conversations and cannot be undone. Are you sure you want to continue?
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-4 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearAll}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-neutral-950 border-r border-neutral-800 transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-neutral-800 space-y-2">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center gap-2 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors text-neutral-200"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">New Chat</span>
          </button>
          <button
            onClick={clearAllConversations}
            className="w-full flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors text-neutral-400 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`group flex items-center gap-2 px-3 py-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                activeConvId === conv.id 
                  ? 'bg-neutral-800 border border-neutral-700 text-neutral-100' 
                  : 'hover:bg-neutral-800/50 text-neutral-400'
              }`}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate text-sm">{conv.title}</span>
              {conversations.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-neutral-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-neutral-100">
            {activeConv?.title || 'Chat'}
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {activeConv?.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-neutral-200 mb-2">Start a conversation</h2>
                <p className="text-neutral-500">Send a message or upload an image to begin</p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {activeConv?.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-neutral-700 text-neutral-100 rounded-2xl rounded-tr-sm'
                      : msg.isError
                      ? 'bg-red-900/20 text-red-200 rounded-2xl rounded-tl-sm border border-red-800'
                      : 'bg-neutral-800 text-neutral-100 rounded-2xl rounded-tl-sm border border-neutral-700'
                  } px-5 py-3 shadow-sm`}>
                    {msg.files && msg.files.length > 0 && (
                      <div className="mb-3">
                        {msg.files.map((file, i) => (
                          file.type?.startsWith('image/') ? (
                            <ImageAttachment key={i} file={file} />
                          ) : (
                            <div key={i} className="flex items-center gap-2 text-sm opacity-90 mb-2">
                              {getFileIcon(file.type)}
                              <span className="truncate">{file.name}</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    <MessageContent content={msg.content} />
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-800 text-neutral-100 rounded-2xl rounded-tl-sm border border-neutral-700 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-pulse delay-75" />
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-pulse delay-150" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-neutral-900 border-t border-neutral-800 p-6">
          <div className="max-w-3xl mx-auto">

            
            <div className="flex items-end gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-3 hover:bg-neutral-800 rounded-xl transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Attach images"
              >
                <Paperclip className="w-5 h-5 text-neutral-400" />
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message..."
                disabled={isLoading}
                rows={1}
                className="flex-1 resize-none px-4 py-3 bg-neutral-800 border border-neutral-700 text-neutral-100 placeholder-neutral-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '48px', maxHeight: '200px' }}
              />

              <button
                onClick={handleSend}
                disabled={(!input.trim() && files.length === 0) || isLoading}
                className="p-3 bg-neutral-700 text-neutral-100 rounded-xl hover:bg-neutral-600 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .markdown-content strong {
          font-weight: 700;
          color: #fafafa;
        }
        .markdown-content em {
          font-style: italic;
        }
        .markdown-content a {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}