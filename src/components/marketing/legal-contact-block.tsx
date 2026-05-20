import { LEGAL_ENTITY } from "@/lib/legal/constants";

export function LegalContactBlock() {
  return (
    <address className="pk-legal-contact not-italic">
      <strong>{LEGAL_ENTITY.name}</strong>
      <br />
      {LEGAL_ENTITY.addressLine1}
      <br />
      {LEGAL_ENTITY.addressLine2}
      <br />
      <a href={`tel:${LEGAL_ENTITY.phone.replace(/[^\d+]/g, "")}`}>{LEGAL_ENTITY.phone}</a>
      <br />
      <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>
    </address>
  );
}
