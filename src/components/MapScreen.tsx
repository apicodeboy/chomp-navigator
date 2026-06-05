import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { NAV } from '@/config/mapbox';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useNavigation } from '@/hooks/useNavigation';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';
import { routeBounds } from '@/utils/geo';
import RouteLayers from './RouteLayers';
import PreviewLayer from './PreviewLayer';
import ChomperMarker from './ChomperMarker';
import InstructionBanner from './InstructionBanner';
import EtaBar from './EtaBar';
import SearchPanel from './SearchPanel';
import StoreScreen from './StoreScreen';
import { useSkinStore } from '@/store/useSkinStore';
import { theme } from '@/theme';
import type { Place } from '@/types/navigation';

function fmtKm(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}
function fmtDuration(sec: number): string {
  const mins = Math.max(1, Math.round(sec / 60));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
}

export default function MapScreen() {
  const { fix, permissionDenied } = useUserLocation();
  const { selected: selectedSkin } = useSkinStore();
  const cameraRef = useRef<React.ElementRef<typeof Mapbox.Camera>>(null);

  const [place, setPlace] = useState<Place | null>(null);
  const [started, setStarted] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);

  const { route, pellets, progress, status, error, reset } = useNavigation(
    place?.coord ?? null,
    fix,
    started,
  );

  useVoiceGuidance(progress, status, voiceOn);

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
    setPlace(null);
    setStarted(false);
  }

  function recenter() {
    if (progress) {
      cameraRef.current?.setCamera({
        centerCoordinate: progress.snapped,
        heading: progress.bearing,
        zoomLevel: NAV.FOLLOW_ZOOM,
        pitch: NAV.FOLLOW_PITCH,
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
        styleURL={NAV.STYLE_URL}
        scaleBarEnabled={false}
        compassEnabled
      >
        <Mapbox.Camera
          ref={cameraRef}
          {...(isNav && progress
            ? {
                // Chase cam: center on the snapped point, rotate to travel direction.
                centerCoordinate: progress.snapped,
                heading: progress.bearing,
                pitch: NAV.FOLLOW_PITCH,
                zoomLevel: NAV.FOLLOW_ZOOM,
                animationMode: 'linearTo' as const,
                animationDuration: 800,
              }
            : isPreview && route
              ? {
                  // Fit the whole route on screen for the preview.
                  bounds: {
                    ...routeBounds(route.line),
                    paddingTop: 120,
                    paddingBottom: 220,
                    paddingLeft: 60,
                    paddingRight: 60,
                  },
                  animationDuration: 600,
                }
              : {
                  followUserLocation: true,
                  followZoomLevel: NAV.FOLLOW_ZOOM,
                })}
        />

        {!isNav && <Mapbox.UserLocation visible androidRenderMode="normal" />}

        {/* Preview: full route line + endpoints. */}
        {isPreview && route && <PreviewLayer line={route.line} />}

        {/* Navigation: pellets + the chomping character. */}
        {isNav && pellets.length > 0 && progress && (
          <RouteLayers
            pellets={pellets}
            distAlong={progress.distAlong}
            leadM={NAV.PELLET_LEAD_M}
          />
        )}
        {isNav && progress && (
          <ChomperMarker
            coordinate={progress.snapped}
            rotationDeg={0}
            skin={selectedSkin}
          />
        )}
      </Mapbox.MapView>

      {/* ---------- Overlays per phase ---------- */}

      {/* Idle: search. */}
      {status === 'idle' && (
        <SearchPanel near={fix?.coord ?? null} onPick={setPlace} />
      )}

      {/* Preview: route summary + Start / Cancel. */}
      {isPreview && (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle} numberOfLines={1}>
            {place?.name ?? 'Route'}
          </Text>
          {route ? (
            <Text style={styles.previewSub}>
              {fmtDuration(route.duration)} · {fmtKm(route.distance)} · with traffic
            </Text>
          ) : (
            <Text style={styles.previewSub}>Finding the best route…</Text>
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
              onStop={cancel}
            />
          )}
        </>
      )}

      {/* Floating controls. */}
      <TouchableOpacity style={styles.fab} onPress={() => setStoreOpen(true)}>
        <Text style={styles.fabIcon}>🛒</Text>
      </TouchableOpacity>
      {isNav && (
        <>
          <TouchableOpacity
            style={[styles.fab, styles.fabMute]}
            onPress={() => setVoiceOn((v) => !v)}
          >
            <Text style={styles.fabIcon}>{voiceOn ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fab, styles.fabRecenter]}
            onPress={recenter}
          >
            <Text style={styles.fabIcon}>🧭</Text>
          </TouchableOpacity>
        </>
      )}

      <StoreScreen visible={storeOpen} onClose={() => setStoreOpen(false)} />
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
  msg: { color: theme.colors.textPrimary, textAlign: 'center', fontSize: 16 },

  previewCard: { ...card, bottom: 24, gap: 6 },
  previewTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800' },
  previewSub: { color: theme.colors.success, fontSize: 14, fontWeight: '600' },
  previewBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: theme.radius.sm, backgroundColor: theme.colors.card, alignItems: 'center' },
  cancelText: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 },
  startBtn: { flex: 2, paddingVertical: 14, borderRadius: theme.radius.sm, backgroundColor: theme.colors.accent, alignItems: 'center' },
  startBtnDisabled: { opacity: 0.5 },
  startText: { color: '#141414', fontWeight: '800', fontSize: 16 },

  arrived: { ...card, bottom: 24, alignItems: 'center', gap: 12 },
  arrivedText: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' },

  fab: {
    position: 'absolute',
    right: 12,
    bottom: 110,
    width: 52,
    height: 52,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.overlay,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMute: { bottom: 224 },
  fabRecenter: { bottom: 167 },
  fabIcon: { fontSize: 24 },

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
