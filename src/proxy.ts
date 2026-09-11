import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function proxy (req:NextRequest){
    const {pathname}= req.nextUrl
    const publicRoutes= ["/register","/login","/api/auth","/favicon.ico","/_next"]
    if(publicRoutes.some((path)=>pathname.startsWith(path))){
        return NextResponse.next()
    }
      //publicRoutes.some((path)=>path==pathname )
    return NextResponse.next()
}