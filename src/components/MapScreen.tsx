import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Mapbox from '@rnmapbox/maps';
import { NAV } from '@/config/mapbox';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useNavigation } from '@/hooks/useNavigation';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';
import RouteLine from './RouteLine';
import PreviewLayer from './PreviewLayer';
import MapFollower from './MapFollower';
import ChomperMarker from './ChomperMarker';
import InstructionBanner from './InstructionBanner';
import NavPanel from './NavPanel';
import GoldButton from './GoldButton';
import SearchPanel from './SearchPanel';
import StoreScreen from './StoreScreen';
import ProfileScreen from './ProfileScreen';
import SettingsModal from './SettingsModal';
import AccountModal from './AccountModal';
import FavoritesModal from './FavoritesModal';
import NearbySheet from './NearbySheet';
import NearbyMarkers from './NearbyMarkers';
import TicketBalance from './TicketBalance';
import { fetchNearby, nearbyToPlace, RADIUS_MILES, type NearbyPlace } from '@/services/nearby';
import { useSkinStore } from '@/store/useSkinStore';
import { useMapStyle } from '@/store/useMapStyle';
import { useTickets } from '@/store/useTickets';
import { useSettings } from '@/store/useSettings';
import { addFavorite, isFavorite } from '@/lib/favorites';
import { addRecent } from '@/lib/recents';
import { formatDistance, formatDuration } from '@/utils/format';
import { routeBounds, straightLineM } from '@/utils/geo';
import { theme } from '@/theme';
import type { Place } from '@/types/navigation';
import type { Position } from 'geojson';

const ICON_RECENTER = require('../../assets/icon-recenter.png');
const ICON_OVERVIEW = require('../../assets/icon-overview.png');
const ICON_PROFILE = require('../../assets/icon-profile.png');
const ICON_STORE = require('../../assets/icon-store.png');

