/**
 * Legacy Popup export — now delegates to shared CartifyApp.
 * Kept for backward compatibility.
 */
import { CartifyApp } from "../shared/CartifyApp";

export function Popup() {
  return <CartifyApp mode="popup" />;
}
