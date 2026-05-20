import type { LegalSection } from "@/components/marketing/legal-types";
import { LegalContactBlock } from "@/components/marketing/legal-contact-block";

type LegalDocumentBodyProps = {
  sections: LegalSection[];
  showContactOnLastSection?: boolean;
};

export function LegalDocumentBody({
  sections,
  showContactOnLastSection = true,
}: LegalDocumentBodyProps) {
  return (
    <>
      {sections.map((section, index) => {
        const isLast = index === sections.length - 1;
        const isContactSection = section.id === "contact";

        return (
          <section
            key={section.id}
            id={section.id}
            className="pk-legal-section"
            aria-labelledby={`${section.id}-heading`}
          >
            <h2 id={`${section.id}-heading`}>{section.title}</h2>
            {section.blocks.map((block, blockIndex) => {
              if (block.type === "p") {
                return <p key={blockIndex}>{block.text}</p>;
              }
              return (
                <ul key={blockIndex}>
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            })}
            {showContactOnLastSection && isLast && isContactSection ? (
              <LegalContactBlock />
            ) : null}
          </section>
        );
      })}
    </>
  );
}
