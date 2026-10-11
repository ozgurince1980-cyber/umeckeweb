<<<<<<< HEAD
"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://yajeiyecxkwmwqkfkxvp.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_pz5KKsdQXXlG7kV239OoJw_YsNuF3w7"

const DEFAULT_IMAGES: { [key: string]: string } = {
    pizza: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
    burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    sushi: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80",
    doner: "https://images.unsplash.com/photo-1561651823-34feb02255e7?auto=format&fit=crop&w=600&q=80",
    default:
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
}

const BUSINESS_TYPES = [
    "Restoran",
    "Paket Servis / İmbiss",
    "Kafe / Kafeterya",
    "Bar / Pub",
    "Fast Food Restoranı",
    "Sokak Lezzetleri / Büfe",
    "Kiosk",
    "Pop-up İşletme",
    "Fırın / Pastane",
    "Food Truck",
]

const CUISINE_TYPES = [
    "Alman / Yerel Mutfak",
    "Türk / Anadolu Mutfağı",
    "İtalyan Mutfağı",
    "Akdeniz Mutfağı",
    "Asya Mutfağı",
    "Amerikan / Burger",
    "Latin Amerika / Meksika",
    "Uzak Doğu / Çin & Japon",
    "Hint / Asya Baharatları",
    "Uluslararası / Karışık",
]

const PRODUCT_CATEGORIES = [
    "Döner & Kebap",
    "Pizza",
    "Burger",
    "Broiler / Tavuk & Izgara",
    "Balık & Deniz Ürünleri",
    "Sandviç & Wrap",
    "Kahve & Tatlı",
    "Makarna & Hamur İşi",
    "Çorba & Ev Yemekleri",
    "Salata & Sağlıklı Yaşam",
]

const PARKING_OPTIONS = [
    "Ücretsiz Cadde Otoparkı",
    "Ücretli Cadde Otoparkı",
    "Özel Otopark / Garaj",
    "Otopark Bulunmuyor",
]

const AVAILABLE_SERVICES = [
    "Mekanda Servis",
    "Paket Servis",
    "Gel-Al",
    "Temassız Teslimat",
]

const AVAILABLE_PAYMENTS = [
    "Nakit",
    "Kredi Kartı",
    "Yemek Çeki / Sodexo",
    "Temassız / Mobil Ödeme",
]

const DAYS_OF_WEEK = [
    { key: "mon", label: "Pazartesi" },
    { key: "tue", label: "Salı" },
    { key: "wed", label: "Çarşamba" },
    { key: "thu", label: "Perşembe" },
    { key: "fri", label: "Cuma" },
    { key: "sat", label: "Cumartesi" },
    { key: "sun", label: "Pazar" },
]

const DEFAULT_HOURS_STATE = {
    mon: { open: "10:00 - 22:00", closed: false },
    tue: { open: "10:00 - 22:00", closed: false },
    wed: { open: "10:00 - 22:00", closed: false },
    thu: { open: "10:00 - 22:00", closed: false },
    fri: { open: "10:00 - 22:00", closed: false },
    sat: { open: "10:00 - 22:00", closed: false },
    sun: { open: "Kapalı", closed: true },
}

function getPlaceholder(productCategory: string, itemName: string = "") {
    const text = `${productCategory || ""} ${itemName || ""}`.toLowerCase()
    if (text.includes("pizza")) return DEFAULT_IMAGES.pizza
    if (text.includes("burger")) return DEFAULT_IMAGES.burger
    if (text.includes("sushi") || text.includes("uzak doğu"))
        return DEFAULT_IMAGES.sushi
    if (text.includes("döner") || text.includes("kebap"))
        return DEFAULT_IMAGES.doner
    return DEFAULT_IMAGES.default
}

