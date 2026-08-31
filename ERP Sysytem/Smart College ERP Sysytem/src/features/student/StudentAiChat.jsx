// src/features/student/StudentAiChat.jsx
import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../auth/api';
import {
  FaRobot,
  FaPaperPlane,
  FaTimes,
  FaMagic,
  FaUser,
  FaSyncAlt,
  FaBookOpen,
  FaExpandAlt,
  FaCompressAlt,
  FaCopy,
  FaCheck,
  FaLightbulb,
  FaGraduationCap,
  FaCalendarCheck,
  FaFileAlt,
  FaExternalLinkAlt
} from 'react-icons/fa';
import './StudentAiChat.css';

const CATEGORIES = [
  { id: 'all', label: '✨ All Smart Prompts', icon: <FaLightbulb /> },
  { id: 'attendance', label: '📊 Attendance & Margin', icon: <FaCalendarCheck /> },
  { id: 'academics', label: '🎓 Marks & Grades', icon: <FaGraduationCap /> },
  { id: 'regulations', label: '📜 College Rules', icon: <FaBookOpen /> },
  { id: 'assignments', label: '📝 Tasks & Deadlines', icon: <FaFileAlt /> },
];

const ALL_QUICK_CHIPS = [
  { cat: 'attendance', label: '📊 Attendance & Safe Classes', query: 'What is my current attendance and how many classes can I safely miss?' },
  { cat: 'attendance', label: '🚨 Classes Needed for 75%', query: 'How many classes do I need to attend to reach 75% attendance?' },
  { cat: 'regulations', label: '📜 Condonation & Shortage Rules', query: 'What are the college rules for attendance shortage and condonation?' },
  { cat: 'academics', label: '📝 Subject-wise Marks & Grades', query: 'Show my course marks and grades breakdown' },
  { cat: 'academics', label: '⚖️ Exam Weightage & Pass Marks', query: 'What is the internal vs semester exam weightage and passing minimum?' },
  { cat: 'regulations', label: '🎯 Grading Scale & CGPA Formula', query: 'Explain the 10-point letter grading scale and CGPA formula' },
  { cat: 'assignments', label: '⏳ Pending Coursework', query: 'What assignments are currently pending?' },
  { cat: 'all', label: '🖼️ Profile Photo', query: 'Show my profile photo' },
  { cat: 'all', label: '👤 Complete Student Profile', query: 'Show my complete student profile and CGPA' },
  { cat: 'all', label: '🔗 Coding & Social Handles', query: 'Show my GitHub, LinkedIn, and LeetCode links' }
];

const INITIAL_MESSAGE = {
  id: 'init-msg',
  sender: 'ai',
  text: `👋 **Welcome to Student AI!**\n\nI am your **AI Academic Co-Pilot**, connected in real-time to your Student Portal. Ask me anything about your portal!`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  sources: []
};

