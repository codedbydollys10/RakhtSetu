import { useEffect, useRef } from "react"

type VascularBackgroundProps = {
  variant?: "dashboard" | "auth"
}

const primaryVessels = [
  { id: "vessel-left-upper", d: "M-30 132 C 105 92 148 154 226 192 S 340 233 410 168 C 462 120 483 63 531 18", tone: "red" },
  { id: "vessel-left-mid", d: "M-24 416 C 90 374 142 405 206 358 C 280 304 304 276 380 294 S 477 334 534 298", tone: "blue" },
  { id: "vessel-left-lower", d: "M34 932 C 75 802 132 756 183 698 S 237 616 211 548 C 192 493 158 466 132 416", tone: "red" },
  { id: "vessel-left-edge", d: "M-18 708 C 52 676 96 638 112 582 S 101 478 62 431 C 24 386 18 326 39 272", tone: "blue" },
  { id: "vessel-right-upper", d: "M1476 116 C 1374 94 1320 135 1259 191 S 1168 244 1094 210 C 1039 184 1004 129 958 82", tone: "blue" },
  { id: "vessel-right-mid", d: "M1472 404 C 1378 375 1323 396 1267 352 S 1165 292 1090 317 C 1033 336 1000 373 943 366", tone: "red" },
  { id: "vessel-right-lower", d: "M1416 930 C 1366 812 1312 752 1263 689 S 1213 601 1240 540 C 1263 487 1295 454 1323 410", tone: "blue" },
  { id: "vessel-right-edge", d: "M1460 704 C 1394 670 1350 637 1331 580 S 1340 479 1381 432 C 1418 390 1424 329 1404 273", tone: "red" },
  { id: "vessel-top", d: "M248 -24 C 301 45 347 74 424 78 S 557 49 620 16", tone: "red" },
  { id: "vessel-bottom", d: "M736 928 C 768 858 823 819 889 802 S 1014 810 1076 863", tone: "blue" },
  { id: "vessel-inner-left", d: "M260 552 C 322 509 359 467 387 420 S 444 343 503 330 C 552 319 592 337 632 360", tone: "red" },
  { id: "vessel-inner-right", d: "M1184 568 C 1125 526 1089 480 1053 436 S 989 361 930 349 C 880 339 840 355 800 379", tone: "blue" },
  { id: "vessel-upper-cross-left", d: "M-20 270 C 88 229 155 247 223 278 S 342 327 420 281 C 470 251 504 211 554 178", tone: "red" },
  { id: "vessel-upper-cross-right", d: "M1460 262 C 1357 225 1297 247 1226 276 S 1104 321 1031 278 C 980 248 946 208 895 178", tone: "blue" },
  { id: "vessel-center-upper", d: "M475 -18 C 494 79 548 128 623 150 S 761 144 827 192 C 886 235 895 292 931 350", tone: "red" },
  { id: "vessel-center-left", d: "M-12 524 C 118 504 222 527 319 571 S 450 640 534 619 C 609 600 654 548 704 503", tone: "blue" },
  { id: "vessel-center-right", d: "M1450 518 C 1320 493 1218 520 1126 565 S 994 635 910 617 C 835 601 786 550 736 504", tone: "red" },
  { id: "vessel-lower-cross-left", d: "M-12 784 C 96 739 185 744 263 776 S 405 835 493 793 C 548 767 579 724 634 696", tone: "blue" },
  { id: "vessel-lower-cross-right", d: "M1450 780 C 1355 738 1262 742 1180 774 S 1038 834 950 792 C 893 765 861 721 806 694", tone: "red" },
  { id: "vessel-central-spine", d: "M716 -20 C 691 93 711 164 746 225 S 806 330 775 411 C 748 480 675 532 662 610 S 693 728 747 797 C 780 840 790 880 784 930", tone: "blue" },
  { id: "vessel-upper-left-arc", d: "M45 48 C 139 71 189 110 230 159 S 302 231 362 245 C 425 261 472 237 509 199", tone: "blue" },
  { id: "vessel-upper-right-arc", d: "M1395 50 C 1307 73 1250 112 1208 160 S 1137 232 1075 246 C 1012 260 965 237 928 201", tone: "red" },
  { id: "vessel-lower-left-arc", d: "M42 866 C 134 833 190 791 229 739 S 292 657 357 646 C 416 637 464 669 500 704", tone: "red" },
  { id: "vessel-lower-right-arc", d: "M1397 865 C 1303 833 1247 790 1208 737 S 1146 657 1080 646 C 1022 637 974 668 938 704", tone: "blue" },
]

