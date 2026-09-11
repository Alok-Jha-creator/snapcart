import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function proxy (req:NextRequest){
    const {pathname}= req.nextUrl
    const publicRoutes= ["/register","/login","/api/auth","/favicon.ico","/_next"]
    if(publicRoutes.some((path)=>pathname.startsWith(path))){
        return NextResponse.next()
    }
    const token = await getToken({req,secret:process.env.AUTH_SECRET})
    console.log(token)
    return NextResponse.next()
}