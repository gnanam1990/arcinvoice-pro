import { MarketingNav } from "@/components/layout/marketing-nav";
import { SiteFooter } from "@/components/layout/footer";
import { Hero } from "@/components/marketing/hero";
import { WorkflowPreview } from "@/components/marketing/workflow-preview";
import { Features } from "@/components/marketing/features";
import { OpenSource } from "@/components/marketing/open-source";

export default function HomePage() {
  return (
    <>
      <MarketingNav />
      <main id="main-content">
        <Hero />
        <WorkflowPreview />
        <Features />
        <OpenSource />
      </main>
      <SiteFooter />
    </>
  );
}
