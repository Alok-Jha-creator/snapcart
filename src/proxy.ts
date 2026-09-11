import { NextRequest, NextResponse } from "next/server";

export async function proxy (req:NextRequest){
    const {pathname}= req.nextUrl
    const publicRoutes= ["/register","/login","/api/auth","/favicon.ico","/_next"]
      publicRoutes.some((path)=>path==pathname )
    return NextResponse.next()
}