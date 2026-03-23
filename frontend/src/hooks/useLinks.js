import { useState, useEffect } from "react";
import { linksApi } from "../services/api";

export function useLinks() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch links from backend on mount
  useEffect(() => {
    linksApi.getMyLinks()
      .then((data) => {
        // backend returns { total, page, limit, links }
        setLinks(data.links ?? data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Optimistic toggle — update UI immediately, call API, revert on failure
  const toggleStatus = async (id, currentStatus) => {
    const isActive = currentStatus === "active";

    // Optimistic update
    setLinks((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, status: isActive ? "disabled" : "active" } : l
      )
    );

    try {
      const link = links.find((l) => l.id === id);
      if (isActive) {
        await linksApi.disable(link.short_code);
      } else {
        await linksApi.enable(link.short_code);
      }
    } catch (err) {
      // Revert on failure
      setLinks((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, status: currentStatus } : l
        )
      );
      throw err;
    }
  };

  // Call API then prepend the returned link to the list
  const createLink = async ({ url, customCode, expiry }) => {
    
    const newLink = await linksApi.shorten(
      url,
      customCode || null,
      expiry || null
    );
    // backend returns the full link object — prepend to list
    setLinks((prev) => [newLink, ...prev]);
    return newLink;
  };

  return { links, loading, error, toggleStatus, createLink };
}