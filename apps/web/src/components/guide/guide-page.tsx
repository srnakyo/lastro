import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { MapSection, PathSection, ProofsSection, RolesSection, TermsSection } from "./guide-sections";

/** How Lastro works, in plain words: the path, the four proofs, who does what, the words and where things are. */
export function GuidePage() {
  const { t } = useI18n();
  return (
    <div className="max-w-[1200px] pb-10">
      <PageHeader title={t("guide.title")} description={t("guide.lead")} />
      <PathSection />
      <ProofsSection />
      <RolesSection />
      <TermsSection />
      <MapSection />
    </div>
  );
}
