import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Image
        src="/icon.svg"
        alt="CourseCove logo"
        width={32}
        height={32}
        className="h-8 w-auto"
      />
      <span className="font-heading text-2xl font-bold tracking-tight -mt-0.5">
        <span className="text-[#164360] dark:text-white">Course</span>
        <span className="text-brand-600 dark:text-brand-400">Cove</span>
      </span>
    </div>
  );
}
