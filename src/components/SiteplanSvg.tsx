import { memo } from 'react';
import { STATUS_CONFIG } from '../constants/statuses';
import type {
  CadGreenZone,
  FacilityArea,
  KavlingStatus,
  KavlingUnit,
  SiteplanProject,
} from '../types/siteplan';

interface SiteplanSvgProps {
  project: SiteplanProject;
  mode?: 'interactive' | 'print' | 'thumbnail';
  selectedUnitId?: string | null;
  highlightedUnitId?: string | null;
  activeStatusFilters?: KavlingStatus[];
  /** True vector camera viewBox override (keeps SVG 100% razor-sharp on iOS Safari at any zoom!) */
  customViewBox?: { x: number; y: number; width: number; height: number };
  onSelectUnit?: (unit: KavlingUnit) => void;
  className?: string;
}

/**
 * Returns the transformed SVG coordinate center of a unit (accounts for CAD siteRotation).
 */
export function getUnitTransformedCenter(
  project: SiteplanProject,
  unit: KavlingUnit
): { x: number; y: number } {
  const ux = unit.x + unit.width / 2;
  const uy = unit.y + unit.height / 2;
  const rot = project.decoration.siteRotation;
  if (!rot) {
    return { x: ux, y: uy };
  }
  const rad = (rot.angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = ux - rot.cx;
  const dy = uy - rot.cy;
  return {
    x: rot.cx + dx * cos - dy * sin + (rot.offsetX ?? 0),
    y: rot.cy + dx * sin + dy * cos + (rot.offsetY ?? 0),
  };
}

function renderCompass(
  variant: 'eight-point' | 'classic-circle',
  x: number,
  y: number
) {
  if (variant === 'eight-point') {
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Minor diagonal spikes */}
        <polygon points="0,0 16,-16 4,-2" fill="#334155" />
        <polygon points="0,0 16,-16 2,-4" fill="#CBD5E1" />
        <polygon points="0,0 16,16 2,4" fill="#334155" />
        <polygon points="0,0 16,16 4,2" fill="#CBD5E1" />
        <polygon points="0,0 -16,16 -4,2" fill="#334155" />
        <polygon points="0,0 -16,16 -2,4" fill="#CBD5E1" />
        <polygon points="0,0 -16,-16 -2,-4" fill="#334155" />
        <polygon points="0,0 -16,-16 -4,-2" fill="#CBD5E1" />

        {/* Main cardinal points (N / E / S / W) */}
        <polygon points="0,-32 6,-6 0,0" fill="#0F172A" />
        <polygon points="0,-32 -6,-6 0,0" fill="#FFFFFF" stroke="#0F172A" strokeWidth={0.9} />
        <polygon points="32,0 6,6 0,0" fill="#0F172A" />
        <polygon points="32,0 6,-6 0,0" fill="#FFFFFF" stroke="#0F172A" strokeWidth={0.9} />
        <polygon points="0,32 -6,6 0,0" fill="#0F172A" />
        <polygon points="0,32 6,6 0,0" fill="#FFFFFF" stroke="#0F172A" strokeWidth={0.9} />
        <polygon points="-32,0 -6,-6 0,0" fill="#0F172A" />
        <polygon points="-32,0 -6,6 0,0" fill="#FFFFFF" stroke="#0F172A" strokeWidth={0.9} />

        <circle cx={0} cy={0} r={4.5} fill="#FFFFFF" stroke="#0F172A" strokeWidth={1.2} />
        <circle cx={0} cy={0} r={1.8} fill="#0F172A" />

        <text x={0} y={-37} textAnchor="middle" fill="#0F172A" fontSize={11} fontWeight={800}>
          N
        </text>
        <text x={39} y={4} textAnchor="middle" fill="#334155" fontSize={10} fontWeight={700}>
          E
        </text>
        <text x={0} y={45} textAnchor="middle" fill="#334155" fontSize={10} fontWeight={700}>
          S
        </text>
        <text x={-40} y={4} textAnchor="middle" fill="#334155" fontSize={10} fontWeight={700}>
          W
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={0} r={24} fill="#FFFFFF" stroke="#1E293B" strokeWidth={1.6} />
      <circle cx={0} cy={0} r={20} fill="none" stroke="#475569" strokeWidth={0.8} />
      {/* Shaded classic North arrow */}
      <polygon points="0,-32 10,10 0,3" fill="#1E293B" />
      <polygon points="0,-32 -10,10 0,3" fill="#FFFFFF" stroke="#1E293B" strokeWidth={1.1} />
      <text
        x={0}
        y={17}
        textAnchor="middle"
        fill="#0F172A"
        fontSize={10}
        fontWeight={800}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        N
      </text>
    </g>
  );
}