export default function MapScreen() {
  const { fix, permissionDenied } = useUserLocation();
  const { selected: selectedSkin } = useSkinStore();
  const { styleURL } = useMapStyle();
  const { voiceOn, setVoiceOn, units, lineColor } = useSettings();
  const tickets = useTickets();
  const cameraRef = useRef<React.ElementRef<typeof Mapbox.Camera>>(null);
  const reportedRef = useRef(false);

  // selectedPlace = a place tapped in search/favorites (map hovers + shows a
  // detail card). routingTo = the destination we actually route to, set when the
  // user taps "Go" (then we fetch route alternatives).
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [routingTo, setRoutingTo] = useState<Place | null>(null);
  const [waypoints, setWaypoints] = useState<Position[]>([]);
  const [addingStop, setAddingStop] = useState(false);
  const [started, setStarted] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [placeSaved, setPlaceSaved] = useState(false);
  // Chase-cam lock. The map auto-follows the character; panning releases it and
  // surfaces the Re-center button (like Apple Maps).
  const [following, setFollowing] = useState(true);
  // Reported by the bottom search bar so the idle buttons float just above it.
  const [searchInfo, setSearchInfo] = useState({ height: 150, keyboardOpen: false });
  // Nearby feature (gas / food / EV / hotels within RADIUS_MILES).
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<NearbyPlace[]>([]);
  const [nearbyFilter, setNearbyFilter] = useState('all');

  const { route, routes, selectedIndex, selectRoute, pellets, progress, status, error, reset } =
    useNavigation(routingTo?.coord ?? null, fix, started, waypoints);

  useVoiceGuidance(progress, status, voiceOn);

  // Pick a place from search/favorites: hover the map over it and show details
  // (no routing yet — that happens on "Go").
  function pickPlace(p: Place) {
    setSelectedPlace(p);
    setRoutingTo(null);
    setStarted(false);
    void addRecent(p); // remember it for the search bar's Recent list
  }

  // Reflect whether the selected place is already saved.
  useEffect(() => {
    if (selectedPlace) isFavorite(selectedPlace.id).then(setPlaceSaved);
    else setPlaceSaved(false);
  }, [selectedPlace]);

  async function saveCurrentPlace() {
    if (!selectedPlace) return;
    await addFavorite(selectedPlace);
    setPlaceSaved(true);
  }

  // Straight-line distance from the user to the selected place (cheap label).
  const placeDistanceM =
    selectedPlace && fix ? straightLineM(fix.coord, selectedPlace.coord) : null;

  // Nearby: a search-bar category chip (Food, Gas, …) opens the Nearby sheet for
  // that category — places within RADIUS_MILES, nearest first, with map pins.
  async function openNearbyCategory(cat: string) {
    if (!fix) return;
    setNearbyFilter(cat);
    setNearbyOpen(true);
    setNearbyLoading(true);
    try {
      setNearbyResults(await fetchNearby(fix.coord, [cat], RADIUS_MILES));
    } catch {
      setNearbyResults([]);
    } finally {
      setNearbyLoading(false);
    }
  }

  // Tapping a Nearby result (list or pin): route through the normal place flow.
  function onNearbyPick(n: NearbyPlace) {
    setNearbyOpen(false);
    pickPlace(nearbyToPlace(n));
  }

  // On arrival, add the trip distance to the lifetime total and report it; the
  // server credits Tickets for any newly crossed distance milestone.
  useEffect(() => {
    if (status === 'arrived' && route && !reportedRef.current) {
      reportedRef.current = true;
      (async () => {
        const prev = parseFloat((await AsyncStorage.getItem('lifetimeMeters')) ?? '0');
        const total = prev + route.distance;
        await AsyncStorage.setItem('lifetimeMeters', String(total));
        await tickets.reportDistance(total);
      })();
    }
    if (status !== 'arrived') reportedRef.current = false;
  }, [status, route, tickets]);

  const isPreview = status === 'preview' || status === 'loading';
  const isNav = status === 'navigating' || status === 'arrived';

  // Traffic-aware remaining time: scale the route's (driving-traffic) duration by
  // the fraction of distance still ahead.
  const remainingSec =
    route && progress
      ? route.duration * (progress.distRemaining / Math.max(route.distance, 1))
      : route?.duration ?? 0;

  function cancel() {
    reset();
    setSelectedPlace(null);
    setRoutingTo(null);
    setWaypoints([]);
    setAddingStop(false);
    setStarted(false);
    setNearbyResults([]);
  }

  // The route is "active" once a destination is picked (place card, route
  // options, or navigating) — this swaps the idle controls for the nav controls.
  const inRoute = selectedPlace !== null || isPreview || isNav;

  // Overview: release follow and frame the whole route (or the selected place).
  // The frame is deferred so the chase-cam loop sees following=false and stops
  // driving the camera first — otherwise it overrides us on the next frame.
  function overview() {
    setFollowing(false);
    const apply = () => {
      if (route) {
        cameraRef.current?.setCamera({
          bounds: {
            ...routeBounds(route.line),
            paddingTop: 140,
            paddingBottom: 280,
            paddingLeft: 60,
            paddingRight: 60,
          },
          animationDuration: 500,
        });
      } else if (selectedPlace) {
        cameraRef.current?.setCamera({
          centerCoordinate: selectedPlace.coord,
          zoomLevel: 14,
          animationDuration: 500,
        });
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(apply));
  }

  async function shareEta() {
    const mins = Math.max(1, Math.round(remainingSec / 60));
    const dest = routingTo?.name ?? selectedPlace?.name ?? 'my destination';
    const left = progress ? formatDistance(progress.distRemaining, units) : '';
    try {
      await Share.share({ message: `On my way to ${dest} — ETA ${mins} min${left ? ` (${left} to go)` : ''}.` });
    } catch {
      // user cancelled the share sheet
    }
  }

  function handleAddStopPick(p: Place) {
    setWaypoints((prev) => [...prev, p.coord]);
    setAddingStop(false);
  }

  // Re-lock the chase cam whenever navigation (re)starts.
  useEffect(() => {
    if (isNav) setFollowing(true);
  }, [isNav]);

  // Re-center: during navigation re-lock the follow cam; otherwise snap back to
  // the user's current location.
  function recenter() {
    if (isNav) {
      setFollowing(true);
      return;
    }
    if (fix) {
      cameraRef.current?.setCamera({
        centerCoordinate: fix.coord,
        zoomLevel: NAV.FOLLOW_ZOOM,
        animationDuration: 500,
      });
    }
  }

  if (permissionDenied) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>
          Location permission is required to navigate. Enable it in Settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <Mapbox.MapView
        style={styles.fill}
        styleURL={styleURL}
        scaleBarEnabled={false}
        compassEnabled
        onCameraChanged={(s) => {
          // A user pan/zoom/rotate during navigation releases the chase cam.
          if (isNav && s.gestures.isGestureActive) setFollowing(false);
        }}
      >
        <MapFollower
          cameraRef={cameraRef}
          isNav={isNav}
          isPreview={isPreview}
          route={route}
          fix={fix}
          progress={progress}
          skin={selectedSkin}
          following={following}
          focusCoord={selectedPlace && !routingTo ? selectedPlace.coord : null}
        />

        {/* Idle/preview: show the EQUIPPED character at the user's location
            instead of the default blue dot (matches the web demo). */}
        {!isNav && (
          <>
            <Mapbox.UserLocation visible={false} />
            {fix && (
              <ChomperMarker
                coordinate={fix.coord}
                rotationDeg={0}
                skin={selectedSkin}
                size={105}
              />
            )}
          </>
        )}

        {/* Place-preview pin (before routing). */}
        {selectedPlace && !routingTo && (
          <Mapbox.PointAnnotation id="selected-place" coordinate={selectedPlace.coord}>
            <View style={styles.placePin} />
          </Mapbox.PointAnnotation>
        )}

        {/* Nearby result pins on the existing map (idle only). */}
        {!inRoute && nearbyResults.length > 0 && (
          <NearbyMarkers results={nearbyResults} filter={nearbyFilter} onTap={onNearbyPick} />
        )}

        {/* Preview: route alternatives + endpoints. */}
        {isPreview && routes.length > 0 && (
          <PreviewLayer routes={routes} selectedIndex={selectedIndex} color={lineColor} />
        )}

        {/* Navigation: solid route line (color from Settings) + character. */}
        {isNav && route && <RouteLine line={route.line} color={lineColor} />}
      </Mapbox.MapView>

      {/* ---------- Overlays per phase ---------- */}

      {/* Idle: bottom search bar with the profile chip on its right end. */}
      {status === 'idle' && !selectedPlace && (
        <SearchPanel
          near={fix?.coord ?? null}
          onPick={pickPlace}
          onOpenProfile={() => setProfileOpen(true)}
          onCategory={openNearbyCategory}
          onLayoutChange={setSearchInfo}
        />
      )}

      {/* Place selected: detail card with a Go button (no route computed yet). */}
      {status === 'idle' && selectedPlace && (
        <View style={styles.previewCard}>
          <View style={styles.previewTitleRow}>
            <Text style={styles.previewTitle} numberOfLines={1}>{selectedPlace.name}</Text>
            <TouchableOpacity onPress={saveCurrentPlace} hitSlop={10} disabled={placeSaved}>
              <Text style={[styles.saveStar, placeSaved && styles.saveStarOn]}>
                {placeSaved ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          </View>
          {!!selectedPlace.address && (
            <Text style={styles.previewAddr} numberOfLines={2}>{selectedPlace.address}</Text>
          )}
          {placeDistanceM != null && (
            <Text style={styles.previewSub}>{formatDistance(placeDistanceM, units)} away</Text>
          )}
          <View style={styles.previewBtns}>
            <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.55} onPress={cancel}>
              <Text style={styles.cancelText}>Back</Text>
            </TouchableOpacity>
            <GoldButton label="Go ▶" style={styles.goFlex} onPress={() => setRoutingTo(selectedPlace)} />
          </View>
        </View>
      )}

      {/* Routing/preview: choose among route alternatives, then Start. */}
      {(isPreview || status === 'error') && (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle} numberOfLines={1}>
            {routingTo?.name ?? selectedPlace?.name ?? 'Routes'}
          </Text>
          {status === 'error' ? (
            <Text style={styles.previewErr}>No route found. Try another destination.</Text>
          ) : routes.length === 0 ? (
            <Text style={styles.previewSub}>Finding the best routes…</Text>
          ) : (
            <View style={styles.routeOptions}>
              {routes.slice(0, 4).map((r, i) => {
                const active = i === selectedIndex;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.routeOpt, active && styles.routeOptActive]}
                    onPress={() => selectRoute(i)}
                  >
                    <Text style={[styles.routeEta, active && styles.routeEtaActive]}>
                      {formatDuration(r.duration)}
                    </Text>
                    <Text style={[styles.routeDist, active && styles.routeDistActive]}>
                      {formatDistance(r.distance, units)}
                    </Text>
                    <Text style={[styles.routeTag, active && styles.routeTagActive]}>
                      {i === 0 ? 'Fastest' : `Alt ${i}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View style={styles.previewBtns}>
            <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.55} onPress={cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <GoldButton
              label="Start ▶"
              style={styles.goFlex}
              disabled={!route}
              onPress={() => setStarted(true)}
            />
          </View>
        </View>
      )}

      {/* Navigation overlays. */}
      {isNav && progress && (
        <>
          <InstructionBanner
            step={progress.currentStep}
            distanceM={progress.distToManeuver}
            units={units}
          />
          {status === 'arrived' ? (
            <View style={styles.arrived}>
              <Text style={styles.arrivedText}>🎉 You’ve arrived!</Text>
              <GoldButton label="Done" style={styles.goStretch} onPress={cancel} />
            </View>
          ) : (
            !addingStop && (
              <NavPanel
                distRemainingM={progress.distRemaining}
                remainingSec={remainingSec}
                units={units}
                onStop={cancel}
                onAddStop={() => setAddingStop(true)}
                onShareEta={shareEta}
                onCharacterSelect={() => setStoreOpen(true)}
              />
            )
          )}
        </>
      )}

      {/* Add-stop search overlay (during navigation). */}
      {addingStop && (
        <>
          <SearchPanel near={fix?.coord ?? null} onPick={handleAddStopPick} />
          <TouchableOpacity style={styles.addStopCancel} onPress={() => setAddingStop(false)}>
            <Text style={styles.addStopCancelText}>Cancel adding stop</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Ticket balance (shown while navigating; tap to open the store). */}
      {isNav && (
        <View style={styles.ticketTop}>
          <TicketBalance onPress={() => setStoreOpen(true)} />
        </View>
      )}

      {/* Floating controls — bottom-right stack. Idle: store / profile / recenter.
          Once a route is active: overview / recenter / audio. */}
      {/* Idle: store + recenter, floating just above the bottom search bar
          (hidden while the keyboard is up so they don't fly off-screen). */}
      {!inRoute && !searchInfo.keyboardOpen && (
        <>
          <TouchableOpacity
            style={[styles.fab, styles.fabDark, { bottom: 30 + searchInfo.height }]}
            onPress={() => setStoreOpen(true)}
          >
            <Image source={ICON_STORE} style={styles.fabFill} resizeMode="cover" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fab, { bottom: 30 + searchInfo.height + 72 }]}
            onPress={recenter}
          >
            <Image source={ICON_RECENTER} style={styles.fabImg} resizeMode="contain" />
          </TouchableOpacity>
        </>
      )}
      {/* Route active: overview + recenter + audio. */}
      {inRoute && (
        <>
          <TouchableOpacity style={[styles.fab, styles.fabPos1]} onPress={overview}>
            <Image source={ICON_OVERVIEW} style={styles.fabImg} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fab, styles.fabPos2, isNav && !following && styles.fabRecenterActive]}
            onPress={recenter}
          >
            <Image source={ICON_RECENTER} style={styles.fabImg} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fab, styles.fabPos3]} onPress={() => setVoiceOn(!voiceOn)}>
            <Text style={styles.fabIcon}>{voiceOn ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
        </>
      )}

      <StoreScreen visible={storeOpen} onClose={() => setStoreOpen(false)} />
      <ProfileScreen
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        onOpenStore={() => { setProfileOpen(false); setStoreOpen(true); }}
        onOpenSettings={() => { setProfileOpen(false); setSettingsOpen(true); }}
        onOpenFavorites={() => { setProfileOpen(false); setFavoritesOpen(true); }}
        onOpenAccount={() => { setProfileOpen(false); setAccountOpen(true); }}
      />
      <FavoritesModal visible={favoritesOpen} onClose={() => setFavoritesOpen(false)} onPick={pickPlace} />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AccountModal visible={accountOpen} onClose={() => setAccountOpen(false)} />
      <NearbySheet
        visible={nearbyOpen}
        loading={nearbyLoading}
        results={nearbyResults}
        filter={nearbyFilter}
        onFilter={openNearbyCategory}
        onClose={() => setNearbyOpen(false)}
        onPick={onNearbyPick}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

// Dark frosted-glass card (matches the reference testimonial look).
const card = {
  position: 'absolute' as const,
  left: 12,
  right: 12,
  backgroundColor: 'rgba(18,22,30,0.88)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.14)',
  borderRadius: theme.radius.lg,
  padding: 18,
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.colors.bg },
  msg: { color: theme.colors.textOnMap, textAlign: 'center', fontSize: 16 },

  previewCard: { ...card, bottom: 24, gap: 6 },
  previewTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewTitle: { flex: 1, color: '#ffffff', fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  saveStar: { color: 'rgba(255,255,255,0.7)', fontSize: 26, paddingLeft: 12 },
  saveStarOn: { color: theme.colors.accent },
  previewSub: { color: '#5ee08a', fontSize: 14, fontWeight: '600' },
  previewAddr: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 18 },
  previewErr: { color: '#ff6b6b', fontSize: 14, fontWeight: '600' },

  routeOptions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  routeOpt: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  routeOptActive: { borderColor: theme.colors.accent, backgroundColor: 'rgba(255,255,255,0.16)' },
  routeEta: { color: '#ffffff', fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },
  routeEtaActive: { color: '#ffffff' },
  routeDist: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 1 },
  routeDistActive: { color: 'rgba(255,255,255,0.75)' },
  routeTag: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', marginTop: 3 },
  routeTagActive: { color: theme.colors.accent },

  placePin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.accent,
    borderWidth: 3,
    borderColor: '#fff',
  },
  previewBtns: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'center' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: theme.radius.sm, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center' },
  cancelText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  goFlex: { flex: 2 },
  goStretch: { alignSelf: 'stretch' },

  arrived: { ...card, bottom: 24, alignItems: 'center', gap: 12 },
  arrivedText: { color: '#ffffff', fontSize: 20, fontWeight: '800' },

  fab: {
    position: 'absolute',
    right: 14,
    width: 64,
    height: 64,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.overlay,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bottom-right vertical stack of three — raised well off the bottom edge.
  fabPos1: { bottom: 252 },
  fabPos2: { bottom: 324 },
  fabPos3: { bottom: 396 },
  fabRecenterActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  fabIcon: { fontSize: 30 },
  fabImg: { width: 44, height: 44 },
  // Dark face (for the black-background chrome store icon); image fills the circle.
  fabDark: { backgroundColor: '#000', borderColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  fabFill: { width: '100%', height: '100%' },

  addStopCancel: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: theme.colors.overlay,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  addStopCancelText: { color: theme.colors.danger, fontWeight: '700', fontSize: 15 },
  ticketTop: { position: 'absolute', top: 116, right: 12 },

  error: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    color: '#ff8888',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: theme.radius.sm,
  },
});
