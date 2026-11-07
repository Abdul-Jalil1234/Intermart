"use client";

import { formatCurrency } from "@/lib/currency";
import React, { useEffect, useState } from "react";
import { Bell, Search, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Order } from "@/sanity.types";

interface AdminUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddresses?: Array<{ emailAddress: string }>;
  imageUrl?: string;
}

interface AdminHeaderProps {
  user: AdminUser;
}

interface OrderType {
  orderDate?: string;
  _createdAt?: string;
  totalPrice?: number;
}

interface NotificationType {
  _id: string;
  id?: string;
  title: string;
  message: string;
  description?: string;
  type: string;
  priority: string;
  sentAt: string;
  time?: string;
}

interface LocalNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: string;
}

const AdminHeader = ({ user }: AdminHeaderProps) => {
  const [stats, setStats] = useState({
    newOrdersToday: 0,
    todaysRevenue: 0,
    activeUsers: 0,
  });
  const [notifications, setNotifications] = useState<
    (NotificationType | LocalNotification)[]
  >([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        // Fetch orders for today's stats
        const ordersRes = await fetch(
          "/api/admin/orders?limit=1000&sortBy=orderDate&sortOrder=desc"
        );
        const ordersData = await ordersRes.json();

        // Calculate today's orders and revenue
        const today = new Date();
        const todayOrders = (ordersData.orders || []).filter((order: Order) => {
          const orderDate = new Date(order.orderDate || order._createdAt);
          return (
            orderDate.getDate() === today.getDate() &&
            orderDate.getMonth() === today.getMonth() &&
            orderDate.getFullYear() === today.getFullYear()
          );
        });

        const newOrdersToday = todayOrders.length;
        const todaysRevenue = todayOrders.reduce(
          (sum: number, order: OrderType) => sum + (order.totalPrice || 0),
          0
        );

        // Fetch users count
        const usersRes = await fetch("/api/admin/users?limit=1");
        const usersData = await usersRes.json();
        const activeUsers = usersData.totalCount || 0;

        // Fetch notifications from API
        const notificationsRes = await fetch("/api/admin/notifications");
        const notificationsData = await notificationsRes.json();

        setStats({
          newOrdersToday,
          todaysRevenue,
          activeUsers,
        });
        setNotifications(notificationsData.notifications || []);
      } catch (error) {
        console.error("Error fetching admin data:", error);
        // Set fallback data
        setStats({
          newOrdersToday: 0,
          todaysRevenue: 0,
          activeUsers: 0,
        });
        setNotifications([
          {
            id: "1",
            title: "Welcome to Admin Dashboard",
            description: "Check your daily stats above",
            time: "now",
            type: "info",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="bg-gradient-to-r from-white via-shop_light_bg to-shop_light_pink rounded-2xl shadow-lg border border-shop_light_green/10 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left Side - Welcome & Date */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-dark-color">
            Welcome back, {user?.firstName || "Admin"}! 👋
          </h1>
          <div className="flex items-center gap-4 text-sm text-light-color">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{currentDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{currentTime}</span>
            </div>
          </div>
        </div>

        {/* Right Side - Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-light-color" />
            <Input
              placeholder="Quick search..."
              className="pl-10 w-64 border-shop_light_green/20 focus:border-shop_light_green"
            />
          </div>

          {/* Notifications */}
          <Sheet open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="relative border-shop_light_green/20 hover:border-shop_light_green hover:bg-shop_light_green/10"
              >
                <Bell className="w-4 h-4" />
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs"
                >
                  {notifications.length}
                </Badge>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0">
              <SheetHeader className="p-6 border-b">
                <SheetTitle className="text-xl font-bold text-dark-color">
                  Notifications
                </SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center text-light-color py-8">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex gap-3 p-4 bg-shop_light_bg rounded-lg border border-shop_light_green/10 hover:bg-shop_light_green/5 transition-colors"
                    >
                      <div className="flex-shrink-0 w-2 h-2 bg-shop_orange rounded-full mt-2"></div>
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-dark-color">
                          {notification.title}
                        </div>
                        {notification.description && (
                          <div className="text-sm text-light-color">
                            {notification.description}
                          </div>
                        )}
                        <div className="text-xs text-light-color">
                          {notification.time}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* User Avatar */}
          <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-shop_light_green/20">
            <div className="w-8 h-8 bg-gradient-to-br from-shop_light_green to-shop_dark_green rounded-lg flex items-center justify-center text-white font-semibold text-sm">
              {user?.firstName?.charAt(0) || "A"}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-dark-color">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-light-color">Administrator</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="mt-6 pt-4 border-t border-shop_light_green/20">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-shop_dark_green">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-8 mx-auto rounded"></div>
              ) : (
                stats.newOrdersToday
              )}
            </div>
            <div className="text-xs text-light-color">New Orders Today</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-shop_orange">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-16 mx-auto rounded"></div>
              ) : (
                formatCurrency(stats.todaysRevenue, { minimumFractionDigits: 0 })
              )}
            </div>
            <div className="text-xs text-light-color">Today&apos;s Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-shop_light_blue">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-12 mx-auto rounded"></div>
              ) : (
                stats.activeUsers.toLocaleString()
              )}
            </div>
            <div className="text-xs text-light-color">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-shop_light_green">98.5%</div>
            <div className="text-xs text-light-color">System Health</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;
