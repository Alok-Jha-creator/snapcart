import { log } from "console"
import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const publicRoutes = ["/register", "/login", "/api/auth"]

  if (publicRoutes.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.AUTH_SECRET })
  console.log(token)

  if (!token) {
    console.log(req.url)
    const loginUrl=new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}