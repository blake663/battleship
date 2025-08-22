'use client';

import { useCallback, useEffect, useState } from 'react';

const getWebSocketStatus = (ws: WebSocket | null): string => {
  if (!ws) return 'Not initialized';
  switch (ws.readyState) {
    case WebSocket.CONNECTING: return 'Connecting...';
    case WebSocket.OPEN: return 'Connected';
    case WebSocket.CLOSING: return 'Closing...';
    case WebSocket.CLOSED: return 'Closed';
    default: return 'Unknown';
  }
};

export default function WebSocketTest() {
  const [messages, setMessages] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [input, setInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Not connected');
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWebSocket = () => {
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      setWs(null);
    }

    setIsConnecting(true);
    setConnectionStatus('Connecting...');
    
    try {
      const wsUrl = 'ws://localhost:3000/api/ws';
      console.log('Attempting to connect to:', wsUrl);
      
      const socket = new WebSocket(wsUrl);
      
      // Connection opened
      socket.onopen = (event) => {
        console.log('WebSocket connection opened:', event);
        setConnectionStatus('Connected');
        setMessages(prev => [...prev, 'Connected to WebSocket']);
        setIsConnecting(false);
      };

      // Listen for messages
      socket.onmessage = (event) => {
        console.log('Message from server:', event.data);
        setMessages(prev => [...prev, `Server: ${event.data}`]);
      };

      // Connection closed
      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event);
        const status = event.wasClean 
          ? `Closed cleanly (code=${event.code}${event.reason ? `, reason=${event.reason}` : ''})`
          : 'Connection died';
        setConnectionStatus(`Disconnected: ${status}`);
        setMessages(prev => [...prev, `Disconnected from WebSocket`]);
        setIsConnecting(false);
      };

      // Error handling
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('Connection error');
        setMessages(prev => [...prev, `Error: Failed to connect to WebSocket`]);
        setIsConnecting(false);
      };

      setWs(socket);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus(`Error: ${error instanceof Error ? error.message : 'Failed to connect'}`);
      setIsConnecting(false);
    }
  };

  // Use useCallback to memoize the connectWebSocket function
  const connectWebSocketCallback = useCallback(connectWebSocket, [ws]);

  useEffect(() => {
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      connectWebSocketCallback();
      // connectWebSocket();
    }
    
    // Clean up on unmount
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, [ws, connectWebSocketCallback]);



  const handleSendMessage = () => {
    if (ws && ws.readyState === WebSocket.OPEN && input.trim()) {
      ws.send(input);
      setMessages(prev => [...prev, `You: ${input}`]);
      setInput('');
    } else if (!ws || ws.readyState !== WebSocket.OPEN) {
      setMessages(prev => [...prev, 'Error: Not connected to WebSocket']);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>WebSocket Test</h1>
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '6px',
        border: '1px solid #dee2e6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <strong>Status:</strong> {connectionStatus}
          {ws && (
            <span style={{ marginLeft: '20px' }}>
              <strong>State:</strong> {getWebSocketStatus(ws)} ({ws.readyState})
            </span>
          )}
        </div>
        <button 
          onClick={connectWebSocket} 
          disabled={isConnecting}
          style={{
            padding: '5px 10px',
            backgroundColor: isConnecting ? '#6c757d' : '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isConnecting ? 'not-allowed' : 'pointer'
          }}
        >
          {isConnecting ? 'Connecting...' : 'Reconnect'}
        </button>
      </div>
      <div style={{ 
        height: '400px', 
        border: '1px solid #dee2e6', 
        marginBottom: '20px',
        padding: '15px',
        overflowY: 'auto',
        backgroundColor: '#fff',
        borderRadius: '6px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        {messages.length === 0 ? (
          <div style={{ color: '#6c757d', textAlign: 'center', marginTop: '50px' }}>
            No messages yet. Send a message to test the WebSocket connection.
          </div>
        ) : (
          messages.map((msg, i) => (
            <div 
              key={i} 
              style={{ 
                margin: '8px 0',
                padding: '8px 12px',
                backgroundColor: msg.startsWith('You:') ? '#e7f5ff' : '#f8f9fa',
                borderRadius: '4px',
                borderLeft: `4px solid ${msg.startsWith('You:') ? '#0d6efd' : '#6c757d'}`
              }}
            >
              {msg}
            </div>
          ))
        )}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          style={{ 
            flex: 1,
            padding: '10px 15px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '16px'
          }}
          placeholder="Type a message..."
          disabled={!ws || ws.readyState !== WebSocket.OPEN}
        />
        <button 
          onClick={handleSendMessage}
          disabled={!ws || ws.readyState !== WebSocket.OPEN || !input.trim()}
          style={{
            padding: '0 20px',
            backgroundColor: (!ws || ws.readyState !== WebSocket.OPEN || !input.trim()) ? '#6c757d' : '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (!ws || ws.readyState !== WebSocket.OPEN || !input.trim()) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          Send
        </button>
      </div>
      <div style={{ marginTop: '20px', color: '#6c757d', fontSize: '14px' }}>
        <p>WebSocket Connection Tips:</p>
        <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
          <li>Make sure the Next.js development server is running</li>
          <li>Check the browser&apos;s console for any error messages</li>
          <li>Try reconnecting if the connection fails</li>
          <li>Ensure no browser extensions are blocking WebSocket connections</li>
        </ul>
      </div>
    </div>
  );
}
