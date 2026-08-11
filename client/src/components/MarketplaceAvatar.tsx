import {
  marketplaceAvatarImages,
  type MarketplaceAvatarTone,
} from "@/lib/marketplaceData";

const beamAvatarStrategyIds = new Set(["STR-005"]);
const beamAvatarColors = ["#13141a", "#a90448", "#fb3640", "#fda543", "#17c69b"];

const avatarImageByStrategyId: Record<string, string> = {
  "STR-002": marketplaceAvatarImages.threeDimensional,
  "STR-003": marketplaceAvatarImages.teams5,
  "STR-007": marketplaceAvatarImages.toon,
  "STR-008": marketplaceAvatarImages.memo,
  "STR-010": marketplaceAvatarImages.notion5,
};

type MarketplaceAvatarProps = {
  strategyId: string;
  name: string;
  avatar: string;
  avatarTone: MarketplaceAvatarTone;
  className: string;
};

export function MarketplaceAvatar({
  strategyId,
  name,
  avatar,
  avatarTone,
  className,
}: MarketplaceAvatarProps) {
  const avatarSrc = avatarImageByStrategyId[strategyId];
  const isBeam = beamAvatarStrategyIds.has(strategyId);
  const seed = Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0);
  const accent = beamAvatarColors[1 + (seed % (beamAvatarColors.length - 1))];
  const accentAlt = beamAvatarColors[1 + ((seed + 2) % (beamAvatarColors.length - 1))];
  const rotation = (seed % 36) - 18;

  return (
    <span className={`${className} is-${avatarTone}${isBeam ? " is-beam" : ""}`} aria-hidden="true">
      {avatarSrc ? <img src={avatarSrc} alt="" /> : isBeam ? (
        <svg viewBox="0 0 36 36" focusable="false">
          <rect width="36" height="36" fill={beamAvatarColors[0]} />
          <rect x="-9" y="8" width="54" height="7" rx="3.5" fill={accent} transform={`rotate(${rotation} 18 18)`} />
          <rect x="-9" y="20" width="54" height="6" rx="3" fill={accentAlt} transform={`rotate(${rotation} 18 18)`} />
          <circle cx="18" cy="18" r="6" fill={beamAvatarColors[4]} />
        </svg>
      ) : avatar}
    </span>
  );
}