const capillaries = [
  "M88 119 C 110 163 110 201 92 237",
  "M224 192 C 206 232 211 271 244 296",
  "M178 363 C 154 328 123 315 88 327",
  "M379 294 C 398 260 431 247 466 254",
  "M210 698 C 253 716 280 751 286 791",
  "M133 580 C 174 574 204 591 224 621",
  "M111 638 C 77 616 53 583 49 544",
  "M62 431 C 95 412 120 380 127 344",
  "M1259 191 C 1284 226 1287 263 1269 294",
  "M1092 317 C 1073 280 1040 261 1004 266",
  "M1265 352 C 1300 329 1333 322 1369 337",
  "M1240 540 C 1198 530 1169 548 1150 581",
  "M1263 689 C 1222 714 1198 751 1194 791",
  "M1331 580 C 1370 571 1395 542 1400 505",
  "M1381 432 C 1349 409 1334 376 1338 343",
  "M424 78 C 457 105 474 139 472 175",
  "M889 802 C 924 764 970 748 1011 758",
  "M823 819 C 806 778 805 744 819 710",
  "M503 330 C 491 292 502 261 530 235",
  "M387 420 C 350 409 319 421 294 449",
  "M632 360 C 663 322 702 310 742 321",
  "M930 349 C 946 309 936 277 908 250",
  "M1053 436 C 1090 423 1121 435 1148 461",
  "M800 379 C 770 341 731 329 691 340",
  "M620 16 C 649 55 689 77 731 78",
  "M1076 863 C 1115 830 1152 819 1194 831",
  "M286 791 C 323 814 361 817 399 801",
  "M88 327 C 66 302 62 274 74 248",
  "M244 296 C 278 275 304 267 337 272",
  "M466 254 C 493 275 512 307 512 337",
  "M49 544 C 78 526 104 500 108 468",
  "M224 621 C 247 593 273 574 308 567",
  "M530 235 C 563 247 582 270 588 300",
  "M294 449 C 271 478 261 509 270 541",
  "M742 321 C 771 298 802 288 836 295",
  "M908 250 C 877 233 850 211 841 182",
  "M1148 461 C 1176 477 1195 505 1195 535",
  "M691 340 C 661 318 643 291 643 260",
  "M731 78 C 769 60 800 58 836 71",
  "M1194 831 C 1227 810 1253 781 1260 744",
  "M399 801 C 431 820 455 850 455 882",
  "M223 278 C 204 245 199 214 208 185",
  "M420 281 C 444 302 459 329 456 358",
  "M1031 278 C 1013 245 1007 214 1017 185",
  "M895 178 C 870 157 850 128 851 98",
  "M623 150 C 600 179 592 209 605 238",
  "M827 192 C 859 175 889 172 918 184",
  "M319 571 C 300 603 297 632 312 660",
  "M534 619 C 565 635 587 660 595 690",
  "M1126 565 C 1145 597 1148 628 1133 657",
  "M910 617 C 878 634 855 658 847 688",
  "M263 776 C 241 748 237 716 250 686",
  "M493 793 C 520 813 537 840 534 870",
  "M1180 774 C 1202 746 1207 715 1194 685",
  "M950 792 C 922 812 906 838 909 868",
  "M746 225 C 714 254 695 286 698 319",
  "M775 411 C 812 433 830 464 820 498",
  "M662 610 C 628 635 609 666 614 698",
  "M747 797 C 716 819 698 848 700 881",
  "M230 159 C 196 171 165 171 135 156",
  "M362 245 C 383 218 409 199 441 193",
  "M1208 160 C 1240 172 1271 171 1301 157",
  "M1075 246 C 1054 219 1027 200 995 194",
  "M229 739 C 199 721 172 695 163 663",
  "M357 646 C 379 670 390 700 386 732",
  "M1208 737 C 1238 719 1265 692 1274 660",
  "M1080 646 C 1057 670 1046 700 1050 732",
]

