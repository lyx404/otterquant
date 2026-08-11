import { useEffect } from "react";
import "./Marketplace.css";

export default function MarketplaceUserProfile() {
  useEffect(() => {
    document.documentElement.classList.add("oq-marketplace-active");
    return () => document.documentElement.classList.remove("oq-marketplace-active");
  }, []);

  return <div className="oq-marketplace-user-profile" aria-label="User profile" />;
}