export default function StudentAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [windowMode, setWindowMode] = useState('normal'); // 'normal' | 'expanded'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showWelcomeTooltip, setShowWelcomeTooltip] = useState(true);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setShowWelcomeTooltip(false);
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [messages, isOpen, windowMode]);

  // Dismiss tooltip after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowWelcomeTooltip(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setMessages([
      {
        ...INITIAL_MESSAGE,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInput('');
    setLoading(false);
  };

  const handleCopyMessage = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (queryText) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await api.studentAiChat(textToSend.trim());
      const aiReply = res?.reply || 'Sorry, I could not process your query at this moment.';
      const sources = res?.sources || [];

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: aiReply,
          sources,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: `⚠️ **Connection Error:** ${err.message || 'Unable to connect to the AI engine. Please verify your server connection.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Filter chips based on active category
  const filteredChips = selectedCategory === 'all'
    ? ALL_QUICK_CHIPS
    : ALL_QUICK_CHIPS.filter(c => c.cat === selectedCategory || c.cat === 'all');

  // Rich message formatting with modern markdown, code blocks, images, links & bold text
  const formatMessageText = (content) => {
    if (!content) return null;
    const lines = content.split('\n');

    return lines.map((line, lIdx) => {
      // Check if line is a bullet point
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || /^\d+\./.test(line.trim());

      // Parse markdown images, links, raw URLs, and bold tokens
      const parts = line.split(/(!\[.*?\]\([^\s\)]+\)|\[.*?\]\([^\s\)]+\)|https?:\/\/[^\s\)]+|\*\*.*?\*\*)/g);

      const formattedLine = parts.map((part, pIdx) => {
        // Markdown image ![alt](url)
        const mdImgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (mdImgMatch) {
          const [, alt, url] = mdImgMatch;
          return (
            <div key={pIdx} className="modern-chat-image-card">
              <img src={url} alt={alt || 'Profile Photo'} className="modern-chat-img" />
              <a href={url} target="_blank" rel="noopener noreferrer" className="modern-img-view-btn">
                <FaExternalLinkAlt /> Open Original
              </a>
            </div>
          );
        }

        // Markdown link [Label](url)
        const mdLinkMatch = part.match(/^\[(.*?)\]\((https?:\/\/[^\s\)]+)\)$/);
        if (mdLinkMatch) {
          const [, label, url] = mdLinkMatch;
          return (
            <a
              key={pIdx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="modern-chat-link"
            >
              <span>{label}</span>
              <FaExternalLinkAlt className="link-ext-icon" />
            </a>
          );
        }

        // Raw URLs
        if (/^https?:\/\/[^\s\)]+$/.test(part)) {
          return (
            <a
              key={pIdx}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="modern-chat-link"
            >
              <span>{part}</span>
              <FaExternalLinkAlt className="link-ext-icon" />
            </a>
          );
        }

        // Bold text **bold**
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="modern-highlight-text">{part.slice(2, -2)}</strong>;
        }

        return part;
      });

      return (
        <div key={lIdx} className={`modern-chat-line ${isBullet ? 'bullet-line' : ''}`}>
          {formattedLine}
        </div>
      );
    });
  };

  return (
    <div className={`student-ai-modern-root ${windowMode}`}>
      {/* FLOATING TRIGGER LAUNCHER */}
      {!isOpen && (
        <div className="modern-launcher-wrapper">
          {showWelcomeTooltip && (
            <div className="modern-launcher-tooltip" onClick={() => setIsOpen(true)}>
              <span className="tooltip-sparkle">✨</span>
              <span>Ask <strong>Student AI</strong> about your attendance & grades</span>
              <button
                className="tooltip-close"
                onClick={(e) => { e.stopPropagation(); setShowWelcomeTooltip(false); }}
              >
                <FaTimes />
              </button>
            </div>
          )}

          <button
            className="modern-ai-trigger"
            onClick={() => setIsOpen(true)}
            title="Launch Student AI"
          >
            <div className="trigger-aura-glow"></div>
            <div className="trigger-icon-orb">
              <FaRobot className="trigger-robot-icon" />
            </div>
            <div className="trigger-content">
              <span className="trigger-title">Student AI</span>
              <span className="trigger-sub">Smart Assistant</span>
            </div>
            <span className="trigger-live-indicator"></span>
          </button>
        </div>
      )}

      {/* CHAT WINDOW INTERFACE */}
      {isOpen && (
        <div className={`modern-ai-window ${windowMode === 'expanded' ? 'is-expanded' : ''}`}>
          {/* TOP AURORA HEADER */}
          <header className="modern-chat-header">
            <div className="header-left">
              <div className="ai-avatar-orb">
                <FaRobot />
                <span className="orb-status-ring"></span>
              </div>
              <div className="header-meta">
                <div className="title-row">
                  <h3>Student AI</h3>
                  <span className="ai-version-tag">Pro</span>
                </div>
                <div className="status-row">
                  <span className="live-pulse-dot"></span>
                  <span className="status-text">Connected to Student Portal</span>
                </div>
              </div>
            </div>

            <div className="header-actions">
              {/* Window Expand Toggle */}
              <button
                className="ai-header-btn ai-expand-btn"
                onClick={() => setWindowMode(windowMode === 'normal' ? 'expanded' : 'normal')}
                title={windowMode === 'normal' ? 'Expand Studio View' : 'Collapse View'}
              >
                {windowMode === 'normal' ? <FaExpandAlt /> : <FaCompressAlt />}
              </button>

              {/* Close Button */}
              <button
                className="ai-header-btn ai-close-btn"
                onClick={() => setIsOpen(false)}
                title="Close Window"
              >
                <FaTimes />
              </button>
            </div>
          </header>

          {/* TOPIC CATEGORIES TABS */}
          <div className="modern-categories-bar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`cat-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span className="cat-icon">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* QUICK PROMPT CHIPS CAROUSEL */}
          <div className="modern-chips-carousel">
            {filteredChips.map((chip, idx) => (
              <button
                key={idx}
                className="modern-chip-card"
                onClick={() => handleSend(chip.query)}
                disabled={loading}
              >
                <span className="chip-label">{chip.label}</span>
              </button>
            ))}
          </div>

          {/* MESSAGES THREAD */}
          <div className="modern-messages-viewport">
            {messages.map((msg) => (
              <div
                key={msg.id || msg.timestamp}
                className={`modern-msg-row ${msg.sender === 'user' ? 'is-user' : 'is-ai'}`}
              >
                <div className="msg-avatar-badge">
                  {msg.sender === 'user' ? <FaUser /> : <FaRobot />}
                </div>

                <div className="modern-msg-bubble">
                  <div className="msg-text-content">
                    {formatMessageText(msg.text)}
                  </div>

                  {/* Grounded Sources Pill Container */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="modern-sources-box">
                      <div className="sources-header">
                        <FaBookOpen />
                        <span>Referenced Institutional Documents:</span>
                      </div>
                      <div className="sources-chips-grid">
                        {msg.sources.map((s, sIdx) => (
                          <div key={sIdx} className="source-pill">
                            <span className="source-dot"></span>
                            <span className="source-name">{s.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bubble Footer with Copy Button & Timestamp */}
                  <div className="modern-msg-footer">
                    <span className="msg-time">{msg.timestamp}</span>

                    {msg.sender === 'ai' && (
                      <button
                        className="copy-msg-btn"
                        onClick={() => handleCopyMessage(msg.text, msg.id)}
                        title="Copy message to clipboard"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <FaCheck className="copy-icon copied" />
                            <span className="copied-text">Copied</span>
                          </>
                        ) : (
                          <>
                            <FaCopy className="copy-icon" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Glowing Thinking Wave Indicator */}
            {loading && (
              <div className="modern-msg-row is-ai is-loading-row">
                <div className="msg-avatar-badge ai-pulsing">
                  <FaMagic />
                </div>
                <div className="modern-msg-bubble loading-bubble">
                  <div className="modern-typing-wave">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="thinking-text">Analyzing your Student Portal records...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* FLOATING MODERN INPUT CONTAINER */}
          <footer className="modern-input-wrapper">
            <div className="modern-input-card">
              <button
                className="modern-refresh-input-btn"
                onClick={handleRefresh}
                title="Clear & Reset Conversation"
                disabled={loading}
              >
                <FaSyncAlt />
              </button>

              <textarea
                ref={textareaRef}
                className="modern-textarea"
                placeholder="Ask StudentAI anything about your portal"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={loading}
              />

              <div className="input-right-actions">
                <button
                  className={`modern-send-btn ${input.trim() && !loading ? 'can-send' : ''}`}
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  title="Send message (Enter)"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>

            <div className="input-footer-hint">
              <span>Press <strong>Enter ↵</strong> to send, <strong>Shift + Enter</strong> for new line</span>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
