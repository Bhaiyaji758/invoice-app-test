import { Suspense } from "react";
import InvoiceEditorClient from "./InvoiceEditorClient";

export default function InvoiceEditorPage() {
  return (
    <Suspense fallback={null}>
      <InvoiceEditorClient />
    </Suspense>
  );
}

