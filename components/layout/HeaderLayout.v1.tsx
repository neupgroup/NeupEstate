"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "@/core/providers/session";
import { HeaderV1 } from "@/components/elements/Header.v1";

export function HeaderLayoutV1() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const workingProfile = searchParams.get("workingProfile");
  const selectedProfile = searchParams.get("selectedProfile");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <HeaderV1
      pathname={pathname}
      isManage={pathname.startsWith("/manage")}
      selectedProfile={selectedProfile}
      workingProfile={workingProfile}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      user={user}
    />
  );
}
