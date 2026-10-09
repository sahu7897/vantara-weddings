/**
 * Honest empty state for §13.6: "no data yet" instead of fake listings.
 * Used by every directory page when a city/locality/category has no approved
 * vendors or venues in Supabase.
 */
interface Props {
  title: string;
  detail?: string;
}

export default function EmptyState({ title, detail }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-lightGray bg-greyWhite px-6 py-10 text-center">
      <p className="font-plus-jakarata-sans text-lg font-bold text-primaryTextColor">{title}</p>
      {detail && <p className="mx-auto mt-2 max-w-xl text-sm text-secondary">{detail}</p>}
    </div>
  );
}