function renderScaleStamp(x: number, y: number) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Authentic AutoCAD crosshair circle emblem */}
      <circle cx={14} cy={14} r={11} fill="#FFFFFF" stroke="#1E293B" strokeWidth={1.4} />
      <line x1={14} y1={-1} x2={14} y2={29} stroke="#1E293B" strokeWidth={1} />
      <line x1={-1} y1={14} x2={29} y2={14} stroke="#1E293B" strokeWidth={1} />
      <path d="M 14 3 A 11 11 0 0 1 25 14 L 14 14 Z" fill="#1E293B" opacity={0.18} />
      <path d="M 14 25 A 11 11 0 0 1 3 14 L 14 14 Z" fill="#1E293B" opacity={0.18} />

      <text x={34} y={11} fill="#0F172A" fontSize={11} fontWeight={800} letterSpacing={1.4}>
        SITEPLAN
      </text>
      <line x1={34} y1={15} x2={156} y2={15} stroke="#334155" strokeWidth={1} />
      <text x={34} y={26} fill="#334155" fontSize={9.5} fontWeight={700} letterSpacing={1}>
        SKALA
      </text>
      <text
        x={84}
        y={26}
        fill="#B91C1C"
        fontSize={9.5}
        fontWeight={800}
        letterSpacing={0.8}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        NTS
      </text>
    </g>
  );
}

