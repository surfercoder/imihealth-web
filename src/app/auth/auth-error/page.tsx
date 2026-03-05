import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <XCircle className="size-6" />
            </div>
            <div>
              <p className="font-semibold">Error de autenticación</p>
              <p className="mt-1 text-sm text-muted-foreground">
                El enlace que usaste es inválido o expiró. Por favor, intentá de nuevo.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button asChild>
                <Link href="/login">Volver al inicio de sesión</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/forgot-password">Solicitar un nuevo enlace</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
