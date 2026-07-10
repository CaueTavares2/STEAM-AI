/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('steam_auth_token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/user', { 
        headers,
        credentials: 'include' 
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem('steam_auth_token');
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data.token) {
          console.log("[App] Exchanging auth token...");
          try {
            const exchangeRes = await fetch('/api/auth/exchange', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: event.data.token }),
              credentials: 'include'
            });
            if (exchangeRes.ok) {
              const data = await exchangeRes.json();
              if (data.token) {
                localStorage.setItem('steam_auth_token', data.token);
              }
              setUser(data.user);
            } else {
              console.log("[App] Token exchange failed.");
              setUser(null);
            }
          } catch (e) {
            console.error("[App] Token exchange error:", e);
            setUser(null);
          }
        } else {
          // Fallback if no token (e.g. old tab)
          checkAuth();
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogin = () => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    window.open(
      '/api/auth/steam',
      'steam_login',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1121] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <Dashboard user={user} /> : <Login onLogin={handleLogin} />;
}

