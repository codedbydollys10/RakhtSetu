import logoImage from "../../assets/logo.jpg"

export default function BrandLogo({
  className = "h-14 w-14 shrink-0 object-cover",
  alt = "RakhtSetu logo",
}: {
  className?: string
  alt?: string
}) {
  const logoClassName = className
    .replace(/\bw-auto\b/g, "aspect-square")
    .replace(/\bobject-contain\b/g, "object-cover")

  return <img src={logoImage} alt={alt} className={logoClassName} />
}
