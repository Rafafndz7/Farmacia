"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

import {
  Search,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  User,
  Phone,
  ShoppingBag,
  ArrowLeft,
  Truck,
  Timer,
  DollarSign,
  Bell,
  Eye,
  Check,
  X,
} from "lucide-react"

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
}

interface Order {
  id: string
  order_number: string
  pickup_code: string
  customer_name: string
  customer_phone: string
  subtotal: number
  discount: number
  total: number
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled"
  notes: string | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-yellow-500", icon: Clock, textColor: "text-yellow-600" },
  preparing: { label: "Preparando", color: "bg-blue-500", icon: Timer, textColor: "text-blue-600" },
  ready: { label: "Listo", color: "bg-green-500", icon: CheckCircle2, textColor: "text-green-600" },
  completed: { label: "Entregado", color: "bg-gray-500", icon: Check, textColor: "text-gray-600" },
  cancelled: { label: "Cancelado", color: "bg-red-500", icon: XCircle, textColor: "text-red-600" },
}

export default function CajeroDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("pending")
  const [isUpdating, setIsUpdating] = useState(false)
  const [pickupCodeSearch, setPickupCodeSearch] = useState("")

  const supabase = createClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    loadOrders()

    // Subscribe to real-time updates
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadOrders() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      if (data) {
        setOrders(data)
      }
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoading(false)
    }
  }

  async function loadOrderItems(orderId: string) {
    const { data } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)

    return data || []
  }

  async function openOrderDetails(order: Order) {
    const items = await loadOrderItems(order.id)
    setSelectedOrder({ ...order, items })
    setIsDetailsOpen(true)
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId)

      if (error) throw error

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as Order["status"] } : o))
      )

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus as Order["status"] } : null))
      }
    } catch (error) {
      console.error("Error updating order:", error)
      alert("Error al actualizar el pedido")
    } finally {
      setIsUpdating(false)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.pickup_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone.includes(searchTerm)

    if (activeTab === "all") return matchesSearch
    return matchesSearch && order.status === activeTab
  })

  const orderCounts = {
    pending: orders.filter((o) => o.status === "pending").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  }

  const searchByPickupCode = () => {
    if (!pickupCodeSearch.trim()) return
    const found = orders.find(
      (o) => o.pickup_code.toLowerCase() === pickupCodeSearch.toLowerCase().trim()
    )
    if (found) {
      openOrderDetails(found)
      setPickupCodeSearch("")
    } else {
      alert("No se encontro ningun pedido con ese codigo")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <Image
                src="/logo.jpeg"
                alt="Farmacia Bienestar"
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <h1 className="font-bold text-lg text-primary">Panel de Cajero</h1>
                <p className="text-xs text-muted-foreground">Gestion de Pedidos</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Codigo de recogida..."
                  value={pickupCodeSearch}
                  onChange={(e) => setPickupCodeSearch(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && searchByPickupCode()}
                  className="w-40 uppercase"
                />
                <Button onClick={searchByPickupCode}>Buscar</Button>
              </div>
              <Button variant="outline" size="icon" onClick={loadOrders}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pendientes</p>
                  <p className="text-3xl font-bold text-yellow-700">{orderCounts.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Preparando</p>
                  <p className="text-3xl font-bold text-blue-700">{orderCounts.preparing}</p>
                </div>
                <Timer className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Listos</p>
                  <p className="text-3xl font-bold text-green-700">{orderCounts.ready}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Entregados</p>
                  <p className="text-3xl font-bold text-gray-700">{orderCounts.completed}</p>
                </div>
                <Check className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Cancelados</p>
                  <p className="text-3xl font-bold text-red-700">{orderCounts.cancelled}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Pedidos</CardTitle>
                <CardDescription>Gestiona los pedidos de los clientes</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending" className="gap-2">
                  Pendientes
                  {orderCounts.pending > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {orderCounts.pending}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="preparing">Preparando</TabsTrigger>
                <TabsTrigger value="ready">Listos</TabsTrigger>
                <TabsTrigger value="completed">Entregados</TabsTrigger>
                <TabsTrigger value="all">Todos</TabsTrigger>
              </TabsList>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Tiempo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No hay pedidos para mostrar
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => {
                        const config = statusConfig[order.status]
                        const StatusIcon = config.icon
                        return (
                          <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-mono font-bold text-primary">
                              {order.pickup_code}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {order.customer_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                {order.customer_phone}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">${order.total.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge
                                className={`${config.color} text-white gap-1`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {getTimeSince(order.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openOrderDetails(order)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>
                                {order.status === "pending" && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrderStatus(order.id, "preparing")}
                                    disabled={isUpdating}
                                  >
                                    Preparar
                                  </Button>
                                )}
                                {order.status === "preparing" && (
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => updateOrderStatus(order.id, "ready")}
                                    disabled={isUpdating}
                                  >
                                    Listo
                                  </Button>
                                )}
                                {order.status === "ready" && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrderStatus(order.id, "completed")}
                                    disabled={isUpdating}
                                  >
                                    Entregar
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Order Details Dialog */}
      <Suspense fallback={<Loading />}>
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Detalle del Pedido
              </DialogTitle>
              <DialogDescription>
                {selectedOrder?.order_number}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4">
                {/* Pickup Code */}
                <div className="bg-primary/10 rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Codigo de Recogida</p>
                  <p className="text-3xl font-mono font-bold tracking-wider text-primary">
                    {selectedOrder.pickup_code}
                  </p>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-medium">{selectedOrder.customer_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefono</p>
                      <p className="font-medium">{selectedOrder.customer_phone}</p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Estado</p>
                      <Badge className={`${statusConfig[selectedOrder.status].color} text-white mt-1`}>
                        {statusConfig[selectedOrder.status].label}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Creado</p>
                    <p className="text-sm font-medium">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <p className="text-sm font-medium mb-2">Productos</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.quantity}x</span>
                          <span className="text-sm">{item.product_name}</span>
                        </div>
                        <span className="text-sm font-medium">${item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Total */}
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${selectedOrder.total.toFixed(2)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {selectedOrder.status === "pending" && (
                    <>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          updateOrderStatus(selectedOrder.id, "cancelled")
                          setIsDetailsOpen(false)
                        }}
                        disabled={isUpdating}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => {
                          updateOrderStatus(selectedOrder.id, "preparing")
                          setIsDetailsOpen(false)
                        }}
                        disabled={isUpdating}
                      >
                        <Timer className="h-4 w-4 mr-2" />
                        Preparar
                      </Button>
                    </>
                  )}
                  {selectedOrder.status === "preparing" && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, "ready")
                        setIsDetailsOpen(false)
                      }}
                      disabled={isUpdating}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Marcar como Listo
                    </Button>
                  )}
                  {selectedOrder.status === "ready" && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, "completed")
                        setIsDetailsOpen(false)
                      }}
                      disabled={isUpdating}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Confirmar Entrega
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Suspense>
    </div>
  )
}
