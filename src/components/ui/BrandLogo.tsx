export default function BrandLogo({
  className = "h-14 w-14 shrink-0 object-cover",
  alt = "SAHAYOG logo",
}: {
  className?: string
  alt?: string
}) {
  const logoClassName = className
    .replace(/\bw-auto\b/g, "aspect-square")
    .replace(/\bobject-cover\b/g, "object-contain")

  return <img src="/sahayog-logo.png" alt={alt} className={logoClassName} />
}