function renderGreenZone(zone: CadGreenZone, isThumb: boolean) {
  if (zone.kind === 'pond') {
    return (
      <g key={zone.id}>
        {zone.points ? (
          <polygon
            points={zone.points}
            fill="#554578"
            stroke="#362B52"
            strokeWidth={1.1}
          />
        ) : (
          <path d={zone.d} fill="#554578" stroke="#362B52" strokeWidth={1.1} />
        )}
        {!isThumb && zone.label && zone.labelX !== undefined && zone.labelY !== undefined && (
          <text
            x={zone.labelX}
            y={zone.labelY}
            textAnchor="middle"
            fill="#F5F4F0"
            fontSize={7}
            fontWeight={700}
            letterSpacing={0.5}
          >
            {zone.label}
          </text>
        )}
      </g>
    );
  }

  if (zone.kind === 'masjid-plaza') {
    // Classic AutoCAD Masjid courtyard: crisp bordered square with architectural concentric diamond roof
    const cx = zone.labelX ?? 0;
    const cy = (zone.labelY ?? 0) - 4;
    return (
      <g key={zone.id}>
        <path d={zone.d} fill="#E6E5DF" stroke="#4B4A45" strokeWidth={1.3} />
        {!isThumb && (
          <g>
            <polygon
              points={`${cx},${cy - 20} ${cx + 22},${cy} ${cx},${cy + 20} ${cx - 22},${cy}`}
              fill="#D4D2CA"
              stroke="#4B4A45"
              strokeWidth={1}
            />
            <polygon
              points={`${cx},${cy - 11} ${cx + 12},${cy} ${cx},${cy + 11} ${cx - 12},${cy}`}
              fill="#F5F4F0"
              stroke="#5C5B55"
              strokeWidth={0.9}
            />
            <text
              x={cx}
              y={cy + 27}
              textAnchor="middle"
              fill="#262522"
              fontSize={7.2}
              fontWeight={800}
              letterSpacing={0.6}
            >
              {zone.label}
            </text>
          </g>
        )}
      </g>
    );
  }

  if (zone.kind === 'court') {
    // Central Linear Park with Basketball/Sport Court & Winding Park Path (Nava Village 4 palette)
    return (
      <g key={zone.id}>
        <path d={zone.d} fill="#7E9770" stroke="#536847" strokeWidth={1.3} />
        {!isThumb && (
          <g>
            {/* Winding sand promenade trail */}
            <path
              d="M 386 356 Q 445 330 510 352 T 655 344 T 812 356"
              fill="none"
              stroke="#E9DAB4"
              strokeWidth={11}
              strokeLinecap="round"
              opacity={0.85}
            />
            {/* Basketball / Sport court */}
            <rect
              x={430}
              y={332}
              width={78}
              height={36}
              rx={2}
              fill="#9E6E58"
              stroke="#4B4A45"
              strokeWidth={1.1}
            />
            <line x1={469} y1={332} x2={469} y2={368} stroke="#F8F7F4" strokeWidth={0.8} />
            <circle cx={469} cy={350} r={6} fill="none" stroke="#F8F7F4" strokeWidth={0.8} />
            {/* Mini tree canopies */}
            <circle cx={396} cy={336} r={6} fill="#5C754F" opacity={0.75} />
            <circle cx={532} cy={335} r={5.5} fill="#5C754F" opacity={0.75} />
            <circle cx={690} cy={365} r={6} fill="#5C754F" opacity={0.75} />
            <circle cx={785} cy={336} r={6} fill="#5C754F" opacity={0.75} />
            {zone.label && zone.labelX !== undefined && zone.labelY !== undefined && (
              <text
                x={zone.labelX + 54}
                y={zone.labelY + 2}
                textAnchor="middle"
                fill="#1F241C"
                fontSize={7.8}
                fontWeight={800}
                letterSpacing={0.6}
              >
                {zone.label}
              </text>
            )}
          </g>
        )}
      </g>
    );
  }

  // Standard olive-sage CAD green RTH / median fill (muted poster tone)
  return (
    <g key={zone.id}>
      {zone.points ? (
        <polygon
          points={zone.points}
          fill={zone.kind === 'median' ? '#7E986F' : '#8BA37B'}
          stroke="#556B49"
          strokeWidth={1}
        />
      ) : (
        <path
          d={zone.d}
          fill={zone.kind === 'median' ? '#7E986F' : '#8BA37B'}
          stroke="#556B49"
          strokeWidth={1}
        />
      )}
      {!isThumb && zone.label && zone.labelX !== undefined && zone.labelY !== undefined && (
        <text
          x={zone.labelX}
          y={zone.labelY}
          textAnchor="middle"
          fill="#223524"
          fontSize={7.5}
          fontWeight={800}
          letterSpacing={0.5}
          transform={
            zone.labelRotate
              ? `rotate(${zone.labelRotate} ${zone.labelX} ${zone.labelY})`
              : undefined
          }
        >
          {zone.label}
        </text>
      )}
    </g>
  );
}

function renderFacilityVisual(facility: FacilityArea, isThumb: boolean) {
  const cx = facility.x + facility.width / 2;
  const cy = facility.y + facility.height / 2;

  if (facility.kind === 'gate') {
    return (
      <g key={facility.id}>
        <rect
          x={facility.x}
          y={facility.y}
          width={facility.width}
          height={facility.height}
          fill="#1E293B"
          stroke="#0F172A"
          strokeWidth={1.2}
        />
        <rect
          x={facility.x + 3}
          y={facility.y + 3}
          width={facility.width - 6}
          height={2.5}
          fill="#F97316"
        />
        {!isThumb && (
          <>
            <text
              x={cx}
              y={facility.sublabel ? cy + 1 : cy + 3}
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize={8.2}
              fontWeight={800}
              letterSpacing={0.5}
            >
              {facility.label}
            </text>
            {facility.sublabel && (
              <text
                x={cx}
                y={cy + 12}
                textAnchor="middle"
                fill="#CBD5E1"
                fontSize={6.8}
                fontWeight={600}
              >
                {facility.sublabel}
              </text>
            )}
          </>
        )}
      </g>
    );
  }

  const fillMap: Record<Exclude<FacilityArea['kind'], 'gate'>, string> = {
    masjid: '#E6E5DF',
    park: '#8BA37B',
    playground: '#8BA37B',
    hall: '#E6E5DF',
    parking: '#E6E5DF',
  };

  const strokeMap: Record<Exclude<FacilityArea['kind'], 'gate'>, string> = {
    masjid: '#4B4A45',
    park: '#556B49',
    playground: '#556B49',
    hall: '#5C5B55',
    parking: '#5C5B55',
  };

  return (
    <g key={facility.id}>
      <rect
        x={facility.x}
        y={facility.y}
        width={facility.width}
        height={facility.height}
        fill={fillMap[facility.kind]}
        stroke={strokeMap[facility.kind]}
        strokeWidth={1.2}
      />
      {facility.kind === 'masjid' && !isThumb && (
        <polygon
          points={`${cx},${facility.y + 7} ${cx + 9},${facility.y + 15} ${cx},${facility.y + 23} ${cx - 9},${facility.y + 15}`}
          fill="#F8FAFC"
          stroke="#334155"
          strokeWidth={0.9}
        />
      )}
      {!isThumb && (
        <>
          <text
            x={cx}
            y={facility.kind === 'masjid' ? cy + 8 : facility.sublabel ? cy - 1 : cy + 3}
            textAnchor="middle"
            fill="#1E293B"
            fontSize={facility.width < 82 ? 7.5 : 8.5}
            fontWeight={800}
          >
            {facility.label}
          </text>
          {facility.sublabel && (
            <text
              x={cx}
              y={facility.kind === 'masjid' ? cy + 18 : cy + 10}
              textAnchor="middle"
              fill="#334155"
              fontSize={6.8}
              fontWeight={600}
            >
              {facility.sublabel}
            </text>
          )}
        </>
      )}
    </g>
  );
}

