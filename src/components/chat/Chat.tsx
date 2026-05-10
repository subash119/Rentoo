import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import './Chat.css';

// Configure axios base URL
axios.defaults.baseURL = 'http://localhost:5000';

interface Message {
    _id: string;
    sender: {
        _id: string;
        name: string;
        email: string;
    };
    receiver: {
        _id: string;
        name: string;
        email: string;
    };
    message: string;
    timestamp: string;
}

interface ChatProps {
    otherUserId: string;
    otherUserName: string;
    onClose?: () => void;
}

const Chat: React.FC<ChatProps> = ({ otherUserId, otherUserName, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
        if (messagesContainerRef.current) {
            const { scrollHeight, clientHeight } = messagesContainerRef.current;
            messagesContainerRef.current.scrollTop = scrollHeight - clientHeight;
        }
    };

    // Auto scroll messages container when messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication required');
                return;
            }

            const { data } = await axios.get(`/api/v1/chat/messages/${otherUserId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (data && Array.isArray(data.messages)) {
                // Sort messages by timestamp
                const sortedMessages = [...data.messages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                setMessages(sortedMessages);
            } else {
                setMessages([]);
            }
            setError(null);
        } catch (error) {
            console.error('Error fetching messages:', error);
            setError('Failed to fetch messages');
        }
    }, [otherUserId]);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, [fetchMessages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedMessage = newMessage.trim();
        if (!trimmedMessage || isLoading) return;

        setNewMessage(''); // Clear immediately
        setIsLoading(true);
        
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Authentication required');
            setIsLoading(false);
            return;
        }

        try {
            await axios.post('/api/v1/chat/send', {
                receiverId: otherUserId,
                message: trimmedMessage
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Add the new message to the list immediately for better UX
            const newMsg: Message = {
                _id: Date.now().toString(), // Temporary ID
                sender: {
                    _id: user?.id || '',
                    name: user?.name || '',
                    email: user?.email || ''
                },
                receiver: {
                    _id: otherUserId,
                    name: otherUserName,
                    email: ''
                },
                message: trimmedMessage,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, newMsg]);
            scrollToBottom('smooth');
            
            // Fetch messages in background
            fetchMessages();
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e as any);
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        if (isToday) {
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            });
        }
        
        return date.toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
            month: 'short',
            day: 'numeric'
        });
    };

    const isMyMessage = (senderId: string) => {
        return user?.id === senderId;
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <div className="chat-header-content">
                    <h3>Chat with {otherUserName}</h3>
                    {onClose && (
                        <button onClick={onClose} className="close-button">
                            ×
                        </button>
                    )}
                </div>
            </div>
            
            <div className="messages-container" ref={messagesContainerRef}>
                {error && <div className="error-message">{error}</div>}
                {messages.length === 0 && !error && (
                    <div className="no-messages">
                        No messages yet. Start the conversation!
                    </div>
                )}
                {messages && messages.map((msg) => (
                    <div
                        key={msg._id}
                        className={`message ${isMyMessage(msg.sender._id) ? 'sent' : 'received'}`}
                    >
                        <div className="message-bubble">
                            <div className="message-content">
                                {msg.message}
                            </div>
                            <div className="message-timestamp">
                                {formatTime(msg.timestamp)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSend} className="message-input-container">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    className="message-input"
                    disabled={isLoading}
                    autoComplete="off"
                />
                <button 
                    type="submit"
                    className={`send-button ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading || !newMessage.trim()}
                >
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
            </form>
        </div>
    );
};

export default Chat;
