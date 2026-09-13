'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Bell, 
  Users, 
  PlusCircle, 
  CheckSquare, 
  Mail, 
  LogOut, 
  LayoutDashboard,
  X,
  ExternalLink
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showBellDrawer, setShowBellDrawer] = useState(false);
  const [showEmailOutbox, setShowEmailOutbox] = useState(false);
  const [outboxEmails, setOutboxEmails] = useState<any[]>([]);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOutbox = async () => {
    try {
      const res = await fetch('/api/emails');
      if (res.ok) {
        const data = await res.json();
        setOutboxEmails(data.emails || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id: string, relatedItem?: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchNotifications();
    setShowBellDrawer(false);
    if (relatedItem) {
      window.location.href = `/admin/requests?item_id=${relatedItem}`;
    }
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    fetchNotifications();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-white text-[#050505] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4E6EA] px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="bg-[#0866FF] text-white text-xs font-black px-2.5 py-1 rounded-md">ADMIN</span>
            <span className="font-bold text-lg text-[#050505] tracking-tight">SocialSuite Manager</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#65676B] hover:text-[#050505] hover:bg-[#F0F2F5] transition-colors flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" /> Overview
            </Link>
            <Link
              href="/admin/clients"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#65676B] hover:text-[#050505] hover:bg-[#F0F2F5] transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4" /> Clients
            </Link>
            <Link
              href="/admin/batches/new"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#65676B] hover:text-[#050505] hover:bg-[#F0F2F5] transition-colors flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> Upload Batch
            </Link>
            <Link
              href="/admin/requests"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#65676B] hover:text-[#050505] hover:bg-[#F0F2F5] transition-colors flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4" /> Edit Requests
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Email Outbox Inspector Button */}
          <button
            onClick={() => {
              fetchOutbox();
              setShowEmailOutbox(true);
            }}
            className="p-2 text-[#65676B] hover:text-[#0866FF] hover:bg-[#F0F2F5] rounded-full transition-colors relative cursor-pointer"
            title="View Dispatched Email Outbox"
          >
            <Mail className="w-5 h-5" />
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowBellDrawer(!showBellDrawer)}
              className="p-2 text-[#65676B] hover:text-[#0866FF] hover:bg-[#F0F2F5] rounded-full transition-colors relative cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Bell Dropdown */}
            {showBellDrawer && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E4E6EA] rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3.5 border-b border-[#E4E6EA] flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#0866FF]" />
                    <span className="font-bold text-sm text-[#050505]">Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-[#0866FF] hover:underline font-medium cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-[#E4E6EA]">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#65676B]">No notifications yet</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id, n.related_content_item_id)}
                        className={`p-3.5 hover:bg-[#F0F2F5] cursor-pointer transition-colors flex items-start gap-3 ${
                          !n.is_read ? 'bg-[#0866FF]/5' : ''
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-[#0866FF] mt-1.5 shrink-0 opacity-80" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-[#050505]">{n.message}</p>
                          <p className="text-[11px] text-[#65676B] mt-1">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-[#65676B] hover:text-red-600 hover:bg-[#F0F2F5] rounded-full transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>

      {/* Email Outbox Inspector Modal */}
      {showEmailOutbox && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E6EA] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#E4E6EA] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#0866FF]" />
                <h3 className="font-bold text-base text-[#050505]">Transactional Email Outbox</h3>
              </div>
              <button
                onClick={() => setShowEmailOutbox(false)}
                className="p-1 rounded-lg text-[#65676B] hover:bg-[#F0F2F5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <p className="text-xs text-[#65676B]">
                Live log of emails dispatched via transactional hooks (Resend API ready).
              </p>
              {outboxEmails.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#65676B] border border-dashed border-[#E4E6EA] rounded-lg">
                  No dispatched emails recorded yet.
                </div>
              ) : (
                outboxEmails.map((email) => (
                  <div key={email.id} className="border border-[#E4E6EA] rounded-lg p-4 bg-[#F0F2F5]/50 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#65676B]">
                      <span>
                        To: <strong className="text-[#050505]">{email.to_email}</strong>
                      </span>
                      <span>{new Date(email.created_at).toLocaleString()}</span>
                    </div>
                    <h4 className="font-bold text-sm text-[#0866FF]">{email.subject}</h4>
                    <div className="bg-white p-3 rounded border border-[#E4E6EA] text-xs text-[#050505] whitespace-pre-wrap">
                      {email.body}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
