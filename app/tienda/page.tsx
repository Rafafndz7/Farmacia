"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  Clock,
  MapPin,
  Phone,
  Heart,
  Sparkles,
  ChevronRight,
  X,
  CheckCircle2,
  QrCode,
  Copy,
  Check,
} from "lucide-react"

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  barcode: string | null
  category: string | null
  section: string | null
  image_url: string | null
  created_at: string
}

interface Promotion {
  id: string
  name: string
  description: string | null
  discount_type: "percentage" | "fixed"
  discount_value: number
  start_date: string
  end_date: string
  is_active: boolean
  product_ids: string[]
}

interface CartItem {
  product: Product
  quantity: number
}

interface Order {
  id: string
  order_number: string
  pickup_code: string
  total: number
  status: string
  customer_name: string
  customer_phone: string
}

export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isOrderComplete, setIsOrderComplete] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const searchParams = useSearchParams()

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Load products
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .gt("stock", 0)
        .order("name")

      if (productsData) {
        setProducts(productsData)
      }

      // Load active promotions
      const now = new Date().toISOString()
      const { data: promotionsData } = await supabase
        .from("promotions")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", now)
        .gte("end_date", now)

      if (promotionsData) {
        // Get product_ids for each promotion
        const promotionsWithProducts = await Promise.all(
          promotionsData.map(async (promo) => {
            const { data: productPromos } = await supabase
              .from("product_promotions")
              .select("product_id")
              .eq("promotion_id", promo.id)
            return {
              ...promo,
              product_ids: productPromos?.map((pp) => pp.product_id) || [],
            }
          })
        )
        setPromotions(promotionsWithProducts)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean))
    return Array.from(cats) as string[]
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm)
      const matchesCategory = !selectedCategory || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, selectedCategory])

  const getProductDiscount = (productId: string) => {
    for (const promo of promotions) {
      if (promo.product_ids.includes(productId)) {
        return promo
      }
    }
    return null
  }

  const getDiscountedPrice = (product: Product) => {
    const promo = getProductDiscount(product.id)
    if (!promo) return product.price
    if (promo.discount_type === "percentage") {
      return product.price * (1 - promo.discount_value / 100)
    }
    return Math.max(0, product.price - promo.discount_value)
  }

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item
          const newQuantity = item.quantity + delta
          if (newQuantity <= 0) return null
          if (newQuantity > item.product.stock) return item
          return { ...item, quantity: newQuantity }
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = getDiscountedPrice(item.product)
      return sum + price * item.quantity
    }, 0)
  }, [cart, promotions])

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  const generatePickupCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleCheckout = async () => {
    if (!customerName.trim() || !customerPhone.trim()) return
    setIsSubmitting(true)

    try {
      const pickupCode = generatePickupCode()
      const orderNumber = `ORD-${Date.now()}`

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          pickup_code: pickupCode,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          subtotal: cartTotal,
          discount: 0,
          total: cartTotal,
          status: "pending",
          notes: null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        discount: item.product.price - getDiscountedPrice(item.product),
        subtotal: getDiscountedPrice(item.product) * item.quantity,
      }))

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

      if (itemsError) throw itemsError

      // Update stock
      for (const item of cart) {
        await supabase
          .from("products")
          .update({ stock: item.product.stock - item.quantity })
          .eq("id", item.product.id)
      }

      setCompletedOrder({
        id: orderData.id,
        order_number: orderNumber,
        pickup_code: pickupCode,
        total: cartTotal,
        status: "pending",
        customer_name: customerName,
        customer_phone: customerPhone,
      })
      setIsCheckoutOpen(false)
      setIsOrderComplete(true)
      setCart([])
      setCustomerName("")
      setCustomerPhone("")
    } catch (error) {
      console.error("Error creating order:", error)
      alert("Error al crear el pedido. Intente de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyPickupCode = () => {
    if (completedOrder) {
      navigator.clipboard.writeText(completedOrder.pickup_code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const featuredProducts = useMemo(() => {
    return products.filter((p) => getProductDiscount(p.id)).slice(0, 6)
  }, [products, promotions])

  if (loading) {
    return <StoreLoadingSkeleton />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link href="/tienda" className="flex items-center gap-3 shrink-0">
              <Image
                src="/logo.jpeg"
                alt="Farmacia Bienestar"
                width={50}
                height={50}
                className="rounded-full"
              />
              <div className="hidden sm:block">
                <h1 className="font-bold text-lg text-primary leading-tight">Farmacia</h1>
                <p className="text-sm text-muted-foreground -mt-1">Bienestar</p>
              </div>
            </Link>

            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar medicamentos, productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-muted/50 border-0 focus-visible:ring-primary"
                />
              </div>
            </div>

            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative bg-transparent">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                      {cartItemsCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="flex flex-col w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Mi Carrito
                  </SheetTitle>
                </SheetHeader>

                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-4">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Tu carrito esta vacio</h3>
                    <p className="text-muted-foreground text-sm">
                      Agrega productos para comenzar tu pedido
                    </p>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="flex-1 -mx-6 px-6">
                      <div className="space-y-4 py-4">
                        {cart.map((item) => {
                          const discount = getProductDiscount(item.product.id)
                          const discountedPrice = getDiscountedPrice(item.product)
                          return (
                            <div
                              key={item.product.id}
                              className="flex gap-3 p-3 rounded-lg bg-muted/50"
                            >
                              <div className="h-16 w-16 rounded-md bg-background overflow-hidden shrink-0">
                                {item.product.image_url ? (
                                  <Image
                                    src={item.product.image_url || "/placeholder.svg"}
                                    alt={item.product.name}
                                    width={64}
                                    height={64}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <Package className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  {discount ? (
                                    <>
                                      <span className="text-sm font-semibold text-primary">
                                        ${discountedPrice.toFixed(2)}
                                      </span>
                                      <span className="text-xs text-muted-foreground line-through">
                                        ${item.product.price.toFixed(2)}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-sm font-semibold">
                                      ${item.product.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 bg-transparent"
                                    onClick={() => updateQuantity(item.product.id, -1)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="text-sm font-medium w-8 text-center">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 bg-transparent"
                                    onClick={() => updateQuantity(item.product.id, 1)}
                                    disabled={item.quantity >= item.product.stock}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 ml-auto text-destructive hover:text-destructive"
                                    onClick={() => removeFromCart(item.product.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>

                    <div className="border-t pt-4 space-y-4">
                      <div className="flex items-center justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span className="text-primary">${cartTotal.toFixed(2)}</span>
                      </div>
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => {
                          setIsCartOpen(false)
                          setIsCheckoutOpen(true)
                        }}
                      >
                        Realizar Pedido
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        El pago se realiza al recoger en tienda
                      </p>
                    </div>
                  </>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Section with Promotions */}
      {featuredProducts.length > 0 && !searchTerm && !selectedCategory && (
        <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-xl md:text-2xl font-bold">Ofertas Especiales</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {featuredProducts.map((product) => {
                const promo = getProductDiscount(product.id)
                const discountedPrice = getDiscountedPrice(product)
                return (
                  <Card
                    key={product.id}
                    className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-colors cursor-pointer group"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-3">
                      <div className="aspect-square rounded-md bg-white/20 mb-2 overflow-hidden">
                        {product.image_url ? (
                          <Image
                            src={product.image_url || "/placeholder.svg"}
                            alt={product.name}
                            width={150}
                            height={150}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-white/50" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-medium text-sm truncate">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold">${discountedPrice.toFixed(2)}</span>
                        <span className="text-xs line-through opacity-70">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                      {promo && (
                        <Badge className="mt-2 bg-white/20 text-white text-xs">
                          {promo.discount_type === "percentage"
                            ? `-${promo.discount_value}%`
                            : `-$${promo.discount_value}`}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      {categories.length > 0 && !searchTerm && (
        <section className="py-6 border-b bg-background/50">
          <div className="container mx-auto px-4">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="shrink-0"
                >
                  Todos
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="shrink-0"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </section>
      )}

      {/* Products Grid */}
      <main className="container mx-auto px-4 py-8">
        {searchTerm && (
          <div className="mb-6">
            <p className="text-muted-foreground">
              {filteredProducts.length} resultados para "{searchTerm}"
            </p>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No se encontraron productos</h3>
            <p className="text-muted-foreground">Intenta con otra busqueda o categoria</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredProducts.map((product) => {
              const promo = getProductDiscount(product.id)
              const discountedPrice = getDiscountedPrice(product)
              const inCart = cart.find((item) => item.product.id === product.id)

              return (
                <Card
                  key={product.id}
                  className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="aspect-square relative bg-muted overflow-hidden">
                    {product.image_url ? (
                      <Image
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    {promo && (
                      <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                        {promo.discount_type === "percentage"
                          ? `-${promo.discount_value}%`
                          : `-$${promo.discount_value}`}
                      </Badge>
                    )}
                    {product.stock <= 5 && product.stock > 0 && (
                      <Badge variant="secondary" className="absolute top-2 right-2">
                        Quedan {product.stock}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem] mb-1">
                      {product.name}
                    </h3>
                    {product.category && (
                      <p className="text-xs text-muted-foreground mb-2">{product.category}</p>
                    )}
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        {promo ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">
                              ${discountedPrice.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground line-through">
                              ${product.price.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold">${product.price.toFixed(2)}</span>
                        )}
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-transparent"
                            onClick={() => updateQuantity(product.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">
                            {inCart.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-transparent"
                            onClick={() => updateQuantity(product.id, 1)}
                            disabled={inCart.quantity >= product.stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => addToCart(product)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 border-t mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/logo.jpeg"
                  alt="Farmacia Bienestar"
                  width={60}
                  height={60}
                  className="rounded-full"
                />
                <div>
                  <h3 className="font-bold text-lg text-primary">Farmacia Bienestar</h3>
                  <p className="text-sm text-muted-foreground">Tu salud es nuestra prioridad</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Horario
              </h4>
              <p className="text-sm text-muted-foreground">Lunes a Sabado: 8:00 AM - 9:00 PM</p>
              <p className="text-sm text-muted-foreground">Domingo: 9:00 AM - 3:00 PM</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Ubicacion
              </h4>
              <p className="text-sm text-muted-foreground">Calle Principal #123</p>
              <p className="text-sm text-muted-foreground">Colonia Centro</p>
              <div className="flex items-center gap-2 mt-2">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm">(123) 456-7890</span>
              </div>
            </div>
          </div>
          <Separator className="my-6" />
          <p className="text-center text-sm text-muted-foreground">
            2026 Farmacia Bienestar. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Floating Cart Button (Mobile) */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:hidden z-40">
          <Button
            className="w-full shadow-lg"
            size="lg"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Ver Carrito ({cartItemsCount}) - ${cartTotal.toFixed(2)}
          </Button>
        </div>
      )}

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Completar Pedido</DialogTitle>
            <DialogDescription>
              Ingresa tus datos para recoger tu pedido en tienda
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nombre completo</label>
              <Input
                placeholder="Tu nombre"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Telefono</label>
              <Input
                placeholder="(123) 456-7890"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <Separator />
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Productos ({cartItemsCount})</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total a pagar</span>
                <span className="text-primary">${cartTotal.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Recibiras un codigo para recoger tu pedido. El pago se realiza en tienda.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setIsCheckoutOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleCheckout}
              disabled={!customerName.trim() || !customerPhone.trim() || isSubmitting}
            >
              {isSubmitting ? "Procesando..." : "Confirmar Pedido"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Complete Dialog */}
      <Dialog open={isOrderComplete} onOpenChange={setIsOrderComplete}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-6">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Pedido Confirmado!</h2>
            <p className="text-muted-foreground mb-6">
              Presenta este codigo en caja para recoger tu pedido
            </p>

            {completedOrder && (
              <div className="space-y-4">
                <div className="bg-primary/10 rounded-xl p-6">
                  <p className="text-sm text-muted-foreground mb-2">Codigo de Recogida</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-4xl font-mono font-bold tracking-wider text-primary">
                      {completedOrder.pickup_code}
                    </span>
                    <Button variant="ghost" size="icon" onClick={copyPickupCode}>
                      {copiedCode ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-left">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Pedido:</span>
                    <span className="font-medium">{completedOrder.order_number}</span>
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">${completedOrder.total.toFixed(2)}</span>
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="font-medium">{completedOrder.customer_name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Tu pedido estara listo en 15-30 minutos</span>
                </div>
              </div>
            )}

            <Button className="w-full mt-6" onClick={() => setIsOrderComplete(false)}>
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StoreLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-10 flex-1 max-w-xl" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-square" />
              <CardContent className="p-3">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function Loading() {
  return null
}
