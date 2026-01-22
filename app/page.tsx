"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ShoppingBag,
  Clock,
  MapPin,
  Phone,
  Heart,
  Shield,
  Truck,
  LogIn,
  ArrowRight,
  Sparkles,
  Users,
} from "lucide-react"

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setIsAuthenticated(true)
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        setUserRole(profile?.role || null)
      }
    } catch {
      // Not authenticated
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: Shield,
      title: "Productos de Calidad",
      description: "Medicamentos certificados y productos de las mejores marcas",
    },
    {
      icon: Clock,
      title: "Pedidos Rapidos",
      description: "Ordena en linea y recoge en tienda en minutos",
    },
    {
      icon: Sparkles,
      title: "Ofertas Exclusivas",
      description: "Promociones especiales disponibles solo en nuestra tienda",
    },
    {
      icon: Heart,
      title: "Atencion Personalizada",
      description: "Nuestro equipo esta listo para ayudarte con tus necesidades",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
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

            <nav className="flex items-center gap-3">
              <Link href="/tienda">
                <Button variant="ghost">Tienda</Button>
              </Link>
              {isAuthenticated ? (
                <Link href={userRole === "admin" ? "/admin/dashboard" : "/pos"}>
                  <Button>
                    <Users className="h-4 w-4 mr-2" />
                    Panel
                  </Button>
                </Link>
              ) : (
                <Link href="/auth/login">
                  <Button variant="outline">
                    <LogIn className="h-4 w-4 mr-2" />
                    Empleados
                  </Button>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Tu salud es nuestra prioridad
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
              Bienvenido a{" "}
              <span className="text-primary">Farmacia Bienestar</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 text-pretty">
              Encuentra todos los medicamentos y productos de salud que necesitas.
              Ordena en linea y recoge en nuestra tienda de forma rapida y segura.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/tienda">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Ir a la Tienda
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Por que elegirnos?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            Como funciona?
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Ordenar tus productos es muy facil. Sigue estos simples pasos:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-lg mb-2">Explora y Selecciona</h3>
              <p className="text-muted-foreground text-sm">
                Navega por nuestra tienda y agrega los productos que necesitas al carrito
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-lg mb-2">Confirma tu Pedido</h3>
              <p className="text-muted-foreground text-sm">
                Ingresa tus datos y recibe un codigo unico de recogida
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-lg mb-2">Recoge y Paga</h3>
              <p className="text-muted-foreground text-sm">
                Presenta tu codigo en caja, recoge tu pedido y paga en el momento
              </p>
            </div>
          </div>
          <div className="text-center mt-10">
            <Link href="/tienda">
              <Button size="lg">
                Comenzar a Comprar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Listo para ordenar?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Visita nuestra tienda en linea y descubre todas las ofertas y productos disponibles para ti.
          </p>
          <Link href="/tienda">
            <Button size="lg" variant="secondary" className="text-primary">
              <ShoppingBag className="h-5 w-5 mr-2" />
              Visitar Tienda
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/logo.jpeg"
                  alt="Farmacia Bienestar"
                  width={50}
                  height={50}
                  className="rounded-full"
                />
                <div>
                  <h3 className="font-bold text-lg text-primary">Farmacia Bienestar</h3>
                  <p className="text-sm text-muted-foreground">Tu salud es nuestra prioridad</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Ofrecemos productos farmaceuticos de calidad con atencion personalizada para cuidar de ti y tu familia.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Horario de Atencion
              </h4>
              <p className="text-sm text-muted-foreground mb-1">Lunes a Sabado: 8:00 AM - 9:00 PM</p>
              <p className="text-sm text-muted-foreground">Domingo: 9:00 AM - 3:00 PM</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Ubicacion
              </h4>
              <p className="text-sm text-muted-foreground mb-1">Calle Principal #123</p>
              <p className="text-sm text-muted-foreground mb-3">Colonia Centro</p>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm">(123) 456-7890</span>
              </div>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              2026 Farmacia Bienestar. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/tienda" className="text-sm text-muted-foreground hover:text-primary">
                Tienda
              </Link>
              <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-primary">
                Empleados
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
