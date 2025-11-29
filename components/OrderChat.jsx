'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';

const OrderChat = ({ orderId, escrowStatus }) => {
    const { user } = useUser();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);

    // Scroll to the bottom of the chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    // Listen for real-time messages from Firestore
    useEffect(() => {
        if (!orderId) return;

        const q = query(collection(db, 'chats', orderId, 'messages'), orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
            const msgs = [];
            querySnapshot.forEach((doc) => {
                msgs.push({ id: doc.id, ...doc.data() });
            });
            setMessages(msgs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chat messages: ", error);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [orderId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !user) return;
        setIsSending(true);

        await addDoc(collection(db, 'chats', orderId, 'messages'), {
            text: newMessage,
            senderId: user.id,
            senderName: user.fullName,
            timestamp: serverTimestamp(),
        });

        setNewMessage('');
        setIsSending(false);
    };

    if (!user) return null;

    return (
        <div className="flex flex-col h-96 border rounded-lg">
            <div className="flex-grow p-4 overflow-y-auto bg-gray-100">
                {loading ? (
                    <div className="text-center text-gray-500">Loading chat...</div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 5.523-4.477 10-10 10S1 17.523 1 12 5.477 2 11 2s10 4.477 10 10z" /></svg>
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => {
                            if (msg.isSystemMessage) {
                                return (
                                    <div key={msg.id} className="relative my-4">
                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                            <div className="w-full border-t border-gray-300" />
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="bg-gray-100 px-2 text-xs text-gray-500">{msg.text}</span>
                                        </div>
                                    </div>
                                );
                            }
                            const isSender = msg.senderId === user.id;
                            return (
                                <div key={msg.id} className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}>
                                    <p className={`text-xs text-gray-500 mb-1 ${isSender ? 'mr-2' : 'ml-2'}`}>
                                        {isSender ? 'You' : msg.senderName}
                                    </p>
                                    <div className={`rounded-lg px-3 py-2 max-w-xs lg:max-w-md ${isSender 
                                            ? 'bg-blue-600 text-white rounded-br-none' 
                                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                                        }`}>
                                            <p className="text-sm">{msg.text}</p>
                                            {msg.timestamp && (
                                                <p className={`text-xs mt-1 ${isSender ? 'text-blue-200' : 'text-gray-400'} text-right`}>
                                                    {new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            {escrowStatus === 'RELEASED' ? (
                <div className="p-4 border-t text-center text-gray-500 bg-gray-50">
                    This chat has been closed as the transaction is complete.
                </div>
            ) : (
                <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center bg-white">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-grow px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSending}
                    />
                    <button 
                        type="submit" 
                        className="bg-blue-600 text-white p-2 rounded-r-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
                        disabled={isSending || newMessage.trim() === ''}
                    >
                        {isSending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        )}
                    </button>
                </form>
            )}
        </div>
    );
};

export default OrderChat;
