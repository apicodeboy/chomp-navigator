import type { Feature, LineString, Point, Position } from 'geojson';

/**
 * Mapbox voice prompt for a step. `distanceAlongGeometry` is how far BEFORE the
 * step's end maneuver this should be announced (meters). `announcement` is the
 * ready-made text from Mapbox (e.g. "In 200 meters, turn left onto Main Street").
 * See Directions API: voiceInstructions (voice_instructions=true).
 */
export interface VoiceInstruction {
  distanceAlongGeometry: number;
  announcement: string;
  ssmlAnnouncement?: string;
}

/**
 * Mapbox banner instruction for a step. `distanceAlongGeometry` is the distance
 * before the maneuver at which this banner becomes active. See Directions API:
 * bannerInstructions (banner_instructions=true).
 */
export interface BannerInstruction {
  distanceAlongGeometry: number;
  primary: { text: string; type?: string; modifier?: string };
  secondary?: { text: string } | null;
}

/**
 * One route step. In the Mapbox model `maneuver` sits at the START of the step,
 * while the step's banner/voice instructions describe the maneuver at its END.
 * So while you are physically on step i, you display step i's banner and play
 * step i's voice prompts — they prepare you for the next maneuver.
 */
export interface RouteStep {
  /** Instruction of the maneuver at the start of this step. */
  instruction: string;
  type: string;
  modifier?: string;
  /** Maneuver location [lng, lat]. */
  location: Position;
  /** Length of this step in meters. */
  distance: number;
  /** Voice prompts to play while traveling this step. */
  voiceInstructions: VoiceInstruction[];
  /** Banner instructions to show while traveling this step. */
  bannerInstructions: BannerInstruction[];
  /** Distance from route start to where this step BEGINS (filled in useNavigation). */
  startDistAlong: number;
  /** Distance from route start to where this step ENDS (= the next maneuver). */
  endDistAlong: number;
}

/** A geocoding search result shown in the suggestions list. */
export interface Place {
  id: string;
  /** Short name, e.g. "Blue Bottle Coffee". */
  name: string;
  /** Fuller address line, e.g. "315 Linden St, San Francisco, California". */
  address: string;
  /** [lng, lat]. */
  coord: Position;
}

/** A fully parsed route ready for rendering + progress tracking. */
export interface NavRoute {
  /** The route geometry as a GeoJSON LineString feature [lng, lat][]. */
  line: Feature<LineString>;
  /** Total route distance in meters. */
  distance: number;
  /** Total route duration in seconds. */
  duration: number;
  /** Ordered steps for the banner + voice guidance. */
  steps: RouteStep[];
}

/** Pellets are simple points carrying their distance-along-route in meters. */
export type Pellet = Feature<Point, { distAlong: number }>;

/** Live user fix from expo-location. */
export interface UserFix {
  /** [lng, lat] */
  coord: Position;
  /** Heading in degrees clockwise from north, or null if unknown. */
  heading: number | null;
  /** Speed in m/s, or null. */
  speed: number | null;
}

/** The derived navigation state recomputed on every GPS update. */
export interface NavProgress {
  /** Snapped position on the route [lng, lat]. */
  snapped: Position;
  /** Distance traveled along the route, meters. */
  distAlong: number;
  /** Distance remaining to destination, meters. */
  distRemaining: number;
  /** Bearing of the route at the snapped point (degrees from north). */
  bearing: number;
  /** Perpendicular distance from the real GPS point to the route, meters. */
  offRouteBy: number;
  /** Index of the step the user is currently on. */
  stepIndex: number;
  /** The step the user is currently traveling (carries banner + voice). */
  currentStep: RouteStep | null;
  /** Distance to the upcoming maneuver (end of the current step), meters. */
  distToManeuver: number;
}