const fineBranchSeeds = [
  [75, 162, 1, 1], [126, 222, -1, 1], [189, 181, 1, -1], [250, 232, 1, 1],
  [324, 255, -1, -1], [398, 221, 1, 1], [469, 195, 1, -1], [518, 277, -1, 1],
  [90, 353, 1, -1], [154, 386, -1, 1], [226, 333, 1, -1], [289, 311, -1, 1],
  [365, 317, 1, 1], [446, 305, 1, -1], [515, 355, -1, 1], [126, 461, 1, -1],
  [180, 506, -1, 1], [243, 564, 1, 1], [314, 544, -1, -1], [381, 579, 1, 1],
  [461, 611, -1, 1], [535, 590, 1, -1], [172, 661, -1, -1], [233, 720, 1, 1],
  [312, 751, -1, 1], [386, 687, 1, -1], [459, 759, 1, 1], [516, 825, -1, -1],
  [1365, 165, -1, 1], [1307, 221, 1, 1], [1245, 181, -1, -1], [1184, 232, -1, 1],
  [1111, 256, 1, -1], [1037, 221, -1, 1], [966, 197, -1, -1], [922, 279, 1, 1],
  [1350, 355, -1, -1], [1287, 386, 1, 1], [1221, 333, -1, -1], [1157, 311, 1, 1],
  [1080, 319, -1, 1], [1002, 306, -1, -1], [940, 356, 1, 1], [1315, 462, -1, -1],
  [1261, 507, 1, 1], [1197, 564, -1, 1], [1128, 545, 1, -1], [1062, 578, -1, 1],
  [981, 612, 1, 1], [906, 590, -1, -1], [1273, 662, 1, -1], [1214, 720, -1, 1],
  [1136, 750, 1, 1], [1060, 689, -1, -1], [991, 759, -1, 1], [933, 824, 1, -1],
  [650, 123, -1, 1], [698, 177, 1, -1], [753, 260, -1, 1], [810, 326, 1, 1],
  [783, 465, -1, -1], [704, 568, 1, 1], [668, 664, -1, 1], [756, 754, 1, -1],
]

const fineCapillaries = fineBranchSeeds.flatMap(([x, y, directionX, directionY], index) => {
  const reach = 22 + (index % 4) * 5
  const sway = ((index % 5) - 2) * 4
  const branch = (side: number) => {
    const endX = x + directionX * reach - side * directionY * (10 + (index % 3) * 4)
    const endY = y + directionY * reach + side * directionX * (10 + (index % 3) * 4)
    const controlX = x + (endX - x) * 0.52 + sway * side
    const controlY = y + (endY - y) * 0.48 - sway * side
    return `M${x} ${y} Q${controlX} ${controlY} ${endX} ${endY}`
  }
  return [branch(1), branch(-1)]
})

const particles = primaryVessels.flatMap(({ id }, pathIndex) =>
  Array.from({ length: 7 }, (_, particleIndex) => ({
    path: id,
    tone: (pathIndex + particleIndex) % 5 === 0 ? "blue" : "red",
    radius: particleIndex % 4 === 0 ? 3.1 : 2.35,
    duration: 14500 + ((pathIndex * 1733 + particleIndex * 683) % 8000),
    delay: (pathIndex * 170 + particleIndex * 210) % 1800,
    offset: (particleIndex + 0.5) / 7,
    particleIndex,
    reversed: (pathIndex + particleIndex) % 3 === 0,
  })),
)

