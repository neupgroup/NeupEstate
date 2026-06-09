"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/logica/core/hooks/use-toast";

type PropertyDetailRenderNoticeProps = {
  show: boolean;
};

export function PropertyDetailRenderNotice({ show }: PropertyDetailRenderNoticeProps) {
  const { toast } = useToast();
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (!show || hasShownRef.current) {
      return;
    }

    hasShownRef.current = true;
    toast({
      variant: "destructive",
      title: "Something went wrong",
      description: "We could not fully load some property details, but the page is still available. Management is notified.",
    });
  }, [show, toast]);

  return null;
}
