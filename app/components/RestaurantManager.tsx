"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import ProductModal from "./ProductModal"
import CartBar from "./CartBar"
import CartModal from "./CartModal"
import SolidareatyLogo from "./SolidareatyLogo"
import MenuOptionManager from "./MenuOptionManager"
import { readShortCache, writeShortCache } from "../../lib/shortCache"
import { useI18n } from "../../lib/i18n"

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



function discoveryHoursStatus(restaurant: any, now = new Date()): { status: "open" | "later" | "closed" | "paused" | "unknown"; time?: string } {
    if (restaurant?.is_closed === true) return { status: "paused" }
    let hours: any = restaurant?.weekly_hours || restaurant?.opening_hours
    if (typeof hours === "string") { try { hours = JSON.parse(hours) } catch { return { status: "unknown" } } }
    if (!hours || typeof hours !== "object") return { status: "unknown" }
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now)
    const getPart = (type: string) => parts.find((part) => part.type === type)?.value || "00"
    const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    const today = Math.max(0, ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(getPart("weekday")))
    const current = Number(getPart("hour")) * 60 + Number(getPart("minute"))
    const parse = (entry: any): [number, number] | null => {
        if (!entry || entry.closed === true || entry.is_closed === true) return null
        const raw = String(entry.open || entry.hours || entry.opening || "")
        const matches = raw.match(/\d{1,2}:\d{2}/g)
        if (!matches || matches.length < 2) return null
        const minutes = (time: string) => { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute }
        return [minutes(matches[0]), minutes(matches[1])]
    }
    const todayHours = parse(hours[weekdays[today]])
    if (todayHours) {
        const [open, close] = todayHours
        if (close < open ? current >= open || current < close : current >= open && current < close) return { status: "open" }
        if (current < open) return { status: "later", time: `${String(Math.floor(open / 60)).padStart(2, "0")}:${String(open % 60).padStart(2, "0")}` }
    }
    const previous = parse(hours[weekdays[(today + 6) % 7]])
    if (previous && previous[1] < previous[0] && current < previous[1]) return { status: "open" }
    for (let offset = 1; offset <= 7; offset++) {
        const upcoming = parse(hours[weekdays[(today + offset) % 7]])
        if (upcoming) return { status: "later", time: `${String(Math.floor(upcoming[0] / 60)).padStart(2, "0")}:${String(upcoming[0] % 60).padStart(2, "0")}` }
    }
    return { status: "closed" }
}

function discoveryServices(restaurant: any): { delivery: boolean; pickup: boolean; dineIn: boolean; freeDelivery: boolean } {
    let raw = restaurant?.service_options
    if (typeof raw === "string") { try { const parsed = JSON.parse(raw); raw = Array.isArray(parsed) ? parsed : raw.split(/[;,|]/) } catch { raw = raw.split(/[;,|]/) } }
    const options = Array.isArray(raw) ? raw.map((value: any) => String(value).toLocaleLowerCase()) : []
    return {
        delivery: options.some((value: string) => /paket|liefer|delivery|kurier/.test(value)),
        pickup: options.some((value: string) => /gel.?al|abhol|pickup|take.?away|self.?collect/.test(value)),
        dineIn: options.some((value: string) => /mekan|dine.?in|vor.?ort/.test(value)),
        freeDelivery: options.some((value: string) => /kostenlos.*liefer|free.*deliver|liefer.*kostenlos/.test(value)),
    }
}

function DiscoveryIcon({ name, size = 18 }: { name: string; size?: number }) {
    const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
    const icons: Record<string, React.ReactNode> = {
        pin: <><path {...p} d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle {...p} cx="12" cy="10" r="2"/></>,
        search: <><circle {...p} cx="10.5" cy="10.5" r="6.5"/><path {...p} d="m15.5 15.5 4 4"/></>,
        heart: <path {...p} d="M20.5 8.8c0 4.2-8.5 10-8.5 10s-8.5-5.8-8.5-10A4.5 4.5 0 0 1 12 6.4a4.5 4.5 0 0 1 8.5 2.4Z"/>,
        clock: <><circle {...p} cx="12" cy="12" r="8.5"/><path {...p} d="M12 7v5l3 2"/></>,
        bag: <><path {...p} d="M5 8h14l1 12H4L5 8Z"/><path {...p} d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
        arrow: <><path {...p} d="M5 12h14m-6-6 6 6-6 6"/></>,
        star: <path {...p} d="m12 3 2.6 5.4 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L12 3Z"/>,
    }
    return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "block", flexShrink: 0 }}>{icons[name] || icons.search}</svg>
}

type RestaurantManagerProps = { initialRestaurantSlug?: string }

