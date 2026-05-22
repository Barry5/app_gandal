'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Image,
  File,
  Smile,
  Check,
  CheckCheck,
  Clock,
  Star,
  Pin,
  Archive,
  Trash2,
  Edit,
  ArrowLeft,
  UserPlus,
  Settings,
} from 'lucide-react';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge, Avatar } from '@/components/ui/DataDisplay';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  status: 'sent' | 'delivered' | 'read';
}

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  isOnline: boolean;
  messages: Message[];
  course?: string;
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    name: 'Aminata Koné',
    lastMessage: 'Merci pour le cours, j\'ai une question sur le marketing...',
    timestamp: '10:30',
    unread: 2,
    isOnline: true,
    course: 'Marketing Digital pour PME',
    messages: [
      { id: '1', content: 'Bonjour ! J\'ai une question sur le dernier module.', timestamp: '10:15', isOwn: false, status: 'read' },
      { id: '2', content: 'Bonjour Aminata ! Bien sûr, je suis là. Quelle est votre question ?', timestamp: '10:20', isOwn: true, status: 'read' },
      { id: '3', content: 'Merci pour le cours, j\'ai une question sur le marketing...', timestamp: '10:30', isOwn: false, status: 'delivered' },
    ],
  },
  {
    id: '2',
    name: 'Ibrahim Sow',
    lastMessage: 'Je vais terminer le quiz ce soir',
    timestamp: 'Hier',
    unread: 0,
    isOnline: false,
    course: 'Initiation à la Programmation Python',
    messages: [
      { id: '1', content: 'Bonjour Ibrahim, comment se passe votre apprentissage ?', timestamp: 'Hier', isOwn: true, status: 'read' },
      { id: '2', content: 'Je vais terminer le quiz ce soir', timestamp: 'Hier', isOwn: false, status: 'read' },
    ],
  },
  {
    id: '3',
    name: 'Mariam Diallo',
    lastMessage: 'Le certificat est magnifique, merci beaucoup !',
    timestamp: 'Hier',
    unread: 0,
    isOnline: true,
    course: 'Marketing Digital pour PME',
    messages: [
      { id: '1', content: 'Félicitations pour votre certificat !', timestamp: 'Hier', isOwn: true, status: 'read' },
      { id: '2', content: 'Le certificat est magnifique, merci beaucoup !', timestamp: 'Hier', isOwn: false, status: 'read' },
    ],
  },
  {
    id: '4',
    name: 'Sékou Touré',
    lastMessage: 'Pouvez-vous m\'expliquer encore une fois ?',
    timestamp: '2j',
    unread: 1,
    isOnline: false,
    course: 'Gestion Financière pour Artisans',
    messages: [
      { id: '1', content: 'Pouvez-vous m\'expliquer encore une fois ?', timestamp: '2j', isOwn: false, status: 'delivered' },
    ],
  },
];

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(mockConversations[0]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const updatedConversation = {
      ...selectedConversation,
      messages: [
        ...selectedConversation.messages,
        {
          id: Date.now().toString(),
          content: newMessage,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          isOwn: true,
          status: 'sent' as const,
        },
      ],
      lastMessage: newMessage,
      timestamp: 'À l\'instant',
    };

    setConversations(conversations.map(c => c.id === selectedConversation.id ? updatedConversation : c));
    setSelectedConversation(updatedConversation);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex h-full bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Conversations List */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h2>
                <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <UserPlus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une conversation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conversation, index) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    setConversations(conversations.map(c => 
                      c.id === conversation.id ? { ...c, unread: 0 } : c
                    ));
                  }}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b border-gray-100 dark:border-gray-700 ${
                    selectedConversation?.id === conversation.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar name={conversation.name} size="md" />
                      {conversation.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{conversation.name}</h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{conversation.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conversation.lastMessage}</p>
                    </div>
                    {conversation.unread > 0 && (
                      <Badge variant="error" size="sm">{conversation.unread}</Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <AnimatePresence>
            {selectedConversation && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 flex flex-col"
              >
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div className="relative">
                      <Avatar name={selectedConversation.name} size="md" />
                      {selectedConversation.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{selectedConversation.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedConversation.isOnline ? 'En ligne' : 'Hors ligne'}
                        {selectedConversation.course && ` • ${selectedConversation.course}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                      <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                      <Video className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                      <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedConversation.messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${message.isOwn ? 'order-2' : ''}`}>
                        <div className={`px-4 py-3 rounded-2xl ${
                          message.isOwn
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${message.isOwn ? 'justify-end' : ''}`}>
                          <span className="text-xs text-gray-400">{message.timestamp}</span>
                          {message.isOwn && (
                            message.status === 'read' ? (
                              <CheckCheck className="w-4 h-4 text-blue-500" />
                            ) : message.status === 'delivered' ? (
                              <CheckCheck className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Check className="w-4 h-4 text-gray-400" />
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-end gap-3">
                    <div className="flex gap-2">
                      <button className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        <Image className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                    <div className="flex-1 relative">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Écrivez votre message..."
                        className="w-full px-4 py-3 pr-12 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[48px] max-h-32"
                        rows={1}
                      />
                      <button className="absolute right-3 bottom-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="p-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {!selectedConversation && (
            <div className="hidden md:flex flex-col items-center justify-center flex-1 p-8">
              <div className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
                <Send className="w-12 h-12 text-indigo-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Vos messages</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                Sélectionnez une conversation pour commencer à envoyer des messages à vos élèves
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}