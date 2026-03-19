import Link from 'next/link'
import { LoginForm } from '@/features/auth/components'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-6 mb-2">Bienvenido de nuevo</h1>
            <p className="text-slate-500 dark:text-slate-400">Ingresa tus credenciales para acceder a tu cuenta.</p>
          </div>

        <LoginForm />

        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