/**
 * Subtle CAD architectural setback / front-porch line on street-facing side of each kavling
 */
function renderSetbackLine(unit: KavlingUnit, strokeColor: string) {
  if (!unit.frontSide) return null;
  const inset = 7;
  if (unit.frontSide === 'top') {
    return (
      <line
        x1={unit.x + 2}
        y1={unit.y + inset}
        x2={unit.x + unit.width - 2}
        y2={unit.y + inset}
        stroke={strokeColor}
        strokeWidth={0.75}
        opacity={0.35}
      />
    );
  }
  if (unit.frontSide === 'bottom') {
    return (
      <line
        x1={unit.x + 2}
        y1={unit.y + unit.height - inset}
        x2={unit.x + unit.width - 2}
        y2={unit.y + unit.height - inset}
        stroke={strokeColor}
        strokeWidth={0.75}
        opacity={0.35}
      />
    );
  }
  if (unit.frontSide === 'left') {
    return (
      <line
        x1={unit.x + inset}
        y1={unit.y + 2}
        x2={unit.x + inset}
        y2={unit.y + unit.height - 2}
        stroke={strokeColor}
        strokeWidth={0.75}
        opacity={0.35}
      />
    );
  }
  return (
    <line
      x1={unit.x + unit.width - inset}
      y1={unit.y + 2}
      x2={unit.x + unit.width - inset}
      y2={unit.y + unit.height - 2}
      stroke={strokeColor}
      strokeWidth={0.75}
      opacity={0.35}
    />
  );
}

