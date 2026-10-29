import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jsonError=(message:string,status:number)=>NextResponse.json({success:false,error:message},{status,headers:{"Cache-Control":"no-store"}});

export async function GET(request:NextRequest){
 try{
  if(!URL||!ANON||!SERVICE)return jsonError("KDS server configuration is missing.",500);
  const token=request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)return jsonError("Please sign in to the kitchen display.",401);
  const authClient=createClient(URL,ANON,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await authClient.auth.getUser(token);
  if(userError||!userData.user)return jsonError("Your session is invalid or expired.",401);
  const admin=createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
  const params=request.nextUrl.searchParams;const restaurantId=params.get("restaurant_id");const view=params.get("view");
  if(!restaurantId||!(["board","archive"] as string[]).includes(view||""))return jsonError("Restaurant or KDS view is invalid.",400);
  const {data:membership,error:membershipError}=await admin.from("restaurant_memberships").select("restaurant_id,role,is_active").eq("restaurant_id",restaurantId).eq("user_id",userData.user.id).eq("is_active",true).in("role",["kitchen","kitchen_supervisor"]).maybeSingle();
  if(membershipError)return jsonError("Kitchen membership could not be verified.",500);
  if(!membership)return jsonError("You do not have active kitchen access to this restaurant.",403);
  const {data:restaurant,error:restaurantError}=await admin.from("restaurants").select("id,name,is_active").eq("id",restaurantId).eq("is_active",true).maybeSingle();
  if(restaurantError||!restaurant)return jsonError("This restaurant is not active or could not be found.",404);
  let query=admin.from("orders").select("*").eq("restaurant_id",restaurantId).order("created_at",{ascending:view==="board"}).range(0,999);
  if(view==="board")query=query.in("status",["pending","preparing","ready"]);
  else{
   query=query.in("status",["completed","cancelled"]);
   const from=params.get("from"),to=params.get("to");
   const datePattern=/^\d{4}-\d{2}-\d{2}$/;
   if(from&&!datePattern.test(from))return jsonError("Archive start date is invalid.",400);
   if(to&&!datePattern.test(to))return jsonError("Archive end date is invalid.",400);
   if(from&&to&&from>to)return jsonError("Archive date range is invalid.",400);
   if(from)query=query.gte("created_at",`${from}T00:00:00.000Z`);
   if(to){const next=new Date(`${to}T00:00:00.000Z`);next.setUTCDate(next.getUTCDate()+1);query=query.lt("created_at",next.toISOString());}
  }
  const {data:orders,error:ordersError}=await query;
  if(ordersError)return jsonError(`Could not load kitchen orders: ${ordersError.message}`,500);
  const rows=orders||[];const ids=rows.map((order:any)=>order.id);let items:any[]=[];let itemsWarning:string|undefined;
  if(ids.length){let itemResult=await admin.from("order_items").select("id,order_id,product_name,quantity,unit_price,line_total,selected_options").in("order_id",ids);
   if(itemResult.error){const fallback=await admin.from("order_items").select("id,order_id,product_name,quantity,unit_price,line_total").in("order_id",ids);if(fallback.error)itemsWarning=fallback.error.message;else items=fallback.data||[];}
   else items=itemResult.data||[];
  }
  const byOrder=new Map<string,any[]>();for(const item of items){const list=byOrder.get(item.order_id)||[];list.push(item);byOrder.set(item.order_id,list);}
  const enriched=rows.map((order:any)=>({...order,order_items:byOrder.get(order.id)||[]}));
  return NextResponse.json({success:true,restaurant:{id:restaurant.id,name:restaurant.name},orders:enriched,items_warning:itemsWarning},{headers:{"Cache-Control":"no-store"}});
 }catch(error){console.error("KDS orders API error",error);return jsonError("Unexpected KDS error.",500);}
}
