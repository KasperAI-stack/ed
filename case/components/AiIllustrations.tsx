import type { AiIllustration } from "@/lib/aiProducts";

/** Farver i stil med referencen: lys lavendel, hvide kort, navy til det vigtige og coral som accent */
const C = {
  bg: "#f2f2f8",
  card: "#ffffff",
  stroke: "#dcdce8",
  navy: "#1a1d56",
  grey: "#d3d3e3",
  grey2: "#e4e4ee",
  line: "#cfd0e1",
  coral: "#ff7456",
};

type CardProps = { x: number; y: number; w: number; h: number; hi?: boolean; o?: number; r?: number };
function Card({ x, y, w, h, hi, o = 1, r = 12 }: CardProps) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={r}
      fill={C.card}
      stroke={hi ? C.navy : C.stroke}
      strokeWidth={hi ? 3 : 1.5}
      opacity={o}
    />
  );
}
function Bar({ x, y, w, h = 5, c = C.grey, o = 1 }: { x: number; y: number; w: number; h?: number; c?: string; o?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={c} opacity={o} />;
}
function Dot({ x, y, r = 6 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 2.2} fill={C.coral} opacity={0.18} />
      <circle cx={x} cy={y} r={r} fill={C.coral} stroke="#fff" strokeWidth={2} />
    </g>
  );
}
const line = { stroke: C.line, strokeWidth: 2, fill: "none", strokeLinecap: "round" as const };

/** Company Brain: ét navy kort øverst, der forgrener sig til tre kort med et gitter, der fader ud */
function Brain() {
  const mids = [68, 213, 357];
  return (
    <>
      <path d="M246 88 C246 112 101 104 101 128" {...line} />
      <path d="M246 88 V128" {...line} />
      <path d="M246 88 C246 112 390 104 390 128" {...line} />
      <Card x={207} y={32} w={78} h={56} hi r={13} />
      <Bar x={219} y={45} w={54} h={7} c={C.navy} />
      <Bar x={219} y={59} w={34} />
      <Bar x={219} y={70} w={22} />
      <Dot x={281} y={36} r={6} />
      {mids.map((x) => {
        const cx = x + 33;
        return (
          <g key={x}>
            <path d={`M${cx} 174 V186 M${cx - 42} 186 H${cx + 42} M${cx - 42} 186 V196 M${cx} 186 V196 M${cx + 42} 186 V196`} {...line} />
            <Card x={x} y={128} w={66} h={46} />
            <Bar x={x + 14} y={142} w={38} h={6} c={C.navy} />
            <Bar x={x + 14} y={155} w={24} />
            {[0, 1, 2].map((row) =>
              [-42, 0, 42].map((dx) => (
                <g key={`${row}${dx}`} opacity={[1, 0.5, 0.22][row]}>
                  <Card x={cx + dx - 16} y={196 + row * 42} w={32} h={32} r={8} />
                  <Bar x={cx + dx - 9} y={206 + row * 42} w={18} h={4} />
                  <Bar x={cx + dx - 9} y={214 + row * 42} w={11} h={4} c={C.grey2} />
                </g>
              )),
            )}
          </g>
        );
      })}
    </>
  );
}

/** Ad hoc-agenten: rodet "før" og pænt "efter", og tre tjek under pilen, hvor ét er flagget */
function Adhoc() {
  const messy: [number, number, number][] = [
    [56, 82, 120], [56, 92, 70], [62, 101, 132], [56, 112, 98], [60, 121, 140], [56, 131, 58], [74, 140, 110],
    [56, 150, 128], [58, 160, 76], [56, 170, 118], [66, 180, 92], [56, 190, 134],
  ];
  return (
    <>
      <g opacity={0.65}>
        <Card x={40} y={66} w={170} h={142} />
        {messy.map(([x, y, w], i) => (
          <Bar key={i} x={x} y={y} w={w} h={4} c={i % 3 === 0 ? C.grey : C.grey2} />
        ))}
      </g>
      <path d="M222 137 H292" {...line} stroke={C.navy} strokeWidth={1.6} />
      <path d="M286 131 L293 137 L286 143" {...line} stroke={C.navy} strokeWidth={1.6} />
      <Card x={310} y={52} w={170} h={170} hi r={14} />
      <rect x={324} y={66} width={142} height={62} rx={8} fill={C.grey2} />
      <path d="M338 116 L362 92 L380 108 L392 98 L452 116 Z" fill={C.grey} />
      <circle cx={444} cy={82} r={7} fill={C.grey} />
      <Bar x={324} y={142} w={110} h={9} c={C.navy} />
      <Bar x={324} y={162} w={138} />
      <Bar x={324} y={176} w={122} />
      <Bar x={324} y={190} w={94} />
      <path d="M257 145 V236 M170 236 H350 M170 236 V246 M260 236 V246 M350 236 V246" {...line} />
      {/* Foto */}
      <Card x={131} y={246} w={78} h={58} r={10} />
      <rect x={143} y={258} width={30} height={22} rx={4} fill={C.grey2} />
      <path d="M146 278 L156 268 L163 274 L170 270 L172 278 Z" fill={C.grey} />
      <Bar x={143} y={288} w={50} h={4} />
      {/* Lager */}
      <Card x={221} y={246} w={78} h={58} r={10} />
      <Bar x={233} y={260} w={44} h={6} c={C.navy} />
      <Bar x={233} y={274} w={54} h={4} />
      <Bar x={233} y={286} w={36} h={4} />
      {/* Pris, flagget */}
      <Card x={311} y={246} w={78} h={58} r={10} />
      <Bar x={323} y={260} w={30} h={6} c={C.navy} />
      <Bar x={323} y={274} w={54} h={4} />
      <Bar x={323} y={286} w={40} h={4} />
      <Dot x={385} y={250} r={6} />
    </>
  );
}

