import React from "react";
import { motion } from "motion/react";
import { X, Check, CheckCheck, Clock, ExternalLink, Bell, Inbox } from "lucide-react";
import { InAppNotification } from "../types";
import { cn } from "../lib/utils";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigateToProperty?: (listingId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateToProperty,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getRelativeTime = (isoString: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays}d ago`;
    } catch (e) {
      return "";
    }
  };

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case "bid_accepted":
      case "listing_approved":
      case "inspection_confirmed":
      case "kyc_verified":
        return "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800";
      case "dispute_opened":
      case "account_suspended":
      case "listing_rejected":
        return "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800";
      default:
        return "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  const getCleanLabel = (type: string) => {
    return type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1200] transition-opacity"
        onClick={onClose}
        id="notification-drawer-backdrop"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-brand-gray dark:bg-zinc-950 border-l-4 border-brand-black dark:border-zinc-800 z-[1201] flex flex-col shadow-2xl"
        id="notification-drawer-panel"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b-4 border-brand-black dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-teal dark:bg-teal-950/50 border-2 border-brand-black dark:border-zinc-700 relative -rotate-2">
              <Bell className="w-5 h-5 text-brand-black dark:text-white" />
            </div>
            <div>
              <h3 className="font-display font-black text-sm uppercase tracking-wider text-brand-black dark:text-white">
                Notifications
              </h3>
              <p className="text-[10px] font-mono text-zinc-500 uppercase">
                {unreadCount} UNREAD STATUS {unreadCount === 1 ? "ALERT" : "ALERTS"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-brand-black dark:border-zinc-700 bg-brand-gray dark:bg-zinc-800 rounded-full hover:bg-brand-red hover:text-white transition-all shadow-brutal-sm cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="px-4 py-2 bg-brand-teal/25 border-b-2 border-brand-black dark:border-zinc-850 flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 font-mono uppercase">
              Keep updated on crucial status changes
            </span>
            <button
              onClick={onMarkAllAsRead}
              className="text-[9px] font-mono font-black uppercase tracking-wider bg-white dark:bg-zinc-800 hover:bg-brand-teal px-2 py-1 border-2 border-brand-black dark:border-zinc-700 shadow-brutal-xs hover:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCheck className="w-3 h-3 text-green-600 dark:text-green-400" />
              Mark All Read
            </button>
          </div>
        )}

        {/* Notification Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-400 dark:border-zinc-700 rounded-full text-zinc-400 dark:text-zinc-600">
                <Inbox size={32} />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-350 uppercase">
                  Inbox Clear
                </p>
                <p className="text-[10px] font-mono text-zinc-500 uppercase mt-1">
                  You do not have any notification alerts yet.
                </p>
              </div>
            </div>
          ) : (
            notifications.map((n) => {
              const targetPropertyId = n.data?.listingId || n.data?.propertyId;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "relative border-2 border-brand-black dark:border-zinc-850 p-3 shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-brutal-xs transition-all flex flex-col gap-2 rounded-sm",
                    n.read
                      ? "bg-white dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-400"
                      : "bg-amber-50/70 border-l-brand-teal dark:bg-teal-950/10"
                  )}
                  id={`notification-item-${n.id}`}
                >
                  {/* Read Indicator Dot */}
                  {!n.read && (
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-brand-teal rounded-full border border-brand-black" />
                  )}

                  {/* Header Row */}
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[8px] font-mono font-black uppercase tracking-widest px-1.5 py-0.5 border rounded-sm",
                        getEventBadgeClass(n.type)
                      )}
                    >
                      {getCleanLabel(n.type)}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 flex items-center gap-1 ml-auto">
                      <Clock size={10} />
                      {getRelativeTime(n.createdAt)}
                    </span>
                  </div>

                  {/* Text Details */}
                  <div className="space-y-1 pr-6">
                    <h4 className="text-xs font-black uppercase tracking-tight text-brand-black dark:text-zinc-100">
                      {n.title}
                    </h4>
                    <p className="text-[11px] leading-relaxed font-bold text-zinc-600 dark:text-zinc-350">
                      {n.body}
                    </p>
                  </div>

                  {/* Action Row */}
                  <div className="flex items-center justify-between pt-1 border-t border-dashed border-zinc-200 dark:border-zinc-800 mt-1">
                    {/* View Action if related to property */}
                    {targetPropertyId && onNavigateToProperty ? (
                      <button
                        onClick={() => {
                          onNavigateToProperty(targetPropertyId);
                          onClose();
                        }}
                        className="text-[9px] font-mono font-black uppercase tracking-wider text-brand-teal dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink size={11} />
                        View Mandate
                      </button>
                    ) : (
                      <span />
                    )}

                    {!n.read && (
                      <button
                        onClick={() => onMarkAsRead(n.id)}
                        className="text-[9px] font-mono font-black uppercase tracking-wider bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 py-0.5 px-1.5 border-2 border-brand-black dark:border-zinc-700 shadow-brutal-xs hover:shadow-none transition-all flex items-center gap-1 cursor-pointer ml-auto"
                      >
                        <Check size={11} className="text-green-600 dark:text-green-400" />
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </>
  );
};