export default function RestaurantManager() {
    const [supabase, setSupabase] = useState<any>(null)
    const [restaurants, setRestaurants] = useState<any[]>([])
    const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null)
    const [menuItems, setMenuItems] = useState<any[]>([])
    const [loading, setLoading] = useState<boolean>(true)

    const [isEditing, setIsEditing] = useState<boolean>(false)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
    const [passwordInput, setPasswordInput] = useState<string>("")
    const [passwordError, setPasswordError] = useState<string>("")

    const [editForm, setEditForm] = useState<any>({})
    const [saving, setSaving] = useState<boolean>(false)
    const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false)
    const [uploadMessage, setUploadMessage] = useState<string>("")
    const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>("")

    useEffect(() => {
        const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        setSupabase(client)
    }, [])

    useEffect(() => {
        if (!supabase) return
        async function fetchRestaurants() {
            setLoading(true)
            const { data, error } = await supabase
                .from("restaurants")
                .select("*")
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
                if (uniqueMenu.length > 0) setSelectedMenuItemId(uniqueMenu[0].id)
            }
        }
        fetchMenu()

        let parsedHours = DEFAULT_HOURS_STATE
        try {
            if (selectedRestaurant.weekly_hours) {
                parsedHours =
                    typeof selectedRestaurant.weekly_hours === "string"
                        ? JSON.parse(selectedRestaurant.weekly_hours)
                        : selectedRestaurant.weekly_hours
            }
        } catch (e) {
            parsedHours = DEFAULT_HOURS_STATE
        }

        const defaultStory = selectedRestaurant.name
            ?.toLowerCase()
            .includes("pascham")
            ? "Ben İrfan Doğan. 30 yıldır Bad Doberan’ın ilk dönercisi Pascham Döner’in başındayım. Kahramanmaraş’tan bu güzel kasabaya geldiğimde burası dönerle henüz tanışmamıştı; o günlerden bugüne her şişi kendi evladımın yiyeceği titizlikle, en taze etlerle ve kusursuz bir hijyen anlayışıyla hazırladım. Müşterilerime sunduğum her lokmanın lezzeti kadar güvenli ve temiz olması benim için her şeyden önce gelir. Şimdi umEcke Ekosistemi ile dijitalde de kendi kaderimizi elimize alıyoruz. Siparişlerinizi komisyoncu dev platformlar yerine doğrudan bizden vermeniz; hem bizim 30 yıllık emeğimize ve hijyenik tezgahımıza sahip çıkmanız, hem de yerel esnafın bağımsız kalması için çok önemlidir. Gelin, bu lezzeti ve dayanışmayı birlikte yaşatalım!"
            : selectedRestaurant.story ||
              "Geleneksel lezzetleri modern dokunuşlarla buluşturduğumuz mekanımızda hizmetinizdeyiz."

        setEditForm({
            name: selectedRestaurant.name || "",
            business_type: selectedRestaurant.business_type || "Restoran",
            cuisine_type:
                selectedRestaurant.cuisine_type || "Alman / Yerel Mutfak",
            product_category:
                selectedRestaurant.product_category || "Döner & Kebap",
            story: defaultStory,
            logo_url:
                selectedRestaurant.logo_url ||
                "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80",
            cover_image_url:
                selectedRestaurant.cover_image_url ||
                selectedRestaurant.image_url ||
                "",
            owner_photo_url:
                selectedRestaurant.owner_photo_url ||
                selectedRestaurant.owner_image_url ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
            address: selectedRestaurant.address || "",
            phone: selectedRestaurant.phone || "",
            email: selectedRestaurant.email || "",
            website: selectedRestaurant.website || "",
            parking_info:
                selectedRestaurant.parking_info || "Ücretsiz Cadde Otoparkı",
            service_options: selectedRestaurant.service_options || [
                "Mekanda Servis",
                "Paket Servis",
                "Gel-Al",
            ],
            payment_methods: selectedRestaurant.payment_methods || [
                "Nakit",
                "Kredi Kartı",
            ],
            weekly_hours: parsedHours,
            is_closed: selectedRestaurant.is_closed || false,
        })
        setIsAuthenticated(false)
        setPasswordInput("")
        setPasswordError("")
        setUploadMessage("")
    }, [supabase, selectedRestaurant])

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const correctPassword = selectedRestaurant.password || "umecke2026"
        if (passwordInput === correctPassword) {
            setIsAuthenticated(true)
            setPasswordError("")
        } else {
            setPasswordError("Hatalı şifre! Lütfen işletme şifrenizi giriniz.")
        }
    }

    const handleDayHourChange = (dayKey: string, field: string, value: any) => {
        setEditForm((prev: any) => {
            const currentDayObj = prev.weekly_hours[dayKey] || {
                open: "10:00 - 22:00",
                closed: false,
            }
            return {
                ...prev,
                weekly_hours: {
                    ...prev.weekly_hours,
                    [dayKey]: {
                        ...currentDayObj,
                        [field]: value,
                    },
                },
            }
        })
    }

    const handleCheckboxArrayChange = (field: string, item: string) => {
        setEditForm((prev: any) => {
            const currentList = prev[field] || []
            if (currentList.includes(item)) {
                return {
                    ...prev,
                    [field]: currentList.filter((i: string) => i !== item),
                }
            } else {
                return { ...prev, [field]: [...currentList, item] }
            }
        })
    }

    const handleDirectImageUpload = async (file: File, type: string) => {
        try {
            setUploadingPhoto(true)
            setUploadMessage("Fotoğraf yükleniyor...")

            const fileExt = file.name.split(".").pop() || "jpg"
            const fileName = `${type}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from("menu-images")
                .upload(fileName, file)

            if (uploadError) {
                throw new Error("Storage yükleme hatası: " + uploadError.message)
            }

            const { data: publicURLData } = supabase.storage
                .from("menu-images")
                .getPublicUrl(fileName)

            const publicUrl = publicURLData.publicUrl

            if (type === "restaurant_cover") {
                const { error } = await supabase
                    .from("restaurants")
                    .update({
                        image_url: publicUrl,
                        cover_image_url: publicUrl,
                    })
                    .eq("id", selectedRestaurant.id)

                if (error) throw error
                setEditForm((prev: any) => ({
                    ...prev,
                    cover_image_url: publicUrl,
                }))
                setSelectedRestaurant((prev: any) => ({
                    ...prev,
                    cover_image_url: publicUrl,
                    image_url: publicUrl,
                }))
            } else if (type === "owner_profile") {
                const { error } = await supabase
                    .from("restaurants")
                    .update({
                        owner_photo_url: publicUrl,
                        owner_image_url: publicUrl,
                    })
                    .eq("id", selectedRestaurant.id)

                if (error) throw error
                setEditForm((prev: any) => ({
                    ...prev,
                    owner_photo_url: publicUrl,
                }))
                setSelectedRestaurant((prev: any) => ({
                    ...prev,
                    owner_photo_url: publicUrl,
                }))
            } else if (type === "menu_item") {
                if (!selectedMenuItemId) {
                    throw new Error("Lütfen fotoğraf yüklenecek menü ürününü seçin.")
                }
                const { error } = await supabase
                    .from("menu_items")
                    .update({ image_url: publicUrl })
                    .eq("id", selectedMenuItemId)

                if (error) throw error

                setMenuItems((prev: any[]) =>
                    prev.map((item) =>
                        item.id === selectedMenuItemId
                            ? { ...item, image_url: publicUrl }
                            : item
                    )
                )
            }

            setUploadMessage("✅ Fotoğraf başarıyla yüklendi ve güncellendi!")
            setTimeout(() => setUploadMessage(""), 4000)
        } catch (error: any) {
            console.error("Yükleme hatası:", error)
            setUploadMessage(`Hata: ${error.message}`)
        } finally {
            setUploadingPhoto(false)
        }
    }

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const payload = {
            name: editForm.name,
            business_type: editForm.business_type,
            cuisine_type: editForm.cuisine_type,
            product_category: editForm.product_category,
            story: editForm.story,
            logo_url: editForm.logo_url,
            cover_image_url: editForm.cover_image_url,
            owner_photo_url: editForm.owner_photo_url,
            owner_image_url: editForm.owner_photo_url,
            address: editForm.address,
            phone: editForm.phone,
            email: editForm.email,
            website: editForm.website,
            parking_info: editForm.parking_info,
            service_options: editForm.service_options,
            payment_methods: editForm.payment_methods,
            weekly_hours: JSON.stringify(editForm.weekly_hours),
            is_closed: editForm.is_closed,
        }

        const { error } = await supabase
            .from("restaurants")
            .update(payload)
            .eq("id", selectedRestaurant.id)

        if (!error) {
            setSelectedRestaurant({ ...selectedRestaurant, ...editForm })
            setIsEditing(false)
            setIsAuthenticated(false)
            alert("İşletme bilgileri başarıyla Supabase'e kaydedildi!")
        } else {
            alert("Güncellenirken bir hata oluştu: " + error.message)
        }
        setSaving(false)
    }

    if (loading) {
        return (
            <div
                style={{
                    width: "100%",
                    padding: "80px 0",
                    textAlign: "center",
                    fontFamily: "sans-serif",
                    fontSize: "18px",
                    color: "#666",
                }}
            >
                Loading...
            </div>
        )
    }

    if (selectedRestaurant) {
        const fallbackBg = getPlaceholder(
            selectedRestaurant.product_category,
            selectedRestaurant.name
        )
        const bgImage =
            selectedRestaurant.cover_image_url ||
            selectedRestaurant.image_url ||
            fallbackBg
        const logoImg =
            selectedRestaurant.logo_url ||
            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80"
        const ownerImg =
            selectedRestaurant.owner_photo_url ||
            selectedRestaurant.owner_image_url ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"

        const defaultStory = selectedRestaurant.name
            ?.toLowerCase()
            .includes("pascham")
            ? "Ben İrfan Doğan. 30 yıldır Bad Doberan’ın ilk dönercisi Pascham Döner’in başındayım. Kahramanmaraş’tan bu güzel kasabaya geldiğimde burası dönerle henüz tanışmamıştı; o günlerden bugüne her şişi kendi evladımın yiyeceği titizlikle, en taze etlerle ve kusursuz bir hijyen anlayışıyla hazırladım. Müşterilerime sunduğum her lokmanın lezzeti kadar güvenli ve temiz olması benim için her şeyden önce gelir. Şimdi umEcke Ekosistemi ile dijitalde de kendi kaderimizi elimize alıyoruz. Siparişlerinizi komisyoncu dev platformlar yerine doğrudan bizden vermeniz; hem bizim 30 yıllık emeğimize ve hijyenik tezgahımıza sahip çıkmanız, hem de yerel esnafın bağımsız kalması için çok önemlidir. Gelin, bu lezzeti ve dayanışmayı birlikte yaşatalım!"
            : selectedRestaurant.story ||
              "Geleneksel lezzetleri modern dokunuşlarla buluşturduğumuz mekanımızda hizmetinizdeyiz."

        const storyText = selectedRestaurant.story || defaultStory
        const addressText =
            selectedRestaurant.address || "Steinstraße 9, 18055 Rostock"
        const phoneText = selectedRestaurant.phone || "+49 381 123456"
        const parkingText =
            selectedRestaurant.parking_info || "Ücretsiz Cadde Otoparkı"
        const servicesList = selectedRestaurant.service_options || [
            "Mekanda Servis",
            "Paket Servis",
            "Gel-Al",
        ]
        const paymentsList = selectedRestaurant.payment_methods || [
            "Nakit",
            "Kredi Kartı",
        ]
        const prodCat = selectedRestaurant.product_category || "Genel"

        let weeklyHoursData = DEFAULT_HOURS_STATE
        try {
            if (selectedRestaurant.weekly_hours) {
                weeklyHoursData =
                    typeof selectedRestaurant.weekly_hours === "string"
                        ? JSON.parse(selectedRestaurant.weekly_hours)
                        : selectedRestaurant.weekly_hours
            }
        } catch (e) {
            weeklyHoursData = DEFAULT_HOURS_STATE
        }

        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`

        return (
            <div
                style={{
                    width: "100%",
                    minHeight: "100vh",
                    fontFamily: "sans-serif",
                    background: "#f8f9fa",
                    paddingBottom: "80px",
                    boxSizing: "border-box",
                    overflowX: "hidden",
                }}
            >
                <div
                    style={{
                        background: "#fff",
                        padding: "15px 30px",
                        borderBottom: "1px solid #eaeaea",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        boxSizing: "border-box",
                        flexWrap: "wrap",
                        gap: "10px",
                    }}
                >
                    <button
                        onClick={() => {
                            setSelectedRestaurant(null)
                            setIsEditing(false)
                            setIsAuthenticated(false)
                        }}
                        style={{
                            background: "#111",
                            color: "#fff",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "bold",
                        }}
                    >
                        ← Back to Restaurants
                    </button>
                    <button
                        onClick={() => {
                            setIsEditing(!isEditing)
                            if (isEditing) setIsAuthenticated(false)
                        }}
                        style={{
                            background: isEditing ? "#e53e3e" : "#3182ce",
                            color: "#fff",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "bold",
                        }}
                    >
                        {isEditing
                            ? "✖ Paneli Kapat"
                            : "🔒 İşletme Paneli (Giriş Yap)"}
                    </button>
                </div>

                {isEditing && !isAuthenticated && (
                    <div
                        style={{
                            maxWidth: "450px",
                            width: "90%",
                            margin: "60px auto",
                            background: "#fff",
                            padding: "35px",
                            borderRadius: "12px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                            border: "2px solid #3182ce",
                            textAlign: "center",
                            boxSizing: "border-box",
                        }}
                    >
                        <h2 style={{ margin: "0 0 10px 0", color: "#111" }}>
                            İşletme Yetkili Girişi
                        </h2>
                        <p style={{ color: "#666", fontSize: "14px", marginBottom: "25px" }}>
                            <strong>{selectedRestaurant.name}</strong> yönetim paneline erişmek için lütfen işletme şifrenizi girin.
                        </p>
                        <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            <input
                                type="password"
                                placeholder="İşletme Şifresi"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box", fontSize: "16px" }}
                            />
                            {passwordError && (
                                <span style={{ color: "#e53e3e", fontSize: "13px", textAlign: "left" }}>
                                    {passwordError}
                                </span>
                            )}
                            <button
                                type="submit"
                                style={{
                                    background: "#3182ce",
                                    color: "#fff",
                                    border: "none",
                                    padding: "12px",
                                    borderRadius: "6px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    fontSize: "15px",
                                }}
                            >
                                Giriş Yap
                            </button>
                        </form>
                    </div>
                )}

                {isEditing && isAuthenticated && (
                    <div
                        style={{
                            maxWidth: "1000px",
                            width: "92%",
                            margin: "30px auto 0 auto",
                            background: "#fff",
                            padding: "30px",
                            borderRadius: "12px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                            border: "2px solid #38a169",
                            boxSizing: "border-box",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                            <div>
                                <h2 style={{ margin: "0 0 5px 0", color: "#111", fontSize: "20px" }}>
                                    ⚙️ {selectedRestaurant.name} - Yönetim Paneli
                                </h2>
                                <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                                    Profil bilgilerini güncelleyin veya kamera/galeri seçeneğiyle fotoğraf yükleyin.
                                </p>
                            </div>
                            <span style={{ background: "#c6f6d5", color: "#22543d", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                                ✓ Yetkili Oturumu Açık
                            </span>
                        </div>

                        {/* FOTOĞRAF YÜKLEME ALANI (KAMERA + GALERİ / DOSYA SEÇİMİ BİR ARADA) */}
                        <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "30px", boxSizing: "border-box" }}>
                            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", color: "#111" }}>
                                📷 Kamera & Galeri Fotoğraf Yükleme Paneli
                            </h3>
                            <p style={{ fontSize: "13px", color: "#666", marginBottom: "20px" }}>
                                Tıkladığınızda telefonunuz veya tarayıcınız size kamera ile çekme ya da galeriden/dosyalardan seçme seçeneklerini sunar.
                            </p>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "15px", boxSizing: "border-box" }}>
                                <div style={{ background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "10px", color: "#333" }}>
                                        Restoran Kapak Fotoğrafı
                                    </label>
                                    <label style={{ display: "block", textAlign: "center", background: "#DC2626", color: "#fff", padding: "12px", borderRadius: "6px", fontWeight: "bold", fontSize: "13px", cursor: "pointer" }}>
                                        {uploadingPhoto ? "Yükleniyor..." : "📷 Kamera / Galeri Seç"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={(e) => e.target.files && e.target.files[0] && handleDirectImageUpload(e.target.files[0], "restaurant_cover")}
                                            disabled={uploadingPhoto}
                                        />
                                    </label>
                                </div>

                                <div style={{ background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "10px", color: "#333" }}>
                                        İşletmeci / Hikaye Fotoğrafı
                                    </label>
                                    <label style={{ display: "block", textAlign: "center", background: "#059669", color: "#fff", padding: "12px", borderRadius: "6px", fontWeight: "bold", fontSize: "13px", cursor: "pointer" }}>
                                        {uploadingPhoto ? "Yükleniyor..." : "👤 Kamera / Galeri Seç"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={(e) => e.target.files && e.target.files[0] && handleDirectImageUpload(e.target.files[0], "owner_profile")}
                                            disabled={uploadingPhoto}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div style={{ background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd", marginTop: "15px", boxSizing: "border-box" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "8px", color: "#333" }}>
                                    Menü Ürün Fotoğrafı Güncelle
                                </label>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", boxSizing: "border-box" }}>
                                    <select
                                        value={selectedMenuItemId}
                                        onChange={(e) => setSelectedMenuItemId(e.target.value)}
                                        style={{ flex: 1, minWidth: "200px", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "13px", boxSizing: "border-box" }}
                                    >
                                        {menuItems.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} ({item.price} €)
                                            </option>
                                        ))}
                                    </select>
                                    <label style={{ background: "#2563EB", color: "#fff", padding: "10px 15px", borderRadius: "6px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" }}>
                                        {uploadingPhoto ? "Yükleniyor..." : "🍽️ Ürün Fotoğrafı Seç / Çek"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={(e) => e.target.files && e.target.files[0] && handleDirectImageUpload(e.target.files[0], "menu_item")}
                                            disabled={uploadingPhoto}
                                        />
                                    </label>
                                </div>
                            </div>

                            {uploadMessage && (
                                <div style={{ marginTop: "12px", fontSize: "14px", fontWeight: "bold", textAlign: "center", color: uploadMessage.includes("Hata") ? "red" : "green" }}>
                                    {uploadMessage}
                                </div>
                            )}
                        </div>

                        {/* Metin ve Ayar Formu */}
                        <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>
                                    Restoran Adı
                                </label>
                                <input
                                    type="text"
                                    value={editForm.name || ""}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "15px", boxSizing: "border-box" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>İşletme Türü</label>
                                    <select
                                        value={editForm.business_type || ""}
                                        onChange={(e) => setEditForm({ ...editForm, business_type: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    >
                                        {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Mutfak Tipi</label>
                                    <select
                                        value={editForm.cuisine_type || ""}
                                        onChange={(e) => setEditForm({ ...editForm, cuisine_type: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    >
                                        {CUISINE_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Ana Ürün / Uzmanlık</label>
                                    <select
                                        value={editForm.product_category || ""}
                                        onChange={(e) => setEditForm({ ...editForm, product_category: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    >
                                        {PRODUCT_CATEGORIES.map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "15px", boxSizing: "border-box" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Otopark Bilgisi</label>
                                    <select
                                        value={editForm.parking_info || ""}
                                        onChange={(e) => setEditForm({ ...editForm, parking_info: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    >
                                        {PARKING_OPTIONS.map((park) => <option key={park} value={park}>{park}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Telefon Numarası</label>
                                    <input
                                        type="text"
                                        value={editForm.phone || ""}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Sunulan Servis Seçenekleri</label>
                                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                                    {AVAILABLE_SERVICES.map((serv) => (
                                        <label key={serv} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
                                            <input
                                                type="checkbox"
                                                checked={editForm.service_options?.includes(serv) || false}
                                                onChange={() => handleCheckboxArrayChange("service_options", serv)}
                                            />
                                            {serv}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Kabul Edilen Ödeme Yöntemleri</label>
                                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                                    {AVAILABLE_PAYMENTS.map((pay) => (
                                        <label key={pay} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
                                            <input
                                                type="checkbox"
                                                checked={editForm.payment_methods?.includes(pay) || false}
                                                onChange={() => handleCheckboxArrayChange("payment_methods", pay)}
                                            />
                                            {pay}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "15px", boxSizing: "border-box" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>E-posta Adresi</label>
                                    <input
                                        type="email"
                                        value={editForm.email || ""}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Web Sitesi</label>
                                    <input
                                        type="text"
                                        value={editForm.website || ""}
                                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Hikayemiz / Hakkımızda</label>
                                <textarea
                                    rows={4}
                                    value={editForm.story || ""}
                                    onChange={(e) => setEditForm({ ...editForm, story: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Adres (Harita Linki İçin)</label>
                                <input
                                    type="text"
                                    value={editForm.address || ""}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "10px" }}>📅 Haftalık Çalışma Saatleri</label>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {DAYS_OF_WEEK.map((d) => {
                                        const dayInfo = editForm.weekly_hours?.[d.key] || { open: "10:00 - 22:00", closed: false }
                                        return (
                                            <div key={d.key} style={{ display: "flex", alignItems: "center", gap: "15px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", flexWrap: "wrap", boxSizing: "border-box" }}>
                                                <span style={{ width: "100px", fontWeight: "bold", fontSize: "14px" }}>{d.label}</span>
                                                <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", cursor: "pointer" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={dayInfo.closed}
                                                        onChange={(e) => handleDayHourChange(d.key, "closed", e.target.checked)}
                                                    />
                                                    Kapalı
                                                </label>
                                                <input
                                                    type="text"
                                                    disabled={dayInfo.closed}
                                                    value={dayInfo.open}
                                                    onChange={(e) => handleDayHourChange(d.key, "open", e.target.value)}
                                                    style={{ flex: 1, minWidth: "150px", padding: "6px 10px", borderRadius: "4px", border: "1px solid #ccc", opacity: dayInfo.closed ? 0.5 : 1, boxSizing: "border-box" }}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    background: "#38a169",
                                    color: "#fff",
                                    border: "none",
                                    padding: "14px",
                                    borderRadius: "8px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    fontSize: "16px",
                                    marginTop: "10px",
                                }}
                            >
                                {saving ? "Kaydediliyor..." : "Değişiklikleri Supabase'e Kaydet"}
                            </button>
                        </form>
                    </div>
                )}

                {/* HERO / COVER HEADER */}
                <div
                    style={{
                        width: "100%",
                        height: "380px",
                        background: `url("${bgImage}") center/cover no-repeat`,
                        position: "relative",
                        marginTop: isEditing ? "20px" : "0",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        paddingBottom: "35px",
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background:
                                "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.3))",
                        }}
                    ></div>

                    <div
                        style={{
                            position: "absolute",
                            top: "30px",
                            left: "0",
                            right: "0",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "15px",
                            flexWrap: "wrap",
                            padding: "0 20px",
                            zIndex: 2,
                            boxSizing: "border-box",
                        }}
                    >
                        <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: "#fff",
                                background: "rgba(0,0,0,0.6)",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontSize: "14px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                border: "1px solid rgba(255,255,255,0.15)",
                            }}
                        >
                            📍 {addressText} (Haritada Aç)
                        </a>
                        <a
                            href={`tel:${phoneText}`}
                            style={{
                                color: "#fff",
                                background: "rgba(0,0,0,0.6)",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontSize: "14px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                border: "1px solid rgba(255,255,255,0.15)",
                            }}
                        >
                            📞 {phoneText}
                        </a>
                        <span
                            style={{
                                color: "#fff",
                                background: "rgba(0,0,0,0.6)",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                fontSize: "14px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                border: "1px solid rgba(255,255,255,0.15)",
                            }}
                        >
                            🚗 {parkingText}
                        </span>
                    </div>

                    <div
                        style={{
                            position: "relative",
                            zIndex: 2,
                            textAlign: "center",
                            color: "#fff",
                            padding: "0 15px",
                            boxSizing: "border-box",
                        }}
                    >
                        <h1
                            style={{
                                fontSize: "36px",
                                fontWeight: "900",
                                margin: 0,
                                textShadow: "0 2px 10px rgba(0,0,0,0.6)",
                                letterSpacing: "0.5px",
                            }}
                        >
                            {selectedRestaurant.name}
                        </h1>
                    </div>
                </div>

                {/* Servis ve Ödeme Bilgileri */}
                <div
                    style={{
                        maxWidth: "1000px",
                        width: "92%",
                        margin: "30px auto 0 auto",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "20px",
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            background: "#fff",
                            padding: "20px 25px",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            boxSizing: "border-box",
                        }}
                    >
                        <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", color: "#111" }}>
                            🚀 Servis Seçenekleri
                        </h4>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                            {servicesList.map((s: string) => (
                                <span key={s} style={{ color: "#2d3748", fontSize: "14px", fontWeight: "600" }}>
                                    ✓ {s}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div
                        style={{
                            background: "#fff",
                            padding: "20px 25px",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            boxSizing: "border-box",
                        }}
                    >
                        <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", color: "#111" }}>
                            💳 Kabul Edilen Ödemeler
                        </h4>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                            {paymentsList.map((p: string) => (
                                <span key={p} style={{ color: "#2d3748", fontSize: "14px", fontWeight: "600" }}>
                                    ✓ {p}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Haftalık Çalışma Saatleri */}
                <div
                    style={{
                        maxWidth: "1000px",
                        width: "92%",
                        margin: "30px auto 0 auto",
                        background: "#fff",
                        padding: "25px 30px",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        boxSizing: "border-box",
                    }}
                >
                    <h3 style={{ margin: "0 0 20px 0", color: "#111", fontSize: "18px" }}>
                        📅 Günlük Çalışma Saatleri
                    </h3>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                            gap: "15px",
                            boxSizing: "border-box",
                        }}
                    >
                        {DAYS_OF_WEEK.map((d) => {
                            const dInfo = weeklyHoursData[d.key] || {
                                open: "10:00 - 22:00",
                                closed: false,
                            }
                            return (
                                <div
                                    key={d.key}
                                    style={{
                                        background: "#fafafa",
                                        padding: "12px 16px",
                                        borderRadius: "8px",
                                        border: "1px solid #eaeaea",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "4px",
                                        boxSizing: "border-box",
                                    }}
                                >
                                    <span style={{ fontSize: "13px", fontWeight: "bold", color: "#666" }}>
                                        {d.label}
                                    </span>
                                    {dInfo.closed ? (
                                        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#e53e3e" }}>
                                            Kapalı
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#2d3748" }}>
                                            {dInfo.open}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* HİKAYEMİZ */}
                <div
                    style={{
                        maxWidth: "1000px",
                        width: "92%",
                        margin: "30px auto 0 auto",
                        background: "#fff",
                        padding: "25px 30px",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        display: "flex",
                        gap: "25px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            width: "80px",
                            height: "80px",
                            borderRadius: "50%",
                            overflow: "hidden",
                            border: "3px solid #e53e3e",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            background: "#fff",
                            flexShrink: 0,
                        }}
                    >
                        <img
                            src={ownerImg}
                            alt="Owner"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: "250px" }}>
                        <h3 style={{ margin: "0 0 8px 0", color: "#111" }}>Hikayemiz</h3>
                        <p style={{ color: "#555", lineHeight: "1.6", margin: 0, fontSize: "14px" }}>
                            {storyText}
                        </p>
                    </div>
                </div>

                {/* MENÜ LİSTESİ */}
                <div style={{ maxWidth: "1000px", width: "92%", margin: "40px auto 0 auto", boxSizing: "border-box" }}>
                    <h2 style={{ fontSize: "24px", marginBottom: "20px", color: "#111" }}>
                        Menu
                    </h2>
                    {menuItems.length === 0 ? (
                        <p style={{ color: "#666" }}>No menu items found for this restaurant.</p>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                                gap: "20px",
                                boxSizing: "border-box",
                            }}
                        >
                            {menuItems.map((item) => {
                                const itemFallback = getPlaceholder(prodCat, item.name)
                                const itemImage = item.image_url || itemFallback
                                return (
                                    <div
                                        key={item.id}
                                        style={{
                                            background: "#fff",
                                            borderRadius: "12px",
                                            overflow: "hidden",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                                            display: "flex",
                                            flexDirection: "column",
                                            boxSizing: "border-box",
                                        }}
                                    >
                                        <div style={{ width: "100%", height: "160px", background: "#f0f0f0" }}>
                                            <img
                                                src={itemImage}
                                                alt={item.name}
                                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                            />
                                        </div>
                                        <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", boxSizing: "border-box" }}>
                                            <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                                                    <h4 style={{ margin: 0, fontSize: "18px", color: "#111" }}>
                                                        {item.name}
                                                    </h4>
                                                    <span style={{ fontWeight: "bold", color: "#e53e3e", fontSize: "16px" }}>
                                                        {item.price} €
                                                    </span>
                                                </div>
                                                <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div
            style={{
                width: "100%",
                minHeight: "100vh",
                fontFamily: "sans-serif",
                boxSizing: "border-box",
                padding: "40px 20px",
                background: "#f8f9fa",
                overflowX: "hidden",
            }}
        >
            <div style={{ maxWidth: "1100px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
                <div style={{ textAlign: "center", marginBottom: "50px" }}>
                    <div style={{ display: "inline-block", marginBottom: "20px" }}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 720 220"
                            style={{ width: "280px", height: "auto", display: "block", margin: "0 auto" }}
                        >
                            <defs>
                                <linearGradient id="cornerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ff3b00" />
                                    <stop offset="100%" stopColor="#ff9900" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M 60 170 L 60 90 C 60 73.431 73.431 60 90 60 L 175 60"
                                fill="none"
                                stroke="url(#cornerGrad)"
                                strokeWidth="18"
                                strokeLinecap="round"
                            />
                            <path
                                d="M 60 170 L 60 120"
                                fill="none"
                                stroke="#222222"
                                strokeWidth="18"
                                strokeLinecap="round"
                            />
                            <text
                                x="220"
                                y="130"
                                fontFamily="sans-serif"
                                fontWeight="900"
                                fontSize="76"
                                fill="#222222"
                                letterSpacing="2"
                            >
                                UM<tspan fill="#ff9900">ECKE</tspan>
                            </text>
                            <text
                                x="222"
                                y="172"
                                fontFamily="sans-serif"
                                fontWeight="500"
                                fontSize="20"
                                fill="#666666"
                                letterSpacing="0.5"
                            >
                                Local flavor, right around the corner.
                            </text>
                        </svg>
                    </div>

                    <p
                        style={{
                            color: "#555",
                            fontSize: "18px",
                            maxWidth: "750px",
                            margin: "0 auto 40px auto",
                            lineHeight: "1.6",
                        }}
                    >
                        A local food movement built to bypass greedy commissions, support neighborhood restaurants, and bring you real flavor straight from the counter around the corner.
                    </p>

                    <h3 style={{ fontSize: "22px", color: "#111", marginBottom: "20px" }}>
                        Discover Local Restaurants
                    </h3>
                </div>

                {/* RESTORAN KARTLARI LİSTESİ */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: "25px",
                        boxSizing: "border-box",
                    }}
                >
                    {restaurants.map((res) => {
                        const cardProd = res.product_category || "Genel"
                        const fallbackCard = getPlaceholder(cardProd, res.name)
                        const cardImage =
                            res.cover_image_url || res.image_url || fallbackCard
                        const cardLogo =
                            res.logo_url ||
                            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80"
                        return (
                            <div
                                key={res.id}
                                onClick={() => setSelectedRestaurant(res)}
                                style={{
                                    background: "#fff",
                                    borderRadius: "16px",
                                    overflow: "hidden",
                                    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
                                    cursor: "pointer",
                                    transition: "transform 0.2s ease",
                                    border: "1px solid #eaeaea",
                                    position: "relative",
                                    boxSizing: "border-box",
                                }}
                            >
                                <div style={{ width: "100%", height: "200px", background: "#f0f0f0", position: "relative" }}>
                                    <img
                                        src={cardImage}
                                        alt={res.name}
                                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                    />
                                    <div
                                        style={{
                                            position: "absolute",
                                            bottom: "12px",
                                            left: "15px",
                                            width: "55px",
                                            height: "55px",
                                            borderRadius: "50%",
                                            overflow: "hidden",
                                            border: "2px solid #fff",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                            background: "#fff",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <img
                                            src={cardLogo}
                                            alt="Logo"
                                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                        />
                                    </div>
                                </div>
                                <div style={{ padding: "20px", boxSizing: "border-box" }}>
                                    <h3 style={{ fontSize: "20px", margin: "6px 0 8px 0", color: "#111" }}>
                                        {res.name}
                                    </h3>
                                    <p
                                        style={{
                                            color: "#666",
                                            fontSize: "14px",
                                            margin: "0 0 15px 0",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {res.story || res.description || "Delicious foods and fresh menus..."}
                                    </p>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            paddingTop: "12px",
                                            borderTop: "1px solid #f0f0f0",
                                        }}
                                    >
                                        <span style={{ fontSize: "13px", color: "#888" }}>
                                            📍 {res.address || "Rostock"}
                                        </span>
                                        <span style={{ fontWeight: "bold", color: "#111", fontSize: "14px" }}>
                                            View Menu →
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
=======
"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://yajeiyecxkwmwqkfkxvp.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_pz5KKsdQXXlG7kV239OoJw_YsNuF3w7"

const DEFAULT_IMAGES: { [key: string]: string } = {
    pizza: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
    burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    sushi: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80",
    doner: "https://images.unsplash.com/photo-1561651823-34feb02255e7?auto=format&fit=crop&w=600&q=80",
    default:
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
}

const BUSINESS_TYPES = [
    "Restoran",
    "Paket Servis / İmbiss",
    "Kafe / Kafeterya",
    "Bar / Pub",
    "Fast Food Restoranı",
    "Sokak Lezzetleri / Büfe",
    "Kiosk",
    "Pop-up İşletme",
    "Fırın / Pastane",
    "Food Truck",
]

const CUISINE_TYPES = [
    "Alman / Yerel Mutfak",
    "Türk / Anadolu Mutfağı",
    "İtalyan Mutfağı",
    "Akdeniz Mutfağı",
    "Asya Mutfağı",
    "Amerikan / Burger",
    "Latin Amerika / Meksika",
    "Uzak Doğu / Çin & Japon",
    "Hint / Asya Baharatları",
    "Uluslararası / Karışık",
]

const PRODUCT_CATEGORIES = [
    "Döner & Kebap",
    "Pizza",
    "Burger",
    "Broiler / Tavuk & Izgara",
    "Balık & Deniz Ürünleri",
    "Sandviç & Wrap",
    "Kahve & Tatlı",
    "Makarna & Hamur İşi",
    "Çorba & Ev Yemekleri",
    "Salata & Sağlıklı Yaşam",
]

const PARKING_OPTIONS = [
    "Ücretsiz Cadde Otoparkı",
    "Ücretli Cadde Otoparkı",
    "Özel Otopark / Garaj",
    "Otopark Bulunmuyor",
]

const AVAILABLE_SERVICES = [
    "Mekanda Servis",
    "Paket Servis",
    "Gel-Al",
    "Temassız Teslimat",
]

const AVAILABLE_PAYMENTS = [
    "Nakit",
    "Kredi Kartı",
    "Yemek Çeki / Sodexo",
    "Temassız / Mobil Ödeme",
]

const DAYS_OF_WEEK = [
    { key: "mon", label: "Pazartesi" },
    { key: "tue", label: "Salı" },
    { key: "wed", label: "Çarşamba" },
    { key: "thu", label: "Perşembe" },
    { key: "fri", label: "Cuma" },
    { key: "sat", label: "Cumartesi" },
    { key: "sun", label: "Pazar" },
]

const DEFAULT_HOURS_STATE = {
    mon: { open: "10:00 - 22:00", closed: false },
    tue: { open: "10:00 - 22:00", closed: false },
    wed: { open: "10:00 - 22:00", closed: false },
    thu: { open: "10:00 - 22:00", closed: false },
    fri: { open: "10:00 - 22:00", closed: false },
    sat: { open: "10:00 - 22:00", closed: false },
    sun: { open: "Kapalı", closed: true },
}

function getPlaceholder(productCategory: string, itemName: string = "") {
    const text = `${productCategory || ""} ${itemName || ""}`.toLowerCase()
    if (text.includes("pizza")) return DEFAULT_IMAGES.pizza
    if (text.includes("burger")) return DEFAULT_IMAGES.burger
    if (text.includes("sushi") || text.includes("uzak doğu"))
        return DEFAULT_IMAGES.sushi
    if (text.includes("döner") || text.includes("kebap"))
        return DEFAULT_IMAGES.doner
    return DEFAULT_IMAGES.default
}

export default function RestaurantManager() {
    const [supabase, setSupabase] = useState<any>(null)
    const [restaurants, setRestaurants] = useState<any[]>([])
    const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null)
    const [menuItems, setMenuItems] = useState<any[]>([])
    const [loading, setLoading] = useState<boolean>(true)

    const [isEditing, setIsEditing] = useState<boolean>(false)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
    const [passwordInput, setPasswordInput] = useState<string>("")
    const [passwordError, setPasswordError] = useState<string>("")

    const [editForm, setEditForm] = useState<any>({})
    const [saving, setSaving] = useState<boolean>(false)
    const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false)
    const [uploadMessage, setUploadMessage] = useState<string>("")
    const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>("")

    useEffect(() => {
        const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        setSupabase(client)
    }, [])

    useEffect(() => {
        if (!supabase) return
        async function fetchRestaurants() {
            setLoading(true)
            const { data, error } = await supabase
                .from("restaurants")
                .select("*")
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
                if (uniqueMenu.length > 0) setSelectedMenuItemId(uniqueMenu[0].id)
            }
        }
        fetchMenu()

        let parsedHours = DEFAULT_HOURS_STATE
        try {
            if (selectedRestaurant.weekly_hours) {
                parsedHours =
                    typeof selectedRestaurant.weekly_hours === "string"
                        ? JSON.parse(selectedRestaurant.weekly_hours)
                        : selectedRestaurant.weekly_hours
            }
        } catch (e) {
            parsedHours = DEFAULT_HOURS_STATE
        }

        const defaultStory = selectedRestaurant.name
            ?.toLowerCase()
            .includes("pascham")
            ? "Ben İrfan Doğan. 30 yıldır Bad Doberan’ın ilk dönercisi Pascham Döner’in başındayım. Kahramanmaraş’tan bu güzel kasabaya geldiğimde burası dönerle henüz tanışmamıştı; o günlerden bugüne her şişi kendi evladımın yiyeceği titizlikle, en taze etlerle ve kusursuz bir hijyen anlayışıyla hazırladım. Müşterilerime sunduğum her lokmanın lezzeti kadar güvenli ve temiz olması benim için her şeyden önce gelir. Şimdi umEcke Ekosistemi ile dijitalde de kendi kaderimizi elimize alıyoruz. Siparişlerinizi komisyoncu dev platformlar yerine doğrudan bizden vermeniz; hem bizim 30 yıllık emeğimize ve hijyenik tezgahımıza sahip çıkmanız, hem de yerel esnafın bağımsız kalması için çok önemlidir. Gelin, bu lezzeti ve dayanışmayı birlikte yaşatalım!"
            : selectedRestaurant.story ||
              "Geleneksel lezzetleri modern dokunuşlarla buluşturduğumuz mekanımızda hizmetinizdeyiz."

        setEditForm({
            name: selectedRestaurant.name || "",
            business_type: selectedRestaurant.business_type || "Restoran",
            cuisine_type:
                selectedRestaurant.cuisine_type || "Alman / Yerel Mutfak",
            product_category:
                selectedRestaurant.product_category || "Döner & Kebap",
            story: defaultStory,
            logo_url:
                selectedRestaurant.logo_url ||
                "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80",
            cover_image_url:
                selectedRestaurant.cover_image_url ||
                selectedRestaurant.image_url ||
                "",
            owner_photo_url:
                selectedRestaurant.owner_photo_url ||
                selectedRestaurant.owner_image_url ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
            address: selectedRestaurant.address || "",
            phone: selectedRestaurant.phone || "",
            email: selectedRestaurant.email || "",
            website: selectedRestaurant.website || "",
            parking_info:
                selectedRestaurant.parking_info || "Ücretsiz Cadde Otoparkı",
            service_options: selectedRestaurant.service_options || [
                "Mekanda Servis",
                "Paket Servis",
                "Gel-Al",
            ],
            payment_methods: selectedRestaurant.payment_methods || [
                "Nakit",
                "Kredi Kartı",
            ],
            weekly_hours: parsedHours,
            is_closed: selectedRestaurant.is_closed || false,
        })
        setIsAuthenticated(false)
        setPasswordInput("")
        setPasswordError("")
        setUploadMessage("")
    }, [supabase, selectedRestaurant])

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const correctPassword = selectedRestaurant.password || "umecke2026"
        if (passwordInput === correctPassword) {
            setIsAuthenticated(true)
            setPasswordError("")
        } else {
            setPasswordError("Hatalı şifre! Lütfen işletme şifrenizi giriniz.")
        }
    }

    const handleDayHourChange = (dayKey: string, field: string, value: any) => {
        setEditForm((prev: any) => {
            const currentDayObj = prev.weekly_hours[dayKey] || {
                open: "10:00 - 22:00",
                closed: false,
            }
            return {
                ...prev,
                weekly_hours: {
                    ...prev.weekly_hours,
                    [dayKey]: {
                        ...currentDayObj,
                        [field]: value,
                    },
                },
            }
        })
    }

    const handleCheckboxArrayChange = (field: string, item: string) => {
        setEditForm((prev: any) => {
            const currentList = prev[field] || []
            if (currentList.includes(item)) {
                return {
                    ...prev,
                    [field]: currentList.filter((i: string) => i !== item),
                }
            } else {
                return { ...prev, [field]: [...currentList, item] }
            }
        })
    }

    const handleDirectImageUpload = async (file: File, type: string) => {
        try {
            setUploadingPhoto(true)
            setUploadMessage("Fotoğraf yükleniyor...")

            const fileExt = file.name.split(".").pop() || "jpg"
            const fileName = `${type}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from("menu-images")
                .upload(fileName, file)

            if (uploadError) {
                throw new Error("Storage yükleme hatası: " + uploadError.message)
            }

            const { data: publicURLData } = supabase.storage
                .from("menu-images")
                .getPublicUrl(fileName)

            const publicUrl = publicURLData.publicUrl

            if (type === "restaurant_cover") {
                const { error } = await supabase
                    .from("restaurants")
                    .update({
                        image_url: publicUrl,
                        cover_image_url: publicUrl,
                    })
                    .eq("id", selectedRestaurant.id)

                if (error) throw error
                setEditForm((prev: any) => ({
                    ...prev,
                    cover_image_url: publicUrl,
                }))
                setSelectedRestaurant((prev: any) => ({
                    ...prev,
                    cover_image_url: publicUrl,
                    image_url: publicUrl,
                }))
            } else if (type === "owner_profile") {
                const { error } = await supabase
                    .from("restaurants")
                    .update({
                        owner_photo_url: publicUrl,
                        owner_image_url: publicUrl,
                    })
                    .eq("id", selectedRestaurant.id)

                if (error) throw error
                setEditForm((prev: any) => ({
                    ...prev,
                    owner_photo_url: publicUrl,
                }))
                setSelectedRestaurant((prev: any) => ({
                    ...prev,
                    owner_photo_url: publicUrl,
                }))
            } else if (type === "menu_item") {
                if (!selectedMenuItemId) {
                    throw new Error("Lütfen fotoğraf yüklenecek menü ürününü seçin.")
                }
                const { error } = await supabase
                    .from("menu_items")
                    .update({ image_url: publicUrl })
                    .eq("id", selectedMenuItemId)

                if (error) throw error

                setMenuItems((prev: any[]) =>
                    prev.map((item) =>
                        item.id === selectedMenuItemId
                            ? { ...item, image_url: publicUrl }
                            : item
                    )
                )
            }

            setUploadMessage("✅ Fotoğraf başarıyla yüklendi ve güncellendi!")
            setTimeout(() => setUploadMessage(""), 4000)
        } catch (error: any) {
            console.error("Yükleme hatası:", error)
            setUploadMessage(`Hata: ${error.message}`)
        } finally {
            setUploadingPhoto(false)
        }
    }

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const payload = {
            name: editForm.name,
            business_type: editForm.business_type,
            cuisine_type: editForm.cuisine_type,
            product_category: editForm.product_category,
            story: editForm.story,
            logo_url: editForm.logo_url,
            cover_image_url: editForm.cover_image_url,
            owner_photo_url: editForm.owner_photo_url,
            owner_image_url: editForm.owner_photo_url,
            address: editForm.address,
            phone: editForm.phone,
            email: editForm.email,
            website: editForm.website,
            parking_info: editForm.parking_info,
            service_options: editForm.service_options,
            payment_methods: editForm.payment_methods,
            weekly_hours: JSON.stringify(editForm.weekly_hours),
            is_closed: editForm.is_closed,
        }

        const { error } = await supabase
            .from("restaurants")
            .update(payload)
            .eq("id", selectedRestaurant.id)

        if (!error) {
            setSelectedRestaurant({ ...selectedRestaurant, ...editForm })
            setIsEditing(false)
            setIsAuthenticated(false)
            alert("İşletme bilgileri başarıyla Supabase'e kaydedildi!")
        } else {
            alert("Güncellenirken bir hata oluştu: " + error.message)
        }
        setSaving(false)
    }

    if (loading) {
        return (
            <div
                style={{
                    width: "100%",
                    padding: "80px 0",
                    textAlign: "center",
                    fontFamily: "sans-serif",
                    fontSize: "18px",
                    color: "#666",
                }}
            >
                Loading...
            </div>
        )
    }

    if (selectedRestaurant) {
        const fallbackBg = getPlaceholder(
            selectedRestaurant.product_category,
            selectedRestaurant.name
        )
        const bgImage =
            selectedRestaurant.cover_image_url ||
            selectedRestaurant.image_url ||
            fallbackBg
        const logoImg =
            selectedRestaurant.logo_url ||
            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80"
        const ownerImg =
            selectedRestaurant.owner_photo_url ||
            selectedRestaurant.owner_image_url ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"

        const defaultStory = selectedRestaurant.name
            ?.toLowerCase()
            .includes("pascham")
            ? "Ben İrfan Doğan. 30 yıldır Bad Doberan’ın ilk dönercisi Pascham Döner’in başındayım. Kahramanmaraş’tan bu güzel kasabaya geldiğimde burası dönerle henüz tanışmamıştı; o günlerden bugüne her şişi kendi evladımın yiyeceği titizlikle, en taze etlerle ve kusursuz bir hijyen anlayışıyla hazırladım. Müşterilerime sunduğum her lokmanın lezzeti kadar güvenli ve temiz olması benim için her şeyden önce gelir. Şimdi umEcke Ekosistemi ile dijitalde de kendi kaderimizi elimize alıyoruz. Siparişlerinizi komisyoncu dev platformlar yerine doğrudan bizden vermeniz; hem bizim 30 yıllık emeğimize ve hijyenik tezgahımıza sahip çıkmanız, hem de yerel esnafın bağımsız kalması için çok önemlidir. Gelin, bu lezzeti ve dayanışmayı birlikte yaşatalım!"
            : selectedRestaurant.story ||
              "Geleneksel lezzetleri modern dokunuşlarla buluşturduğumuz mekanımızda hizmetinizdeyiz."

        const storyText = selectedRestaurant.story || defaultStory
        const addressText =
            selectedRestaurant.address || "Steinstraße 9, 18055 Rostock"
        const phoneText = selectedRestaurant.phone || "+49 381 123456"
        const parkingText =
            selectedRestaurant.parking_info || "Ücretsiz Cadde Otoparkı"
        const servicesList = selectedRestaurant.service_options || [
            "Mekanda Servis",
            "Paket Servis",
            "Gel-Al",
        ]
        const paymentsList = selectedRestaurant.payment_methods || [
            "Nakit",
            "Kredi Kartı",
        ]
        const prodCat = selectedRestaurant.product_category || "Genel"

        let weeklyHoursData = DEFAULT_HOURS_STATE
        try {
            if (selectedRestaurant.weekly_hours) {
                weeklyHoursData =
                    typeof selectedRestaurant.weekly_hours === "string"
                        ? JSON.parse(selectedRestaurant.weekly_hours)
                        : selectedRestaurant.weekly_hours
            }
        } catch (e) {
            weeklyHoursData = DEFAULT_HOURS_STATE
        }

        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`

        return (
            <div
                style={{
                    width: "100%",
                    minHeight: "100vh",
                    fontFamily: "sans-serif",
                    background: "#f8f9fa",
                    paddingBottom: "80px",
                    boxSizing: "border-box",
                    overflowX: "hidden",
                }}
            >
                <div
                    style={{
                        background: "#fff",
                        padding: "15px 30px",
                        borderBottom: "1px solid #eaeaea",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        boxSizing: "border-box",
                        flexWrap: "wrap",
                        gap: "10px",
                    }}
                >
                    <button
                        onClick={() => {
                            setSelectedRestaurant(null)
                            setIsEditing(false)
                            setIsAuthenticated(false)
                        }}
                        style={{
                            background: "#111",
                            color: "#fff",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "bold",
                        }}
                    >
                        ← Back to Restaurants
                    </button>
                    <button
                        onClick={() => {
                            setIsEditing(!isEditing)
                            if (isEditing) setIsAuthenticated(false)
                        }}
                        style={{
                            background: isEditing ? "#e53e3e" : "#3182ce",
                            color: "#fff",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "bold",
                        }}
                    >
                        {isEditing
                            ? "✖ Paneli Kapat"
                            : "🔒 İşletme Paneli (Giriş Yap)"}
                    </button>
                </div>

                {isEditing && !isAuthenticated && (
                    <div
                        style={{
                            maxWidth: "450px",
                            width: "90%",
                            margin: "60px auto",
                            background: "#fff",
                            padding: "35px",
                            borderRadius: "12px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                            border: "2px solid #3182ce",
                            textAlign: "center",
                            boxSizing: "border-box",
                        }}
                    >
                        <h2 style={{ margin: "0 0 10px 0", color: "#111" }}>
                            İşletme Yetkili Girişi
                        </h2>
                        <p style={{ color: "#666", fontSize: "14px", marginBottom: "25px" }}>
                            <strong>{selectedRestaurant.name}</strong> yönetim paneline erişmek için lütfen işletme şifrenizi girin.
                        </p>
                        <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            <input
                                type="password"
                                placeholder="İşletme Şifresi"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box", fontSize: "16px" }}
                            />
                            {passwordError && (
                                <span style={{ color: "#e53e3e", fontSize: "13px", textAlign: "left" }}>
                                    {passwordError}
                                </span>
                            )}
                            <button
                                type="submit"
                                style={{
                                    background: "#3182ce",
                                    color: "#fff",
                                    border: "none",
                                    padding: "12px",
                                    borderRadius: "6px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    fontSize: "15px",
                                }}
                            >
                                Giriş Yap
                            </button>
                        </form>
                    </div>
                )}

                {isEditing && isAuthenticated && (
                    <div
                        style={{
                            maxWidth: "1000px",
                            width: "92%",
                            margin: "30px auto 0 auto",
                            background: "#fff",
                            padding: "30px",
                            borderRadius: "12px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                            border: "2px solid #38a169",
                            boxSizing: "border-box",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                            <div>
                                <h2 style={{ margin: "0 0 5px 0", color: "#111", fontSize: "20px" }}>
                                    ⚙️ {selectedRestaurant.name} - Yönetim Paneli
                                </h2>
                                <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                                    Profil bilgilerini güncelleyin veya kamera/galeri seçeneğiyle fotoğraf yükleyin.
                                </p>
                            </div>
                            <span style={{ background: "#c6f6d5", color: "#22543d", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                                ✓ Yetkili Oturumu Açık
                            </span>
                        </div>

                        {/* FOTOĞRAF YÜKLEME ALANI (KAMERA + GALERİ / DOSYA SEÇİMİ BİR ARADA) */}
                        <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "30px", boxSizing: "border-box" }}>
                            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", color: "#111" }}>
                                📷 Kamera & Galeri Fotoğraf Yükleme Paneli
                            </h3>
                            <p style={{ fontSize: "13px", color: "#666", marginBottom: "20px" }}>
                                Tıkladığınızda telefonunuz veya tarayıcınız size kamera ile çekme ya da galeriden/dosyalardan seçme seçeneklerini sunar.
                            </p>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "15px", boxSizing: "border-box" }}>
                                <div style={{ background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "10px", color: "#333" }}>
                                        Restoran Kapak Fotoğrafı
                                    </label>
                                    <label style={{ display: "block", textAlign: "center", background: "#DC2626", color: "#fff", padding: "12px", borderRadius: "6px", fontWeight: "bold", fontSize: "13px", cursor: "pointer" }}>
                                        {uploadingPhoto ? "Yükleniyor..." : "📷 Kamera / Galeri Seç"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={(e) => e.target.files && e.target.files[0] && handleDirectImageUpload(e.target.files[0], "restaurant_cover")}
                                            disabled={uploadingPhoto}
                                        />
                                    </label>
                                </div>

                                <div style={{ background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "10px", color: "#333" }}>
                                        İşletmeci / Hikaye Fotoğrafı
                                    </label>
                                    <label style={{ display: "block", textAlign: "center", background: "#059669", color: "#fff", padding: "12px", borderRadius: "6px", fontWeight: "bold", fontSize: "13px", cursor: "pointer" }}>
                                        {uploadingPhoto ? "Yükleniyor..." : "👤 Kamera / Galeri Seç"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={(e) => e.target.files && e.target.files[0] && handleDirectImageUpload(e.target.files[0], "owner_profile")}
                                            disabled={uploadingPhoto}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div style={{ background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd", marginTop: "15px", boxSizing: "border-box" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "8px", color: "#333" }}>
                                    Menü Ürün Fotoğrafı Güncelle
                                </label>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", boxSizing: "border-box" }}>
                                    <select
                                        value={selectedMenuItemId}
                                        onChange={(e) => setSelectedMenuItemId(e.target.value)}
                                        style={{ flex: 1, minWidth: "200px", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "13px", boxSizing: "border-box" }}
                                    >
                                        {menuItems.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} ({item.price} €)
                                            </option>
                                        ))}
                                    </select>
                                    <label style={{ background: "#2563EB", color: "#fff", padding: "10px 15px", borderRadius: "6px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" }}>
                                        {uploadingPhoto ? "Yükleniyor..." : "🍽️ Ürün Fotoğrafı Seç / Çek"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={(e) => e.target.files && e.target.files[0] && handleDirectImageUpload(e.target.files[0], "menu_item")}
                                            disabled={uploadingPhoto}
                                        />
                                    </label>
                                </div>
                            </div>

                            {uploadMessage && (
                                <div style={{ marginTop: "12px", fontSize: "14px", fontWeight: "bold", textAlign: "center", color: uploadMessage.includes("Hata") ? "red" : "green" }}>
                                    {uploadMessage}
                                </div>
                            )}
                        </div>

                        {/* Metin ve Ayar Formu */}
                        <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>
                                    Restoran Adı
                                </label>
                                <input
                                    type="text"
                                    value={editForm.name || ""}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "15px", boxSizing: "border-box" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>İşletme Türü</label>
                                    <select
                                        value={editForm.business_type || ""}
                                        onChange={(e) => setEditForm({ ...editForm, business_type: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    >
                                        {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Mutfak Tipi</label>
                                    <select
                                        value={editForm.cuisine_type || ""}
                                        onChange={(e) => setEditForm({ ...editForm, cuisine_type: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    >
                                        {CUISINE_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Ana Ürün / Uzmanlık</label>
                                    <select
                                        value={editForm.product_category || ""}
                                        onChange={(e) => setEditForm({ ...editForm, product_category: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    >
                                        {PRODUCT_CATEGORIES.map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "15px", boxSizing: "border-box" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Otopark Bilgisi</label>
                                    <select
                                        value={editForm.parking_info || ""}
                                        onChange={(e) => setEditForm({ ...editForm, parking_info: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    >
                                        {PARKING_OPTIONS.map((park) => <option key={park} value={park}>{park}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Telefon Numarası</label>
                                    <input
                                        type="text"
                                        value={editForm.phone || ""}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Sunulan Servis Seçenekleri</label>
                                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                                    {AVAILABLE_SERVICES.map((serv) => (
                                        <label key={serv} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
                                            <input
                                                type="checkbox"
                                                checked={editForm.service_options?.includes(serv) || false}
                                                onChange={() => handleCheckboxArrayChange("service_options", serv)}
                                            />
                                            {serv}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Kabul Edilen Ödeme Yöntemleri</label>
                                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                                    {AVAILABLE_PAYMENTS.map((pay) => (
                                        <label key={pay} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
                                            <input
                                                type="checkbox"
                                                checked={editForm.payment_methods?.includes(pay) || false}
                                                onChange={() => handleCheckboxArrayChange("payment_methods", pay)}
                                            />
                                            {pay}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "15px", boxSizing: "border-box" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>E-posta Adresi</label>
                                    <input
                                        type="email"
                                        value={editForm.email || ""}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Web Sitesi</label>
                                    <input
                                        type="text"
                                        value={editForm.website || ""}
                                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Hikayemiz / Hakkımızda</label>
                                <textarea
                                    rows={4}
                                    value={editForm.story || ""}
                                    onChange={(e) => setEditForm({ ...editForm, story: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Adres (Harita Linki İçin)</label>
                                <input
                                    type="text"
                                    value={editForm.address || ""}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "10px" }}>📅 Haftalık Çalışma Saatleri</label>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {DAYS_OF_WEEK.map((d) => {
                                        const dayInfo = editForm.weekly_hours?.[d.key] || { open: "10:00 - 22:00", closed: false }
                                        return (
                                            <div key={d.key} style={{ display: "flex", alignItems: "center", gap: "15px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", flexWrap: "wrap", boxSizing: "border-box" }}>
                                                <span style={{ width: "100px", fontWeight: "bold", fontSize: "14px" }}>{d.label}</span>
                                                <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", cursor: "pointer" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={dayInfo.closed}
                                                        onChange={(e) => handleDayHourChange(d.key, "closed", e.target.checked)}
                                                    />
                                                    Kapalı
                                                </label>
                                                <input
                                                    type="text"
                                                    disabled={dayInfo.closed}
                                                    value={dayInfo.open}
                                                    onChange={(e) => handleDayHourChange(d.key, "open", e.target.value)}
                                                    style={{ flex: 1, minWidth: "150px", padding: "6px 10px", borderRadius: "4px", border: "1px solid #ccc", opacity: dayInfo.closed ? 0.5 : 1, boxSizing: "border-box" }}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    background: "#38a169",
                                    color: "#fff",
                                    border: "none",
                                    padding: "14px",
                                    borderRadius: "8px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    fontSize: "16px",
                                    marginTop: "10px",
                                }}
                            >
                                {saving ? "Kaydediliyor..." : "Değişiklikleri Supabase'e Kaydet"}
                            </button>
                        </form>
                    </div>
                )}

                {/* HERO / COVER HEADER */}
                <div
                    style={{
                        width: "100%",
                        height: "380px",
                        background: `url("${bgImage}") center/cover no-repeat`,
                        position: "relative",
                        marginTop: isEditing ? "20px" : "0",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        paddingBottom: "35px",
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background:
                                "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.3))",
                        }}
                    ></div>

                    <div
                        style={{
                            position: "absolute",
                            top: "30px",
                            left: "0",
                            right: "0",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "15px",
                            flexWrap: "wrap",
                            padding: "0 20px",
                            zIndex: 2,
                            boxSizing: "border-box",
                        }}
                    >
                        <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: "#fff",
                                background: "rgba(0,0,0,0.6)",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontSize: "14px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                border: "1px solid rgba(255,255,255,0.15)",
                            }}
                        >
                            📍 {addressText} (Haritada Aç)
                        </a>
                        <a
                            href={`tel:${phoneText}`}
                            style={{
                                color: "#fff",
                                background: "rgba(0,0,0,0.6)",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontSize: "14px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                border: "1px solid rgba(255,255,255,0.15)",
                            }}
                        >
                            📞 {phoneText}
                        </a>
                        <span
                            style={{
                                color: "#fff",
                                background: "rgba(0,0,0,0.6)",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                fontSize: "14px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                border: "1px solid rgba(255,255,255,0.15)",
                            }}
                        >
                            🚗 {parkingText}
                        </span>
                    </div>

                    <div
                        style={{
                            position: "relative",
                            zIndex: 2,
                            textAlign: "center",
                            color: "#fff",
                            padding: "0 15px",
                            boxSizing: "border-box",
                        }}
                    >
                        <h1
                            style={{
                                fontSize: "36px",
                                fontWeight: "900",
                                margin: 0,
                                textShadow: "0 2px 10px rgba(0,0,0,0.6)",
                                letterSpacing: "0.5px",
                            }}
                        >
                            {selectedRestaurant.name}
                        </h1>
                    </div>
                </div>

                {/* Servis ve Ödeme Bilgileri */}
                <div
                    style={{
                        maxWidth: "1000px",
                        width: "92%",
                        margin: "30px auto 0 auto",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "20px",
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            background: "#fff",
                            padding: "20px 25px",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            boxSizing: "border-box",
                        }}
                    >
                        <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", color: "#111" }}>
                            🚀 Servis Seçenekleri
                        </h4>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                            {servicesList.map((s: string) => (
                                <span key={s} style={{ color: "#2d3748", fontSize: "14px", fontWeight: "600" }}>
                                    ✓ {s}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div
                        style={{
                            background: "#fff",
                            padding: "20px 25px",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            boxSizing: "border-box",
                        }}
                    >
                        <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", color: "#111" }}>
                            💳 Kabul Edilen Ödemeler
                        </h4>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                            {paymentsList.map((p: string) => (
                                <span key={p} style={{ color: "#2d3748", fontSize: "14px", fontWeight: "600" }}>
                                    ✓ {p}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Haftalık Çalışma Saatleri */}
                <div
                    style={{
                        maxWidth: "1000px",
                        width: "92%",
                        margin: "30px auto 0 auto",
                        background: "#fff",
                        padding: "25px 30px",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        boxSizing: "border-box",
                    }}
                >
                    <h3 style={{ margin: "0 0 20px 0", color: "#111", fontSize: "18px" }}>
                        📅 Günlük Çalışma Saatleri
                    </h3>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                            gap: "15px",
                            boxSizing: "border-box",
                        }}
                    >
                        {DAYS_OF_WEEK.map((d) => {
                            const dInfo = weeklyHoursData[d.key] || {
                                open: "10:00 - 22:00",
                                closed: false,
                            }
                            return (
                                <div
                                    key={d.key}
                                    style={{
                                        background: "#fafafa",
                                        padding: "12px 16px",
                                        borderRadius: "8px",
                                        border: "1px solid #eaeaea",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "4px",
                                        boxSizing: "border-box",
                                    }}
                                >
                                    <span style={{ fontSize: "13px", fontWeight: "bold", color: "#666" }}>
                                        {d.label}
                                    </span>
                                    {dInfo.closed ? (
                                        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#e53e3e" }}>
                                            Kapalı
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#2d3748" }}>
                                            {dInfo.open}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* HİKAYEMİZ */}
                <div
                    style={{
                        maxWidth: "1000px",
                        width: "92%",
                        margin: "30px auto 0 auto",
                        background: "#fff",
                        padding: "25px 30px",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        display: "flex",
                        gap: "25px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            width: "80px",
                            height: "80px",
                            borderRadius: "50%",
                            overflow: "hidden",
                            border: "3px solid #e53e3e",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            background: "#fff",
                            flexShrink: 0,
                        }}
                    >
                        <img
                            src={ownerImg}
                            alt="Owner"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: "250px" }}>
                        <h3 style={{ margin: "0 0 8px 0", color: "#111" }}>Hikayemiz</h3>
                        <p style={{ color: "#555", lineHeight: "1.6", margin: 0, fontSize: "14px" }}>
                            {storyText}
                        </p>
                    </div>
                </div>

                {/* MENÜ LİSTESİ */}
                <div style={{ maxWidth: "1000px", width: "92%", margin: "40px auto 0 auto", boxSizing: "border-box" }}>
                    <h2 style={{ fontSize: "24px", marginBottom: "20px", color: "#111" }}>
                        Menu
                    </h2>
                    {menuItems.length === 0 ? (
                        <p style={{ color: "#666" }}>No menu items found for this restaurant.</p>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                                gap: "20px",
                                boxSizing: "border-box",
                            }}
                        >
                            {menuItems.map((item) => {
                                const itemFallback = getPlaceholder(prodCat, item.name)
                                const itemImage = item.image_url || itemFallback
                                return (
                                    <div
                                        key={item.id}
                                        style={{
                                            background: "#fff",
                                            borderRadius: "12px",
                                            overflow: "hidden",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                                            display: "flex",
                                            flexDirection: "column",
                                            boxSizing: "border-box",
                                        }}
                                    >
                                        <div style={{ width: "100%", height: "160px", background: "#f0f0f0" }}>
                                            <img
                                                src={itemImage}
                                                alt={item.name}
                                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                            />
                                        </div>
                                        <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", boxSizing: "border-box" }}>
                                            <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                                                    <h4 style={{ margin: 0, fontSize: "18px", color: "#111" }}>
                                                        {item.name}
                                                    </h4>
                                                    <span style={{ fontWeight: "bold", color: "#e53e3e", fontSize: "16px" }}>
                                                        {item.price} €
                                                    </span>
                                                </div>
                                                <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div
            style={{
                width: "100%",
                minHeight: "100vh",
                fontFamily: "sans-serif",
                boxSizing: "border-box",
                padding: "40px 20px",
                background: "#f8f9fa",
                overflowX: "hidden",
            }}
        >
            <div style={{ maxWidth: "1100px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
                <div style={{ textAlign: "center", marginBottom: "50px" }}>
                    <div style={{ display: "inline-block", marginBottom: "20px" }}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 720 220"
                            style={{ width: "280px", height: "auto", display: "block", margin: "0 auto" }}
                        >
                            <defs>
                                <linearGradient id="cornerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ff3b00" />
                                    <stop offset="100%" stopColor="#ff9900" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M 60 170 L 60 90 C 60 73.431 73.431 60 90 60 L 175 60"
                                fill="none"
                                stroke="url(#cornerGrad)"
                                strokeWidth="18"
                                strokeLinecap="round"
                            />
                            <path
                                d="M 60 170 L 60 120"
                                fill="none"
                                stroke="#222222"
                                strokeWidth="18"
                                strokeLinecap="round"
                            />
                            <text
                                x="220"
                                y="130"
                                fontFamily="sans-serif"
                                fontWeight="900"
                                fontSize="76"
                                fill="#222222"
                                letterSpacing="2"
                            >
                                UM<tspan fill="#ff9900">ECKE</tspan>
                            </text>
                            <text
                                x="222"
                                y="172"
                                fontFamily="sans-serif"
                                fontWeight="500"
                                fontSize="20"
                                fill="#666666"
                                letterSpacing="0.5"
                            >
                                Local flavor, right around the corner.
                            </text>
                        </svg>
                    </div>

                    <p
                        style={{
                            color: "#555",
                            fontSize: "18px",
                            maxWidth: "750px",
                            margin: "0 auto 40px auto",
                            lineHeight: "1.6",
                        }}
                    >
                        A local food movement built to bypass greedy commissions, support neighborhood restaurants, and bring you real flavor straight from the counter around the corner.
                    </p>

                    <h3 style={{ fontSize: "22px", color: "#111", marginBottom: "20px" }}>
                        Discover Local Restaurants
                    </h3>
                </div>

                {/* RESTORAN KARTLARI LİSTESİ */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: "25px",
                        boxSizing: "border-box",
                    }}
                >
                    {restaurants.map((res) => {
                        const cardProd = res.product_category || "Genel"
                        const fallbackCard = getPlaceholder(cardProd, res.name)
                        const cardImage =
                            res.cover_image_url || res.image_url || fallbackCard
                        const cardLogo =
                            res.logo_url ||
                            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80"
                        return (
                            <div
                                key={res.id}
                                onClick={() => setSelectedRestaurant(res)}
                                style={{
                                    background: "#fff",
                                    borderRadius: "16px",
                                    overflow: "hidden",
                                    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
                                    cursor: "pointer",
                                    transition: "transform 0.2s ease",
                                    border: "1px solid #eaeaea",
                                    position: "relative",
                                    boxSizing: "border-box",
                                }}
                            >
                                <div style={{ width: "100%", height: "200px", background: "#f0f0f0", position: "relative" }}>
                                    <img
                                        src={cardImage}
                                        alt={res.name}
                                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                    />
                                    <div
                                        style={{
                                            position: "absolute",
                                            bottom: "12px",
                                            left: "15px",
                                            width: "55px",
                                            height: "55px",
                                            borderRadius: "50%",
                                            overflow: "hidden",
                                            border: "2px solid #fff",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                            background: "#fff",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <img
                                            src={cardLogo}
                                            alt="Logo"
                                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                        />
                                    </div>
                                </div>
                                <div style={{ padding: "20px", boxSizing: "border-box" }}>
                                    <h3 style={{ fontSize: "20px", margin: "6px 0 8px 0", color: "#111" }}>
                                        {res.name}
                                    </h3>
                                    <p
                                        style={{
                                            color: "#666",
                                            fontSize: "14px",
                                            margin: "0 0 15px 0",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {res.story || res.description || "Delicious foods and fresh menus..."}
                                    </p>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            paddingTop: "12px",
                                            borderTop: "1px solid #f0f0f0",
                                        }}
                                    >
                                        <span style={{ fontSize: "13px", color: "#888" }}>
                                            📍 {res.address || "Rostock"}
                                        </span>
                                        <span style={{ fontWeight: "bold", color: "#111", fontSize: "14px" }}>
                                            View Menu →
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
>>>>>>> edd03a9 (Proje modalları ve duzeltmeler eklendi)
}