import React, { useEffect, useRef, useState } from 'react';
import {
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
import RouteLayers from './RouteLayers';
import PreviewLayer from './PreviewLayer';
import MapFollower from './MapFollower';
import ChomperMarker from './ChomperMarker';
import InstructionBanner from './InstructionBanner';
import EtaBar from './EtaBar';
import SearchPanel from './SearchPanel';
import StoreScreen from './StoreScreen';
import ProfileScreen from './ProfileScreen';
import SettingsModal from './SettingsModal';
import AccountModal from './AccountModal';
import FavoritesModal from './FavoritesModal';
import TicketBalance from './TicketBalance';
import { useSkinStore } from '@/store/useSkinStore';
import { useMapStyle } from '@/store/useMapStyle';
import { useTickets } from '@/store/useTickets';
import { useSettings } from '@/store/useSettings';
import { addFavorite, isFavorite } from '@/lib/favorites';
import { formatDistance, formatDuration } from '@/utils/format';
import { straightLineM } from '@/utils/geo';
import { theme } from '@/theme';
import type { Place } from '@/types/navigation';

export default function MapScreen() {
  const { fix, permissionDenied } = useUserLocation();
  const { selected: selectedSkin } = useSkinStore();
  const { styleURL } = useMapStyle();
  const { voiceOn, setVoiceOn, units } = useSettings();
  const tickets = useTickets();
  const cameraRef = useRef<React.ElementRef<typeof Mapbox.Camera>>(null);
  const reportedRef = useRef(false);

  // selectedPlace = a place tapped in search/favorites (map hovers + shows a
  // detail card). routingTo = the destination we actually route to, set when the
  // user taps "Go" (then we fetch route alternatives).
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [routingTo, setRoutingTo] = useState<Place | null>(null);
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

  const { route, routes, selectedIndex, selectRoute, pellets, progress, status, error, reset } =
    useNavigation(routingTo?.coord ?? null, fix, started);

  useVoiceGuidance(progress, status, voiceOn);

  // Pick a place from search/favorites: hover the map over it and show details
  // (no routing yet — that happens on "Go").
  function pickPlace(p: Place) {
    setSelectedPlace(p);
    setRoutingTo(null);
    setStarted(false);
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
    setStarted(false);
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
                size={42}
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

        {/* Preview: route alternatives + endpoints. */}
        {isPreview && routes.length > 0 && (
          <PreviewLayer routes={routes} selectedIndex={selectedIndex} />
        )}

        {/* Navigation: pellets + the chomping character. */}
        {isNav && pellets.length > 0 && progress && (
          <RouteLayers
            pellets={pellets}
            distAlong={progress.distAlong}
            leadM={NAV.PELLET_LEAD_M}
          />
        )}
      </Mapbox.MapView>

      {/* ---------- Overlays per phase ---------- */}

      {/* Idle: search (hidden once a place is selected). */}
      {status === 'idle' && !selectedPlace && (
        <SearchPanel near={fix?.coord ?? null} onPick={pickPlace} />
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
            <TouchableOpacity style={styles.cancelBtn} onPress={cancel}>
              <Text style={styles.cancelText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.startBtn} onPress={() => setRoutingTo(selectedPlace)}>
              <Text style={styles.startText}>Go ▶</Text>
            </TouchableOpacity>
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
            <TouchableOpacity style={styles.cancelBtn} onPress={cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.startBtn, !route && styles.startBtnDisabled]}
              onPress={() => setStarted(true)}
              disabled={!route}
            >
              <Text style={styles.startText}>Start ▶</Text>
            </TouchableOpacity>
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
              <TouchableOpacity onPress={cancel} style={styles.startBtn}>
                <Text style={styles.startText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EtaBar
              distRemainingM={progress.distRemaining}
              remainingSec={remainingSec}
              units={units}
              onStop={cancel}
            />
          )}
        </>
      )}

      {/* Ticket balance (shown while navigating; tap to open the store). */}
      {isNav && (
        <View style={styles.ticketTop}>
          <TicketBalance onPress={() => setStoreOpen(true)} />
        </View>
      )}

      {/* Floating controls — bottom-right stack. */}
      <TouchableOpacity style={[styles.fab, styles.fabStore]} onPress={() => setStoreOpen(true)}>
        <Text style={styles.fabIcon}>🛒</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.fab, styles.fabProfile]} onPress={() => setProfileOpen(true)}>
        <Text style={styles.fabIcon}>👤</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.fab, styles.fabFavorites]} onPress={() => setFavoritesOpen(true)}>
        <Text style={styles.fabIcon}>⭐</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.fab, styles.fabSettings]} onPress={() => setSettingsOpen(true)}>
        <Text style={styles.fabIcon}>⚙️</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.fab, styles.fabAccount]} onPress={() => setAccountOpen(true)}>
        <Text style={styles.fabIcon}>🔑</Text>
      </TouchableOpacity>
      {/* Always-on re-center; highlighted when navigation has been panned away. */}
      <TouchableOpacity
        style={[styles.fab, styles.fabRecenter, isNav && !following && styles.fabRecenterActive]}
        onPress={recenter}
      >
        <Text style={styles.fabIcon}>🧭</Text>
      </TouchableOpacity>
      {isNav && (
        <TouchableOpacity
          style={[styles.fab, styles.fabMute]}
          onPress={() => setVoiceOn(!voiceOn)}
        >
          <Text style={styles.fabIcon}>{voiceOn ? '🔊' : '🔇'}</Text>
        </TouchableOpacity>
      )}

      <StoreScreen visible={storeOpen} onClose={() => setStoreOpen(false)} />
      <ProfileScreen visible={profileOpen} onClose={() => setProfileOpen(false)} />
      <FavoritesModal visible={favoritesOpen} onClose={() => setFavoritesOpen(false)} onPick={pickPlace} />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AccountModal visible={accountOpen} onClose={() => setAccountOpen(false)} />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const card = {
  position: 'absolute' as const,
  left: 12,
  right: 12,
  backgroundColor: theme.colors.overlay,
  borderWidth: 1,
  borderColor: theme.colors.border,
  borderRadius: theme.radius.lg,
  padding: 18,
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.colors.bg },
  msg: { color: theme.colors.textOnMap, textAlign: 'center', fontSize: 16 },

  previewCard: { ...card, bottom: 24, gap: 6 },
  previewTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewTitle: { flex: 1, color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800' },
  saveStar: { color: theme.colors.textSecondary, fontSize: 26, paddingLeft: 12 },
  saveStarOn: { color: theme.colors.accent },
  previewSub: { color: theme.colors.success, fontSize: 14, fontWeight: '600' },
  previewAddr: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 },
  previewErr: { color: theme.colors.danger, fontSize: 14, fontWeight: '600' },

  routeOptions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  routeOpt: {
    flex: 1,
    backgroundColor: theme.colors.cardElevated,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  routeOptActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.card },
  routeEta: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },
  routeEtaActive: { color: theme.colors.textPrimary },
  routeDist: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 1 },
  routeDistActive: { color: theme.colors.textSecondary },
  routeTag: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 3 },
  routeTagActive: { color: theme.colors.accentStrong },

  placePin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.accent,
    borderWidth: 3,
    borderColor: '#fff',
  },
  previewBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: theme.radius.sm, backgroundColor: theme.colors.card, alignItems: 'center' },
  cancelText: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 },
  startBtn: { flex: 2, paddingVertical: 14, borderRadius: theme.radius.sm, backgroundColor: theme.colors.accent, alignItems: 'center' },
  startBtnDisabled: { opacity: 0.5 },
  startText: { color: theme.colors.onAccent, fontWeight: '800', fontSize: 16 },

  arrived: { ...card, bottom: 24, alignItems: 'center', gap: 12 },
  arrivedText: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' },

  fab: {
    position: 'absolute',
    right: 12,
    width: 52,
    height: 52,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.overlay,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bottom-right vertical stack (57px pitch).
  fabStore: { bottom: 110 },
  fabProfile: { bottom: 167 },
  fabFavorites: { bottom: 224 },
  fabSettings: { bottom: 281 },
  fabAccount: { bottom: 338 },
  fabRecenter: { bottom: 395 },
  fabRecenterActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  fabMute: { bottom: 452 },
  fabIcon: { fontSize: 24 },
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
