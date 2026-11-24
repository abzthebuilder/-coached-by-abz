import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getSiteLinks } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const links = await getSiteLinks();
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter links={links} />
    </>
  );
}
