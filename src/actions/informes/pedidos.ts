"use server";

import { requireAuth } from "@/utils/supabase/require-auth";

export async function generatePedidos(
  informeId: string,
  items: string[]
) {
  if (!items || items.length === 0) return { error: "No hay pedidos para generar" };

  const { supabase, user } = await requireAuth();
  if (!user) return { error: "No autenticado" };

  const { data: informeData, error: fetchError } = await supabase
    .from("informes")
    .select("status")
    .eq("id", informeId)
    .eq("doctor_id", user.id)
    .single();

  if (fetchError || !informeData) return { error: "Informe no encontrado" };
  if (informeData.status !== "completed") return { error: "El informe no esta completado" };

  // Build on-demand PDF URLs for each item
  const urls = items.map((item) => {
    const params = new URLSearchParams({ id: informeId, item });
    return `/api/pdf/pedido?${params.toString()}`;
  });

  // Build merged URL with all items
  const mergedParams = new URLSearchParams({ id: informeId });
  for (const item of items) {
    mergedParams.append("item", item);
  }
  const mergedUrl = `/api/pdf/pedidos?${mergedParams.toString()}`;

  return { urls, mergedUrl };
}
