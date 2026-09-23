"use client";

import Image from "next/image";

// The coloured card at the top of a student or lecturer profile.
const ProfileCard = ({
  img,
  name,
  subtitle,
  details,
  action,
}: {
  img?: string | null;
  name: string;
  subtitle?: string;
  details: { icon: string; value: string | null | undefined; label: string }[];
  action?: React.ReactNode;
}) => (
  <div className="bg-lamaSky py-6 px-4 rounded-md flex-1 flex gap-4">
    <div className="w-1/3">
      <Image
        src={img || "/noAvatar.png"}
        alt=""
        width={144}
        height={144}
        className="w-24 h-24 sm:w-36 sm:h-36 rounded-full object-cover"
        unoptimized={!!img}
      />
    </div>
    <div className="w-2/3 flex flex-col justify-between gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">{name}</h1>
        {action}
      </div>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-medium">
        {details.map((d) => (
          <div key={d.label} className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2" title={d.label}>
            <Image src={d.icon} alt={d.label} width={14} height={14} />
            <span>{d.value || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const SmallCard = ({ icon, value, label }: { icon: string; value: React.ReactNode; label: string }) => (
  <div className="bg-surface p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
    <Image src={icon} alt="" width={24} height={24} className="w-6 h-6" />
    <div className="">
      <h1 className="text-xl font-semibold">{value}</h1>
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  </div>
);

export default ProfileCard;
