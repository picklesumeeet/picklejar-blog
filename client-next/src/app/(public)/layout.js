import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Ticker from "@/components/layout/Ticker";
import TopAdBanner from "@/components/ads/TopAdBanner";
import { createClient } from "@/lib/supabase/server";
import { mapVertical } from "@/lib/supabase/mappers";

async function getVerticals() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('verticals')
    .select('*')
    .eq('active', true)
    .order('featured_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getVerticals:', error);
    return [];
  }
  return (data ?? []).map(mapVertical);
}

export default async function PublicLayout({ children }) {
  const verticals = await getVerticals();

  return (
    <>
      <TopAdBanner />
      <Navbar verticals={verticals} />
      <Ticker />
      {children}
      <Footer />
    </>
  );
}
