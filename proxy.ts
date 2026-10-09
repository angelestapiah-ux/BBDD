import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Solo entra al CRM quien tiene perfil en perfiles_usuario. Las cuentas sin perfil
// (por ejemplo, las asesoras de Pulso Renova, que comparten este Supabase) se
// cierran y vuelven al login con un aviso.
async function tienePerfil(userId: string) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await admin.from('perfiles_usuario').select('user_id').eq('user_id', userId).maybeSingle()
  return !error && !!data
}

function cerrarSesion(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = '?acceso=pendiente'
  const res = NextResponse.redirect(url)
  request.cookies.getAll()
    .filter(c => c.name.startsWith('sb-'))
    .forEach(c => res.cookies.set(c.name, '', { path: '/', maxAge: 0 }))
  return res
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isLoginPage = request.nextUrl.pathname === '/login'

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && !(await tienePerfil(user.id))) {
    // En /login con el aviso ya visible, solo limpiamos la sesión.
    if (isLoginPage && request.nextUrl.searchParams.get('acceso') === 'pendiente') {
      request.cookies.getAll()
        .filter(c => c.name.startsWith('sb-'))
        .forEach(c => supabaseResponse.cookies.set(c.name, '', { path: '/', maxAge: 0 }))
      return supabaseResponse
    }
    return cerrarSesion(request)
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
