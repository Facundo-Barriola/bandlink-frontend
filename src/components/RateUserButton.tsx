"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RateUserDialog } from "@/components/RateUserDialog";
import { useUser } from "@/app/context/userContext";

export function RateUserButton({ targetIdUser }: { targetIdUser: number }) {
  const [open, setOpen] = useState(false);
  const { user } = useUser(); // para bloquear self-rating si querés

  const isSelf = user?.idUser === targetIdUser;

  return (
    <>
      <Button
        className="rounded-xl"
        onClick={() => setOpen(true)}
        disabled={isSelf}
        title={isSelf ? "No podés calificarte a vos mismo" : "Calificar"}
      >
        Calificar
      </Button>

      <RateUserDialog
        open={open}
        onOpenChange={setOpen}
        targetIdUser={targetIdUser}
        onSubmitted={() => {
        }}
      />
    </>
  );
}
