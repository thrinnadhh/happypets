import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  addFavoriteInSupabase,
  fetchFavoriteIdsFromSupabase,
  removeFavoriteInSupabase,
} from "@/lib/supabase";

type FavoritesContextValue = {
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const loadFavorites = async (): Promise<void> => {
      if (!user) {
        setFavorites([]);
        return;
      }

      try {
        setFavorites(await fetchFavoriteIdsFromSupabase());
      } catch {
        setFavorites([]);
      }
    };

    void loadFavorites();
  }, [user?.id]);

  const toggleFavorite = (productId: string): void => {
    if (!user) {
      return;
    }

    const previous = favorites;
    const wasFavorite = favorites.includes(productId);
    const next = wasFavorite
      ? favorites.filter((id) => id !== productId)
      : [...favorites, productId];

    setFavorites(next);

    const sync = async (): Promise<void> => {
      try {
        const synced = wasFavorite
          ? await removeFavoriteInSupabase(productId)
          : await addFavoriteInSupabase(productId);
        setFavorites(synced);
      } catch {
        setFavorites(previous);
      }
    };

    void sync();
  };

  const isFavorite = (productId: string): boolean => favorites.includes(productId);

  const value = useMemo(
    () => ({
      favorites,
      toggleFavorite,
      isFavorite,
    }),
    [favorites],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error("useFavorites must be used inside FavoritesProvider");
  }

  return context;
}
