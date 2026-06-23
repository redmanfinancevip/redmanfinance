'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, 
  PhoneCall, 
  CheckSquare, 
  Send, 
  ShieldCheck, 
  User, 
  Building2, 
  CheckCircle2, 
  Paperclip,
  X 
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

interface Channel {
  id: string;
  title: string;
  subtitle: string;
  unread: boolean;
  tag: 'Urgent' | 'General' | 'Compliance';
  icon: React.ComponentType<any>;
  messages: Message[];
}

export default function UserMessagesView() {
  const [channels, setChannels] = useState<Channel[]>([
    {
      id: 'ch-support',
      title: 'Global Help Desk Desk',
      subtitle: 'Active link to general operations desk.',
      unread: true,
      tag: 'General',
      icon: MessageSquare,
      messages: [
        { id: 'm1', sender: 'agent', text: 'Welcome to Redman Finance Secure Hub. How can we support your asset positions today?', timestamp: '09:30 AM' }
      ]
    },
    {
      id: 'ch-compliance',
      title: 'Compliance & Verification Desk',
      subtitle: 'Identity auditing and KYC clearing pipelines.',
      unread: true,
      tag: 'Compliance',
      icon: ShieldCheck,
      messages: [
        { id: 'm2', sender: 'agent', text: 'Your identity data parsing channel is successfully synchronized. Please upload documentation updates if tier updates fail.', timestamp: 'Yesterday' }
      ]
    }
  ]);

  const [activeChannelId, setActiveChannelId] = useState<string>('ch-support');
  const [typedMessage, setTypedMessage] = useState('');
  
  // Callback Request States
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submittingCall, setSubmittingCall] = useState(false);

  const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];

  // Mark current channel or all channels as read
  const markAllAsRead = () => {
    setChannels(prev => prev.map(c => ({ ...c, unread: false })));
    toast.success('All communication logs marked as parsed.');
  };

  const selectChannel = (id: string) => {
    setActiveChannelId(id);
    setChannels(prev => prev.map(c => c.id === id ? { ...c, unread: false } : c));
  };

  // Dispatch live user response message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    const newMsg: Message = {
      id: `m-user-${Date.now()}`,
      sender: 'user',
      text: typedMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChannels(prev => prev.map(c => {
      if (c.id === activeChannelId) {
        return {
          ...c,
          messages: [...c.messages, newMsg]
        };
      }
      return c;
    }));

    setTypedMessage('');
    
    // Auto simulated response echo
    setTimeout(() => {
      const echoMsg: Message = {
        id: `m-agent-${Date.now()}`,
        sender: 'agent',
        text: 'Message received by secure node. An account officer will review and update your log shortly.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChannels(prev => prev.map(c => c.id === activeChannelId ? { ...c, messages: [...c.messages, echoMsg] } : c));
    }, 1500);
  };

  // Submit Call Hook
  const handleRequestCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setSubmittingCall(true);
    setTimeout(() => {
      setSubmittingCall(false);
      setCallbackModalOpen(false);
      setPhoneNumber('');
      toast.success('Callback request queued. An available desk officer will reach out shorty.');
    }, 1200);
  };

  return (
    <div className="space-y-4 p-4 lg:p-6 max-w-6xl mx-auto h-[calc(100vh-5rem)] flex flex-col">
      
      {/* Encryption System Clearance Banner Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-primary/5 border border-primary/10 rounded-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">End-to-End Cryptographic Tunnel Active</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Communications with internal platform representatives are private and encrypted.</p>
          </div>
        </div>
        
        {/* ACTION PANEL CONTROL HEADER BUTTONS */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button 
            onClick={() => setCallbackModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary text-white hover:opacity-90 transition-all shadow-sm"
          >
            <PhoneCall size={12} /> Request Agent Call
          </button>
          <button 
            onClick={markAllAsRead}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-muted text-muted-foreground border border-border hover:text-foreground transition-colors"
          >
            <CheckSquare size={12} /> Mark All Read
          </button>
        </div>
      </div>

      {/* CHAT INTERFACE SPLIT CANVAS AREA */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 border border-border bg-card rounded-xl overflow-hidden min-h-0 shadow-sm">
        
        {/* LEFT COLUMN: COMMUNICATION CHANNEL INDEXING GRID */}
        <div className="border-r border-border flex flex-col bg-muted/5">
          <div className="p-3 border-b border-border bg-muted/10">
            <span className="text-xs font-bold text-foreground">Secure Desks Ledger</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {channels.map((chan) => {
              const ChannelIcon = chan.icon;
              const isSelected = chan.id === activeChannelId;
              return (
                <button
                  key={chan.id}
                  onClick={() => selectChannel(chan.id)}
                  className={`w-full p-3.5 text-left flex gap-3 items-start transition-colors focus:outline-none relative ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <ChannelIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold truncate ${chan.unread ? 'text-foreground' : 'text-muted-foreground'}`}>{chan.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 font-semibold rounded ${
                        chan.tag === 'Urgent' ? 'bg-rose-500/10 text-rose-400' :
                        chan.tag === 'Compliance' ? 'bg-amber-500/10 text-amber-400' : 'bg-primary/10 text-primary'
                      }`}>{chan.tag}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{chan.subtitle}</p>
                  </div>
                  {chan.unread && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 self-center ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: DIRECT ACTIVE FEED VIEWPORT CHANNEL */}
        <div className="lg:col-span-2 flex flex-col h-full bg-background/20">
          {/* Active Title Header Context */}
          <div className="p-3 border-b border-border bg-card flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-bold text-foreground">{activeChannel.title} Connected</span>
          </div>

          {/* Interactive Message Bubble Canvas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {activeChannel.messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] rounded-xl px-3.5 py-2.5 text-xs border transition-all ${
                    isUser 
                      ? 'bg-primary/10 border-primary/20 text-foreground rounded-tr-none' 
                      : 'bg-card border-border text-foreground rounded-tl-none'
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground font-semibold">
                      {isUser ? <User size={10} /> : <Building2 size={10} />}
                      <span>{isUser ? 'Investor Log' : 'Official System Operator'}</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className="text-[9px] text-muted-foreground/60 text-right mt-1 font-mono">{msg.timestamp}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Transmission Form Element Block */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-card flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => toast.info('System document upload attachment layer open.')}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
              title="Attach Document Elements"
            >
              <Paperclip size={16} />
            </button>
            <input 
              type="text" 
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              placeholder="Transmit inquiry package data into secure channel..."
              className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
            <button 
              type="submit"
              disabled={!typedMessage.trim()}
              className="p-2 rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* BACKUP REQUEST CALL PHONE BOX CONTAINER DIALOG (MODAL FRAME) */}
      {callbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-4 space-y-4 animate-in zoom-in-95 duration-200">
            
            {/* Modal Exit Cross Trigger */}
            <button 
              onClick={() => setCallbackModalOpen(false)}
              className="absolute right-3 top-3 p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <PhoneCall size={14} className="text-primary" /> Confirm Callback Target
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Provide a secure telecommunication line. A desk representative will verify cryptographic keys over the session call.
              </p>
            </div>

            <form onSubmit={handleRequestCall} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Phone Number Line</label>
                <input 
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <button 
                type="submit"
                disabled={submittingCall || !phoneNumber.trim()}
                className="w-full btn-primary py-2.5 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 rounded-lg"
              >
                {submittingCall ? 'Queueing Secure Protocol...' : 'Submit Callback Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}