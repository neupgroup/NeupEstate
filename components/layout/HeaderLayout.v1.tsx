"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useNeupUser } from "@/lib/neup-user-context";
import { HeaderV1 } from "@/components/elements/Header.v1";

export function HeaderLayoutV1() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useNeupUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const selectedAgency = searchParams.get("selectedAgency");

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
      selectedAgency={selectedAgency}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      user={user}
    />
  );
}
