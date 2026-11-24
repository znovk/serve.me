"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestConnection } from "@/modules/connections/actions";

export function ConnectButton({ username }: { username: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  if (message?.ok) {
    return (
      <p role="status" className="text-sm text-success">
        {message.text}
      </p>
    );
  }
  return (
    <div className="grid gap-2">
      <Button
        variant="brand"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await requestConnection(username);
            setMessage({ ok: res.ok, text: res.message ?? (res.ok ? "Request sent." : "Couldn't send request.") });
          })
        }
      >
        <UserPlus aria-hidden /> Connect
      </Button>
      {message && !message.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
