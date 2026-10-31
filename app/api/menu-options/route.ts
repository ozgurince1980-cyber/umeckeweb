import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
const fail=(message:string,status=400)=>NextResponse.json({success:false,error:message},{status});
function clients(){if(!url||!anon||!service)throw new Error("Supabase server configuration missing");return {publicClient:createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}}),admin:createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})}}
async function authorized(request:NextRequest,restaurantId:string){
 const token=request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)return null;
 const {publicClient,admin}=clients();const {data,error}=await publicClient.auth.getUser(token);if(error||!data.user)return null;
 const [{data:platform},{data:membership}]=await Promise.all([
  admin.from("platform_memberships").select("user_id").eq("user_id",data.user.id).eq("role","platform_admin").eq("is_active",true).maybeSingle(),
  admin.from("restaurant_memberships").select("user_id").eq("user_id",data.user.id).eq("restaurant_id",restaurantId).eq("is_active",true).in("role",["owner","manager"]).maybeSingle()
 ]);
 return platform||membership?{user:data.user,admin}:null;
}
export async function GET(request:NextRequest){
 try{
  const {admin}=clients();const params=request.nextUrl.searchParams;const restaurantId=params.get("restaurant_id");const includeInactive=params.get("include_inactive")==="true";
  let itemIds=(params.get("menu_item_ids")||"").split(",").filter(Boolean).map(Number).filter(n=>Number.isInteger(n)&&n>0);
  if(includeInactive&&!restaurantId)return fail("Inactive options are only available to authenticated restaurant managers.",401);
  if(restaurantId&&!includeInactive)return fail("Use the public menu-item ID lookup for customer-facing option data.",400);
  if(restaurantId&&includeInactive){const auth=await authorized(request,restaurantId);if(!auth)return fail("Authentication and restaurant manager permission are required.",401);const {data,error}=await auth.admin.from("menu_items").select("id").eq("restaurant_id",restaurantId).limit(500);if(error)throw error;itemIds=(data||[]).map((x:any)=>x.id)}
  if(!itemIds.length||itemIds.length>500)return NextResponse.json({success:true,groups:[],optionsByMenuItem:{}});
  if(!restaurantId){const {data:items,error}=await admin.from("menu_items").select("id,restaurant_id,is_available").in("id",itemIds).eq("is_available",true);if(error)throw error;const restaurantIds=Array.from(new Set((items||[]).map((i:any)=>i.restaurant_id).filter(Boolean)));const {data:restaurants}=await admin.from("restaurants").select("id").in("id",restaurantIds).eq("is_active",true);const active=new Set((restaurants||[]).map((r:any)=>r.id));itemIds=(items||[]).filter((i:any)=>active.has(i.restaurant_id)).map((i:any)=>i.id)}
  const groupQuery=admin.from("menu_item_option_groups").select("group_id,restaurant_id,menu_item_id,name_en,name_de,name_tr,min_select,max_select,required,sort_order,is_active").in("menu_item_id",itemIds).order("sort_order",{ascending:true});
  if(!includeInactive)groupQuery.eq("is_active",true);
  const {data:groups,error}=await groupQuery;if(error)throw error;const ids=(groups||[]).map((g:any)=>g.group_id);let options:any[]=[];
  if(ids.length){const query=admin.from("menu_item_options").select("option_id,group_id,name_en,name_de,name_tr,price_delta,sort_order,is_active").in("group_id",ids).order("sort_order",{ascending:true});if(!includeInactive)query.eq("is_active",true);const result=await query;if(result.error)throw result.error;options=result.data||[]}
  const optionsByGroup=new Map<number,any[]>();for(const option of options){const list=optionsByGroup.get(option.group_id)||[];list.push(option);optionsByGroup.set(option.group_id,list)}
  const resultGroups=(groups||[]).map((g:any)=>({...g,options:optionsByGroup.get(g.group_id)||[]}));const optionsByMenuItem:Record<string,any[]>={};for(const g of resultGroups){(optionsByMenuItem[String(g.menu_item_id)] ||= []).push(g)}
  return NextResponse.json({success:true,groups:resultGroups,optionsByMenuItem});
 }catch(error){console.error("menu-options GET",error);return fail("Could not load menu options.",500)}
}
export async function POST(request:NextRequest){
 try{const body=await request.json();const restaurantId=String(body.restaurant_id||"");const auth=await authorized(request,restaurantId);if(!auth)return fail("Sign in with an active restaurant owner or manager account.",401);
  const menuItemId=Number(body.menu_item_id);const options=body.options;
  if(!Number.isInteger(menuItemId)||menuItemId<=0||!Array.isArray(options)||options.length<1||options.length>40)return fail("Choose a product and provide between 1 and 40 options.");
  const {data:item,error:itemError}=await auth.admin.from("menu_items").select("id,restaurant_id").eq("id",menuItemId).eq("restaurant_id",restaurantId).maybeSingle();if(itemError||!item)return fail("The selected product does not belong to this restaurant.",403);
  const min=Number(body.min_select),max=Number(body.max_select);if(!Number.isInteger(min)||!Number.isInteger(max)||min<0||max<1||max>options.length||min>max)return fail("Selection limits are invalid.");
  for(const option of options){if(!String(option.name_en||"").trim()||!Number.isFinite(Number(option.price_delta))||Number(option.price_delta)<0)return fail("Each option needs an English name and a non-negative price.")}
  const {data,error}=await auth.admin.rpc("save_menu_item_option_group",{p_group_id:body.group_id?Number(body.group_id):null,p_restaurant_id:restaurantId,p_menu_item_id:menuItemId,p_name_en:String(body.name_en||"").trim(),p_name_de:String(body.name_de||"").trim()||null,p_name_tr:String(body.name_tr||"").trim()||null,p_min_select:min,p_max_select:max,p_required:body.required===true,p_sort_order:Number(body.sort_order||0),p_options:options});
  if(error)throw error;return NextResponse.json({success:true,group_id:data});
 }catch(error){console.error("menu-options POST",error);return fail(error instanceof Error?error.message:"Could not save options.",500)}
}
export async function DELETE(request:NextRequest){
 try{const body=await request.json();const restaurantId=String(body.restaurant_id||"");const auth=await authorized(request,restaurantId);if(!auth)return fail("Sign in with an active restaurant owner or manager account.",401);const groupId=Number(body.group_id);if(!Number.isInteger(groupId)||groupId<=0)return fail("Invalid option group.");const {error}=await auth.admin.from("menu_item_option_groups").delete().eq("group_id",groupId).eq("restaurant_id",restaurantId);if(error)throw error;return NextResponse.json({success:true})}catch(error){console.error("menu-options DELETE",error);return fail("Could not delete the option group.",500)}
}