export default function RestaurantManager({ initialRestaurantSlug }: RestaurantManagerProps) {
    const { t, locale } = useI18n()
    const [restaurants, setRestaurants] = useState<any[]>([])
    const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null)
    const [badgeByRestaurant, setBadgeByRestaurant] = useState<Record<string, any>>({})
    const [regions, setRegions] = useState<any[]>([])
    const [selectedZipcode, setSelectedZipcode] = useState<string>("")

    const [discoveryQuery, setDiscoveryQuery] = useState("")
    const [discoveryCategory, setDiscoveryCategory] = useState("")
    const [discoveryMode, setDiscoveryMode] = useState<"all" | "delivery" | "pickup">("all")
    const [favoritesOnly, setFavoritesOnly] = useState(false)
    const [favoriteIds, setFavoriteIds] = useState<string[]>([])
    const [favoritesHydrated, setFavoritesHydrated] = useState(false)
    const [menuItems, setMenuItems] = useState<any[]>([])
    const [loading, setLoading] = useState<boolean>(true)

    // Modal state'leri
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [isCartModalOpen, setIsCartModalOpen] = useState<boolean>(false)

    // Sepet state'i
    const [cartItems, setCartItems] = useState<any[]>([])

    const [isEditing, setIsEditing] = useState<boolean>(false)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
    const [passwordInput, setPasswordInput] = useState<string>("")
    const [adminEmail, setAdminEmail] = useState<string>("")
    const [passwordError, setPasswordError] = useState<string>("")

    const [editForm, setEditForm] = useState<any>({})
    const [saving, setSaving] = useState<boolean>(false)
    const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false)
    const [uploadMessage, setUploadMessage] = useState<string>("")
    const [stripeOnboardingLoading, setStripeOnboardingLoading] = useState<boolean>(false)
    const [subscriptionLoading, setSubscriptionLoading] = useState<string>("")
    const [financialSummary, setFinancialSummary] = useState<any>(null)
    const [financialLoading, setFinancialLoading] = useState<boolean>(false)
    const [financialError, setFinancialError] = useState<string>("")
    const [financialFrom, setFinancialFrom] = useState<string>("")
    const [financialTo, setFinancialTo] = useState<string>("")
    const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>("")
    const [managerTab, setManagerTab] = useState<"overview" | "photos" | "menu" | "profile" | "payments">("overview")

    useEffect(() => {
        try { setFavoriteIds(JSON.parse(localStorage.getItem("solidareaty-favorite-restaurants") || "[]")) }
        catch { setFavoriteIds([]) }
        setFavoritesHydrated(true)
    }, [])

    useEffect(() => {
        if (favoritesHydrated) localStorage.setItem("solidareaty-favorite-restaurants", JSON.stringify(favoriteIds))
    }, [favoriteIds, favoritesHydrated])

    useEffect(() => {
        let cancelled = false
        async function fetchRestaurants() {
            setLoading(true)
            const cached = readShortCache<any>("restaurant-discovery-v1", 30_000)
            if (cached && !cancelled) {
                setRestaurants(cached.restaurants || []); setBadgeByRestaurant(cached.badges || {}); setRegions(cached.regions || [])
                const savedZip=localStorage.getItem("solidareatySelectedZipcode")||""; if(savedZip)setSelectedZipcode(savedZip)
                if(initialRestaurantSlug){const match=(cached.restaurants||[]).find((item:any)=>item.slug===initialRestaurantSlug);if(match)setSelectedRestaurant(match)}
                setLoading(false); return
            }
            const [restaurantResult,badgeResult,regionResult]=await Promise.all([
                supabase.from("restaurants").select("id,name,slug,phone,created_at,description,image_url,category,address,rating,is_active,story,cover_image_url,owner_image_url,logo_url,owner_photo_url,features,opening_hours,is_closed,business_type,cuisine_type,product_category,email,website,weekly_hours,parking_info,service_options,payment_methods,vision,zipcode").eq("is_active",true),
                supabase.rpc("get_all_restaurant_badges"),
                supabase.from("regions").select("zipcode,city,district,display_order").eq("is_active",true).order("display_order",{ascending:true})
            ])
            if(!cancelled&&!restaurantResult.error&&restaurantResult.data){
                const uniqueRestaurants=Array.from(new Map(restaurantResult.data.map((item:any)=>[item.id,item])).values())
                const badgeMap:Record<string,any>={};for(const row of badgeResult.data||[])badgeMap[row.restaurant_id]=row
                const nextRegions=regionResult.data||[];setRestaurants(uniqueRestaurants);setBadgeByRestaurant(badgeMap);setRegions(nextRegions)
                writeShortCache("restaurant-discovery-v1",{restaurants:uniqueRestaurants,badges:badgeMap,regions:nextRegions})
                const savedZip=localStorage.getItem("solidareatySelectedZipcode")||"";if(savedZip)setSelectedZipcode(savedZip)
                if(initialRestaurantSlug){const match=uniqueRestaurants.find((item:any)=>item.slug===initialRestaurantSlug);if(match)setSelectedRestaurant(match)}
            }
            if(!cancelled)setLoading(false)
        }
        void fetchRestaurants();return()=>{cancelled=true}
    }, [initialRestaurantSlug])

    useEffect(() => {
        if (!supabase || !selectedRestaurant) return
        async function fetchMenu() {
            const cacheKey=`menu:${selectedRestaurant.id}`;const cachedMenu=readShortCache<any[]>(cacheKey,30_000)
            if(cachedMenu){setMenuItems(cachedMenu);if(cachedMenu.length>0)setSelectedMenuItemId(String(cachedMenu[0].id));return}
            const {data,error}=await supabase.from("menu_items").select("*").eq("restaurant_id",selectedRestaurant.id).order("category",{ascending:true})
            if(!error&&data){
                const uniqueMenu=Array.from(new Map(data.map((item:any)=>[item.id,item])).values()) as any[]
                const ids=uniqueMenu.map((item:any)=>item.id).join(",");let optionMap:Record<string,any[]>={}
                if(ids){try{const response=await fetch(`/api/menu-options?menu_item_ids=${encodeURIComponent(ids)}`,{cache:"no-store"});const payload=await response.json();if(response.ok)optionMap=payload.optionsByMenuItem||{}}catch(e){console.warn("Menu option fetch failed",e)}}
                const withOptions=uniqueMenu.map((item:any)=>({...item,optionGroups:optionMap[String(item.id)]||[]}));setMenuItems(withOptions);writeShortCache(cacheKey,withOptions);if(withOptions.length>0)setSelectedMenuItemId(String(withOptions[0].id))
            }
        }
        void fetchMenu()

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
            ? "Ben İrfan Doğan. 30 yıldır Bad Doberan’ın ilk dönercisi Pascham Döner’in başındayım. Kahramanmaraş’tan bu güzel kasabaya geldiğimde burası dönerle henüz tanışmamıştı; o günlerden bugüne her şişi kendi evladımın yiyeceği titizlikle, en taze etlerle ve kusursuz bir hijyen anlayışıyla hazırladım. Müşterilerime sunduğum her lokmanın lezzeti kadar güvenli ve temiz olması benim için her şeyden önce gelir. Şimdi Solidareaty Ekosistemi ile dijitalde de kendi kaderimizi elimize alıyoruz. Siparişlerinizi komisyoncu dev platformlar yerine doğrudan bizden vermeniz; hem bizim 30 yıllık emeğimize ve hijyenik tezgahımıza sahip çıkmanız, hem de yerel esnafın bağımsız kalması için çok önemlidir. Gelin, bu lezzeti ve dayanışmayı birlikte yaşatalım!"
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
        setPasswordInput("")
        setPasswordError("")
        setUploadMessage("")
    }, [supabase, selectedRestaurant])

    const handleAddToCart = (newItem: any) => {
        setCartItems((prevItems) => {
            const existingIndex = prevItems.findIndex((item) => item.cartId === newItem.cartId);
            if (existingIndex > -1) {
                const updated = [...prevItems];
                updated[existingIndex].quantity += newItem.quantity;
                return updated;
            } else {
                return [...prevItems, newItem];
            }
        });
    }

    const handleUpdateQuantity = (cartId: string, delta: number) => {
        setCartItems((prevItems) => {
            return prevItems.map((item) => {
                if (item.cartId === cartId) {
                    const newQty = item.quantity + delta;
                    return newQty > 0 ? { ...item, quantity: newQty } : null;
                }
                return item;
            }).filter(Boolean);
        });
    };

    const formatLocalDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
    }

    const localDateTimeToIso = (dateText: string, endOfDay = false) => {
        if (!dateText) return null
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText)
        if (!match) throw new Error("Geçersiz tarih formatı.")
        const [, yearText, monthText, dayText] = match
        const year = Number(yearText)
        const month = Number(monthText)
        const day = Number(dayText)
        const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            throw new Error("Geçersiz tarih seçildi.")
        }
        return date.toISOString()
    }

    const loadFinancialSummary = async (
        selectedFrom = financialFrom,
        selectedTo = financialTo
    ) => {
        if (!selectedRestaurant?.id) return
        setFinancialLoading(true)
        setFinancialError("")
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            if (sessionError || !session?.access_token) throw new Error("Aktif Auth oturumu bulunamadı.")

            const fromIso = selectedFrom
                ? localDateTimeToIso(selectedFrom, false)
                : null
            const toIso = selectedTo
                ? localDateTimeToIso(selectedTo, true)
                : null

            const response = await fetch("/api/finance/restaurant-summary", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    restaurant_id: selectedRestaurant.id,
                    from: fromIso,
                    to: toIso,
                }),
            })
            const result = await response.json()
            if (!response.ok || !result.success) throw new Error(result.error || "Finans raporu alınamadı.")
            setFinancialSummary(result.data)
        } catch (error) {
            console.error("Finans özeti hatası:", error)
            setFinancialError(error instanceof Error ? error.message : "Finans raporu alınamadı.")
        } finally {
            setFinancialLoading(false)
        }
    }

    const setFinancialPeriod = (period: "today" | "yesterday" | "week" | "month" | "all") => {
        const now = new Date()
        let nextFrom = ""
        let nextTo = formatLocalDate(now)

        if (period !== "all") {
            const startDate = new Date(now)
            if (period === "today") {
                startDate.setHours(0, 0, 0, 0)
            }
            if (period === "yesterday") {
                startDate.setDate(startDate.getDate() - 1)
                startDate.setHours(0, 0, 0, 0)
                nextTo = formatLocalDate(startDate)
            }
            if (period === "week") {
                const day = startDate.getDay() || 7
                startDate.setDate(startDate.getDate() - day + 1)
                startDate.setHours(0, 0, 0, 0)
            }
            if (period === "month") {
                startDate.setDate(1)
                startDate.setHours(0, 0, 0, 0)
            }
            nextFrom = formatLocalDate(startDate)
        }

        setFinancialFrom(nextFrom)
        setFinancialTo(nextTo)
        setTimeout(() => loadFinancialSummary(nextFrom, nextTo), 0)
    }

    useEffect(() => {
        if (isAuthenticated && selectedRestaurant?.id) loadFinancialSummary()
    }, [isAuthenticated, selectedRestaurant?.id])

    const renderCardBadge = (restaurantId: string) => {
        const badge = badgeByRestaurant[restaurantId];
        if (!badge || badge.star_level < 1) return null;
        const starLevel = Math.min(5, Math.max(1, badge.star_level));
        const resId = restaurantId.replace(/[^a-zA-Z0-9]/g, "");
        return (
            <div
                className="solidareaty-award-badge"
                style={{
                    flexShrink: 0,
                    width: "60px",
                    height: "72px",
                    filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.22))",
                    cursor: "pointer",
                    marginLeft: "8px",
                    marginTop: "4px"
                }}
                title={`Lokaler Unterstützer (${starLevel} Yıldız)`}
            >
                <svg viewBox="0 0 420 500" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <radialGradient id={`m_${resId}`} cx="35%" cy="28%" r="75%">
                            <stop stopColor="#fff4ad" />
                            <stop offset=".38" stopColor="#f4c548" />
                            <stop offset="1" stopColor="#a9620d" />
                        </radialGradient>
                        <linearGradient id={`r_${resId}`} x1="0" y1="0" x2="1" y2="1">
                            <stop stopColor="#fff5b5" />
                            <stop offset=".45" stopColor="#e0a52b" />
                            <stop offset="1" stopColor="#8b4e08" />
                        </linearGradient>
                        <linearGradient id={`rib_${resId}`} x1="0" y1="0" x2="1" y2="1">
                            <stop stopColor="#f05a28" />
                            <stop offset="1" stopColor="#b72f1b" />
                        </linearGradient>
                    </defs>
                    <path d="M128 320l-18 130 67-43 33 55 10-142z" fill={`url(#rib_${resId})`} stroke="#8e2418" strokeWidth="3" />
                    <path d="M292 320l18 130-67-43-33 55-10-142z" fill={`url(#rib_${resId})`} stroke="#8e2418" strokeWidth="3" />
                    <circle cx="210" cy="190" r="153" fill="#172033" stroke="#0b1220" strokeWidth="4" />
                    <circle cx="210" cy="190" r="143" fill={`url(#m_${resId})`} stroke={`url(#r_${resId})`} strokeWidth="9" />
                    <circle cx="210" cy="190" r="112" fill="#172033" fillOpacity=".94" stroke="#f2c44d" strokeWidth="2" />
                    <path id={`arc_${resId}`} d="M 92,190 A 118,118 0 0,1 328,190" fill="none" />
                    <text fill="#172033" stroke="#172033" strokeWidth="0.35" paintOrder="stroke" fontFamily="Inter,Arial,sans-serif" fontSize="12" fontWeight="900" letterSpacing="1.6">
                        <textPath href={`#arc_${resId}`} startOffset="50%" textAnchor="middle">REGIONAL • VERBUNDEN</textPath>
                    </text>
                    <text x="210" y="195" textAnchor="middle" fill="#fff" fontFamily="Inter,Arial,sans-serif" fontSize="42" fontWeight="900" letterSpacing="-1.5">Solidareaty</text>
                    <g stroke="#fff3a6" strokeWidth="1.4">
                        <path fill={starLevel >= 1 ? `url(#m_${resId})` : "#2e3b4e"} stroke={starLevel >= 1 ? "#fff3a6" : "#4e5e73"} d="M142 197l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" opacity={starLevel >= 1 ? "1" : "0.3"} />
                        <path fill={starLevel >= 2 ? `url(#m_${resId})` : "#2e3b4e"} stroke={starLevel >= 2 ? "#fff3a6" : "#4e5e73"} d="M169 230l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" opacity={starLevel >= 2 ? "1" : "0.3"} />
                        <path fill={starLevel >= 3 ? `url(#m_${resId})` : "#2e3b4e"} stroke={starLevel >= 3 ? "#fff3a6" : "#4e5e73"} d="M210 240l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" opacity={starLevel >= 3 ? "1" : "0.3"} />
                        <path fill={starLevel >= 4 ? `url(#m_${resId})` : "#2e3b4e"} stroke={starLevel >= 4 ? "#fff3a6" : "#4e5e73"} d="M251 230l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" opacity={starLevel >= 4 ? "1" : "0.3"} />
                        <path fill={starLevel >= 5 ? `url(#m_${resId})` : "#2e3b4e"} stroke={starLevel >= 5 ? "#fff3a6" : "#4e5e73"} d="M278 197l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" opacity={starLevel >= 5 ? "1" : "0.3"} />
                    </g>
                    <path d="M65 320l38-22h214l38 22-38 66H103z" fill="#8f2418" stroke="#6f1b14" strokeWidth="3" />
                    <path d="M72 309l35-18h206l35 18-35 54H107z" fill={`url(#rib_${resId})`} stroke="#ff8a4e" strokeWidth="2" />
                    <text x="210" y="338" textAnchor="middle" fill="#fff7d6" fontFamily="Inter,Arial,sans-serif" fontSize="16" fontWeight="900" letterSpacing=".7">Lokaler Unterstützer</text>
                </svg>
            </div>
        );
    };

    const renderDetailCardBadge = (badge: any) => {
        if (!badge || badge.star_level < 1) return null;
        const starLevel = Math.min(5, Math.max(1, badge.star_level));
        const resId = "detail_sel";
        return (
            <div
                style={{
                    background: "linear-gradient(135deg, #29343C 0%, #29343C 100%)",
                    padding: "20px 25px",
                    borderRadius: "16px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    border: "2px solid #E69F5C",
                    color: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    boxSizing: "border-box",
                }}
            >
                <div style={{ width: "95px", height: "115px", margin: "0 auto" }}>
                    <svg viewBox="0 0 420 500" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <radialGradient id={`m_${resId}`} cx="35%" cy="28%" r="75%">
                                <stop stopColor="#fff4ad" />
                                <stop offset=".38" stopColor="#f4c548" />
                                <stop offset="1" stopColor="#a9620d" />
                            </radialGradient>
                            <linearGradient id={`r_${resId}`} x1="0" y1="0" x2="1" y2="1">
                                <stop stopColor="#fff5b5" />
                                <stop offset=".45" stopColor="#e0a52b" />
                                <stop offset="1" stopColor="#8b4e08" />
                            </linearGradient>
                            <linearGradient id={`rib_${resId}`} x1="0" y1="0" x2="1" y2="1">
                                <stop stopColor="#f05a28" />
                                <stop offset="1" stopColor="#b72f1b" />
                            </linearGradient>
                        </defs>
                        <path d="M128 320l-18 130 67-43 33 55 10-142z" fill={`url(#rib_${resId})`} stroke="#8e2418" strokeWidth="3" />
                        <path d="M292 320l18 130-67-43-33 55-10-142z" fill={`url(#rib_${resId})`} stroke="#8e2418" strokeWidth="3" />
                        <circle cx="210" cy="190" r="153" fill="#172033" stroke="#0b1220" strokeWidth="4" />
                        <circle cx="210" cy="190" r="143" fill={`url(#m_${resId})`} stroke={`url(#r_${resId})`} strokeWidth="9" />
                        <circle cx="210" cy="190" r="112" fill="#172033" fillOpacity=".94" stroke="#f2c44d" strokeWidth="2" />
                        <path id={`arc_${resId}`} d="M 92,190 A 118,118 0 0,1 328,190" fill="none" />
                        <text fill="#172033" stroke="#172033" strokeWidth="0.35" paintOrder="stroke" fontFamily="Inter,Arial,sans-serif" fontSize="12" fontWeight="900" letterSpacing="1.6">
                            <textPath href={`#arc_${resId}`} startOffset="50%" textAnchor="middle">REGIONAL • VERBUNDEN</textPath>
                        </text>
                        <text x="210" y="195" textAnchor="middle" fill="#fff" fontFamily="Inter,Arial,sans-serif" fontSize="42" fontWeight="900" letterSpacing="-1.5">Solidareaty</text>
                        <g stroke="#fff3a6" strokeWidth="1.4">
                            <path fill={starLevel >= 1 ? `url(#m_${resId})` : "#2e3b4e"} stroke={starLevel >= 1 ? "#fff3a6" : "#4e5e73"} d="M142 197l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" opacity={starLevel >= 1 ? "1" : "0.3"} />
                            <path fill={starLevel >= 2 ? `url(#m_${resId})` : "#2e3b4e"} stroke={starLevel >= 2 ? "#fff3a6" : "#4e5e73"} d="M169 230l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" opacity={starLevel >= 2 ? "1" : "0.3"} />
                            <path fill={starLevel >= 3 ? `url(#m_${resId})` : "#2e3b4e"} stroke={starLevel >= 3 ? "#fff3a6" : "#4e5e73"} d="M210 240l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" opacity={starLevel >= 3 ? "1" : "0.3"} />
                            <path fill={starLevel >= 4 ? `url(#m_${resId})` : "#2e3b4e"} stroke={starLevel >= 4 ? "#fff3a6" : "#4e5e73"} d="M251 230l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" opacity={starLevel >= 4 ? "1" : "0.3"} />
                            <path fill={starLevel >= 5 ? `url(#m_${resId})` : "#2e3b4e"} stroke={starLevel >= 5 ? "#fff3a6" : "#4e5e73"} d="M278 197l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" opacity={starLevel >= 5 ? "1" : "0.3"} />
                        </g>
                        <path d="M65 320l38-22h214l38 22-38 66H103z" fill="#8f2418" stroke="#6f1b14" strokeWidth="3" />
                        <path d="M72 309l35-18h206l35 18-35 54H107z" fill={`url(#rib_${resId})`} stroke="#ff8a4e" strokeWidth="2" />
                        <text x="210" y="338" textAnchor="middle" fill="#fff7d6" fontFamily="Inter,Arial,sans-serif" fontSize="16" fontWeight="900" letterSpacing=".7">Lokaler Unterstützer</text>
                    </svg>
                </div>
                <h4 style={{ margin: "10px 0 4px 0", fontSize: "15px", color: "#FAC796", fontWeight: "800" }}>
                    🏅 Lokaler Unterstützer · {starLevel} Yıldız
                </h4>
                <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#94a3b8", lineHeight: "1.4" }}>
                    {badge.badge_description || "Bu işletme yerel üreticileri desteklemektedir."}
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "12px", fontSize: "11px", color: "#cbd5e1" }}>
                    <span>🌾 <strong>{badge.unique_producer_count || 1}</strong> Üretici</span>
                    <span>⭐ <strong>{badge.total_points || 0}</strong> Puan</span>
                </div>
            </div>
        );
    };

    const handleStripeOnboarding = async () => {
        if (!selectedRestaurant?.id) {
            alert("Restoran bilgisi bulunamadı.")
            return
        }

        setStripeOnboardingLoading(true)

        try {
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession()

            if (sessionError || !session?.access_token) {
                throw new Error("Aktif Auth oturumu bulunamadı. Lütfen tekrar giriş yapın.")
            }

            const response = await fetch("/api/stripe/connect/onboarding", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    restaurant_id: selectedRestaurant.id,
                }),
            })

            const result = await response.json()

            if (!response.ok || !result.success || !result.onboarding_url) {
                throw new Error(result.error || "Stripe onboarding bağlantısı oluşturulamadı.")
            }

            window.location.href = result.onboarding_url
        } catch (error) {
            console.error("Stripe onboarding hatası:", error)
            alert(error instanceof Error ? error.message : "Stripe onboarding başlatılamadı.")
        } finally {
            setStripeOnboardingLoading(false)
        }
    }

    const handleSubscriptionCheckout = async (planKey: "basic" | "premium") => {
        if (!selectedRestaurant?.id) {
            alert("Restoran bilgisi bulunamadı.")
            return
        }

        setSubscriptionLoading(planKey)

        try {
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession()

            if (sessionError || !session?.access_token) {
                throw new Error("Aktif Auth oturumu bulunamadı. Lütfen tekrar giriş yapın.")
            }

            const response = await fetch("/api/stripe/subscription/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    restaurant_id: selectedRestaurant.id,
                    plan_key: planKey,
                }),
            })

            const result = await response.json()

            if (!response.ok || !result.success || !result.checkout_url) {
                throw new Error(result.error || "Abonelik Checkout bağlantısı oluşturulamadı.")
            }

            window.location.href = result.checkout_url
        } catch (error) {
            console.error("Abonelik Checkout hatası:", error)
            alert(error instanceof Error ? error.message : "Abonelik başlatılamadı.")
        } finally {
            setSubscriptionLoading("")
        }
    }

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedRestaurant?.id) {
            setPasswordError("Restoran bilgisi bulunamadı.")
            return
        }

        if (!passwordInput.trim()) {
            setPasswordError("Lütfen şifrenizi giriniz.")
            return
        }

        // E-posta girildiyse yeni Supabase Auth / platform_admin akışı kullanılır.
        if (adminEmail.trim()) {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: adminEmail.trim(),
                password: passwordInput,
            })

            if (authError) {
                console.error("Platform admin giriş hatası:", authError)
                setPasswordError("E-posta veya şifre hatalı.")
                return
            }

            const { data: isPlatformAdmin, error: adminError } =
                await supabase.rpc("is_platform_admin")

            if (adminError) {
                console.error("Platform admin yetki kontrolü hatası:", adminError)
                await supabase.auth.signOut()
                setPasswordError("Yetki kontrolü yapılamadı.")
                return
            }

            if (isPlatformAdmin === true) {
                setIsAuthenticated(true)
                setPasswordError("")
                setPasswordInput("")
                return
            }

            const { data: canReadRestaurant, error: permissionError } =
                await supabase.rpc("has_permission", {
                    p_permission_key: "restaurant.read",
                    p_restaurant_id: selectedRestaurant.id,
                    p_producer_id: null,
                })

            if (permissionError) {
                console.error("Restoran yetki kontrolü hatası:", permissionError)
                await supabase.auth.signOut()
                setPasswordError("Restoran yetkisi kontrol edilemedi.")
                return
            }

            if (canReadRestaurant === true) {
                setIsAuthenticated(true)
                setPasswordError("")
                setPasswordInput("")
                return
            }

            await supabase.auth.signOut()
            setPasswordError("Bu restoranda yönetim yetkiniz yok.")
            return
        }

        // Legacy plaintext restaurant-password login was disabled during the
        // security hardening. Restaurant managers must use Supabase Auth.
        setPasswordError(
            "İşletme paneline girmek için Supabase Auth e-posta hesabınızı kullanın. Eski restoran şifresi girişi kapatıldı."
        )
        setPasswordInput("")
        return
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
        const ownerImg =
            selectedRestaurant.owner_photo_url ||
            selectedRestaurant.owner_image_url ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"

        const defaultStory = selectedRestaurant.name
            ?.toLowerCase()
            .includes("pascham")
            ? "Ben İrfan Doğan. 30 yıldır Bad Doberan’ın ilk dönercisi Pascham Döner’in başındayım. Kahramanmaraş’tan bu güzel kasabaya geldiğimde burası dönerle henüz tanışmamıştı; o günlerden bugüne her şişi kendi evladımın yiyeceği titizlikle, en taze etlerle ve kusursuz bir hijyen anlayışıyla hazırladım. Müşterilerime sunduğum her lokmanın lezzeti kadar güvenli ve temiz olması benim için her şeyden önce gelir. Şimdi Solidareaty Ekosistemi ile dijitalde de kendi kaderimizi elimize alıyoruz. Siparişlerinizi komisyoncu dev platformlar yerine doğrudan bizden vermeniz; hem bizim 30 yıllık emeğimize ve hijyenik tezgahımıza sahip çıkmanız, hem de yerel esnafın bağımsız kalması için çok önemlidir. Gelin, bu lezzeti ve dayanışmayı birlikte yaşatalım!"
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
                    paddingBottom: "120px",
                    boxSizing: "border-box",
                    overflowX: "hidden",
                    position: "relative",
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
                        ← {t("restaurant_back")}
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
                            ? `✖ ${t("restaurant_panel_close")}`
                            : `🔒 ${t("restaurant_panel_login")}`}
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
                            <strong>{selectedRestaurant.name}</strong> yönetim paneline erişmek için giriş yapın.
                        </p>
                        <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            <input
                                type="email"
                                placeholder="Platform admin e-postası (isteğe bağlı)"
                                value={adminEmail}
                                onChange={(e) => setAdminEmail(e.target.value)}
                                style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box", fontSize: "16px" }}
                            />
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

                        <div role="tablist" aria-label="Business management sections" style={{ display: "flex", gap: "8px", overflowX: "auto", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "20px" }}>
                            <button type="button" role="tab" id="manager-tab-overview" aria-selected={managerTab === "overview"} aria-controls="manager-panel-overview" onClick={() => setManagerTab("overview")} style={{ flex: "0 0 auto", padding: "10px 14px", borderRadius: "10px", border: managerTab === "overview" ? "1px solid #c2410c" : "1px solid #e2e8f0", background: managerTab === "overview" ? "#fff7ed" : "#fff", color: managerTab === "overview" ? "#9a3412" : "#73818C", fontWeight: 800, fontSize: "13px", cursor: "pointer" }}>
                                {locale === "de" ? "Übersicht & Finanzen" : locale === "tr" ? "Genel Bakış & Finans" : "Overview & Finance"}
                            </button>
                            <button type="button" role="tab" id="manager-tab-photos" aria-selected={managerTab === "photos"} aria-controls="manager-panel-photos" onClick={() => setManagerTab("photos")} style={{ flex: "0 0 auto", padding: "10px 14px", borderRadius: "10px", border: managerTab === "photos" ? "1px solid #c2410c" : "1px solid #e2e8f0", background: managerTab === "photos" ? "#fff7ed" : "#fff", color: managerTab === "photos" ? "#9a3412" : "#73818C", fontWeight: 800, fontSize: "13px", cursor: "pointer" }}>
                                {locale === "de" ? "Fotos" : locale === "tr" ? "Fotoğraflar" : "Photos"}
                            </button>
                            <button type="button" role="tab" id="manager-tab-menu" aria-selected={managerTab === "menu"} aria-controls="manager-panel-menu" onClick={() => setManagerTab("menu")} style={{ flex: "0 0 auto", padding: "10px 14px", borderRadius: "10px", border: managerTab === "menu" ? "1px solid #c2410c" : "1px solid #e2e8f0", background: managerTab === "menu" ? "#fff7ed" : "#fff", color: managerTab === "menu" ? "#9a3412" : "#73818C", fontWeight: 800, fontSize: "13px", cursor: "pointer" }}>
                                {locale === "de" ? "Speisekarte & Optionen" : locale === "tr" ? "Menü ve Seçenekler" : "Menu & Options"}
                            </button>
                            <button type="button" role="tab" id="manager-tab-profile" aria-selected={managerTab === "profile"} aria-controls="manager-panel-profile" onClick={() => setManagerTab("profile")} style={{ flex: "0 0 auto", padding: "10px 14px", borderRadius: "10px", border: managerTab === "profile" ? "1px solid #c2410c" : "1px solid #e2e8f0", background: managerTab === "profile" ? "#fff7ed" : "#fff", color: managerTab === "profile" ? "#9a3412" : "#73818C", fontWeight: 800, fontSize: "13px", cursor: "pointer" }}>
                                {locale === "de" ? "Unternehmensprofil" : locale === "tr" ? "İşletme Profili" : "Business Profile"}
                            </button>
                            <button type="button" role="tab" id="manager-tab-payments" aria-selected={managerTab === "payments"} aria-controls="manager-panel-payments" onClick={() => setManagerTab("payments")} style={{ flex: "0 0 auto", padding: "10px 14px", borderRadius: "10px", border: managerTab === "payments" ? "1px solid #c2410c" : "1px solid #e2e8f0", background: managerTab === "payments" ? "#fff7ed" : "#fff", color: managerTab === "payments" ? "#9a3412" : "#73818C", fontWeight: 800, fontSize: "13px", cursor: "pointer" }}>
                                {locale === "de" ? "Zahlungen & Tarife" : locale === "tr" ? "Ödemeler ve Paketler" : "Payments & Plans"}
                            </button>
                        </div>

                        {managerTab === "payments" && (
                            <section role="tabpanel" id="manager-panel-payments" aria-labelledby="manager-tab-payments" style={{ border: "1px solid #e2e8f0", borderRadius: "14px", background: "#fff", padding: "18px", marginBottom: "20px" }}>
                                <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800, color: "#29343C" }}>{locale === "de" ? "Zahlungen & Abonnements" : locale === "tr" ? "Ödemeler ve Abonelikler" : "Payments & subscriptions"}</h3>
                                <p style={{ margin: "0 0 14px", color: "#73818C", fontSize: "13px" }}>{locale === "de" ? "Stripe-Einrichtung und Abo-Checkout sind getrennte Abläufe." : locale === "tr" ? "Stripe kurulumu ve abonelik işlemleri birbirinden ayrıdır." : "Stripe setup and subscription checkout are separate actions."}</p>
                            <button
                                type="button"
                                onClick={handleStripeOnboarding}
                                disabled={stripeOnboardingLoading}
                                style={{
                                    marginTop: "10px",
                                    background: stripeOnboardingLoading ? "#a0aec0" : "#635bff",
                                    color: "#fff",
                                    border: "none",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    cursor: stripeOnboardingLoading ? "not-allowed" : "pointer",
                                }}
                            >
                                {stripeOnboardingLoading ? "Stripe açılıyor..." : "💳 Stripe hesabını tamamla"}
                            </button>
                            <div style={{ marginTop: "14px", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc" }}>
                                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#29343C", marginBottom: "8px" }}>Platform aboneliği</div>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    <button
                                        type="button"
                                        onClick={() => handleSubscriptionCheckout("basic")}
                                        disabled={Boolean(subscriptionLoading)}
                                        style={{ background: subscriptionLoading === "basic" ? "#94a3b8" : "#0f766e", color: "#fff", border: "none", padding: "8px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: subscriptionLoading ? "not-allowed" : "pointer" }}
                                    >
                                        {subscriptionLoading === "basic" ? "Açılıyor..." : "Basic · 9,90 € / ay"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSubscriptionCheckout("premium")}
                                        disabled={Boolean(subscriptionLoading)}
                                        style={{ background: subscriptionLoading === "premium" ? "#94a3b8" : "#7c3aed", color: "#fff", border: "none", padding: "8px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: subscriptionLoading ? "not-allowed" : "pointer" }}
                                    >
                                        {subscriptionLoading === "premium" ? "Açılıyor..." : "Premium · 99,90 € / ay"}
                                    </button>
                                </div>
                            </div>
                            </section>
                        )}

                        {managerTab === "overview" && (
                            <div role="tabpanel" id="manager-panel-overview" aria-labelledby="manager-tab-overview">

                            <>
                        <div style={{ marginTop: "16px", marginBottom: "20px", padding: "16px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#ffffff" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>Finans Özeti</h3>
                                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#73818C" }}>Ödenmiş siparişler ve Solidareaty finansal dağılımı</p>
                                </div>
                                <button type="button" onClick={() => { void loadFinancialSummary(); }} disabled={financialLoading} style={{ background: financialLoading ? "#94a3b8" : "#29343C", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 12px", fontWeight: 700, cursor: financialLoading ? "not-allowed" : "pointer" }}>{financialLoading ? "Yükleniyor..." : "Yenile"}</button>
                            </div>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", marginTop: "12px" }}>
                                {[['today', 'Bugün'], ['yesterday', 'Dün'], ['week', 'Bu hafta'], ['month', 'Bu ay'], ['all', 'Tümü']].map(([key, label]) => <button key={key} type="button" onClick={() => { setFinancialPeriod(key as "today" | "yesterday" | "week" | "month" | "all"); setTimeout(loadFinancialSummary, 0) }} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#29343C", borderRadius: "7px", padding: "6px 9px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>{label}</button>)}
                                <input type="date" value={financialFrom} onChange={(e) => setFinancialFrom(e.target.value)} style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: "7px", fontSize: "11px" }} />
                                <span style={{ fontSize: "11px", color: "#73818C" }}>–</span>
                                <input type="date" value={financialTo} onChange={(e) => setFinancialTo(e.target.value)} style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: "7px", fontSize: "11px" }} />
                                <button type="button" onClick={() => loadFinancialSummary()} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#29343C", borderRadius: "7px", padding: "6px 9px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Tarihleri uygula</button>
                            </div>
                            {financialError && <div style={{ marginTop: "10px", color: "#b91c1c", fontSize: "13px" }}>{financialError}</div>}
                            {financialSummary && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: "10px", marginTop: "14px" }}>
                                {[["Brüt satış", financialSummary.gross_sales], ["Komisyon matrahı", financialSummary.commissionable_sales], ["Solidareaty payı", financialSummary.platform_fees], ["Net işletme payı", financialSummary.restaurant_net_amount], ["İadeler", financialSummary.refunded_amount], ["Ödenmiş sipariş", financialSummary.paid_order_count]].map(([label, value]) => <div key={String(label)} style={{ padding: "12px", background: "#f8fafc", borderRadius: "9px" }}><div style={{ fontSize: "11px", color: "#73818C" }}>{label}</div><div style={{ marginTop: "4px", fontSize: "18px", fontWeight: 800, color: "#29343C" }}>{label === "Ödenmiş sipariş" ? Number(value || 0) : `${Number(value || 0).toFixed(2)} €`}</div></div>)}
                            </div>}
                        </div>

                            </>
                            </div>
                        )}

                        {managerTab === "photos" && (
                            <div role="tabpanel" id="manager-panel-photos" aria-labelledby="manager-tab-photos">
                        <p style={{ margin: "0 0 14px", borderRadius: "10px", background: "#eff6ff", padding: "12px 14px", color: "#1e40af", fontSize: "13px" }}>{locale === "de" ? "Fotos werden direkt nach dem Upload gespeichert." : locale === "tr" ? "Fotoğraflar yüklendikten hemen sonra kaydedilir; ayrı bir kayıt düğmesi gerekmez." : "Photos are saved immediately after upload; no separate save button is needed."}</p>
                        {/* FOTOĞRAF YÜKLEME ALANI */}
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

                            </div>
                        )}

                        {managerTab === "menu" && (
                            <div role="tabpanel" id="manager-panel-menu" aria-labelledby="manager-tab-menu">
                        <MenuOptionManager restaurantId={selectedRestaurant.id} menuItems={menuItems} onSaved={() => { const key=`menu:${selectedRestaurant.id}`; sessionStorage.removeItem(`solidareaty-cache:${key}`); const ids=menuItems.map((item:any)=>item.id).join(","); if(ids) void fetch(`/api/menu-options?menu_item_ids=${encodeURIComponent(ids)}`,{cache:"no-store"}).then(r=>r.json()).then(payload=>{if(payload.success)setMenuItems((prev:any[])=>prev.map(item=>({...item,optionGroups:payload.optionsByMenuItem?.[String(item.id)]||[]})))}) }} />

                            </div>
                        )}

                        {/* Metin ve Ayar Formu */}
                        {managerTab === "profile" && (
                            <div role="tabpanel" id="manager-panel-profile" aria-labelledby="manager-tab-profile">
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
                        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: "20px",
                        boxSizing: "border-box",
                    }}
                >
                    {renderDetailCardBadge(badgeByRestaurant[selectedRestaurant.id])}
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
                            );
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
                        <img loading="lazy" decoding="async"
                            src={ownerImg}
                            alt="Owner"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: "250px" }}>
                        <h3 style={{ margin: "0 0 8px 0", color: "#111" }}>{t("restaurant_story")}</h3>
                        <p style={{ color: "#555", lineHeight: "1.6", margin: 0, fontSize: "14px" }}>
                            {storyText}
                        </p>
                    </div>
                </div>

                {/* MENÜ LİSTESİ VE TIKLAMA ÖZELLİĞİ */}
                <div style={{ maxWidth: "1000px", width: "92%", margin: "40px auto 0 auto", boxSizing: "border-box" }}>
                    <h2 style={{ fontSize: "24px", marginBottom: "20px", color: "#111" }}>
                        {t("restaurant_menu")}
                    </h2>
                    {menuItems.length === 0 ? (
                        <p style={{ color: "#666" }}>{t("restaurant_no_menu")}</p>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                                gap: "20px",
                                boxSizing: "border-box",
                            }}
                        >
                            {menuItems.filter((item:any) => item.is_available !== false).map((item) => {
                                const itemFallback = getPlaceholder(prodCat, item.name)
                                const itemImage = item.image_url || itemFallback
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
                                            boxSizing: "border-box",
                                            cursor: "pointer",
                                            transition: "transform 0.2s ease, border-color 0.2s ease",
                                            border: "1px solid #eaeaea",
                                        }}
                                    >
                                        <div style={{ width: "100%", height: "160px", background: "#f0f0f0" }}>
                                            <img loading="lazy" decoding="async"
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

                {/* MODAL ENTEGRASYONLARI */}
                {selectedProduct && (
                    <ProductModal
                        product={selectedProduct}
                        onClose={() => setSelectedProduct(null)}
                        onAddToCart={handleAddToCart}
                    />
                )}

                {/* CartModal Entegrasyonu (restaurantId parametresi eklendi) */}
                {isCartModalOpen && (
                    <CartModal
                        items={cartItems}
                        onClose={() => setIsCartModalOpen(false)}
                        onUpdateQuantity={handleUpdateQuantity}
                        onClearCart={() => setCartItems([])}
                        restaurantPhone={selectedRestaurant.phone}
                        restaurantName={selectedRestaurant.name}
                        restaurantId={selectedRestaurant.id}
                    />
                )}

                {/* CARTBAR ENTEGRASYONU */}
                <CartBar
                    items={cartItems}
                    onOpenCart={() => setIsCartModalOpen(true)}
                />
            </div>
        )
    }

    const language = String(locale || "en").toLowerCase().slice(0, 2)
    const copyByLanguage: Record<string, Record<string, string>> = {
      en: { title:"Discover local restaurants", search:"Search restaurants, dishes or cuisines", region:"All neighbourhoods", categories:"All cuisines", all:"All", delivery:"Delivery", pickup:"Take away", favorites:"Favourites", clear:"Clear filters", orderNow:"Order from local places", preOrder:"Opens later · delivery available", unavailable:"Unavailable for delivery", pickupOnly:"Take away only", notTaking:"Not taking orders", checkHours:"Check opening hours", open:"Open now", later:"Opens later", paused:"Not taking orders", closed:"Closed today", free:"Free delivery", rating:"Community score", menu:"View menu", noResults:"No restaurants match these filters", tryAgain:"Try another search or clear filters", loading:"Finding local restaurants…", count:"restaurants" },
      de: { title:"Restaurants aus deiner Nähe", search:"Restaurants, Gerichte oder Küchen suchen", region:"Alle Nachbarschaften", categories:"Alle Küchen", all:"Alle", delivery:"Lieferung", pickup:"Abholung", favorites:"Merkliste", clear:"Filter zurücksetzen", orderNow:"Jetzt lokal bestellen", preOrder:"Öffnet später · Lieferung verfügbar", unavailable:"Keine Lieferung verfügbar", pickupOnly:"Nur zum Mitnehmen", notTaking:"Nimmt keine Bestellungen an", checkHours:"Öffnungszeiten prüfen", open:"Jetzt geöffnet", later:"Öffnet später", paused:"Nimmt keine Bestellungen an", closed:"Heute geschlossen", free:"Kostenlose Lieferung", rating:"Community-Bewertung", menu:"Speisekarte ansehen", noResults:"Keine passenden Restaurants gefunden", tryAgain:"Suche ändern oder Filter zurücksetzen", loading:"Restaurants in deiner Nähe…", count:"Restaurants" },
      tr: { title:"Yakınındaki restoranları keşfet", search:"Restoran, yemek veya mutfak ara", region:"Tüm mahalleler", categories:"Tüm mutfaklar", all:"Tümü", delivery:"Teslimat", pickup:"Gel-al", favorites:"Favoriler", clear:"Filtreleri temizle", orderNow:"Yerel restoranlardan sipariş ver", preOrder:"Daha sonra açılır · teslimat mevcut", unavailable:"Teslimat yapılamıyor", pickupOnly:"Yalnızca gel-al", notTaking:"Sipariş almıyor", checkHours:"Çalışma saatlerini kontrol et", open:"Şimdi açık", later:"Daha sonra açılıyor", paused:"Sipariş almıyor", closed:"Bugün kapalı", free:"Ücretsiz teslimat", rating:"Topluluk puanı", menu:"Menüyü gör", noResults:"Bu filtrelerle restoran bulunamadı", tryAgain:"Başka bir arama dene veya filtreleri temizle", loading:"Yakınındaki restoranlar bulunuyor…", count:"restoran" }
    }
    const copy = copyByLanguage[language] || copyByLanguage.en
    const categories = Array.from(new Set(restaurants.map((res: any) => String(res.product_category || res.cuisine_type || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
    const allFilteredRestaurants = restaurants.filter((res: any) => {
        const inRegion = !selectedZipcode || res.zipcode === selectedZipcode || (Array.isArray(res.service_zipcodes) && res.service_zipcodes.includes(selectedZipcode))
        const query = discoveryQuery.trim().toLocaleLowerCase()
        const matchesQuery = !query || [res.name, res.description, res.story, res.product_category, res.cuisine_type, res.address].some((value) => String(value || "").toLocaleLowerCase().includes(query))
        const matchesCategory = !discoveryCategory || String(res.product_category || res.cuisine_type || "").trim() === discoveryCategory
        const services = discoveryServices(res)
        const matchesMode = discoveryMode === "all" || (discoveryMode === "delivery" ? services.delivery : services.pickup)
        const matchesFavorite = !favoritesOnly || favoriteIds.includes(String(res.id))
        return inRegion && matchesQuery && matchesCategory && matchesMode && matchesFavorite
    })
    const statusOf = (res: any) => discoveryHoursStatus(res)
    const serviceOf = (res: any) => discoveryServices(res)
    const orderNow = allFilteredRestaurants.filter((res: any) => statusOf(res).status === "open" && (serviceOf(res).delivery || serviceOf(res).pickup) && !(serviceOf(res).pickup && !serviceOf(res).delivery && !serviceOf(res).dineIn))
    const preOrder = allFilteredRestaurants.filter((res: any) => statusOf(res).status === "later" && serviceOf(res).delivery)
    const unavailableForDelivery = allFilteredRestaurants.filter((res: any) => statusOf(res).status === "open" && !serviceOf(res).delivery && (serviceOf(res).pickup || serviceOf(res).dineIn) && !(serviceOf(res).pickup && !serviceOf(res).dineIn))
    const pickupOnly = allFilteredRestaurants.filter((res: any) => serviceOf(res).pickup && !serviceOf(res).delivery && !serviceOf(res).dineIn && (statusOf(res).status === "open" || statusOf(res).status === "later"))
    const notTaking = allFilteredRestaurants.filter((res: any) => statusOf(res).status === "paused" || statusOf(res).status === "closed")
    const needsHoursCheck = allFilteredRestaurants.filter((res: any) => statusOf(res).status === "unknown" || (statusOf(res).status === "open" && !serviceOf(res).delivery && !serviceOf(res).pickup && !serviceOf(res).dineIn))
    const sections = [
      { key:"order-now", title:copy.orderNow, items:orderNow },
      { key:"pre-order", title:copy.preOrder, items:preOrder },
      { key:"delivery-unavailable", title:copy.unavailable, items:unavailableForDelivery },
      { key:"pickup-only", title:copy.pickupOnly, items:pickupOnly },
      { key:"not-taking", title:copy.notTaking, items:notTaking },
      { key:"check-hours", title:copy.checkHours, items:needsHoursCheck },
    ].filter((section) => section.items.length > 0)
    const hasActiveFilters = Boolean(discoveryQuery || discoveryCategory || discoveryMode !== "all" || favoritesOnly || selectedZipcode)
    const clearFilters = () => { setDiscoveryQuery(""); setDiscoveryCategory(""); setDiscoveryMode("all"); setFavoritesOnly(false); setSelectedZipcode(""); localStorage.removeItem("solidareatySelectedZipcode") }
    const toggleFavorite = (event: React.MouseEvent, id: string) => { event.stopPropagation(); setFavoriteIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]) }
    const timeLabel = (res: any) => {
        const status = statusOf(res)
        if (status.status === "open") return copy.open
        if (status.status === "paused") return copy.paused
        if (status.status === "closed") return copy.closed
        if (status.status === "later") return `${copy.later}${status.time ? ` · ${status.time}` : ""}`
        return ""
    }
    const renderRestaurantCard = (res: any) => {
        const services = serviceOf(res)
        const status = statusOf(res)
        const favorite = favoriteIds.includes(String(res.id))
        const category = res.product_category || res.cuisine_type || ""
        const image = res.cover_image_url || res.image_url || getPlaceholder(category, res.name)
        const logo = res.logo_url || getPlaceholder(category, res.name)
        return <article key={res.id} className="sa-discovery-card" role="group" tabIndex={0} aria-label={`${res.name} restaurant card`} onClick={() => setSelectedRestaurant(res)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedRestaurant(res) } }} style={{ background:"#fff", border:"1px solid #e6eae3", borderRadius:"20px", overflow:"hidden", boxShadow:"0 8px 24px rgba(32,54,44,.055)", cursor:"pointer", minWidth:0 }}>
          <div style={{ height:"184px", position:"relative", background:"#e9ede7" }}><img loading="lazy" decoding="async" src={image} alt={res.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/><div style={{ position:"absolute", inset:"50% 0 0", background:"linear-gradient(transparent,rgba(25,39,31,.18))" }}/>{category && <span style={{ position:"absolute", left:"13px", top:"13px", borderRadius:"99px", background:"#ffffffed", padding:"6px 9px", color:"#52665a", fontSize:"10px", fontWeight:800 }}>{category}</span>}<button type="button" aria-label={favorite ? "Remove from favourites" : "Add to favourites"} aria-pressed={favorite} onClick={(event) => toggleFavorite(event, String(res.id))} style={{ position:"absolute", top:"11px", right:"11px", display:"grid", placeItems:"center", width:"40px", height:"40px", border:"1px solid #ffffffc9", borderRadius:"50%", background:"#ffffffed", color:favorite?"#ad7652":"#667367", cursor:"pointer", boxShadow:"0 3px 12px #0002" }}><DiscoveryIcon name="heart" size={19}/></button><img loading="lazy" decoding="async" src={logo} alt="" style={{ position:"absolute", left:"15px", bottom:"-19px", width:"54px", height:"54px", borderRadius:"16px", border:"3px solid #fff", objectFit:"cover", background:"white", boxShadow:"0 4px 12px #0002" }}/></div>
          <div style={{ padding:"29px 16px 15px" }}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px" }}><h3 style={{ margin:"0 0 7px", fontSize:"17px", lineHeight:1.25, color:"#263f32" }}>{res.name}</h3>{renderCardBadge(res.id)}</div><p style={{ margin:"0 0 12px", minHeight:"18px", color:"#78847a", fontSize:"12px", lineHeight:1.5, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{res.story || res.description || ""}</p>
            <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:"7px", marginBottom:"10px" }}>{Number(res.rating) > 0 && <span style={{ display:"inline-flex", alignItems:"center", gap:"5px", borderRadius:"9px", padding:"6px 8px", background:"#f5f0e5", color:"#806e4d", fontSize:"10px", fontWeight:800 }}><DiscoveryIcon name="star" size={13}/>{Number(res.rating).toFixed(1)} <span style={{ fontWeight:600, color:"#978b74" }}>{copy.rating}</span></span>}{status.status !== "unknown" && <span style={{ display:"inline-flex", alignItems:"center", gap:"5px", borderRadius:"9px", padding:"6px 8px", background:status.status === "open" ? "#eef3ec" : "#f4f0e9", color:status.status === "open" ? "#566c55" : "#806c4d", fontSize:"10px", fontWeight:750 }}><DiscoveryIcon name="clock" size={13}/>{timeLabel(res)}</span>}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"12px" }}>{services.delivery && <span className="sa-service-pill"><DiscoveryIcon name="arrow" size={12}/>{copy.delivery}</span>}{services.pickup && <span className="sa-service-pill"><DiscoveryIcon name="bag" size={12}/>{copy.pickup}</span>}{services.freeDelivery && <span className="sa-service-pill sa-free-pill">{copy.free}</span>}{!services.delivery && services.pickup && <span className="sa-service-pill">{copy.unavailable}</span>}</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", borderTop:"1px solid #edf0eb", paddingTop:"10px" }}><span style={{ minWidth:0, display:"inline-flex", alignItems:"center", gap:"5px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#89938b", fontSize:"10px" }}><DiscoveryIcon name="pin" size={13}/>{res.address || ""}</span><span style={{ display:"inline-flex", alignItems:"center", gap:"5px", color:"#60735f", fontSize:"11px", fontWeight:800, whiteSpace:"nowrap" }}>{t("restaurant_view_menu")}<DiscoveryIcon name="arrow" size={13}/></span></div>
          </div>
        </article>
    }

    return <main className="sa-discovery" style={{ width:"100%", minHeight:"100vh", boxSizing:"border-box", padding:"32px 20px 52px", background:"#f7f8f3", color:"#263f32", overflowX:"hidden" }}>
      <style>{`@keyframes sa-discovery-hover{to{transform:translateY(-4px);box-shadow:0 18px 38px rgba(32,54,44,.13)}}@keyframes sa-award-glow{0%,100%{filter:drop-shadow(0 3px 6px rgba(120,91,39,.22))}50%{filter:drop-shadow(0 5px 13px rgba(174,132,55,.42))}}.sa-discovery-card{transition:transform .2s ease,box-shadow .2s ease}.sa-discovery-card:hover{transform:translateY(-4px);box-shadow:0 18px 38px rgba(32,54,44,.13)!important}.solidareaty-award-badge{animation:sa-award-glow 3.5s ease-in-out infinite}.sa-service-pill{display:inline-flex;align-items:center;gap:4px;border-radius:8px;background:#f0f3ed;color:#627064;padding:5px 7px;font-size:9px;font-weight:750}.sa-free-pill{background:#f3eee3;color:#826d49}.sa-discovery-button{min-height:39px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:8px 13px;border:1px solid #e2e7df;border-radius:999px;background:#fff;color:#596a5d;font-size:11px;font-weight:800;white-space:nowrap;cursor:pointer}.sa-discovery-button[aria-pressed=true]{background:#263f32;color:#fff;border-color:#263f32}@media(max-width:640px){.sa-discovery{padding:22px 14px 40px!important}.sa-discovery-toolbar{grid-template-columns:1fr!important}.sa-discovery-grid{grid-template-columns:1fr!important}}@media(prefers-reduced-motion:reduce){.sa-discovery-card,.solidareaty-award-badge{animation:none!important;transition:none!important}}`}</style>
      <div style={{ maxWidth:"1180px", margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:"25px" }}><SolidareatyLogo className="mx-auto mb-4 block h-auto w-[210px] max-w-[75vw]"/><h2 style={{ margin:"0 0 7px", fontSize:"clamp(23px,4vw,32px)", letterSpacing:"-.8px", color:"#263f32" }}>{copy.title}</h2><p style={{ margin:0, color:"#79847a", fontSize:"12px" }}>{copy.intro || "Independent places, connected to your neighbourhood."}</p></div>
        <div className="sa-discovery-toolbar" style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(210px,.48fr)", gap:"10px", marginBottom:"11px" }}><label style={{ display:"flex", alignItems:"center", gap:"9px", minHeight:"48px", padding:"0 13px", border:"1px solid #e5e9e2", borderRadius:"14px", background:"white" }}><DiscoveryIcon name="search" size={19}/><input aria-label={copy.search} type="search" placeholder={copy.search} value={discoveryQuery} onChange={(event)=>setDiscoveryQuery(event.target.value)} style={{ width:"100%", minWidth:0, border:0, outline:0, background:"transparent", color:"#263f32", fontSize:"12px" }}/></label><label style={{ display:"flex", alignItems:"center", gap:"8px", minHeight:"48px", padding:"0 11px", border:"1px solid #e5e9e2", borderRadius:"14px", background:"white" }}><DiscoveryIcon name="pin" size={17}/><select aria-label={copy.region} value={selectedZipcode} onChange={(event)=>{const value=event.target.value;setSelectedZipcode(value);if(value)localStorage.setItem("solidareatySelectedZipcode",value);else localStorage.removeItem("solidareatySelectedZipcode")}} style={{ width:"100%", border:0, outline:0, background:"transparent", color:"#43584a", fontSize:"12px", fontWeight:750 }}><option value="">{copy.region}</option>{regions.map((reg)=><option key={`${reg.zipcode}-${reg.city}-${reg.district}`} value={reg.zipcode}>{reg.zipcode} {reg.city} ({reg.district})</option>)}</select></label></div>
        <div style={{ display:"flex", alignItems:"center", gap:"7px", overflowX:"auto", padding:"2px 0 12px" }}><button type="button" className="sa-discovery-button" aria-pressed={discoveryMode==="all"} onClick={()=>setDiscoveryMode("all")}>{copy.all}</button><button type="button" className="sa-discovery-button" aria-pressed={!discoveryCategory} onClick={()=>setDiscoveryCategory("")}>{copy.categories}</button><button type="button" className="sa-discovery-button" aria-pressed={discoveryMode==="delivery"} onClick={()=>setDiscoveryMode("delivery")}><DiscoveryIcon name="arrow" size={14}/>{copy.delivery}</button><button type="button" className="sa-discovery-button" aria-pressed={discoveryMode==="pickup"} onClick={()=>setDiscoveryMode("pickup")}><DiscoveryIcon name="bag" size={14}/>{copy.pickup}</button><button type="button" className="sa-discovery-button" aria-pressed={favoritesOnly} onClick={()=>setFavoritesOnly(!favoritesOnly)}><DiscoveryIcon name="heart" size={14}/>{copy.favorites}{favoriteIds.length?` · ${favoriteIds.length}`:""}</button>{categories.map((category)=><button key={category} type="button" className="sa-discovery-button" aria-pressed={discoveryCategory===category} onClick={()=>setDiscoveryCategory(discoveryCategory===category?"":category)}>{category}</button>)}{hasActiveFilters&&<button type="button" className="sa-discovery-button" onClick={clearFilters}>{copy.clear}</button>}</div>
        {loading ? <div role="status" style={{ padding:"52px 20px", textAlign:"center", color:"#778278", fontSize:"13px" }}>{copy.loading}</div> : allFilteredRestaurants.length===0 ? <div style={{ padding:"44px 20px", textAlign:"center", border:"1px dashed #d7ded5", borderRadius:"18px", background:"#ffffffb5", color:"#69776d" }}><DiscoveryIcon name="search" size={29}/><h3 style={{ margin:"12px 0 6px", color:"#344d3e", fontSize:"17px" }}>{copy.noResults}</h3><p style={{ margin:"0 0 14px", fontSize:"12px" }}>{copy.tryAgain}</p>{hasActiveFilters&&<button type="button" className="sa-discovery-button" onClick={clearFilters}>{copy.clear}</button>}</div> : <><div aria-live="polite" style={{ margin:"0 0 13px", color:"#7b867d", fontSize:"11px", fontWeight:700 }}>{allFilteredRestaurants.length} {copy.count}</div>{sections.map((section)=><section key={section.key} style={{ marginBottom:"24px" }}><h3 style={{ display:"flex", alignItems:"center", gap:"8px", margin:"0 0 11px", color:"#344d3e", fontSize:"17px", letterSpacing:"-.3px" }}>{section.title}<span style={{ borderRadius:"99px", padding:"3px 8px", background:"#ecefe8", color:"#68766b", fontSize:"10px" }}>{section.items.length}</span></h3><div className="sa-discovery-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,270px),1fr))", gap:"15px" }}>{section.items.map(renderRestaurantCard)}</div></section>)}</>}
      </div>
    </main>

}