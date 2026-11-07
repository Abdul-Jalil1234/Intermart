"use client";

import { Check, Home, Package, ShoppingBag, Calendar, Eye } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MY_ORDERS_QUERYResult } from "@/sanity.types";
import { client } from "@/sanity/lib/client";
import { defineQuery } from "next-sanity";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PriceFormatter from "@/components/PriceFormatter";
import { format } from "date-fns";

const SuccessPage = () => {
  const [orders, setOrders] = useState<MY_ORDERS_QUERYResult>([]);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");

  const { user } = useUser();
  const userId = user?.id;

  const query =
    defineQuery(`*[_type == 'order' && clerkUserId == $userId] | order(orderDate desc){
  ...,products[]{
    ...,product->
  }
}`);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        console.log("User ID not found. Cannot fetch orders.");
        return;
      }

      try {
        const ordersData = await client.fetch(query, { userId });
        setOrders(ordersData as MY_ORDERS_QUERYResult);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchData();
  }, [userId, query]);

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
          >
            <Check className="text-white w-12 h-12" />
          </motion.div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Order Placed Successfully!
          </h1>

          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Thank you for your purchase! Your order has been confirmed and
            we&apos;re preparing it for shipment. You&apos;ll receive a
            confirmation email
          </p>

          {orderNumber && (
            <div className="bg-white rounded-lg p-6 shadow-md inline-block">
              <div className="flex items-center justify-center gap-3">
                <Package className="w-5 h-5 text-green-600" />
                <span className="text-gray-700 font-medium">Order Number:</span>
                <span className="text-xl font-bold text-green-600">
                  {orderNumber}
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Order Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-center">What happens next?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    Order Processing
                  </h3>
                  <p className="text-sm text-gray-600">
                    We&apos;re preparing your items for shipment
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-6 h-6 text-yellow-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Shipping</h3>
                  <p className="text-sm text-gray-600">
                    Your order will be shipped within 2-3 business days
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Delivery</h3>
                  <p className="text-sm text-gray-600">
                    Delivered to your doorstep with tracking updates
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Orders */}
        {orders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Your Recent Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(showAllOrders ? orders : orders.slice(0, 2)).map(
                    (order) => (
                      <div
                        key={order?._id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              Order #
                              {order.orderNumber?.slice(-8) ||
                                order._id.slice(-8)}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {order.orderDate
                                  ? format(
                                      new Date(order.orderDate),
                                      "MMM dd, yyyy"
                                    )
                                  : "N/A"}
                              </div>
                              <PriceFormatter amount={order.totalPrice || 0} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              order.status === "completed" ||
                              order.status === "delivered"
                                ? "default"
                                : "secondary"
                            }
                            className="capitalize"
                          >
                            {order.status || "pending"}
                          </Badge>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/user/orders/${order._id}`}>
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  {orders.length > 2 && (
                    <div className="text-center pt-2">
                      <Button
                        variant="ghost"
                        onClick={() => setShowAllOrders(!showAllOrders)}
                        className="text-sm"
                      >
                        {showAllOrders
                          ? "Show Less"
                          : `Show All ${orders.length} Orders`}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto"
        >
          <Button asChild size="lg" className="h-12">
            <Link href="/" className="flex items-center justify-center gap-2">
              <Home className="w-5 h-5" />
              Continue Shopping
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="h-12">
            <Link
              href="/user/orders"
              className="flex items-center justify-center gap-2"
            >
              <Package className="w-5 h-5" />
              Track Orders
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="h-12">
            <Link
              href="/shop"
              className="flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Shop More
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default SuccessPage;
