import { Suspense } from "react";
import InvoicePrintViewClient from "./InvoicePrintViewClient";

export default function InvoicePrintViewPage() {
  return (
    <Suspense fallback={null}>
      <InvoicePrintViewClient />
    </Suspense>
  );
}

