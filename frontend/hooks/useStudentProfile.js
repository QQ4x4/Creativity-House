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

/**
 * @param {object|null} authUser Signed-in user from AuthProvider.
 * @param {{ enabled?: boolean }} options `enabled: false` holds the request
 *   until auth resolves, so the hub never flashes fallback data.
 */
export function useStudentProfile(authUser = null, { enabled = true } = {}) {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);

  const mountedRef = useRef(true);

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
      const { data, source: origin } = await fetchStudentProfile(authUser);
      if (!mountedRef.current) return;
      setProfile(data);
      setSource(origin);
    } catch (loadError) {
      if (!mountedRef.current) return;
      setError(loadError);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [authUser, enabled]);

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
      }
      return { profile: data, source: origin };
    },
    [profile]
  );

  const saveAvatar = useCallback(async (file) => {
    const { data: avatarUrl, source: origin } = await uploadStudentAvatar(file);
    if (mountedRef.current && avatarUrl) {
      setProfile((current) => (current ? { ...current, avatarUrl } : current));
    }
    return { avatarUrl, source: origin };
  }, []);

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
