'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';

const OrderChat = ({ orderId }) => {
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
            senderName: user.fullName || user.emailAddresses[0].emailAddress,
            timestamp: serverTimestamp(),
        });

        setNewMessage('');
        setIsSending(false);
    };

    if (!user) return null;

    return (
        <div className="flex flex-col h-96 border rounded-lg">
            <div className="flex-grow p-4 overflow-y-auto bg-gray-50">
                {loading ? (
                    <div className="text-center text-gray-500">Loading chat...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500">No messages yet. Start the conversation!</div>
                ) : (
                    messages.map((msg) => {
                        if (msg.isSystemMessage) {
                            return (
                                <div key={msg.id} className="text-center my-2">
                                    <p className="text-xs text-gray-500 italic bg-gray-200 rounded-full px-3 py-1 inline-block">{msg.text}</p>
                                </div>
                            );
                        }
                        return (
                            <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'} mb-2`}>
                                <div className={`rounded-lg px-3 py-2 max-w-xs lg:max-w-md ${
                                    msg.senderId === user.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                                }`}>
                                    <p className="text-sm">{msg.text}</p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t flex">
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
                    className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 disabled:bg-blue-300"
                    disabled={isSending}
                >
                    {isSending ? '...' : 'Send'}
                </button>
            </form>
        </div>
    );
};

export default OrderChat;
