'use client';

/**
 * hooks/useStudentProfile.js — state store for the profile hub.
 *
 * Owns the UserProfile + PurchaseHistory slices and exposes one mutation per
 * form so components stay presentational. Every mutation reports whether it hit
 * the live API or the mock fallback, letting the UI say so honestly.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  changeStudentPassword,
  fetchPurchaseHistory,
  fetchStudentProfile,
  updateNotificationPreferences,
  updateStudentProfile,
  uploadStudentAvatar,
} from '@/lib/student/api';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Keep AuthProvider's user in sync so Header (and anything else on useAuth)
 * sees the same avatar / name fields the profile hub just wrote.
 *
 * IMPORTANT: return the same `current` reference when nothing changed. A new
 * object every time would re-trigger loadProfile (it used to depend on the
 * whole authUser) and leave the profile hub stuck on loading skeletons.
 *
 * @param {(updater: object|((current: object|null) => object|null)) => void} setUser
 * @param {Partial<object>} patch
 */
function syncAuthUser(setUser, patch) {
  if (!setUser || !patch || typeof patch !== 'object') return;

  setUser((current) => {
    if (!current) return current;

    let changed = false;
    const next = { ...current };

    for (const [key, value] of Object.entries(patch)) {
      if (current[key] !== value) {
        next[key] = value;
        changed = true;
      }
    }

    return changed ? next : current;
  });
}

/**
 * @param {object|null} authUser Signed-in user from AuthProvider.
 * @param {{ enabled?: boolean }} options `enabled: false` holds the request
 *   until auth resolves, so the hub never flashes fallback data.
 */
export function useStudentProfile(authUser = null, { enabled = true } = {}) {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);

  const mountedRef = useRef(true);
  // Keep the latest auth user for seed/fallback without putting the whole
  // object in loadProfile deps (that caused the infinite reload loop).
  const authUserRef = useRef(authUser);
  authUserRef.current = authUser;
  const authUserId = authUser?.id ?? null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadProfile = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, source: origin } = await fetchStudentProfile(authUserRef.current);
      if (!mountedRef.current) return;
      setProfile(data);
      setSource(origin);
      if (data?.avatarUrl) {
        syncAuthUser(setUser, { avatar_url: data.avatarUrl, avatarUrl: data.avatarUrl });
      }
    } catch (loadError) {
      if (!mountedRef.current) return;
      setError(loadError);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [authUserId, enabled, setUser]);

  const loadOrders = useCallback(async () => {
    if (!enabled) return;

    setIsOrdersLoading(true);

    try {
      const { data } = await fetchPurchaseHistory();
      if (mountedRef.current) setOrders(data);
    } catch {
      if (mountedRef.current) setOrders([]);
    } finally {
      if (mountedRef.current) setIsOrdersLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const saveAccountInfo = useCallback(
    async (values) => {
      const { data, source: origin } = await updateStudentProfile(values, profile);
      if (mountedRef.current) {
        setProfile(data);
        setSource(origin);
        // Auth /me and Header use snake_case — mirror both shapes.
        syncAuthUser(setUser, {
          first_name: data.firstName,
          last_name: data.lastName,
          name: [data.firstName, data.lastName].filter(Boolean).join(' ').trim(),
          email: data.email,
          phone_number: data.phoneNumber,
          ...(data.avatarUrl
            ? { avatar_url: data.avatarUrl, avatarUrl: data.avatarUrl }
            : {}),
        });
      }
      return { profile: data, source: origin };
    },
    [profile, setUser]
  );

  const saveAvatar = useCallback(
    async (file) => {
      const { data: avatarUrl, source: origin } = await uploadStudentAvatar(file);
      if (mountedRef.current && avatarUrl) {
        setProfile((current) => (current ? { ...current, avatarUrl } : current));
        // Instant upload: push the new URL into global auth so Header updates now.
        syncAuthUser(setUser, { avatar_url: avatarUrl, avatarUrl });
      }
      return { avatarUrl, source: origin };
    },
    [setUser]
  );

  const savePassword = useCallback(async (values) => {
    const { source: origin } = await changeStudentPassword(values);
    return { source: origin };
  }, []);

  const saveNotifications = useCallback(async (preferences) => {
    const { data, source: origin } = await updateNotificationPreferences(preferences);
    if (mountedRef.current) {
      setProfile((current) =>
        current ? { ...current, notificationPreferences: data } : current
      );
    }
    return { preferences: data, source: origin };
  }, []);

  return {
    profile,
    orders,
    isLoading,
    isOrdersLoading,
    error,
    source,
    reload: loadProfile,
    reloadOrders: loadOrders,
    saveAccountInfo,
    saveAvatar,
    savePassword,
    saveNotifications,
  };
}

export default useStudentProfile;
