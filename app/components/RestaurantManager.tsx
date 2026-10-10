"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import ProductModal from "./ProductModal"

const SUPABASE_URL = "https://yajeiyecxkwmwqkfkxvp.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_pz5KKsdQXXlG7kV239OoJw_YsNuF3w7"

const DEFAULT_IMAGES: { [key: string]: string } = {
    pizza: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
    burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    sushi: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80",
    doner: "https://images.unsplash.com/photo-1561651823-34feb02255e7?auto=format&fit=crop&w=600&q=80",
    default: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
}

export default function RestaurantManager() {
    const [supabase, setSupabase] = useState<any>(null)
    const [restaurants, setRestaurants] = useState<any[]>([])
    const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null)
    const [menuItems, setMenuItems] = useState<any[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [selectedProduct, setSelectedProduct] = useState<any>(null)

    useEffect(() => {
        const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        setSupabase(client)
    }, [])

    useEffect(() => {
        if (!supabase) return
        async function fetchRestaurants() {
            setLoading(true)
            const { data, error } = await supabase.from("restaurants").select("*")
            if (!error && data) {
                const uniqueRestaurants = Array.from(
                    new Map(data.map((item: any) => [item.id, item])).values()
                )
                setRestaurants(uniqueRestaurants)
            }
            setLoading(false)
        }
        fetchRestaurants()
    }, [supabase])

    useEffect(() => {
        if (!supabase || !selectedRestaurant) return
        async function fetchMenu() {
            const { data, error } = await supabase
                .from("menu_items")
                .select("*")
                .eq("restaurant_id", selectedRestaurant.id)
            if (!error && data) {
                const uniqueMenu = Array.from(
                    new Map(data.map((item: any) => [item.id, item])).values()
                )
                setMenuItems(uniqueMenu)
            }
        }
        fetchMenu()
    }, [supabase, selectedRestaurant])

    if (loading) {
        return <div style={{ width: "100%", padding: "80px 0", textAlign: "center", fontSize: "18px", color: "#666" }}>Loading...</div>
    }

    if (selectedRestaurant) {
        return (
            <div style={{ width: "100%", minHeight: "100vh", fontFamily: "sans-serif", background: "#f8f9fa", paddingBottom: "80px", boxSizing: "border-box" }}>
                <div style={{ background: "#fff", padding: "15px 30px", borderBottom: "1px solid #eaeaea", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                        onClick={() => setSelectedRestaurant(null)}
                        style={{ background: "#111", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                    >
                        ← Back to Restaurants
                    </button>
                </div>

                <div style={{ maxWidth: "1000px", width: "92%", margin: "40px auto 0 auto", boxSizing: "border-box" }}>
                    <h2 style={{ fontSize: "24px", marginBottom: "20px", color: "#111" }}>Menu</h2>
                    {menuItems.length === 0 ? (
                        <p style={{ color: "#666" }}>No menu items found for this restaurant.</p>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                            {menuItems.map((item) => {
                                const itemImage = item.image_url || DEFAULT_IMAGES.default
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedProduct(item)}
                                        style={{
                                            background: "#fff",
                                            borderRadius: "12px",
                                            overflow: "hidden",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                                            display: "flex",
                                            flexDirection: "column",
                                            cursor: "pointer",
                                            border: "1px solid #eaeaea",
                                            boxSizing: "border-box",
                                        }}
                                    >
                                        <div style={{ width: "100%", height: "160px", background: "#f0f0f0" }}>
                                            <img src={itemImage} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                        </div>
                                        <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                                            <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                                                    <h4 style={{ margin: 0, fontSize: "18px", color: "#111" }}>{item.name}</h4>
                                                    <span style={{ fontWeight: "bold", color: "#e53e3e", fontSize: "16px" }}>{item.price} €</span>
                                                </div>
                                                <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>{item.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {selectedProduct && (
                    <ProductModal 
                        product={selectedProduct} 
                        onClose={() => setSelectedProduct(null)} 
                    />
                )}
            </div>
        )
    }

    return (
        <div style={{ width: "100%", minHeight: "100vh", fontFamily: "sans-serif", padding: "40px 20px", background: "#f8f9fa" }}>
            <div style={{ maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
                <h3 style={{ fontSize: "22px", color: "#111", marginBottom: "20px", textAlign: "center" }}>Discover Local Restaurants</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "25px" }}>
                    {restaurants.map((res) => (
                        <div
                            key={res.id}
                            onClick={() => setSelectedRestaurant(res)}
                            style={{
                                background: "#fff",
                                borderRadius: "16px",
                                overflow: "hidden",
                                boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
                                cursor: "pointer",
                                border: "1px solid #eaeaea",
                            }}
                        >
                            <div style={{ width: "100%", height: "200px", background: "#f0f0f0" }}>
                                <img src={res.cover_image_url || res.image_url || DEFAULT_IMAGES.default} alt={res.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            </div>
                            <div style={{ padding: "20px" }}>
                                <h3 style={{ fontSize: "20px", margin: "6px 0 8px 0", color: "#111" }}>{res.name}</h3>
                                <p style={{ color: "#666", fontSize: "14px", margin: "0 0 15px 0" }}>{res.story || res.description || "Delicious foods..."}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}