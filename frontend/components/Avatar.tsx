interface AvatarProps {
  src: string | null;
  name: string;
  size?: number;
  online?: boolean;
}

export default function Avatar({ src, name, size = 44, online }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full bg-signal-blue text-white flex items-center justify-center font-medium"
          style={{ width: size, height: size, fontSize: size / 2.5 }}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            online ? "bg-green-500" : "bg-gray-300"
          }`}
        />
      )}
    </div>
  );
}