/** Trend-agenten: en graf med en tydelig spike, der fører til lager og plan. Bagved ligger tidligere uger. */
function Trend() {
  const pts = "82,176 110,172 138,175 166,166 194,169 222,161 250,163 276,148 300,98 318,140 340,134";
  return (
    <>
      <g opacity={0.28}>
        <Card x={84} y={22} w={300} h={168} />
      </g>
      <g opacity={0.5}>
        <Card x={72} y={34} w={300} h={168} />
      </g>
      <Card x={60} y={46} w={300} h={168} r={14} />
      <Bar x={78} y={62} w={90} h={7} c={C.navy} />
      <Bar x={78} y={76} w={50} />
      {[110, 140, 170, 196].map((y) => (
        <path key={y} d={`M78 ${y} H342`} stroke={C.grey2} strokeWidth={1} />
      ))}
      <polyline points={pts} fill="none" stroke={C.grey} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <path d="M300 106 V228" {...line} strokeDasharray="0" />
      <path d="M300 228 V242 M300 228 C300 236 430 228 430 238" {...line} />
      <Dot x={300} y={98} r={7} />
      {/* Lager */}
      <Card x={248} y={242} w={104} h={62} r={10} />
      <Bar x={262} y={256} w={50} h={4} />
      <Bar x={262} y={270} w={42} h={9} c={C.navy} />
      <Bar x={262} y={287} w={70} h={4} c={C.grey2} />
      {/* Plan */}
      <Card x={374} y={238} w={112} h={72} hi r={12} />
      {[252, 272, 292].map((y, i) => (
        <g key={y}>
          <rect x={388} y={y - 5} width={10} height={10} rx={3} fill={i < 2 ? C.navy : "none"} stroke={C.navy} strokeWidth={1.5} />
          <Bar x={406} y={y - 2} w={[62, 52, 44][i]} h={4} />
        </g>
      ))}
    </>
  );
}

/** Genkøbs-agenten: tidligere ordrer, en pil i en bue tilbage til kurven, et forslag og mails til en kundegruppe */
function Reorder() {
  return (
    <>
      {[40, 108, 176].map((y, i) => (
        <g key={y} opacity={[1, 0.55, 0.25][i]}>
          <Card x={36} y={y} w={180} h={56} />
          <rect x={48} y={y + 13} width={30} height={30} rx={7} fill={C.grey2} />
          <Bar x={90} y={y + 16} w={78} h={6} c={C.navy} />
          <Bar x={90} y={y + 30} w={56} />
          <Bar x={178} y={y + 24} w={26} h={6} c={C.grey2} />
        </g>
      ))}
      {/* Pil i en bue fra den seneste ordre tilbage mod kurven */}
      <path d="M216 62 C258 30 318 28 334 62 C342 78 338 92 330 100" {...line} stroke={C.navy} strokeWidth={1.8} />
      <path d="M324 92 L330 101 L338 94" {...line} stroke={C.navy} strokeWidth={1.8} />
      {/* Kurv */}
      <path d="M306 128 C306 104 362 104 362 128" fill="none" stroke={C.navy} strokeWidth={3} strokeLinecap="round" />
      <path d="M284 124 Q284 118 290 118 H378 Q384 118 384 124 L374 184 Q373 192 365 192 H303 Q295 192 294 184 Z" fill={C.card} stroke={C.navy} strokeWidth={3} strokeLinejoin="round" />
      {[312, 334, 356].map((x) => (
        <path key={x} d={`M${x} 136 V176`} stroke={C.grey} strokeWidth={4} strokeLinecap="round" />
      ))}
      {/* Forslag: passer til dit udstyr */}
      <path d="M384 146 C394 146 396 130 406 130" {...line} />
      <Card x={406} y={102} w={86} h={56} r={10} />
      <Bar x={418} y={116} w={50} h={6} c={C.navy} />
      <Bar x={418} y={130} w={60} h={4} />
      <Bar x={418} y={141} w={40} h={4} />
      <Dot x={488} y={106} r={6} />
      {/* Mails til en kundegruppe */}
      <path d="M449 158 V170 M413 170 H485 M413 170 V178 M449 170 V178 M485 170 V178" {...line} />
      {[396, 432, 468].map((x, i) => (
        <g key={x} opacity={[1, 0.7, 0.45][i]}>
          <Card x={x} y={178} w={34} h={26} r={6} />
          <path d={`M${x + 6} ${184} L${x + 17} ${193} L${x + 28} ${184}`} fill="none" stroke={C.grey} strokeWidth={1.8} strokeLinejoin="round" />
        </g>
      ))}
    </>
  );
}

export function AiArt({ kind, className }: { kind: AiIllustration; className?: string }) {
  return (
    <svg viewBox="0 0 520 330" className={className} role="img" aria-hidden preserveAspectRatio="xMidYMid meet">
      <rect width="520" height="330" fill={C.bg} />
      {kind === "brain" && <Brain />}
      {kind === "adhoc" && <Adhoc />}
      {kind === "trend" && <Trend />}
      {kind === "reorder" && <Reorder />}
    </svg>
  );
}
