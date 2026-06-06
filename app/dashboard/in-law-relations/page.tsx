import InLawRelationsPanel from "@/components/InLawRelationsPanel";
import { getSupabase } from "@/utils/supabase/queries";

export const metadata = {
  title: "Sui gia",
};

export default async function InLawRelationsPage() {
  const supabase = await getSupabase();

  const [
    personsRes,
    relationshipsRes,
    familiesRes,
    familyParentsRes,
    familyChildrenRes,
  ] = await Promise.all([
    supabase.from("persons_active").select("*"),
    supabase.from("relationships_active").select("*"),
    supabase.from("families").select("*").is("deleted_at", null),
    supabase.from("family_parents").select("*"),
    supabase.from("family_children").select("*"),
  ]);

  return (
    <div className="flex-1 w-full relative flex flex-col pb-12">
      <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h1 className="title">Sui gia</h1>
        <p className="text-stone-500 mt-1 text-sm">
          So tương quan thế hệ nội ngoại bên người gốc và bên vợ/chồng để tiện xác định vai vế, cách xưng hô.
        </p>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <InLawRelationsPanel
          persons={personsRes.data ?? []}
          relationships={relationshipsRes.data ?? []}
          families={familiesRes.data ?? []}
          familyParents={familyParentsRes.data ?? []}
          familyChildren={familyChildrenRes.data ?? []}
        />
      </main>
    </div>
  );
}
