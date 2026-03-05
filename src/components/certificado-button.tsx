"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Award, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateAndSaveCertificado } from "@/actions/informes";

interface CertificadoButtonProps {
  informeId: string;
  patientName: string;
}

export function CertificadoButton({ informeId, patientName }: CertificadoButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [daysOff, setDaysOff] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [observations, setObservations] = useState<string>("");
  const [certUrl, setCertUrl] = useState<string | null>(null);

  function handleOpenChange(val: boolean) {
    if (!isPending) {
      setOpen(val);
      if (!val) {
        setCertUrl(null);
        setDaysOff("");
        setDiagnosis("");
        setObservations("");
      }
    }
  }

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateAndSaveCertificado(informeId, {
        daysOff: daysOff ? parseInt(daysOff, 10) : null,
        diagnosis: diagnosis.trim() || null,
        observations: observations.trim() || null,
      });

      if (result?.error) {
        toast.error("Error al generar certificado", {
          description: result.error,
        });
      } else if (result?.signedUrl) {
        setCertUrl(result.signedUrl);
        toast.success("Certificado generado", {
          description: `El certificado médico de ${patientName} está listo.`,
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Award className="size-4 mr-1.5" />
          Crear Certificado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Certificado médico</DialogTitle>
          <DialogDescription>
            Generá un certificado médico para {patientName} para presentar en trabajo, escuela o universidad.
          </DialogDescription>
        </DialogHeader>

        {certUrl ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <Award className="size-7 text-primary" />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              El certificado fue generado correctamente.
            </p>
            <Button asChild className="w-full">
              <a href={certUrl} target="_blank" rel="noopener noreferrer">
                <Download className="size-4 mr-1.5" />
                Descargar certificado
              </a>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setCertUrl(null);
                setDaysOff("");
                setDiagnosis("");
                setObservations("");
              }}
            >
              Generar otro certificado
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="daysOff">Días de reposo</Label>
                <Input
                  id="daysOff"
                  type="number"
                  min={1}
                  max={365}
                  placeholder="Ej: 2"
                  value={daysOff}
                  onChange={(e) => setDaysOff(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Dejar vacío si no se indica reposo.
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="diagnosis">Diagnóstico</Label>
                <Input
                  id="diagnosis"
                  placeholder="Ej: Síndrome gripal"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Opcional. Se incluirá en el certificado si se completa.
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="observations">Observaciones</Label>
                <Textarea
                  id="observations"
                  placeholder="Observaciones adicionales..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  disabled={isPending}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Award className="size-4 mr-1.5" />
                    Generar certificado
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