const junctions = [
  { cx: 206, cy: 358, tone: "rose" },
  { cx: 211, cy: 548, tone: "blue" },
  { cx: 1267, cy: 352, tone: "blue" },
  { cx: 1240, cy: 540, tone: "rose" },
  { cx: 424, cy: 78, tone: "rose" },
  { cx: 889, cy: 802, tone: "blue" },
]

export default function VascularBackground({ variant = "dashboard" }: VascularBackgroundProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    let disposed = false
    let generation = 0
    let animations: Array<{
      pause: () => unknown
      play: () => unknown
      revert: () => unknown
    }> = []

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const mobileQuery = window.matchMedia("(max-width: 639px)")
    const tabletQuery = window.matchMedia("(max-width: 1023px)")
    const lowPowerDevice = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4

    const clearAnimations = () => {
      animations.forEach((animation) => animation.revert())
      animations = []
    }

    const initialize = async (run: number) => {
      clearAnimations()
      if (motionPreference.matches || disposed || !svgRef.current) return

      try {
        const anime = await import("animejs")
        if (disposed || run !== generation || !svgRef.current || motionPreference.matches) return

        const svgElement = svgRef.current
        const visibilityHandler = () => {
          animations.forEach((animation) => {
            if (document.hidden) animation.pause()
            else animation.play()
          })
        }
        document.addEventListener("visibilitychange", visibilityHandler)

        const paths = new Map(
          Array.from(svgElement.querySelectorAll<SVGGeometryElement>("[data-vessel-path]"))
            .map((path) => [path.id, path]),
        )
        const trackParticles = Array.from(
          svgElement.querySelectorAll<SVGElement>("[data-flow-path]"),
        )

        trackParticles.forEach((particle) => {
          const particleIndex = Number(particle.dataset.flowIndex)
          if (mobileQuery.matches && particleIndex % 4 !== 1) return
          if (
            !mobileQuery.matches &&
            (tabletQuery.matches || lowPowerDevice) &&
            particleIndex % 2 !== 0 &&
            particleIndex !== 6
          ) return

          const path = paths.get(particle.dataset.flowPath ?? "")
          if (!path) return

          const settings = particles.find(
            (item) => item.path === path.id && item.particleIndex === particleIndex,
          )
          if (!settings) return

          const motionPath = anime.svg.createMotionPath(path, settings.offset)
          animations.push(
            anime.animate(particle, {
              ...motionPath,
              opacity: [0.05, 0.94, 0.7, 0.05],
              duration: settings.duration,
              delay: settings.delay,
              reversed: settings.reversed,
              ease: "linear",
              loop: true,
            }),
          )
        })

        svgElement.querySelectorAll<SVGPathElement>("[data-pulse-path]").forEach((path, index) => {
          animations.push(
            anime.animate(path, {
              strokeDashoffset: [0, -420],
              opacity: [0.1, 0.38, 0.1],
              duration: 18000 + index * 1700,
              delay: index * 800,
              ease: "linear",
              loop: true,
            }),
          )
        })

        svgElement.querySelectorAll<SVGCircleElement>("[data-junction]").forEach((junction, index) => {
          animations.push(
            anime.animate(junction, {
              r: [2.5, 4.2],
              opacity: [0.2, 0.62],
              duration: 2600 + index * 350,
              delay: index * 420,
              ease: "inOutSine",
              alternate: true,
              loop: true,
            }),
          )
        })

        if (document.hidden) visibilityHandler()

        return () => {
          document.removeEventListener("visibilitychange", visibilityHandler)
        }
      } catch (error) {
        console.error("Unable to initialize the decorative vascular animation.", error)
      }
    }

    let removeVisibilityListener: (() => void) | undefined
    const start = () => {
      removeVisibilityListener?.()
      const run = ++generation
      void initialize(run).then((cleanup) => {
        if (disposed || run !== generation) {
          cleanup?.()
          return
        }
        removeVisibilityListener = cleanup
      })
    }
    const handleMotionPreference = () => start()
    const handleDensityChange = () => start()

    motionPreference.addEventListener("change", handleMotionPreference)
    mobileQuery.addEventListener("change", handleDensityChange)
    tabletQuery.addEventListener("change", handleDensityChange)
    start()

    return () => {
      disposed = true
      removeVisibilityListener?.()
      motionPreference.removeEventListener("change", handleMotionPreference)
      mobileQuery.removeEventListener("change", handleDensityChange)
      tabletQuery.removeEventListener("change", handleDensityChange)
      clearAnimations()
    }
  }, [])

  return (
    <svg
      ref={svgRef}
      className={`vascular-background vascular-background--${variant}`}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="vascular-junction-rose">
          <stop offset="0" stopColor="var(--vascular-highlight)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--vascular-primary)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vascular-junction-blue">
          <stop offset="0" stopColor="var(--vascular-blue-highlight)" stopOpacity="0.78" />
          <stop offset="1" stopColor="var(--vascular-blue-highlight)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {primaryVessels.map(({ id, d }) => (
          <path key={`${id}-underlay`} d={d} className="vascular-underlay" />
        ))}
        {primaryVessels.map(({ id, d, tone }) => (
          <path key={id} id={id} data-vessel-path="" d={d} className={`vascular-primary vascular-${tone}`} />
        ))}
        {capillaries.map((d, index) => (
          <path
            key={d}
            d={d}
            className={`vascular-capillary vascular-capillary-${index % 3} ${index % 5 === 0 ? "vascular-blue" : "vascular-red"}`}
          />
        ))}
        {fineCapillaries.map((d, index) => (
          <path
            key={`fine-${index}`}
            d={d}
            className={`vascular-fine vascular-fine-${index % 3} ${index % 7 === 0 ? "vascular-blue" : "vascular-red"}`}
          />
        ))}
        {primaryVessels.map(({ id, d, tone }) => (
          <path key={`${id}-pulse`} d={d} data-pulse-path="" data-flow-tone={tone} className={`vascular-pulse vascular-${tone}`} />
        ))}
      </g>

      <g className="vascular-particles">
        {particles.map((particle, index) => (
          particle.particleIndex % 4 === 0 ? (
            <rect
              key={`${particle.path}-${index}`}
              x={-particle.radius * 1.8}
              y={-particle.radius * 0.48}
              width={particle.radius * 3.6}
              height={particle.radius * 0.96}
              rx={particle.radius * 0.48}
              data-flow-path={particle.path}
              data-flow-index={particle.particleIndex}
              className={`vascular-particle vascular-particle-${particle.tone} vascular-particle-glow`}
            />
          ) : (
            <circle
              key={`${particle.path}-${index}`}
              cx="0"
              cy="0"
              r={particle.radius}
              data-flow-path={particle.path}
              data-flow-index={particle.particleIndex}
              className={`vascular-particle vascular-particle-${particle.tone}`}
            />
          )
        ))}
      </g>

      <g>
        {junctions.map(({ cx, cy, tone }, index) => (
          <g key={`${cx}-${cy}`} className="vascular-junction">
            <circle
              cx={cx}
              cy={cy}
              r="13"
              fill={`url(#vascular-junction-${tone})`}
              opacity="0.18"
            />
            <circle
              cx={cx}
              cy={cy}
              r="2.5"
              data-junction={index}
              className={tone === "rose" ? "vascular-junction-core-rose" : "vascular-junction-core-blue"}
            />
          </g>
        ))}
      </g>
    </svg>
  )
}
