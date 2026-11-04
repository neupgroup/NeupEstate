"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@neup/core/hooks/useToast";

type ListingDetailRenderNoticeProps = {
  show: boolean;
};

export function ListingDetailRenderNotice({ show }: ListingDetailRenderNoticeProps) {
  const { toast } = useToast();
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (!show || hasShownRef.current) {
      return;
    }

    hasShownRef.current = true;
    toast({ name: "default",
      type: "solid", convey: "danger",
      title: "Something went wrong",
      description: "We could not fully load some property details, but the page is still available. Management is notified.",
    });
  }, [show, toast]);

  return null;
}