export const SiteplanSvg = memo(function SiteplanSvg({
  project,
  mode = 'interactive',
  selectedUnitId = null,
  highlightedUnitId = null,
  activeStatusFilters = [],
  customViewBox,
  onSelectUnit,
  className = '',
}: SiteplanSvgProps) {
  const isInteractive = mode === 'interactive';
  const isThumb = mode === 'thumbnail';
  const hasFilter = isInteractive && activeStatusFilters.length > 0;
  const { width, height } = project.viewBox;
  const { decoration } = project;
  const vb = customViewBox ?? { x: 0, y: 0, width, height };

  const siteTransform = decoration.siteRotation
    ? `translate(${decoration.siteRotation.offsetX ?? 0} ${decoration.siteRotation.offsetY ?? 0}) rotate(${decoration.siteRotation.angleDeg} ${decoration.siteRotation.cx} ${decoration.siteRotation.cy})`
    : undefined;

  const selectedUnit =
    isInteractive && selectedUnitId
      ? project.units.find((u) => u.id === selectedUnitId) ?? null
      : null;

  const highlightedUnit =
    isInteractive && highlightedUnitId
      ? project.units.find((u) => u.id === highlightedUnitId) ?? null
      : null;

  return (
    <svg
      viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`}
      preserveAspectRatio="xMidYMid meet"
      className={`block select-none ${className}`}
      role="img"
      aria-label={`Peta Siteplan ${project.name}`}
      shapeRendering="geometricPrecision"
    >
      {/* Architectural CAD Sheet Paper Background (warm matte poster tone) */}
      <rect x={0} y={0} width={width} height={height} fill="#F9F8F4" />

      {/* Authentic Double-Line CAD Sheet Border */}
      <rect
        x={12}
        y={12}
        width={width - 24}
        height={height - 24}
        fill="none"
        stroke="#3F3E3A"
        strokeWidth={isThumb ? 2.6 : 1.5}
      />
      {!isThumb && (
        <rect
          x={18}
          y={18}
          width={width - 36}
          height={height - 36}
          fill="none"
          stroke="#78766E"
          strokeWidth={0.75}
        />
      )}

      {/* Upright CAD Sheet Title Block */}
      {!isThumb && (
        <g>
          <text
            x={decoration.sheetTitlePos.x}
            y={decoration.sheetTitlePos.y}
            textAnchor={decoration.sheetTitlePos.align ?? 'start'}
            fill="#0F172A"
            fontSize={19}
            fontWeight={800}
            letterSpacing={1.2}
          >
            {decoration.sheetTitle}
          </text>
          {decoration.sheetSubtitle && (
            <text
              x={decoration.sheetTitlePos.x}
              y={decoration.sheetTitlePos.y + 17}
              textAnchor={decoration.sheetTitlePos.align ?? 'start'}
              fill="#64748B"
              fontSize={9.5}
              fontWeight={600}
              letterSpacing={0.8}
            >
              {decoration.sheetSubtitle}
            </text>
          )}
        </g>
      )}

      {/* ROTATED / ANGLED CAD SITEPLAN GEOMETRY */}
      <g transform={siteTransform}>
        {/* Outer Land Parcel Base Fill */}
        <path
          d={decoration.boundaryPath}
          fill="#EFECE4"
          stroke="#5C5B55"
          strokeWidth={isThumb ? 2.4 : 1.2}
        />

        {/* Custom Angled / Curved CAD Roads */}
        {decoration.roadPaths?.map((rp) => (
          <g key={rp.id}>
            <path
              d={rp.d}
              fill={rp.fill ? '#E3E1DA' : '#E3E1DA'}
              stroke={rp.stroke ?? '#6E6D66'}
              strokeWidth={rp.strokeWidth ?? 1}
            />
            {!isThumb && rp.label && rp.labelX !== undefined && rp.labelY !== undefined && (
              <text
                x={rp.labelX}
                y={rp.labelY}
                textAnchor="middle"
                fill="#334155"
                fontSize={8.5}
                fontWeight={700}
                letterSpacing={1.2}
                transform={
                  rp.labelRotate
                    ? `rotate(${rp.labelRotate} ${rp.labelX} ${rp.labelY})`
                    : undefined
                }
              >
                {rp.label}
              </text>
            )}
          </g>
        ))}

        {/* Internal CAD Street Network */}
        <g>
          {project.roads.map((road) => (
            <rect
              key={road.id}
              x={road.x}
              y={road.y}
              width={road.width}
              height={road.height}
              rx={road.rx ?? 0}
              fill={road.isMain ? '#DEDCD5' : '#E8E6E0'}
              stroke="#9C9A92"
              strokeWidth={0.85}
            />
          ))}

          {/* CAD Street Centerlines */}
          {!isThumb &&
            decoration.centerLines.map((line, idx) => (
              <line
                key={idx}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#FFFFFF"
                strokeWidth={1.2}
                strokeDasharray="7 5"
                opacity={0.9}
              />
            ))}

          {/* CAD Roundabouts / Elliptical Plazas */}
          {decoration.roundabouts?.map((rb, idx) => (
            <g key={idx}>
              {rb.rxOuter && rb.ryOuter ? (
                <>
                  <ellipse
                    cx={rb.cx}
                    cy={rb.cy}
                    rx={rb.rxOuter}
                    ry={rb.ryOuter}
                    fill="#DEDCD5"
                    stroke="#6E6D66"
                    strokeWidth={1.1}
                  />
                  <ellipse
                    cx={rb.cx}
                    cy={rb.cy}
                    rx={rb.rxInner ?? rb.innerR}
                    ry={rb.ryInner ?? rb.innerR}
                    fill={rb.plazaFill ?? '#7E986F'}
                    stroke="#4B4A45"
                    strokeWidth={1}
                  />
                </>
              ) : (
                <>
                  <circle
                    cx={rb.cx}
                    cy={rb.cy}
                    r={rb.outerR}
                    fill="#DEDCD5"
                    stroke="#6E6D66"
                    strokeWidth={1.1}
                  />
                  <circle
                    cx={rb.cx}
                    cy={rb.cy}
                    r={rb.innerR}
                    fill={rb.plazaFill ?? '#7E986F'}
                    stroke="#4B4A45"
                    strokeWidth={1}
                  />
                </>
              )}
              {!isThumb && rb.label && (
                <text
                  x={rb.cx}
                  y={rb.cy + 2.5}
                  textAnchor="middle"
                  fill="#1E293B"
                  fontSize={6.5}
                  fontWeight={800}
                  letterSpacing={0.4}
                >
                  {rb.label}
                </text>
              )}
            </g>
          ))}

          {/* Street ROW Labels */}
          {!isThumb &&
            project.roads.map((road) => {
              if (!road.label || road.labelX === undefined || road.labelY === undefined) {
                return null;
              }
              return (
                <text
                  key={`${road.id}-lbl`}
                  x={road.labelX}
                  y={road.labelY}
                  textAnchor="middle"
                  fill="#334155"
                  fontSize={road.isMain ? 7.8 : 7}
                  fontWeight={700}
                  letterSpacing={0.9}
                  transform={
                    road.labelRotate
                      ? `rotate(${road.labelRotate} ${road.labelX} ${road.labelY})`
                      : undefined
                  }
                >
                  {road.label}
                </text>
              );
            })}
        </g>

        {/* CAD Green Zones, Ponds, Linear Park & Masjid Plazas */}
        {decoration.greenZones?.map((gz) => renderGreenZone(gz, isThumb))}

        {/* Architectural Facilities */}
        <g>{project.facilities.map((fac) => renderFacilityVisual(fac, isThumb))}</g>

        {/* Block Group CAD Labels */}
        {!isThumb &&
          project.blockBanners.map((banner) => (
            <text
              key={banner.id}
              x={banner.x}
              y={banner.y}
              fill="#334155"
              fontSize={8}
              fontWeight={800}
              letterSpacing={0.7}
              transform={
                banner.rotate
                  ? `rotate(${banner.rotate} ${banner.x} ${banner.y})`
                  : undefined
              }
            >
              {banner.label}
            </text>
          ))}

        {/* TIGHTLY TESSELLATED CAD KAVLING LOTS */}
        <g>
          {project.units.map((unit) => {
            const statusMeta = STATUS_CONFIG[unit.status];
            const isDimmed = hasFilter && !activeStatusFilters.includes(unit.status);
            const isDashedUnlocked = Boolean(statusMeta.isDashed);
            const isLockedUnit = Boolean(statusMeta.isLocked);

            const cx = unit.x + unit.width / 2;
            const cy = unit.y + unit.height / 2;
            const minDim = Math.min(unit.width, unit.height);
            const fontSize = minDim <= 37 ? 10 : minDim <= 46 ? 11 : 12.2;
            const showUnlockedMicro =
              isDashedUnlocked && !isThumb && unit.height >= 54 && unit.width >= 38;

            return (
              <g
                key={unit.id}
                onClick={
                  isInteractive && onSelectUnit
                    ? (e) => {
                        e.stopPropagation();
                        onSelectUnit(unit);
                      }
                    : undefined
                }
                style={{
                  opacity: isDimmed ? 0.15 : 1,
                  transition: isInteractive ? 'opacity 180ms ease' : undefined,
                  cursor: isInteractive ? 'pointer' : 'default',
                }}
                role={isInteractive ? 'button' : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                aria-label={`Kavling ${unit.blockCode}, status ${statusMeta.label}${
                  statusMeta.subLabel ? ` (${statusMeta.subLabel})` : ''
                }`}
                onKeyDown={
                  isInteractive && onSelectUnit
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectUnit(unit);
                        }
                      }
                    : undefined
                }
              >
                {/* Sharp-cornered CAD Kavling Parcel (edge-to-edge touching lots) */}
                <rect
                  x={unit.x}
                  y={unit.y}
                  width={unit.width}
                  height={unit.height}
                  rx={0.5}
                  fill={statusMeta.color}
                  stroke={isDashedUnlocked ? statusMeta.darkStroke : '#FFFFFF'}
                  strokeWidth={isDashedUnlocked ? 1.5 : 1.1}
                  strokeDasharray={isDashedUnlocked ? '4 2.5' : undefined}
                />

                {/* Crisp outer CAD parcel hairline */}
                <rect
                  x={unit.x}
                  y={unit.y}
                  width={unit.width}
                  height={unit.height}
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth={0.5}
                  opacity={0.45}
                />

                {/* Subtle architectural building setback line on street side */}
                {!isThumb &&
                  renderSetbackLine(
                    unit,
                    unit.status === 'minat' ? '#422006' : '#FFFFFF'
                  )}

                {/* Crisp inset dashed frame on Belum Lock units (Minat) */}
                {isDashedUnlocked && !isThumb && (
                  <rect
                    x={unit.x + 2.4}
                    y={unit.y + 2.4}
                    width={unit.width - 4.8}
                    height={unit.height - 4.8}
                    fill="none"
                    stroke="#6B4F0E"
                    strokeWidth={1.15}
                    strokeDasharray="3.5 2.2"
                    opacity={0.85}
                  />
                )}

                {/* Subtle solid inner trim on locked units (Booking / SP3K) */}
                {isLockedUnit &&
                  (unit.status === 'booking' || unit.status === 'sp3k') &&
                  !isThumb && (
                    <rect
                      x={unit.x + 2.2}
                      y={unit.y + 2.2}
                      width={unit.width - 4.4}
                      height={unit.height - 4.4}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={0.85}
                      opacity={0.55}
                    />
                  )}

                {/* Block Code Label */}
                {!isThumb && (
                  <text
                    x={cx}
                    y={showUnlockedMicro ? cy - 1 : cy + 3.8}
                    textAnchor="middle"
                    fill={statusMeta.plotTextColor}
                    fontSize={fontSize}
                    fontWeight={800}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {unit.blockCode}
                  </text>
                )}

                {/* Micro BLM LOCK badge on tall Belum Lock (Minat) plots */}
                {showUnlockedMicro && (
                  <text
                    x={cx}
                    y={cy + 10.5}
                    textAnchor="middle"
                    fill="#3F2D06"
                    fontSize={5.8}
                    fontWeight={700}
                    letterSpacing={0.1}
                  >
                    BLM LOCK
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Authentic Muted Crimson Dashed CAD Site Perimeter Outline */}
        {decoration.redBoundaryPath && (
          <path
            d={decoration.redBoundaryPath}
            fill="none"
            stroke="#A43D40"
            strokeWidth={isThumb ? 2.4 : 1.4}
            strokeDasharray="5 3"
            opacity={0.85}
          />
        )}

        {/* Top-most SVG overlay so Selected & Search Pulse frames are NEVER clipped by neighboring lots */}
        {(selectedUnit || highlightedUnit) && (
          <g pointerEvents="none">
            {selectedUnit && (
              <>
                <rect
                  x={selectedUnit.x - 2}
                  y={selectedUnit.y - 2}
                  width={selectedUnit.width + 4}
                  height={selectedUnit.height + 4}
                  rx={2}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={4}
                />
                <rect
                  x={selectedUnit.x - 2}
                  y={selectedUnit.y - 2}
                  width={selectedUnit.width + 4}
                  height={selectedUnit.height + 4}
                  rx={2}
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth={2.5}
                />
              </>
            )}

            {highlightedUnit && (
              <rect
                x={highlightedUnit.x - 4.5}
                y={highlightedUnit.y - 4.5}
                width={highlightedUnit.width + 9}
                height={highlightedUnit.height + 9}
                rx={3}
                fill="none"
                stroke="#0284C7"
                className="plot-pulse-ring"
              />
            )}
          </g>
        )}
      </g>

      {/* Upright Architectural Compass Rose */}
      {!isThumb &&
        renderCompass(
          decoration.compassVariant,
          decoration.compassPos.x,
          decoration.compassPos.y
        )}

      {/* Upright SITEPLAN · SKALA NTS Technical Drafting Stamp */}
      {!isThumb &&
        renderScaleStamp(decoration.scaleStampPos.x, decoration.scaleStampPos.y)}
    </svg>
  );
});
